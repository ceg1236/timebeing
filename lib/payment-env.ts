/** Central place that reads env vars, so the rest of the code never touches process.env directly. */

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET
}

export type SheetsConfig = {
  spreadsheetId?: string
  credentialsJson?: string
  credentialsPath?: string
  bookingsSheetName: string
  configSheetName: string
}

export function getSheetsConfig(): SheetsConfig {
  return {
    spreadsheetId: process.env.SPREADSHEET_ID,
    credentialsJson: process.env.GOOGLE_CREDENTIALS_JSON,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    bookingsSheetName: process.env.BOOKINGS_SHEET_NAME || 'Bookings',
    configSheetName: process.env.CONFIG_SHEET_NAME || 'Config',
  }
}

export function getResendConfig(): { apiKey?: string; from?: string } {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM,
  }
}
