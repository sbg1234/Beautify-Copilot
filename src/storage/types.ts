/**
 * Types for Google Sheets storage
 */

export interface StoredApplication {
  applicationId: string;
  tab: string;
  applicantName: string;
  email: string;
  status: string;
  requestedAmount: number | null;
  approvedAmount: number | null;
  notes: string;
  lossReason: string | null;
  createdAt: string;
  lastUpdatedAt: string;
  lastScrapedAt: string;
  rawJson: string;
}

export interface RunLogEntry {
  timestamp: string;
  status: 'Success' | 'Failed';
  durationSeconds: number;
  applicationsFound: number;
  changesDetected: number;
  newApplications: number;
  errors: string;
}

export const APPLICATIONS_SHEET = 'Applications';
export const RUN_LOG_SHEET = 'Run Log';

export const APPLICATION_HEADERS = [
  'application_id',
  'tab',
  'applicant_name',
  'email',
  'status',
  'requested_amount',
  'approved_amount',
  'notes',
  'loss_reason',
  'created_at',
  'last_updated_at',
  'last_scraped_at',
  'raw_json',
] as const;

export const RUN_LOG_HEADERS = [
  'timestamp',
  'status',
  'duration_seconds',
  'applications_found',
  'changes_detected',
  'new_applications',
  'errors',
] as const;
