/**
 * Beautifi Financing Portal Watcher
 *
 * Main entry point - orchestrates the scraping, diffing, and notification flow.
 * Designed to run as a Railway cron job every 30 minutes.
 */

import { launchBrowser, closeBrowser, log } from './scraper/browser.js';
import { login } from './scraper/login.js';
import { scrapeAllTabs } from './scraper/extractor.js';
import { getApplications, upsertApplications, logRun } from './storage/sheets.js';
import { computeDiff, toStoredApplications } from './diff/engine.js';
import { notifyChanges, notifyError } from './notifications/slack.js';
import { config } from './config.js';

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log('🚀 Starting Beautifi Watcher...');

  let applicationsFound = 0;
  let changesDetected = 0;
  let newApplicationsCount = 0;

  try {
    // 1. Launch browser and login
    console.log('📱 Launching browser...');
    const { page } = await launchBrowser();

    console.log('🔐 Logging in...');
    await login(page);

    // 2. Scrape all tabs
    console.log('📊 Scraping applications...');
    const scrapeResult = await scrapeAllTabs(page);
    applicationsFound = scrapeResult.applications.length;

    console.log(`Found ${applicationsFound} applications across tabs:`);
    console.log(`  - In-Progress: ${scrapeResult.tabCounts['In-Progress']}`);
    console.log(`  - Submitted: ${scrapeResult.tabCounts['Submitted']}`);
    console.log(`  - Accepted & Approved: ${scrapeResult.tabCounts['Accepted & Approved']}`);

    // 3. Close browser early to free resources
    await closeBrowser();

    // 4. Get existing data from Google Sheets
    console.log('📋 Fetching existing data from Google Sheets...');
    const existingApplications = await getApplications();
    console.log(`Found ${existingApplications.length} existing applications in sheet`);

    // 5. Compute diff
    console.log('🔍 Computing differences...');
    const diff = computeDiff(scrapeResult.applications, existingApplications);

    // Filter out closed applications and notifications for new apps on first run
    const isFirstRun = existingApplications.length === 0;
    const notifiableChanges = diff.changes.filter(change => {
      // Skip all notifications on first run - just establish baseline
      if (isFirstRun) return false;

      // Skip closed applications
      const status = change.application.status.toLowerCase();
      if (status.includes('closed') || status.includes('n/a')) return false;

      // Skip new_application type on first run (redundant but explicit)
      if (change.type === 'new_application' && isFirstRun) return false;

      return true;
    });

    changesDetected = notifiableChanges.length;
    newApplicationsCount = diff.newApplications.length;

    console.log(`Total changes detected: ${diff.changes.length}`);
    console.log(`  - New applications: ${newApplicationsCount}`);
    console.log(`  - Updates: ${diff.updatedApplications.length}`);
    console.log(`  - Unchanged: ${diff.unchangedCount}`);

    if (isFirstRun) {
      console.log('📋 First run - establishing baseline, skipping notifications');
    }

    console.log(`Notifiable changes (open apps only): ${notifiableChanges.length}`);

    // 6. Send Slack notifications for changes (only open applications, not first run)
    if (notifiableChanges.length > 0) {
      console.log('📣 Sending Slack notifications...');
      await notifyChanges(notifiableChanges);
    }

    // 7. Update Google Sheets with fresh data
    console.log('💾 Updating Google Sheets...');
    const storedApps = toStoredApplications(
      scrapeResult.applications,
      scrapeResult.scrapedAt
    );
    await upsertApplications(storedApps);

    // 8. Log successful run
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    await logRun({
      timestamp: new Date().toISOString(),
      status: 'Success',
      durationSeconds,
      applicationsFound,
      changesDetected,
      newApplications: newApplicationsCount,
      errors: '',
    });

    console.log(`✅ Completed successfully in ${durationSeconds}s`);
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMessage);

    // Try to send error to Slack
    try {
      await notifyError(error instanceof Error ? error : new Error(errorMessage));
    } catch (slackError) {
      console.error('Failed to send error to Slack:', slackError);
    }

    // Try to log failed run
    try {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      await logRun({
        timestamp: new Date().toISOString(),
        status: 'Failed',
        durationSeconds,
        applicationsFound,
        changesDetected,
        newApplications: newApplicationsCount,
        errors: errorMessage,
      });
    } catch (logError) {
      console.error('Failed to log run:', logError);
    }

    // Clean up browser if still running
    try {
      await closeBrowser();
    } catch {
      // Ignore cleanup errors
    }

    // Exit cleanly for Railway (non-zero would cause retries)
    process.exit(0);
  }
}

// Run if executed directly
main();
