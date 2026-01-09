/**
 * Slack message formatters for different notification types
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

export function formatNewApplication(app: ScrapedApplication): SlackMessage {
  const text = `🆕 *New Application*\n*${app.applicantName}* (${app.email})\nRequested: ${formatMoney(app.requestedAmount)}\nStatus: ${app.status || 'Unknown'}\nTab: ${app.tab}`;

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

export function formatStatusChange(change: Change): SlackMessage {
  const app = change.application;
  const text = `🔄 *Status Update*\n*${app.applicantName}* moved from \`${change.previousValue}\` → \`${change.newValue}\``;

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

export function formatTabChange(change: Change): SlackMessage {
  const app = change.application;
  const text = `📋 *Pipeline Update*\n*${app.applicantName}* moved from \`${change.previousValue}\` → \`${change.newValue}\``;

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

export function formatAmountChange(change: Change): SlackMessage {
  const app = change.application;
  const oldAmount = formatMoney(change.previousValue as number | null);
  const newAmount = formatMoney(change.newValue as number | null);
  const text = `💰 *Amount Updated*\n*${app.applicantName}* approved amount changed: ${oldAmount} → ${newAmount}`;

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

export function formatClosed(change: Change): SlackMessage {
  const app = change.application;
  const reason = app.lossReason || change.newValue || 'Unknown';
  const text = `❌ *Application Closed*\n*${app.applicantName}* (${app.email})\nReason: ${reason}`;

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

export function formatNotesChange(change: Change): SlackMessage {
  const app = change.application;
  const text = `📝 *Notes Updated*\n*${app.applicantName}*\nNew notes: ${change.newValue}`;

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
