/**
 * Slack webhook integration for sending notifications
 */

import { config } from '../config.js';
import { Change } from '../diff/engine.js';
import { ScrapedApplication } from '../scraper/types.js';
import {
  SlackMessage,
  formatNewApplication,
  formatStatusChange,
  formatTabChange,
  formatAmountChange,
  formatClosed,
  formatNotesChange,
  formatError,
} from './formatters.js';

async function sendToSlack(message: SlackMessage): Promise<void> {
  const response = await fetch(config.slack.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} - ${text}`);
  }
}

export async function notifyNewApplication(app: ScrapedApplication): Promise<void> {
  const message = formatNewApplication(app);
  await sendToSlack(message);
}

export async function notifyChange(change: Change): Promise<void> {
  let message: SlackMessage;

  switch (change.type) {
    case 'new_application':
      message = formatNewApplication(change.application);
      break;
    case 'status_change':
      message = formatStatusChange(change);
      break;
    case 'tab_change':
      message = formatTabChange(change);
      break;
    case 'amount_change':
      message = formatAmountChange(change);
      break;
    case 'closed':
      message = formatClosed(change);
      break;
    case 'notes_change':
      message = formatNotesChange(change);
      break;
    default:
      console.warn(`Unknown change type: ${(change as Change).type}`);
      return;
  }

  await sendToSlack(message);
}

export async function notifyError(error: Error | string): Promise<void> {
  const message = formatError(error);
  await sendToSlack(message);
}

/**
 * Check if a change should be skipped for notifications
 * Skip all notifications related to "Funded" applications - they're already complete
 */
function shouldSkipNotification(change: Change): boolean {
  const app = change.application;

  // Skip ANY notification for applications in the Funded tab
  if (app.tab === 'Funded') {
    console.log(`Skipping notification: application in Funded tab for ${app.firstName} ${app.lastName}`);
    return true;
  }

  // Skip ANY notification for applications with Funded status
  if (app.status && app.status.toLowerCase() === 'funded') {
    console.log(`Skipping notification: application has Funded status for ${app.firstName} ${app.lastName}`);
    return true;
  }

  return false;
}

export async function notifyChanges(changes: Change[]): Promise<void> {
  // Filter out "Funded" transitions - no need to notify for these
  const notifiableChanges = changes.filter(change => !shouldSkipNotification(change));

  console.log(`Sending ${notifiableChanges.length} notifications (filtered ${changes.length - notifiableChanges.length} Funded transitions)`);

  // Send notifications with a small delay between each to avoid rate limits
  for (const change of notifiableChanges) {
    try {
      await notifyChange(change);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Failed to send notification for change:`, change.type, err);
    }
  }
}
