/**
 * Configuration module - loads and validates environment variables
 */

import 'dotenv/config';

interface Config {
  beautifi: {
    loginUrl: string;
    email: string;
    password: string;
  };
  googleSheets: {
    spreadsheetId: string;
    serviceAccountJson: string;
  };
  slack: {
    webhookUrl: string;
  };
  debug: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig(): Config {
  return {
    beautifi: {
      loginUrl: requireEnv('BEAUTIFI_LOGIN_URL'),
      email: requireEnv('BEAUTIFI_EMAIL'),
      password: requireEnv('BEAUTIFI_PASSWORD'),
    },
    googleSheets: {
      spreadsheetId: requireEnv('GOOGLE_SHEETS_ID'),
      serviceAccountJson: requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON'),
    },
    slack: {
      webhookUrl: requireEnv('SLACK_WEBHOOK_URL'),
    },
    debug: process.env.DEBUG === 'true',
  };
}

export const config = loadConfig();
export type { Config };
