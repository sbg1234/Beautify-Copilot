/**
 * Monday.com sync - placeholder for future implementation
 *
 * TODO: Implement Monday.com integration when needed
 * - Create items in Monday.com board for new applications
 * - Update existing items when status changes
 * - Map Beautifi statuses to Monday.com status columns
 */

import { ScrapedApplication } from '../scraper/types.js';
import { Change } from '../diff/engine.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncToMonday(_application: ScrapedApplication): Promise<void> {
  // TODO: Implement Monday.com sync
  // 1. Authenticate with Monday.com API
  // 2. Find or create item in board
  // 3. Update status column
  // 4. Update other relevant columns
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncChangesToMonday(_changes: Change[]): Promise<void> {
  // TODO: Implement batch sync to Monday.com
  // For each change:
  // - new_application: Create new item
  // - status_change: Update status column
  // - amount_change: Update amount column
  // - closed: Move to closed group or archive
}
