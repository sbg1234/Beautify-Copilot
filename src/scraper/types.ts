/**
 * Types for scraped application data from Beautifi portal
 */

export type TabName = 'In-Progress' | 'Submitted' | 'Accepted & Approved' | 'Funded';

export interface ScrapedApplication {
  applicationId: string;
  tab: TabName;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  requestedAmount: number | null;
  approvedAmount: number | null;
  maximumAmountApproved: number | null;
  fundingAmount: number | null;
  scheduledFundingDate: string | null;
  fee: number | null;
  rate: number | null;
  notes: string;
  lossReason: string | null;
  createdAt: string;
  lastUpdatedAt: string;
  source: string;
  doctor: string;
  procedureDate: string | null;
  rawJson: string;
}

export interface ScrapeResult {
  applications: ScrapedApplication[];
  tabCounts: Record<TabName, number>;
  scrapedAt: Date;
}
