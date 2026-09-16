# Onboarding: timebeing

A guide for working on this site with Claude, whether or not you're comfortable
with code yourself.

---

## Part 1: Get repo access

1. Carl adds you as a collaborator: repo → **Settings** → **Collaborators** → **Add people**
2. Accept the invite email from GitHub

---

## Part 2: Pick how you'll work with Claude on this repo

**Option A — Claude in the browser (no local setup).** Point a Claude session
at this GitHub repo and describe the change you want in plain language — a
new event, different wording on the homepage, a color change. Claude makes
the edit, opens a branch, and puts up a pull request for review. Nothing to
install.

**Option B — Claude Code on your own machine (what Carl uses).** Needs
Node.js and pnpm installed locally (`node --version` / `pnpm --version` to
check; see [nodejs.org](https://nodejs.org) if not). Clone the repo, run
`pnpm install`, then work with Claude Code directly against the files. Better
if you want to actually see the site running locally (`pnpm dev`) as you go.

Either way, the review step below is the same — and matters more, not less,
now that more than one person is making AI-assisted changes to the same code.

---

## Part 3: Where things live

| What to change | Where |
|---|---|
| A new event, or changing dates/prices/description for an existing one | `content/events/*.config.ts` — copy `example-gathering.config.ts` to start a new one |
| Homepage / marketing copy | `app/page.tsx` |
| Layout, colors, fonts | `app/global.css`, `app/components/*.tsx` |
| Capacity for a specific date | The spreadsheet's **Config** tab directly — not code |

You can ask Claude to make any of these changes for you rather than editing
files by hand — just be specific about which event or which page.

---

## Part 4: Always use a branch + pull request

Never push straight to `main` — that's what's live on the actual site.
Instead:

1. Create a branch for the change (Claude will do this as part of making the
   edit if asked, or: `git checkout main && git pull && git checkout -b my-change`)
2. Make the change
3. Open a pull request on GitHub
4. **Vercel automatically builds a preview deployment for the PR** — click
   through to it and look at the real, live page before merging
5. Carl (or whoever owns the repo) reviews and merges

This preview link is the safety net — it catches a change that looks right
in the description but breaks something on the actual page, before anyone
outside the team ever sees it.

---

## If something breaks

- The PR's Vercel preview shows an error → describe the error back to Claude
  and ask it to fix it on the same branch, then push again
- Merge conflict → ask Carl for help, or ask Claude to help resolve it
- Unsure whether a change needs code vs. just the spreadsheet → capacity
  numbers are the spreadsheet; almost everything else (copy, events, design)
  is code
