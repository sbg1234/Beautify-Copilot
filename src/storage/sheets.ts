/**
 * Google Sheets storage - reads and writes application data
 */

import { google, sheets_v4 } from 'googleapis';
import { config } from '../config.js';
import {
  StoredApplication,
  RunLogEntry,
  APPLICATIONS_SHEET,
  RUN_LOG_SHEET,
  APPLICATION_HEADERS,
  RUN_LOG_HEADERS,
} from './types.js';

let sheetsClient: sheets_v4.Sheets | null = null;

async function getClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  const credentials = JSON.parse(config.googleSheets.serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function ensureSheetsExist(): Promise<void> {
  const client = await getClient();
  const spreadsheetId = config.googleSheets.spreadsheetId;

  // Get existing sheets
  const spreadsheet = await client.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  const sheetsToCreate: sheets_v4.Schema$Request[] = [];

  if (!existingSheets.includes(APPLICATIONS_SHEET)) {
    sheetsToCreate.push({
      addSheet: { properties: { title: APPLICATIONS_SHEET } },
    });
  }

  if (!existingSheets.includes(RUN_LOG_SHEET)) {
    sheetsToCreate.push({
      addSheet: { properties: { title: RUN_LOG_SHEET } },
    });
  }

  if (sheetsToCreate.length > 0) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: sheetsToCreate },
    });
  }

  // Ensure headers exist
  await ensureHeaders(client, spreadsheetId, APPLICATIONS_SHEET, APPLICATION_HEADERS);
  await ensureHeaders(client, spreadsheetId, RUN_LOG_SHEET, RUN_LOG_HEADERS);
}

async function ensureHeaders(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headers: readonly string[]
): Promise<void> {
  const range = `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`;
  const response = await client.spreadsheets.values.get({ spreadsheetId, range });

  if (!response.data.values || response.data.values.length === 0) {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [headers as unknown as string[]] },
    });
  }
}

export async function getApplications(): Promise<StoredApplication[]> {
  await ensureSheetsExist();
  const client = await getClient();
  const spreadsheetId = config.googleSheets.spreadsheetId;

  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATIONS_SHEET}!A2:N`,
  });

  const rows = response.data.values || [];
  return rows.map(row => ({
    applicationId: row[0] || '',
    tab: row[1] || '',
    firstName: row[2] || '',
    lastName: row[3] || '',
    email: row[4] || '',
    status: row[5] || '',
    requestedAmount: row[6] ? parseFloat(row[6]) : null,
    approvedAmount: row[7] ? parseFloat(row[7]) : null,
    notes: row[8] || '',
    lossReason: row[9] || null,
    createdAt: row[10] || '',
    lastUpdatedAt: row[11] || '',
    lastScrapedAt: row[12] || '',
    rawJson: row[13] || '',
  }));
}

export async function upsertApplications(
  applications: StoredApplication[]
): Promise<void> {
  await ensureSheetsExist();
  const client = await getClient();
  const spreadsheetId = config.googleSheets.spreadsheetId;

  // Get existing applications to find row numbers
  const existing = await getApplications();
  const existingMap = new Map(existing.map((app, idx) => [app.applicationId, idx + 2])); // +2 for header row and 1-indexed

  const updates: { range: string; values: (string | number | null)[][] }[] = [];
  const appends: (string | number | null)[][] = [];

  for (const app of applications) {
    const row = applicationToRow(app);
    const existingRow = existingMap.get(app.applicationId);

    if (existingRow) {
      updates.push({
        range: `${APPLICATIONS_SHEET}!A${existingRow}:N${existingRow}`,
        values: [row],
      });
    } else {
      appends.push(row);
    }
  }

  // Batch update existing rows
  if (updates.length > 0) {
    await client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates,
      },
    });
  }

  // Append new rows
  if (appends.length > 0) {
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: `${APPLICATIONS_SHEET}!A:N`,
      valueInputOption: 'RAW',
      requestBody: { values: appends },
    });
  }
}

function applicationToRow(app: StoredApplication): (string | number | null)[] {
  return [
    app.applicationId,
    app.tab,
    app.firstName,
    app.lastName,
    app.email,
    app.status,
    app.requestedAmount,
    app.approvedAmount,
    app.notes,
    app.lossReason,
    app.createdAt,
    app.lastUpdatedAt,
    app.lastScrapedAt,
    app.rawJson,
  ];
}

export async function logRun(entry: RunLogEntry): Promise<void> {
  await ensureSheetsExist();
  const client = await getClient();
  const spreadsheetId = config.googleSheets.spreadsheetId;

  const row = [
    entry.timestamp,
    entry.status,
    entry.durationSeconds,
    entry.applicationsFound,
    entry.changesDetected,
    entry.newApplications,
    entry.errors,
  ];

  await client.spreadsheets.values.append({
    spreadsheetId,
    range: `${RUN_LOG_SHEET}!A:G`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}
