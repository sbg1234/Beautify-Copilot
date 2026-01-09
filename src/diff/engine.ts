/**
 * Diff engine - compares scraped data against stored data to detect changes
 */

import { ScrapedApplication } from '../scraper/types.js';
import { StoredApplication } from '../storage/types.js';

export type ChangeType =
  | 'new_application'
  | 'status_change'
  | 'amount_change'
  | 'tab_change'
  | 'notes_change'
  | 'closed';

export interface Change {
  type: ChangeType;
  application: ScrapedApplication;
  previousValue?: string | number | null;
  newValue?: string | number | null;
  field?: string;
}

export interface DiffResult {
  changes: Change[];
  newApplications: ScrapedApplication[];
  updatedApplications: ScrapedApplication[];
  unchangedCount: number;
}

export function computeDiff(
  scraped: ScrapedApplication[],
  stored: StoredApplication[]
): DiffResult {
  const changes: Change[] = [];
  const newApplications: ScrapedApplication[] = [];
  const updatedApplications: ScrapedApplication[] = [];
  let unchangedCount = 0;

  // Create lookup map for stored applications
  const storedMap = new Map<string, StoredApplication>();
  for (const app of stored) {
    storedMap.set(app.applicationId, app);
  }

  for (const scrapedApp of scraped) {
    const storedApp = storedMap.get(scrapedApp.applicationId);

    if (!storedApp) {
      // New application
      newApplications.push(scrapedApp);
      changes.push({
        type: 'new_application',
        application: scrapedApp,
      });
      continue;
    }

    // Check for changes
    const appChanges = detectChanges(scrapedApp, storedApp);

    if (appChanges.length > 0) {
      updatedApplications.push(scrapedApp);
      changes.push(...appChanges);
    } else {
      unchangedCount++;
    }
  }

  return {
    changes,
    newApplications,
    updatedApplications,
    unchangedCount,
  };
}

function detectChanges(
  scraped: ScrapedApplication,
  stored: StoredApplication
): Change[] {
  const changes: Change[] = [];

  // Check status change
  if (scraped.status && scraped.status !== stored.status) {
    // Check if this is a closure
    const closedStatuses = ['closed', 'n/a', 'contact beautifi'];
    const isClosed = closedStatuses.some(s =>
      scraped.status.toLowerCase().includes(s)
    );

    if (isClosed && scraped.lossReason) {
      changes.push({
        type: 'closed',
        application: scraped,
        previousValue: stored.status,
        newValue: scraped.status,
        field: 'status',
      });
    } else {
      changes.push({
        type: 'status_change',
        application: scraped,
        previousValue: stored.status,
        newValue: scraped.status,
        field: 'status',
      });
    }
  }

  // Check tab change (application moved to different pipeline stage)
  if (scraped.tab !== stored.tab) {
    changes.push({
      type: 'tab_change',
      application: scraped,
      previousValue: stored.tab,
      newValue: scraped.tab,
      field: 'tab',
    });
  }

  // Check approved amount change
  if (
    scraped.approvedAmount !== null &&
    scraped.approvedAmount !== stored.approvedAmount
  ) {
    changes.push({
      type: 'amount_change',
      application: scraped,
      previousValue: stored.approvedAmount,
      newValue: scraped.approvedAmount,
      field: 'approvedAmount',
    });
  }

  // Check notes change (might indicate new information)
  if (scraped.notes && scraped.notes !== stored.notes) {
    changes.push({
      type: 'notes_change',
      application: scraped,
      previousValue: stored.notes,
      newValue: scraped.notes,
      field: 'notes',
    });
  }

  // Check loss reason change
  if (scraped.lossReason && scraped.lossReason !== stored.lossReason) {
    changes.push({
      type: 'closed',
      application: scraped,
      previousValue: stored.lossReason,
      newValue: scraped.lossReason,
      field: 'lossReason',
    });
  }

  return changes;
}

/**
 * Convert scraped applications to stored format for upserting
 */
export function toStoredApplications(
  scraped: ScrapedApplication[],
  scrapedAt: Date
): StoredApplication[] {
  return scraped.map(app => ({
    applicationId: app.applicationId,
    tab: app.tab,
    applicantName: app.applicantName,
    email: app.email,
    status: app.status,
    requestedAmount: app.requestedAmount,
    approvedAmount: app.approvedAmount,
    notes: app.notes,
    lossReason: app.lossReason,
    createdAt: app.createdAt,
    lastUpdatedAt: app.lastUpdatedAt,
    lastScrapedAt: scrapedAt.toISOString(),
    rawJson: app.rawJson,
  }));
}
