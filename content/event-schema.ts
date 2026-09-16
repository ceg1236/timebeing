/**
 * The shape every event config file must satisfy. Keeping this in one place
 * means adding a new event is "add a config file that matches this shape,"
 * not "build a new page."
 */

export type EventTier = {
  /** Stable id, used in Stripe metadata and the Sheet — don't change once an event has sales. */
  id: string
  /** Shown to guests, e.g. "Community" */
  label: string
  /** One-line context, e.g. "Our standard price" */
  blurb?: string
  /** Price in whole dollars. */
  price: number
}

export type EventDate = {
  /** Stable id used for capacity lookups and the Sheet — don't change once an event has sales. */
  id: string
  /** Shown to guests, e.g. "Saturday, November 8" */
  label: string
  /** Shown to guests under the label, e.g. "6 - 9pm" */
  timeLabel: string
  /** Used to sort dates and to disable past dates automatically. ISO date, e.g. "2026-11-08" */
  isoDate: string
  /**
   * Fallback capacity if the "Config" tab in the spreadsheet has no row for
   * this date id. Editing the spreadsheet is the normal way to change
   * capacity — this is just what the site uses if that row is missing.
   */
  fallbackCapacity: number
}

export type EventConfig = {
  /** URL slug — the event lives at /events/<slug>. */
  slug: string
  title: string
  /** Short line for the card on /events. */
  summary: string
  /** Longer copy for the event's own page. Plain text paragraphs, split on blank lines. */
  description: string
  location: string
  address?: string
  /** Path under /public, e.g. "/images/autumn-tea.jpg". Optional — falls back to a plain header. */
  heroImage?: string
  dates: readonly EventDate[]
  tiers: readonly EventTier[]
  /** Short label used in the Stripe line-item description and confirmation email. */
  stripeDescriptionLabel: string
}
