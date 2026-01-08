# Beautifi Autopilot - Project Context

## What This Project Is

A "Financing Portal Watcher" that monitors the Beautifi financing portal for loan application status changes and sends Slack notifications. Runs as a Railway cron job every 30 minutes.

## Current Status

**Phase:** Design complete, ready for implementation

**Design document:** `docs/plans/2026-01-08-beautifi-watcher-design.md`

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Browser automation:** Playwright (Chromium)
- **Database:** Google Sheets (chosen over Supabase for simplicity)
- **Notifications:** Slack incoming webhooks
- **Hosting:** Railway (cron job, not web server)
- **Future:** Monday.com sync (placeholder only)

## Key Design Decisions

1. **Monitor 3 tabs only:** In-Progress, Submitted, Accepted & Approved (skip Funded/Subsidized)
2. **All status changes trigger notifications** (not just high-priority)
3. **Google Sheets as database + dashboard** - includes Run Log for visibility
4. **Hybrid scraping:** Try JSON API interception first, DOM fallback if needed
5. **Single Slack channel** for all alerts
6. **No procedure field** - everyone gets gastric sleeve

## Before Starting Implementation

User needs to:
- [ ] Check portal for unique application ID format
- [ ] Provide Beautifi login URL
- [ ] Set up Google Cloud service account
- [ ] Create Slack webhook
- [ ] Create Railway account

## Reference Materials

- Portal screenshots: `Assets/Beautifi Data Example Screenshots/`
- Full design doc: `docs/plans/2026-01-08-beautifi-watcher-design.md`

## To Resume This Project

Read the design document at `docs/plans/2026-01-08-beautifi-watcher-design.md` which contains:
- Complete architecture diagram
- Google Sheets schema
- Project structure
- Step-by-step implementation plan
- Environment variables needed
- Slack message formats
- Verification plan
