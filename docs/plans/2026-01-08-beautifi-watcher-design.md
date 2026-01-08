# Beautifi Financing Portal Watcher - Design Document

**Created:** 2026-01-08
**Status:** Ready for implementation
**Next session:** Begin coding

---

## Project Summary

Build a scheduled automation that monitors the Beautifi financing portal for loan application status changes and sends Slack notifications. Designed to run as a Railway cron job every 30 minutes.

---

## Decisions Made During Brainstorming

### Scope
| Question | Decision |
|----------|----------|
| Which tabs to monitor? | **Active pipeline only**: In-Progress, Submitted, Accepted & Approved (skip Funded, Subsidized) |
| What triggers notifications? | **All status changes** - status, amount, notes, loss_reason, tab movement |
| Login method? | **Standard email/password** - no SSO, no MFA |
| Data loading? | **Unknown** - implement hybrid: try JSON API interception first, DOM fallback |
| Scale? | **Under 20 active** applications at any time, few hundred per year total |

### Architecture
| Question | Decision |
|----------|----------|
| Database? | **Google Sheets** (not Supabase) - simpler, visual dashboard, can migrate later |
| Slack setup? | **Single channel** for all alerts |
| Dashboard? | **Google Sheets Run Log** - no custom web UI needed |
| Scheduling? | **Railway Cron** - configurable in Railway dashboard |
| Error handling? | **Slack alert + graceful exit** |

### Data Model
| Question | Decision |
|----------|----------|
| Procedure field? | **Removed** - everyone gets gastric sleeve by default |
| Application ID? | **TBD** - user needs to check portal for unique identifier |

---

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────┐     ┌───────────────┐
│  Railway Cron   │────▶│   Scraper    │────▶│ Google Sheets │
│  (30 min)       │     │  (Playwright)│     │  (Database)   │
└─────────────────┘     └──────┬───────┘     └───────┬───────┘
                               │                     │
                               ▼                     │
                        ┌──────────────┐            │
                        │ Diff Engine  │◀───────────┘
                        └──────┬───────┘
                               │ (changes only)
                               ▼
                        ┌──────────────┐     ┌─────────────┐
                        │   Notifier   │────▶│    Slack    │
                        └──────────────┘     └─────────────┘
                               │
                               ▼ (future placeholder)
                        ┌──────────────┐
                        │  Monday.com  │
                        └──────────────┘
```

**Execution flow:**
1. Railway triggers script every 30 minutes
2. Scraper logs into Beautifi, collects applications from 3 tabs
3. Diff engine compares against last-known state in Google Sheets
4. Only **changed** applications trigger Slack notifications
5. Sheets updated with fresh snapshot + run logged
6. Process exits cleanly (`process.exit(0)`)

---

## Google Sheets Schema

### Sheet 1: Applications

| Column | Type | Description |
|--------|------|-------------|
| application_id | string | Unique ID (format TBD after user checks portal) |
| tab | string | In-Progress, Submitted, or Accepted & Approved |
| applicant_name | string | Full name |
| email | string | Applicant email |
| status | string | Badge text (e.g., "Approved for Loan", "Ready for Funding") |
| requested_amount | number | Amount requested |
| approved_amount | number | Nullable - amount approved |
| notes | string | Full notes text from portal |
| loss_reason | string | Extracted if application closed |
| created_at | datetime | From portal |
| last_updated_at | datetime | From portal |
| last_scraped_at | datetime | When our script last saw it |
| raw_json | string | Full data dump for debugging |

### Sheet 2: Run Log (Dashboard)

| Column | Type | Description |
|--------|------|-------------|
| timestamp | datetime | When scrape started |
| status | string | Success / Failed |
| duration_seconds | number | How long scrape took |
| applications_found | number | Total across 3 tabs |
| changes_detected | number | How many triggered notifications |
| new_applications | number | First-time appearances |
| errors | string | Error message if failed |

---

## Project Structure

```
beautifi-watcher/
├── src/
│   ├── index.ts              # Entry point - orchestrates the flow
│   ├── config.ts             # Environment variables & validation
│   ├── scraper/
│   │   ├── browser.ts        # Playwright setup, cookie management
│   │   ├── login.ts          # Authentication flow
│   │   ├── extractor.ts      # JSON interception + DOM fallback
│   │   └── types.ts          # Application data types
│   ├── storage/
│   │   ├── sheets.ts         # Google Sheets read/write
│   │   └── types.ts          # Sheet row types
│   ├── diff/
│   │   └── engine.ts         # Compare old vs new, detect changes
│   ├── notifications/
│   │   ├── slack.ts          # Slack webhook formatting & sending
│   │   └── formatters.ts     # Message templates
│   └── sync/
│       └── monday.ts         # Placeholder for future Monday.com sync
├── Dockerfile                # Railway deployment
├── .env.example              # Required environment variables
├── package.json
├── tsconfig.json
└── README.md                 # Setup & deployment instructions
```

---

## Implementation Steps

### Step 1: Project Setup
- Initialize Node.js project with TypeScript
- Install dependencies: `playwright`, `googleapis`, `typescript`, `tsx`
- Configure `tsconfig.json` for ES modules
- Create `.env.example` with all required variables

### Step 2: Configuration Module (`src/config.ts`)
- Load and validate environment variables
- Export typed config object
- Fail fast if required vars missing

### Step 3: Google Sheets Integration (`src/storage/sheets.ts`)
- Authenticate with service account
- Functions: `getApplications()`, `upsertApplications()`, `logRun()`
- Create sheets if they don't exist on first run

### Step 4: Playwright Scraper (`src/scraper/`)
- `browser.ts`: Launch Chromium, manage cookies for session reuse
- `login.ts`: Navigate to login, fill credentials, wait for dashboard
- `extractor.ts`:
  - Set up network interception for JSON responses
  - Navigate to each tab (In-Progress, Submitted, Accepted & Approved)
  - If JSON captured → parse directly
  - If not → fall back to DOM scraping
  - Handle pagination if needed

### Step 5: Diff Engine (`src/diff/engine.ts`)
- Compare new scrape against existing sheet data
- Watched fields: `status`, `approved_amount`, `notes`, `loss_reason`, `tab`
- Return list of changes with old/new values
- Identify new applications (not in sheet)

### Step 6: Slack Notifications (`src/notifications/`)
- `formatters.ts`: Message templates for each event type
- `slack.ts`: Send via webhook, handle errors gracefully
- Event types: new_application, status_change, amount_change, closed, error

### Step 7: Main Orchestrator (`src/index.ts`)
```typescript
async function main() {
  const startTime = Date.now();
  try {
    // 1. Launch browser & login
    // 2. Scrape all 3 tabs
    // 3. Fetch existing data from sheet
    // 4. Run diff engine
    // 5. Send Slack notifications for changes
    // 6. Update sheet with new data
    // 7. Log successful run
    process.exit(0);
  } catch (error) {
    // Send error to Slack
    // Log failed run
    process.exit(0); // Still exit cleanly for Railway
  }
}
```

### Step 8: Monday.com Placeholder (`src/sync/monday.ts`)
- Export empty `syncToMonday(application)` function
- Add TODO comments for future implementation

### Step 9: Dockerfile
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

### Step 10: Documentation
- README with setup instructions
- How to create Google service account
- How to set up Slack webhook
- Railway deployment guide

---

## Environment Variables

```bash
# Beautifi Portal
BEAUTIFI_LOGIN_URL=          # User to provide
BEAUTIFI_EMAIL=
BEAUTIFI_PASSWORD=

# Google Sheets
GOOGLE_SHEETS_ID=            # Spreadsheet ID from URL
GOOGLE_SERVICE_ACCOUNT_JSON= # Full JSON as string

# Slack
SLACK_WEBHOOK_URL=

# Optional
DEBUG=false                  # Enable verbose logging
```

---

## Slack Message Formats

### New Application
```
🆕 *New Application*
*Leanne Sagun* (leannesagun@yahoo.com)
Requested: $20,000
Status: Approved for Loan
<portal-link|View in Beautifi>
```

### Status Change
```
🔄 *Status Update*
*Leanne Sagun* moved from `Approved for Loan` → `Ready for Funding`
<portal-link|View in Beautifi>
```

### Amount Change
```
💰 *Amount Updated*
*Leanne Sagun* approved amount changed: $5,000 → $10,000
<portal-link|View in Beautifi>
```

### Application Closed
```
❌ *Application Closed*
*Shayna Glazer* (shayna.glazer@email.com)
Reason: Unqualified, No Co-Signer Available
<portal-link|View in Beautifi>
```

### Scraper Error
```
🚨 *Beautifi Watcher Error*
Login failed: timeout waiting for dashboard
Check credentials or portal availability
```

---

## Known Statuses from Portal Screenshots

From "Submitted" tab:
- `Approved for Loan` - Beautifi is presenting the applicant with their loan offer
- `Closed` - Application closed with loss reason
- `Reaching Out to Patient` - Beautifi is reaching out regarding application
- `Gathering Additional Information` - Additional info required

From "Accepted & Approved" tab:
- `Ready for Funding` - Ready to fund
- `N/A - Contact Beautifi` - Application closed, contact Beautifi

---

## Reference Data from Portal Screenshots

The portal shows these columns/fields:
- Applicant name + email
- Source (Website)
- Doctor (Scott Gmora in examples)
- Procedure + Procedure Date
- Requested Amount, Approved Amount, Maximum Amount Approved
- Funding Amount, Scheduled Funding Date
- Fee, Rate (discount percentage)
- Created date, Last Updated date
- Notes (status explanation, loss reasons)

Pagination: 25 results per page

---

## Verification Plan

1. **Local testing:**
   - Run `npm run dev` with real credentials
   - Verify login succeeds
   - Verify all 3 tabs scraped correctly
   - Verify Google Sheet populated
   - Verify Slack message received

2. **Diff testing:**
   - Manually change a status in the sheet
   - Run scraper again
   - Verify change detected and Slack notified

3. **Error testing:**
   - Use wrong password
   - Verify error sent to Slack
   - Verify Run Log shows failure

4. **Railway deployment:**
   - Deploy to Railway as cron job
   - Set schedule to every 30 minutes
   - Monitor first few runs in Run Log sheet

---

## Open Items (User Action Required Before Implementation)

- [ ] **Verify application ID format** - Check portal for how applications are uniquely identified (URL contains ID? Or use email + created_at composite?)
- [ ] **Provide Beautifi login URL** - The exact URL to navigate to for login
- [ ] **Create Google Cloud service account** - For Sheets API access
- [ ] **Create Google Sheet** - And share with service account email
- [ ] **Create Slack incoming webhook** - For notifications
- [ ] **Create Railway account** - For deployment

---

## Files to Reference

Portal screenshots saved at:
- `/Users/sbg/Documents/Vibe Coded Apps/Beautify Autopilot/Assets/Beautifi Data Example Screenshots/`
- Contains examples of Submitted, Accepted & Approved, Funded, and Subsidized tabs
