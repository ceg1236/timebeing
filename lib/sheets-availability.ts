/**
 * Combines capacity (Config tab) with sold counts (Bookings tab) to answer
 * "how many seats are left for this date." Refunded bookings don't count
 * against capacity.
 *
 * Bookings tab columns (see lib/sheets-append.ts for the writer):
 * A Timestamp | B Name | C Email | D EventSlug | E DateId | F DateLabel |
 * G TierLabel | H Quantity | I AmountPaid | J PaymentId | K Refunded | L Notes
 */

import { getSheetsClient, extractErrorMessage } from './sheets-client'
import { getSheetsConfig } from './payment-env'
import { getCapacityFromSheet, resolveCapacity } from './sheets-capacity'
import type { EventDate } from '../content/event-schema'

export type DateAvailability = {
  dateId: string
  capacity: number
  sold: number
  remaining: number
  soldOut: boolean
}

const DATE_ID_COL = 4 // E
const QUANTITY_COL = 7 // H
const REFUNDED_COL = 10 // K

/**
 * Returns per-date sold/remaining/soldOut for the given event dates.
 * Returns null if the spreadsheet isn't configured — callers should treat
 * that as "no live data available yet" rather than "sold out."
 */
export async function getAvailabilityForDates(
  dates: readonly EventDate[]
): Promise<DateAvailability[] | null> {
  const { spreadsheetId, bookingsSheetName } = getSheetsConfig()
  if (!spreadsheetId) return null

  const capacityFromSheet = await getCapacityFromSheet()
  const capacityByDateId = resolveCapacity(dates, capacityFromSheet)

  const sheets = getSheetsClient(true)
  if (!sheets) {
    // No credentials configured — fall back to "nothing sold yet" so the
    // site still works locally without Google credentials set up.
    return dates.map((d) => {
      const capacity = capacityByDateId[d.id] ?? d.fallbackCapacity
      return { dateId: d.id, capacity, sold: 0, remaining: capacity, soldOut: capacity <= 0 }
    })
  }

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${bookingsSheetName}!A2:L`,
    })
    const rows = (res.data.values ?? []) as string[][]

    const soldByDateId: Record<string, number> = {}
    for (const row of rows) {
      const dateId = (row[DATE_ID_COL] ?? '').trim().toLowerCase()
      const refunded = (row[REFUNDED_COL] ?? '').trim()
      if (!dateId || refunded) continue
      const qty = parseInt(String(row[QUANTITY_COL] ?? '1'), 10)
      soldByDateId[dateId] = (soldByDateId[dateId] ?? 0) + (Number.isNaN(qty) ? 1 : qty)
    }

    return dates.map((d) => {
      const capacity = capacityByDateId[d.id] ?? d.fallbackCapacity
      const sold = soldByDateId[d.id] ?? 0
      const remaining = Math.max(0, capacity - sold)
      return { dateId: d.id, capacity, sold, remaining, soldOut: remaining <= 0 }
    })
  } catch (err) {
    console.error('[sheets-availability] getAvailabilityForDates failed:', extractErrorMessage(err))
    return null
  }
}
