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
