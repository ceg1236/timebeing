import type { EventConfig } from '../event-schema'

/**
 * Template event — copy this file to add a real one.
 *
 * 1. Duplicate this file as content/events/<your-slug>.config.ts
 * 2. Fill in the fields below
 * 3. Register it in lib/event-registry.ts
 * 4. Add a row to the "Config" tab in the spreadsheet for each date id below,
 *    with the real capacity (see .env.example / README for the sheet setup)
 *
 * That's the whole process — no new page, no new route.
 */
export const exampleGatheringEvent: EventConfig = {
  slug: 'example-gathering',
  title: 'Example Tea Gathering',
  summary: 'A short one-line description shown on the /events schedule page.',
  description:
    "Longer description shown on the event's own page. Write a paragraph or two " +
    'about what the gathering is, what to expect, and anything guests should know ' +
    'before booking.\n\nA blank line like the one above starts a new paragraph.',
  location: 'timebeing, 438 Haight St, San Francisco',
  address: '438 Haight St, San Francisco, CA',
  dates: [
    {
      id: 'example-nov-8',
      label: 'Saturday, November 8',
      timeLabel: '6 - 9pm',
      isoDate: '2026-11-08',
      fallbackCapacity: 12,
    },
  ],
  tiers: [
    {
      id: 'community',
      label: 'Community',
      blurb: 'Our standard price — keeps things sustainable.',
      price: 30,
    },
    {
      id: 'supporter',
      label: 'Supporter',
      blurb: 'If you are able, this helps cover a supported seat for someone else.',
      price: 45,
    },
    {
      id: 'supported',
      label: 'Supported',
      blurb: 'For guests who need a lower price — no questions asked.',
      price: 15,
    },
  ],
  stripeDescriptionLabel: 'Example Tea Gathering',
}
