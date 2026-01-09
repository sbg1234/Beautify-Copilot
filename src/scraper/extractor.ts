/**
 * Data extraction from Beautifi portal
 * Navigates to each tab page and parses application data from the DOM
 */

import { Page } from 'playwright';
import { ScrapedApplication, ScrapeResult, TabName } from './types.js';
import { log } from './browser.js';

const TABS_TO_SCRAPE: TabName[] = ['In-Progress', 'Submitted', 'Accepted & Approved'];

// Map tab names to URL paths
const TAB_URL_PATHS: Record<TabName, string> = {
  'In-Progress': 'in-progress',
  'Submitted': 'submitted',
  'Accepted & Approved': 'accepted-approved',
};

export async function scrapeAllTabs(page: Page): Promise<ScrapeResult> {
  const allApplications: ScrapedApplication[] = [];
  const tabCounts: Record<TabName, number> = {
    'In-Progress': 0,
    'Submitted': 0,
    'Accepted & Approved': 0,
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
  await page.waitForTimeout(2000);

  // Get the page text content
  const bodyText = await page.locator('body').textContent() || '';

  // Parse applications from the text
  const applications = parseApplicationsFromText(bodyText, tab);

  return applications;
}

function parseApplicationsFromText(text: string, tab: TabName): ScrapedApplication[] {
  const applications: ScrapedApplication[] = [];

  // Known statuses in the system
  const statuses = [
    'Approved for Loan',
    'Credit Review',
    'Closed',
    'Reaching Out to Patient',
    'Gathering Additional Information',
    'Ready for Funding',
    'Funded',
    'N/A - Contact Beautifi',
  ];

  // Create regex to find status markers
  const statusPattern = statuses.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const statusRegex = new RegExp(`(${statusPattern})`, 'g');

  // Find email patterns - they mark distinct applications
  const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = [...text.matchAll(emailPattern)].map(m => m[1]);

  // Remove system emails
  const appEmails = emails.filter(e => !e.includes('sleeveclinic.ca') && !e.includes('beautifi'));

  log(`Found ${appEmails.length} unique application emails`);

  for (const email of appEmails) {
    // Find the section of text around this email
    const emailIndex = text.indexOf(email);
    if (emailIndex === -1) continue;

    // Get text before and after the email (500 chars each direction)
    const start = Math.max(0, emailIndex - 500);
    const end = Math.min(text.length, emailIndex + 500);
    const section = text.substring(start, end);

    // Extract name - usually appears before the email
    // Pattern: Name appears before status or email
    const beforeEmail = text.substring(start, emailIndex);
    const nameMatch = beforeEmail.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*(?:Approved|Credit|Closed|Reaching|Gathering|Ready|Funded|N\/A|$)/);
    const name = nameMatch ? nameMatch[1].trim() : extractNameFromSection(beforeEmail);

    // Extract status
    const statusMatch = section.match(new RegExp(statusPattern));
    const status = statusMatch ? statusMatch[0] : '';

    // Extract amounts
    const requestedMatch = section.match(/Requested Amount\$?([\d,]+(?:\.\d{2})?)/);
    const approvedMatch = section.match(/Approved Amount\$?([\d,]+(?:\.\d{2})?)/);
    const maxApprovedMatch = section.match(/Maximum Amount Approved\$?([\d,]+(?:\.\d{2})?)/);

    // Extract dates
    const createdMatch = section.match(/Created(\d{4}-\d{2}-\d{2}[^L]*)/);
    const updatedMatch = section.match(/Last Updated(\d{4}-\d{2}-\d{2}[^N]*)/);

    // Extract notes
    const notesMatch = section.match(/Notes:([^L]*?)(?:Loss Reason:|$)/s);
    const notes = notesMatch ? notesMatch[1].trim() : '';

    // Extract loss reason
    const lossMatch = section.match(/Loss Reason:([^D]*?)(?:DAMARIS|Cheri|Kumanan|Angela|Brian|Jasmine|Rylee|fazilla|Monica|$)/s);
    const lossReason = lossMatch ? lossMatch[1].trim() : null;

    // Generate unique ID from email + created date
    const created = createdMatch ? createdMatch[1].trim() : '';
    const applicationId = `${email}-${created}`.replace(/[^a-zA-Z0-9@.-]/g, '_');

    if (name && email) {
      applications.push({
        applicationId,
        tab,
        applicantName: name,
        email,
        status,
        requestedAmount: requestedMatch ? parseFloat(requestedMatch[1].replace(/,/g, '')) : null,
        approvedAmount: approvedMatch ? parseFloat(approvedMatch[1].replace(/,/g, '')) : null,
        maximumAmountApproved: maxApprovedMatch ? parseFloat(maxApprovedMatch[1].replace(/,/g, '')) : null,
        fundingAmount: null,
        scheduledFundingDate: null,
        fee: null,
        rate: null,
        notes,
        lossReason,
        createdAt: created,
        lastUpdatedAt: updatedMatch ? updatedMatch[1].trim() : '',
        source: 'Website',
        doctor: 'Scott Gmora', // Default from examples
        procedureDate: null,
        rawJson: JSON.stringify({ email, section: section.substring(0, 300) }),
      });
    }
  }

  // Remove duplicates by email
  const seen = new Set<string>();
  return applications.filter(app => {
    if (seen.has(app.email)) return false;
    seen.add(app.email);
    return true;
  });
}

function extractNameFromSection(text: string): string {
  // Look for capitalized words that could be a name
  // Names typically appear as "FirstName LastName" before status
  const lines = text.split(/\n|(?=[A-Z][a-z])/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    // Check if it looks like a name (2-3 capitalized words)
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(line)) {
      return line;
    }
  }
  return '';
}
