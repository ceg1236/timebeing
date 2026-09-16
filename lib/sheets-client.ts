import { google, sheets_v4 } from 'googleapis'
import { getSheetsConfig } from './payment-env'

/**
 * One shared way to build an authenticated Sheets client. Reads either
 * GOOGLE_CREDENTIALS_JSON (paste the whole service-account JSON — used on
 * Vercel) or GOOGLE_APPLICATION_CREDENTIALS (a path to the JSON file — used
 * for local dev). Returns null if neither is configured, so callers can fall
 * back gracefully instead of crashing.
 */
export function getSheetsClient(readonly = false): sheets_v4.Sheets | null {
  const { credentialsJson, credentialsPath } = getSheetsConfig()
  const scopes = [
    readonly
      ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
      : 'https://www.googleapis.com/auth/spreadsheets',
  ]

  if (credentialsJson) {
    return google.sheets({
      version: 'v4',
      auth: new google.auth.GoogleAuth({
        credentials: JSON.parse(credentialsJson) as object,
        scopes,
      }),
    })
  }

  if (credentialsPath) {
    return google.sheets({
      version: 'v4',
      auth: new google.auth.GoogleAuth({ keyFile: credentialsPath, scopes }),
    })
  }

  return null
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const withResponse = err as Error & {
      response?: { data?: { error?: { message?: string } } }
    }
    return withResponse.response?.data?.error?.message ?? err.message
  }
  return String(err)
}

/** True if `err` is the Sheets API's "that tab doesn't exist" error, e.g. from a bad range. */
export function isMissingSheetError(err: unknown): boolean {
  return extractErrorMessage(err).includes('Unable to parse range')
}

/**
 * Header row for a per-event Bookings tab. Column order must match the row
 * built in sheets-bookings.ts's appendBooking.
 */
export const BOOKINGS_HEADER_ROW = [
  'Timestamp',
  'Name',
  'Email',
  'EventSlug',
  'DateId',
  'DateLabel',
  'TierLabel',
  'Quantity',
  'AmountPaid',
  'PaymentId',
  'Refunded',
  'Notes',
]

/** Each event gets its own Bookings tab, named after its slug (event slugs are already tab-safe). */
export function bookingsTabName(eventSlug: string): string {
  return eventSlug
}

/** Creates the event's Bookings tab with its header row, if it doesn't already exist. */
export async function ensureBookingsTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  })
  const exists = (meta.data.sheets ?? []).some((s) => s.properties?.title === sheetName)
  if (exists) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:L1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [BOOKINGS_HEADER_ROW] },
  })
}

/**
 * Appends a row to the first empty data row (i.e. after any existing rows),
 * rather than relying on the Sheets API's own append, which can behave
 * unexpectedly around merged cells or manual formatting. Returns the
 * 1-indexed row number that was written.
 */
export async function writeRowAtNextDataRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  row: (string | number)[]
): Promise<number> {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:A`,
  })
  const dataRowCount = (existing.data.values ?? []).length
  const targetRow = dataRowCount + 2 // +1 for header, +1 to move past last filled row

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${targetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  })

  return targetRow
}
