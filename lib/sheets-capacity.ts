/**
 * Capacity per date lives in a "Config" tab on the same spreadsheet as
 * bookings: column A = DateId, column B = Capacity. Edit it directly in the
 * sheet — there's no admin screen for this on purpose, so it's always
 * editable by whoever has the sheet open.
 *
 * Row 1 = header, data starts at row 2. DateId is matched case-insensitively
 * against each event date's `id` (see content/event-schema.ts).
 */

import { getSheetsClient, extractErrorMessage } from './sheets-client'
import { getSheetsConfig } from './payment-env'
import type { EventDate } from '../content/event-schema'

export type CapacityByDateId = Record<string, number>

/** Capacity from each date's own `fallbackCapacity`, used if the sheet has no row (or isn't configured). */
export function getFallbackCapacity(dates: readonly EventDate[]): CapacityByDateId {
  return Object.fromEntries(dates.map((d) => [d.id, d.fallbackCapacity]))
}

/** Reads the Config tab. Returns null if it's not set up yet or has no valid rows. */
export async function getCapacityFromSheet(): Promise<CapacityByDateId | null> {
  const { spreadsheetId, configSheetName } = getSheetsConfig()
  if (!spreadsheetId) return null

  const sheets = getSheetsClient(true)
  if (!sheets) return null

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${configSheetName}!A2:B`,
    })
    const rows = (res.data.values ?? []) as string[][]
    const byDateId: CapacityByDateId = {}
    for (const row of rows) {
      const dateId = (row[0] ?? '').trim().toLowerCase()
      const cap = parseInt(String(row[1] ?? ''), 10)
      if (!dateId || Number.isNaN(cap) || cap < 0) continue
      byDateId[dateId] = cap
    }
    return Object.keys(byDateId).length > 0 ? byDateId : null
  } catch (err) {
    console.error('[sheets-capacity] getCapacityFromSheet failed:', extractErrorMessage(err))
    return null
  }
}

/** Merges sheet capacity over the per-event fallback, so a missing sheet row still works. */
export function resolveCapacity(
  dates: readonly EventDate[],
  fromSheet: CapacityByDateId | null
): CapacityByDateId {
  const fallback = getFallbackCapacity(dates)
  if (!fromSheet) return fallback
  return { ...fallback, ...fromSheet }
}
