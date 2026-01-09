/**
 * Data extraction from Beautifi portal
 * Uses gridtable CSS selectors to extract structured application data
 */

import { Page } from 'playwright';
import { ScrapedApplication, ScrapeResult, TabName } from './types.js';
import { log } from './browser.js';

const TABS_TO_SCRAPE: TabName[] = ['In-Progress', 'Submitted', 'Accepted & Approved', 'Funded'];

// Map tab names to URL paths
const TAB_URL_PATHS: Record<TabName, string> = {
  'In-Progress': 'in-progress',
  'Submitted': 'submitted',
  'Accepted & Approved': 'accepted-approved',
  'Funded': 'funded',
};

export async function scrapeAllTabs(page: Page): Promise<ScrapeResult> {
  const allApplications: ScrapedApplication[] = [];
  const tabCounts: Record<TabName, number> = {
    'In-Progress': 0,
    'Submitted': 0,
    'Accepted & Approved': 0,
    'Funded': 0,
  };

  // Get the partner ID from current URL
  const currentUrl = page.url();
  const match = currentUrl.match(/partners\/(\d+)/);
  const partnerId = match ? match[1] : '';

  if (!partnerId) {
    throw new Error('Could not determine partner ID from URL: ' + currentUrl);
  }

  log(`Partner ID: ${partnerId}`);

  for (const tab of TABS_TO_SCRAPE) {
    log(`Scraping tab: ${tab}`);
    const applications = await scrapeTab(page, tab, partnerId);
    tabCounts[tab] = applications.length;
    allApplications.push(...applications);
    log(`Found ${applications.length} applications in ${tab}`);
  }

  return {
    applications: allApplications,
    tabCounts,
    scrapedAt: new Date(),
  };
}

async function scrapeTab(
  page: Page,
  tab: TabName,
  partnerId: string
): Promise<ScrapedApplication[]> {
  const urlPath = TAB_URL_PATHS[tab];
  const url = `https://app.beautifi.com/partners/${partnerId}/${urlPath}`;

  log(`Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for dynamic content

  // Extract applications using gridtable structure
  // The portal uses a CSS grid with classes like gridtable-cell, gridtable-even/odd, gridtable-rowfooter
  // Structure per row: 6 cells (name, source, doctor, procedure, amounts, dates) + 1 rowfooter
  const applications = await page.evaluate((tabName) => {
    const results: Array<{
      name: string;
      email: string;
      status: string;
      requestedAmount: number | null;
      approvedAmount: number | null;
      maxApproved: number | null;
      createdAt: string;
      lastUpdatedAt: string;
      notes: string;
      lossReason: string | null;
      source: string;
      doctor: string;
      procedure: string;
    }> = [];

    // Find the gridtable container
    const gridtable = document.querySelector('.gridtable');
    if (!gridtable) return results;

    // Find all first cells of application rows
    // First cells have min-w-[240px] class and contain the name/email
    const firstCells = gridtable.querySelectorAll('.gridtable-cell[class*="min-w-"]');

    for (const firstCell of firstCells) {
      // Skip header cells
      if (firstCell.querySelector('button')) continue;

      // Get the row class (gridtable-even or gridtable-odd) to identify all cells in this row
      const isEven = firstCell.classList.contains('gridtable-even');
      const isOdd = firstCell.classList.contains('gridtable-odd');
      if (!isEven && !isOdd) continue;

      const rowClass = isEven ? 'gridtable-even' : 'gridtable-odd';

      // Extract name and status from first cell
      const nameElement = firstCell.querySelector('.font-medium');
      if (!nameElement) continue;

      // Get name (text content before the badge span)
      let nameText = '';
      for (const node of nameElement.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          nameText += node.textContent || '';
        }
      }
      nameText = nameText.trim();

      // Get status from badge
      const statusBadge = nameElement.querySelector('.badge');
      const status = statusBadge?.textContent?.trim() || '';

      // Get email from opacity-60 div
      const emailElement = firstCell.querySelector('.opacity-60');
      const email = emailElement?.textContent?.trim() || '';

      if (!nameText || !email) continue;

      // Find all cells in the same row by looking for siblings with the same row class
      // We need to collect all cells between this first cell and the next first cell
      const allCells = gridtable.querySelectorAll(`.gridtable-cell.${rowClass}`);
      const cellsArray = Array.from(allCells);

      // Find our first cell in the array
      const firstCellIndex = cellsArray.indexOf(firstCell as Element);
      if (firstCellIndex === -1) continue;

      // Get the next 5 cells for this row
      const sourceCell = cellsArray[firstCellIndex + 1];
      const doctorCell = cellsArray[firstCellIndex + 2];
      const procedureCell = cellsArray[firstCellIndex + 3];
      const amountsCell = cellsArray[firstCellIndex + 4];
      const datesCell = cellsArray[firstCellIndex + 5];

      // Extract source
      const source = sourceCell?.querySelector('div > div')?.textContent?.trim() || '';

      // Extract doctor
      const doctor = doctorCell?.querySelector('div > div')?.textContent?.trim() || '';

      // Extract procedure
      const procedure = procedureCell?.querySelector('div > div')?.textContent?.trim() || '';

      // Extract amounts
      let requestedAmount: number | null = null;
      let approvedAmount: number | null = null;
      let maxApproved: number | null = null;

      if (amountsCell) {
        const h5s = amountsCell.querySelectorAll('h5');
        h5s.forEach((h5) => {
          const label = h5.textContent?.trim() || '';
          const nextDiv = h5.nextElementSibling;
          const valueText = nextDiv?.textContent?.trim() || '';
          const value = parseFloat(valueText.replace(/[$,]/g, ''));

          if (!isNaN(value)) {
            if (label.includes('Requested')) {
              requestedAmount = value;
            } else if (label.includes('Maximum')) {
              maxApproved = value;
            } else if (label.includes('Approved')) {
              approvedAmount = value;
            }
          }
        });
      }

      // Extract dates
      let createdAt = '';
      let lastUpdatedAt = '';

      if (datesCell) {
        const h5s = datesCell.querySelectorAll('h5');
        h5s.forEach((h5) => {
          const label = h5.textContent?.trim() || '';
          const nextDiv = h5.nextElementSibling;
          const dateText = nextDiv?.textContent?.trim() || '';

          if (label === 'Created') {
            createdAt = dateText;
          } else if (label.includes('Last Updated')) {
            lastUpdatedAt = dateText;
          }
        });
      }

      // Find the corresponding rowfooter for notes
      // Rowfooters also have even/odd classes and appear after each row's cells
      const allRowFooters = gridtable.querySelectorAll(`.gridtable-rowfooter.${rowClass}`);
      const rowIndex = Math.floor(firstCellIndex / 6);
      const rowFooter = allRowFooters[rowIndex];

      let notes = '';
      let lossReason: string | null = null;

      if (rowFooter) {
        // Get notes
        const notesDiv = rowFooter.querySelector('div > div');
        if (notesDiv) {
          const notesH5 = notesDiv.querySelector('h5');
          if (notesH5 && notesH5.textContent?.includes('Notes')) {
            // Notes text comes after the h5 tag
            notes = notesDiv.textContent?.replace(/Notes:\s*/, '').trim() || '';
          }
        }

        // Check for loss reason
        const allDivs = rowFooter.querySelectorAll('div');
        for (const div of allDivs) {
          const text = div.textContent || '';
          if (text.includes('Loss Reason:')) {
            lossReason = text.replace(/.*Loss Reason:\s*/, '').trim() || null;
            break;
          }
        }
      }

      results.push({
        name: nameText,
        email,
        status,
        requestedAmount,
        approvedAmount,
        maxApproved,
        createdAt,
        lastUpdatedAt,
        notes,
        lossReason,
        source,
        doctor,
        procedure
      });
    }

    return results;
  }, tab);

  log(`Extracted ${applications.length} applications from DOM`);

  // Convert to ScrapedApplication format
  // Use email as stable applicationId - each patient has one unique email
  return applications.map(app => {
    const applicationId = app.email.toLowerCase();

    // Convert name to title case and split into first/last
    const { firstName, lastName } = parseAndFormatName(app.name);

    return {
      applicationId,
      tab,
      firstName,
      lastName,
      email: app.email,
      status: app.status,
      requestedAmount: app.requestedAmount,
      approvedAmount: app.approvedAmount,
      maximumAmountApproved: app.maxApproved,
      fundingAmount: null,
      scheduledFundingDate: null,
      fee: null,
      rate: null,
      notes: app.notes,
      lossReason: app.lossReason,
      createdAt: app.createdAt,
      lastUpdatedAt: app.lastUpdatedAt,
      source: app.source,
      doctor: app.doctor,
      procedureDate: null,
      rawJson: JSON.stringify({ email: app.email, firstName, lastName, status: app.status }),
    };
  });
}

/**
 * Convert name to title case and split into first/last name
 * Examples:
 *   "DAMARIS FERNANDEZ" → { firstName: "Damaris", lastName: "Fernandez" }
 *   "Cheri Brunning" → { firstName: "Cheri", lastName: "Brunning" }
 *   "Mary Jane Watson" → { firstName: "Mary Jane", lastName: "Watson" }
 */
function parseAndFormatName(fullName: string): { firstName: string; lastName: string } {
  // Convert to title case
  const titleCase = fullName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();

  // Split into first and last name
  const parts = titleCase.split(' ').filter(p => p.length > 0);

  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  // Last word is last name, everything else is first name
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');

  return { firstName, lastName };
}
