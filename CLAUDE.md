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

1. **Monitor 3 tabs only:** In-Progress, Submitted, Accepted & Approved (skip Funded/Subsidized)
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

## Next Steps

1. **Replace dashboard** with operational status dashboard (not patient data)
2. **Deploy to Railway** as a cron job (every 30 minutes)
3. **Monitor** the Run Log sheet to ensure it's working

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
