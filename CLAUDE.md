# CLAUDE.md — timebeing

Context for Claude sessions working in this repo, technical or not.

## What this is

Marketing + event-booking site for **timebeing**, a teahouse space at 438
Haight St, San Francisco — a collaboration between Carl's existing business
**Midnight Teahouse** and **Gather SF**. Repo: `ceg1236/timebeing`.

## Where this came from

Midnight Teahouse already runs a working site (midnighttea.house) on
Vercel + GitHub with a proven booking pattern: **Stripe Checkout → webhook →
Google Sheets as the database** (a Config tab for per-date capacity, a
Bookings tab for records). No separate admin panel.

timebeing reuses that pattern but trimmed down, with one key structural
change from the old repo: instead of a hand-built page per event, **events
are data-driven** — a single dynamic `/events/[slug]` route reads from
`content/events/*.config.ts` files registered in `lib/event-registry.ts`.
Adding an event means adding a config file, not adding a page.

## Deliberate decisions already made

Don't relitigate these without a real reason:

- **Booking is built in-house (Stripe Checkout), not embedded via Luma/
  Eventbrite.** Avoids their percentage fees on top of Stripe's own, since
  events are updated manually anyway.
- **Google Sheets is the database, not Postgres/Supabase.** The capacity
  check at checkout isn't perfectly atomic (two people could theoretically
  both grab the last seat) — accepted tradeoff given small, capacity-capped
  events; not worth a real database to prevent. See `README.md` and the
  comment in `app/api/checkout/route.ts`.
- **No ticket-format pools** (e.g. "Open Teahouse" vs "Guided Tasting" as
  separately-capped experiences), and **no admin door-link/QR check-in
  system** — both existed in the Midnight Teahouse repo but are out of scope
  for v1.
- **Always work on a branch and open a PR**, never push straight to `main`
  once it carries real content, so Vercel's automatic PR preview deploys
  catch problems before they go live. This matters more here than on a
  solo repo: Carl (software engineer) does most hands-on dev, but Jenny (a
  non-technical collaborator) also works in this repo via her own Claude
  Code setup, describing changes in plain language. See `ONBOARDING.md` for
  the collaboration flow aimed at her.

## Repo layout

| What to change | Where |
|---|---|
| A new event, or changing dates/prices/description for an existing one | `content/events/*.config.ts` — copy `example-gathering.config.ts` to start a new one, then register it in `lib/event-registry.ts` |
| Homepage / marketing copy | `app/page.tsx` |
| Layout, colors, fonts | `app/global.css`, `app/components/*.tsx` |
| Capacity for a specific date | The spreadsheet's **Config** tab directly — not code |
| Checkout session creation | `app/api/checkout/route.ts` |
| Stripe webhook handling (booking write, refunds) | `app/api/webhooks/stripe/route.ts` |
| Google Sheets access | `lib/sheets-*.ts` |

## Where things stand / what's left

Rough sequence being worked through:

1. Push real scaffold code to GitHub, connect Vercel to the GitHub repo as
   a proper git-linked project (auto-deploy on push to `main`, PR previews)
   — replacing an earlier bare file-upload deploy used only to sanity-check
   that the scaffold builds.
2. Stripe: test-mode keys, webhook endpoint registered for
   `checkout.session.completed` and `charge.refunded`, secrets in Vercel.
3. A real Google Sheet (separate from Midnight Teahouse's) with Bookings
   and Config tabs, a service account with Sheets API access shared onto
   it, credentials in Vercel.
4. End-to-end test in Stripe test mode: real booking through the flow,
   webhook fires, row lands in the sheet, confirmation email sends (if
   Resend configured), and a refund test.
5. Replace the placeholder event in `content/events/` with a real one.
6. Set up the actual domain.
7. Design pass — currently bare Tailwind, intentionally waiting for a real
   look distinct from Midnight Teahouse's nighttime aesthetic.

If you're picking this up mid-stream, check current git branches, open
PRs, and Vercel project state rather than assuming the above list is still
accurate — update this section as items complete.

## For non-technical collaborators

See `ONBOARDING.md` — written for Jenny, covers repo access, working with
Claude (browser or Claude Code), where things live, and the branch/PR/
preview-deploy workflow.
