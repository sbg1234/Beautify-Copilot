/**
 * Slack message formatters - simplified to two notification types:
 * 1. New Application
 * 2. Status Update (covers status changes, tab changes, amount changes, closures)
 */

import { Change } from '../diff/engine.js';
import { ScrapedApplication } from '../scraper/types.js';

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string;
    url?: string;
  }>;
}

function formatMoney(amount: number | null): string {
  if (amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getFullName(app: ScrapedApplication): string {
  return `${app.firstName} ${app.lastName}`.trim();
}

export function formatNewApplication(app: ScrapedApplication): SlackMessage {
  const name = getFullName(app);
  const text = `🆕 *New Application*\n*${name}* (${app.email})\nRequested: ${formatMoney(app.requestedAmount)}\nStatus: ${app.status || 'Unknown'}\nTab: ${app.tab}`;

  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  };
}

export function formatStatusUpdate(change: Change): SlackMessage {
  const app = change.application;
  const name = getFullName(app);
  const approvedDisplay = app.approvedAmount ? formatMoney(app.approvedAmount) : 'N/A';

  // Build the "moved from X → Y" part based on what changed
  let changeDescription = '';
  if (change.type === 'tab_change') {
    changeDescription = `moved from \`${change.previousValue}\` → \`${change.newValue}\``;
  } else if (change.type === 'status_change' || change.type === 'closed') {
    changeDescription = `moved from \`${change.previousValue}\` → \`${change.newValue}\``;
  } else if (change.type === 'amount_change') {
    const oldAmount = formatMoney(change.previousValue as number | null);
    const newAmount = formatMoney(change.newValue as number | null);
    changeDescription = `approved amount changed: ${oldAmount} → ${newAmount}`;
  } else {
    changeDescription = `updated (${change.field || 'unknown'})`;
  }

  const text = `🔄 *Status Update*\n*${name}* ${changeDescription}\nRequested: ${formatMoney(app.requestedAmount)}\nApproved: ${approvedDisplay}\nTab: ${app.tab}`;

  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  };
}

// Keep these for backwards compatibility but they all route to formatStatusUpdate
export const formatStatusChange = formatStatusUpdate;
export const formatTabChange = formatStatusUpdate;
export const formatAmountChange = formatStatusUpdate;
export const formatClosed = formatStatusUpdate;
export const formatNotesChange = formatStatusUpdate;

export function formatError(error: Error | string): SlackMessage {
  const errorMessage = error instanceof Error ? error.message : error;
  const text = `🚨 *Beautifi Watcher Error*\n${errorMessage}\nCheck credentials or portal availability`;

  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  };
}

export function formatRunSummary(
  applicationsFound: number,
  changesDetected: number,
  newApplications: number,
  durationSeconds: number
): SlackMessage {
  const text = `✅ *Beautifi Watcher Run Complete*\nApplications: ${applicationsFound}\nChanges: ${changesDetected}\nNew: ${newApplications}\nDuration: ${durationSeconds}s`;

  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  };
}
