# timebeing

Marketing site and event booking for timebeing, the Midnight Teahouse × Gather SF
space at 438 Haight St, San Francisco.

**New collaborator?** See [ONBOARDING.md](./ONBOARDING.md).

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in real values, or leave blank to browse without booking
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## How booking works, in one paragraph

Each event is a config file under `content/events/`. A guest picks a date and
ticket tier on the event's page, which calls `/api/checkout` to create a
Stripe Checkout session; after payment, Stripe calls `/api/webhooks/stripe`,
which writes the booking to a "Bookings" tab in a Google Sheet (the
spreadsheet is the database — no separate admin screen) and emails a
confirmation if Resend is configured. Capacity per date lives in a "Config"
tab on the same spreadsheet and is edited directly there.

**Known, accepted tradeoff:** the capacity check at checkout time isn't
perfectly atomic — if two people try to book the very last seat within the
same second or two, both could get through. Given typical event sizes here,
that's judged not worth adding a database to prevent; if it ever happens,
it's a manual fix (comp a seat, follow up), not a system failure. See
`app/api/checkout/route.ts` for where that tradeoff is made.

## Adding a new event

1. Copy `content/events/example-gathering.config.ts` to a new file with your event's slug
2. Fill in the fields (dates, tiers, description, etc.)
3. Import and register it in `lib/event-registry.ts`
4. Add a row to the spreadsheet's "Config" tab for each date id, with the real capacity

No new page or route needed — `/events/<your-slug>` renders automatically.

## Required services

- **Vercel** — hosting, deploys from `main` on push (same flow as midnighttea.house)
- **Stripe** — payment processing (only cost: Stripe's own per-transaction fee)
- **Google Sheets API** — a service account with edit access to the spreadsheet
- **Resend** (optional) — booking confirmation emails
