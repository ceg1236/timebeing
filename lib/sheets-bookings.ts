/**
 * Writes confirmed bookings to that event's own Bookings tab (one tab per
 * event slug, auto-created on first booking — see column layout in
 * sheets-availability.ts) and marks a booking refunded when Stripe reports
 * one. Both are best-effort: if the spreadsheet isn't configured, callers
 * log and move on rather than failing the whole request — a missed sheet
 * write shouldn't mean a charged guest gets no confirmation.
 */

import {
  getSheetsClient,
  extractErrorMessage,
  isMissingSheetError,
  writeRowAtNextDataRow,
  bookingsTabName,
  ensureBookingsTab,
} from './sheets-client'
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

/** Payment ids already recorded for this event, so a retried webhook doesn't double-write. */
export async function getExistingPaymentIds(eventSlug: string): Promise<string[] | null> {
  const { spreadsheetId } = getSheetsConfig()
  if (!spreadsheetId) return null
  const sheets = getSheetsClient(true)
  if (!sheets) return null

  const sheetName = bookingsTabName(eventSlug)
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!J2:J`,
    })
    return (res.data.values ?? []).flat()
  } catch (err) {
    if (isMissingSheetError(err)) return [] // tab doesn't exist yet — no bookings recorded
    console.error('[sheets-bookings] getExistingPaymentIds failed:', extractErrorMessage(err))
    return null
  }
}

export async function appendBooking(booking: BookingRow): Promise<{ ok: boolean; row?: number }> {
  const { spreadsheetId } = getSheetsConfig()
  if (!spreadsheetId) {
    console.error('[sheets-bookings] SPREADSHEET_ID not set — booking not recorded:', booking)
    return { ok: false }
  }
  const sheets = getSheetsClient(false)
  if (!sheets) {
    console.error('[sheets-bookings] No Google credentials configured — booking not recorded:', booking)
    return { ok: false }
  }

  const sheetName = bookingsTabName(booking.eventSlug)
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
    await ensureBookingsTab(sheets, spreadsheetId, sheetName)
    const rowNumber = await writeRowAtNextDataRow(sheets, spreadsheetId, sheetName, row)
    return { ok: true, row: rowNumber }
  } catch (err) {
    console.error('[sheets-bookings] appendBooking failed:', extractErrorMessage(err))
    return { ok: false }
  }
}

/** Finds the booking row by Stripe payment id in that event's tab and stamps the Refunded column (K). */
export async function markBookingRefunded(
  paymentId: string,
  eventSlug: string
): Promise<{ ok: boolean }> {
  const { spreadsheetId } = getSheetsConfig()
  if (!spreadsheetId) return { ok: false }
  const sheets = getSheetsClient(false)
  if (!sheets) return { ok: false }

  const sheetName = bookingsTabName(eventSlug)
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:L`,
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
      range: `${sheetName}!K${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[new Date().toISOString().split('T')[0]]] },
    })
    return { ok: true }
  } catch (err) {
    if (isMissingSheetError(err)) {
      console.log('[sheets-bookings] markBookingRefunded: no tab for event', eventSlug)
      return { ok: false }
    }
    console.error('[sheets-bookings] markBookingRefunded failed:', extractErrorMessage(err))
    return { ok: false }
  }
}
