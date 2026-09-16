/**
 * Writes confirmed bookings to the "Bookings" tab (see column layout in
 * sheets-availability.ts) and marks a booking refunded when Stripe reports
 * one. Both are best-effort: if the spreadsheet isn't configured, callers
 * log and move on rather than failing the whole request — a missed sheet
 * write shouldn't mean a charged guest gets no confirmation.
 */

import { getSheetsClient, extractErrorMessage, writeRowAtNextDataRow } from './sheets-client'
import { getSheetsConfig } from './payment-env'

export type BookingRow = {
  name: string
  email: string
  eventSlug: string
  dateId: string
  dateLabel: string
  tierLabel: string
  quantity: number
  amountPaidLabel: string
  paymentId: string
  notes?: string
}

/** Payment ids already recorded, so a retried webhook doesn't double-write. */
export async function getExistingPaymentIds(): Promise<string[] | null> {
  const { spreadsheetId, bookingsSheetName } = getSheetsConfig()
  if (!spreadsheetId) return null
  const sheets = getSheetsClient(true)
  if (!sheets) return null

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${bookingsSheetName}!J2:J`,
    })
    return (res.data.values ?? []).flat()
  } catch (err) {
    console.error('[sheets-bookings] getExistingPaymentIds failed:', extractErrorMessage(err))
    return null
  }
}

export async function appendBooking(booking: BookingRow): Promise<{ ok: boolean; row?: number }> {
  const { spreadsheetId, bookingsSheetName } = getSheetsConfig()
  if (!spreadsheetId) {
    console.error('[sheets-bookings] SPREADSHEET_ID not set — booking not recorded:', booking)
    return { ok: false }
  }
  const sheets = getSheetsClient(false)
  if (!sheets) {
    console.error('[sheets-bookings] No Google credentials configured — booking not recorded:', booking)
    return { ok: false }
  }

  const row = [
    new Date().toISOString(),
    booking.name,
    booking.email,
    booking.eventSlug,
    booking.dateId,
    booking.dateLabel,
    booking.tierLabel,
    booking.quantity,
    booking.amountPaidLabel,
    booking.paymentId,
    '', // Refunded — blank for a new booking
    booking.notes ?? '',
  ]

  try {
    const rowNumber = await writeRowAtNextDataRow(sheets, spreadsheetId, bookingsSheetName, row)
    return { ok: true, row: rowNumber }
  } catch (err) {
    console.error('[sheets-bookings] appendBooking failed:', extractErrorMessage(err))
    return { ok: false }
  }
}

/** Finds the booking row by Stripe payment id and stamps the Refunded column (K). */
export async function markBookingRefunded(paymentId: string): Promise<{ ok: boolean }> {
  const { spreadsheetId, bookingsSheetName } = getSheetsConfig()
  if (!spreadsheetId) return { ok: false }
  const sheets = getSheetsClient(false)
  if (!sheets) return { ok: false }

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${bookingsSheetName}!A2:L`,
    })
    const rows = (res.data.values ?? []) as string[][]
    const rowIndex = rows.findIndex((r) => (r[9] ?? '').trim() === paymentId.trim())
    if (rowIndex < 0) {
      console.log('[sheets-bookings] markBookingRefunded: payment id not found', paymentId)
      return { ok: false }
    }
    const sheetRow = rowIndex + 2
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${bookingsSheetName}!K${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[new Date().toISOString().split('T')[0]]] },
    })
    return { ok: true }
  } catch (err) {
    console.error('[sheets-bookings] markBookingRefunded failed:', extractErrorMessage(err))
    return { ok: false }
  }
}
