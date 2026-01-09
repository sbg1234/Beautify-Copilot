/**
 * Playwright browser setup and management
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from '../config.js';

let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function launchBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  if (config.debug) {
    page.on('console', msg => console.log('[Browser Console]', msg.text()));
    page.on('pageerror', err => console.error('[Page Error]', err));
  }

  return { browser, context, page };
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export function log(message: string): void {
  if (config.debug) {
    console.log(`[Scraper] ${new Date().toISOString()} - ${message}`);
  }
}
