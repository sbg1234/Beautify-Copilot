/**
 * Authentication flow for Beautifi portal
 *
 * Flow:
 * 1. Click "Sign-in with Email" button
 * 2. Fill email, click "Continue"
 * 3. Fill password, click "Continue"
 * 4. Wait for dashboard
 */

import { Page } from 'playwright';
import { config } from '../config.js';
import { log } from './browser.js';

export async function login(page: Page): Promise<void> {
  log('Navigating to login page...');
  await page.goto(config.beautifi.loginUrl, { waitUntil: 'networkidle' });

  // Step 1: Click "Sign-in with Email" button to reveal the form
  log('Looking for Sign-in with Email button...');
  const emailSignInButton = page.locator('button:has-text("Sign-in with Email")');

  if (await emailSignInButton.isVisible({ timeout: 5000 })) {
    log('Clicking Sign-in with Email button...');
    await emailSignInButton.click();
    await page.waitForTimeout(1000);
  }

  // Step 2: Fill email
  log('Waiting for email input...');
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });

  log('Filling email...');
  await emailInput.fill(config.beautifi.email);

  // Step 3: Click Continue to enable password field
  log('Clicking Continue...');
  const continueButton = page.locator('button:has-text("Continue")');
  await continueButton.click();
  await page.waitForTimeout(1500);

  // Step 4: Fill password (now enabled)
  log('Waiting for password input to be enabled...');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

  // Wait for it to be enabled
  await page.waitForFunction(
    () => {
      const pw = document.querySelector('input[type="password"]') as HTMLInputElement;
      return pw && !pw.disabled;
    },
    { timeout: 10000 }
  );

  log('Filling password...');
  await passwordInput.fill(config.beautifi.password);

  // Step 5: Click Sign in button to submit (button changes from "Continue" to "Sign in")
  log('Submitting login...');
  const signInButton = page.locator('button:has-text("Sign in")');
  await signInButton.click();

  // Wait for navigation to dashboard
  log('Waiting for dashboard to load...');

  // Wait for URL to change away from sign-in page
  await page.waitForURL((url) => !url.toString().includes('sign-in'), {
    timeout: 30000,
  });

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const url = page.url();
  log(`Current URL after login: ${url}`);

  if (url.includes('sign-in') || url.includes('login')) {
    throw new Error('Login failed - still on login page. Check credentials.');
  }

  log('Successfully logged in!');
}
