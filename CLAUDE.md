# Beautifi Autopilot - Project Context

## What This Project Is

A "Financing Portal Watcher" that monitors the Beautifi financing portal for loan application status changes and sends Slack notifications. Runs as a Railway cron job every 30 minutes.

## Current Status

**Phase:** Working - tested successfully on 2026-01-08

**Design document:** `docs/plans/2026-01-08-beautifi-watcher-design.md`

## Test Results

- Successfully logged in to Beautifi portal
- Scraped 21 applications (18 Submitted, 3 Accepted & Approved, 0 In-Progress)
- First run: Established baseline, no notifications sent
- Subsequent runs: 0 changes = 0 notifications (working correctly)
- Run time: ~28 seconds

## What's Been Built

### Core Scraper Application
All core modules implemented in `src/`:
- `config.ts` - Environment variable loading with dotenv
- `scraper/browser.ts` - Playwright browser setup and management
- `scraper/login.ts` - Multi-step login flow (Email button → Fill email → Continue → Fill password → Sign in)
- `scraper/extractor.ts` - Navigate to tabs and parse application data from DOM text
- `scraper/types.ts` - TypeScript types for scraped applications
- `storage/sheets.ts` - Google Sheets read/write for applications and run logs
- `storage/types.ts` - TypeScript types for stored data
- `diff/engine.ts` - Change detection (new apps, status changes, amount changes)
- `notifications/slack.ts` - Slack webhook integration
- `notifications/formatters.ts` - Message templates for different event types
- `sync/monday.ts` - Placeholder for future Monday.com integration
- `index.ts` - Main orchestrator

### Dashboard (WIP)
- `dashboard/index.html` - Patient financial dashboard (NOT INTENDED - to be replaced with operational status dashboard)

### Configuration Files
- `package.json` - Dependencies: playwright, googleapis, dotenv, tsx, typescript
- `tsconfig.json` - TypeScript config for ES modules
- `Dockerfile` - Railway deployment with Playwright
- `.env.example` - Template for environment variables

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Browser automation:** Playwright (Chromium)
- **Database:** Google Sheets (chosen over Supabase for simplicity)
- **Notifications:** Slack incoming webhooks
- **Hosting:** Railway (cron job, not web server)
- **Future:** Monday.com sync (placeholder only)

## Key Design Decisions

1. **Monitor 4 tabs:** In-Progress, Submitted, Accepted & Approved, Funded (skip Subsidized only)
2. **First run = baseline:** No notifications on first run, just establishes baseline
3. **Only open apps:** Closed applications filtered out from notifications
4. **Changes only:** Only notify when something actually changes (status, amount, etc.)
5. **Google Sheets as database + dashboard** - includes Run Log for visibility
6. **Single Slack channel** for all alerts

## Beautifi Portal Login Flow

The portal uses a multi-step login:
1. Click "Sign-in with Email" button
2. Fill email field
3. Click "Continue" (enables password field)
4. Fill password field
5. Click "Sign in" button
6. Wait for redirect to `/partners/{partnerId}`

## URL Structure

- Login: `https://app.beautifi.com/partners/sign-in`
- Dashboard: `https://app.beautifi.com/partners/{partnerId}`
- In-Progress: `https://app.beautifi.com/partners/{partnerId}/in-progress`
- Submitted: `https://app.beautifi.com/partners/{partnerId}/submitted`
- Accepted & Approved: `https://app.beautifi.com/partners/{partnerId}/accepted-approved`
- Funded: `https://app.beautifi.com/partners/{partnerId}/funded`

Partner ID for Sleeve Clinic: `7571`

## Google Sheets Schema

### Sheet 1: Applications
Columns: application_id, tab, applicant_name, email, status, requested_amount, approved_amount, notes, loss_reason, created_at, last_updated_at, last_scraped_at, raw_json

### Sheet 2: Run Log
Columns: timestamp, status, duration_seconds, applications_found, changes_detected, new_applications, errors

## Configuration

Credentials stored in `.env` (not committed):
- `BEAUTIFI_LOGIN_URL=https://app.beautifi.com/partners/sign-in`
- `BEAUTIFI_EMAIL=gmora@sleeveclinic.ca`
- `BEAUTIFI_PASSWORD=***`
- `GOOGLE_SHEETS_ID=1d9BGPguTvPRvfDJ-s2CjEv0eTROxodaAGIGZCivNGx0`
- `GOOGLE_SERVICE_ACCOUNT_JSON=` (reused from Sleeve Command Centre)
- `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/***`

## Deployment

- **Railway:** Cron job running every 30 minutes at `proactive-wisdom` project
- **GitHub Pages:** Dashboard live at https://sbg1234.github.io/Beautify-Copilot/
- **GitHub Repo:** https://github.com/sbg1234/Beautify-Copilot (public)

## Session Log

### 2026-01-08 (Evening Session)

**What was accomplished:**
- Created operational status dashboard (replaced patient data dashboard)
- Fixed timestamps to use Toronto timezone (America/Toronto)
- Added schedule frequency dropdown (15min to 6 hours)
- Deployed to Railway as cron job (every 30 minutes)
- Set up GitHub Pages for dashboard hosting
- Made repo public to enable free GitHub Pages

**Files changed:**
- `dashboard/index.html` - Operational status dashboard with Toronto time
- `index.html` - Copy of dashboard for GitHub Pages (root)
- `Dockerfile` - Updated to build TypeScript during deployment
- `package.json` - Pinned Playwright to exact version 1.40.0
- `package-lock.json` - Updated to match package.json

**Key decisions:**
- Use GitHub Pages (free) for dashboard instead of Railway web server (costs $3-5/month)
- Made repo public since no secrets in code (credentials in Railway env vars)
- Pinned Playwright to 1.40.0 to match Docker image version

**Problems encountered:**
1. Dockerfile tried to copy non-existent `dist/` folder → Fixed by building during Docker build
2. Playwright version mismatch (npm installed 1.57.0, Docker had 1.40.0) → Pinned to exact 1.40.0
3. package-lock.json out of sync → Ran `npm install` to regenerate
4. Missing environment variables in Railway → User needs to add via Variables tab

**Final status:** ✅ **FULLY OPERATIONAL**
- Railway cron job running successfully every 30 minutes
- Last successful run: 21 applications scraped in 29 seconds
- All environment variables configured

**Known limitations:**
- Dashboard shows hardcoded mock data, not live data from Google Sheets
- To show live data would need to connect dashboard to Google Sheets API

### 2026-01-09

**What was accomplished:**
- Added "Funded" tab to monitoring based on user feedback that Mandy uses all tabs except Subsidized

**Files changed:**
- `src/scraper/types.ts` - Added 'Funded' to TabName type
- `src/scraper/extractor.ts` - Added 'Funded' to TABS_TO_SCRAPE, TAB_URL_PATHS, and tabCounts
- `CLAUDE.md` - Updated documentation

**Note:** Next deployment will automatically pick up these changes and start monitoring the Funded tab.

### Next Steps (Optional Enhancements)
1. Connect dashboard to live Google Sheets data via API
2. Add more detailed application tracking

## Reference Materials

- Portal screenshots: `Assets/Beautifi Data Example Screenshots/`
- Full design doc: `docs/plans/2026-01-08-beautifi-watcher-design.md`
- Google Sheet: https://docs.google.com/spreadsheets/d/1d9BGPguTvPRvfDJ-s2CjEv0eTROxodaAGIGZCivNGx0/edit

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Run the scraper once
npm run build        # Build TypeScript to dist/
npm run start        # Run built version
npm run typecheck    # Check types without building
```
