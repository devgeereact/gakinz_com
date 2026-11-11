# Changelog

What changed in the product, newest first. The checks behind each change are in [AUDIT.md](AUDIT.md) and
[VERIFICATION.md](VERIFICATION.md); why is in [DECISIONS.md](DECISIONS.md). Releases before 2026-11-10 are listed in
[WORKBOOK.md](WORKBOOK.md) section 1.

## 2026-11-11 (later) · One planning home (documents only)

- `.planning/` (nine GSD phases, a 2026-11-08 baseline) is folded into `docs/ROADMAP.md`: an "At a glance" table of what is done, what is left and what is parked; scope notes for the planned V1.2 and V2; the parking lot grouped by theme with the version each item would join. The folder is removed; a copy of the old files is kept in `.local-state/` (gitignored).
- `AGENTS.md` gains "How work is planned and built": brainstorm, plan in `.agent/CURRENT-TASK.md`, build test first, prove with evidence, using the Superpowers skills. `CLAUDE.md` points to it.

## 2026-11-11 · V1.1 finish-line run (local branch `goal/finish`, not released; D-063)

**Added**
- Today lists a client's open data deletion request with its reply-by date (one month after it was filed) and says when that date has passed (`today.php` section `deletion_requests`, K-095).
- Today shows a notice when an alert email failed or was held back in the last 7 days, for the owner roles (`owner_alerts`, D-061).
- Browser tests for layout: every public page and every CMS screen at 375 and 1280 px (`tests/browser/public-layout.test.ts`, `cms-layout.test.ts`, seed data in `tests/browser/seed.ts`, a test-only build in `vite.cms-test.config.ts` with Clerk stubbed). Optional axe run with `GK_AXE`.

**Fixed**
- A client or editor login no longer asks `invoices.php` (a 403 on every screen) from the notification bell.
- Accessible names on the Today lead lists and the Leads cards now contain their visible text (axe label-in-name).
- Invoicing and Contracts row actions wrap instead of running past the table at 1280 px.
- `pnpm run lint` is clean (Portal, Contracts and the theme toggle no longer set state in an effect), CI and `release.json` run it, and the lint ratchet script is deleted (K-002).

**Found, not fixed:** K-147 (two sitemap articles render the not-found page on the live CMS), K-148 (eight CMS tables scroll sideways inside their box on a phone).

## 2026-11-10 (later) · Recovery targets agreed, live walk recorded (documents only)

- Recovery targets agreed: back within one working day, lose at most 24 hours (D-062). The owner chose no OpenRouter spending limit (D-062).
- The live owner walk (steps 1, 2, 3, 5, 7) is recorded in `docs/VERIFICATION.md` with the TEST records it left. No code or host change.

## 2026-11-11 (merge) · V1.1 and Tailwind v4 with pnpm are in one branch (not released)

- The Tailwind v4 and pnpm branch now contains the V1.1 work, and local `main` points at the result. The Tailwind decision is D-064 (it was D-062, which the recovery-targets decision already held). The V1.1 test harness builds with the Tailwind plugin. Checks: `docs/VERIFICATION.md`.

## 2026-11-11 · Tailwind CSS v4 and pnpm (branch `chore/tailwind-v4`, D-064; not released)

**Changed**
- Styling moves to Tailwind CSS v4 through the Vite plugin; tokens live in `src/index.css` (`@theme inline` over the shadcn variables). `tailwind.config.js`, PostCSS, `autoprefixer` and `tailwindcss-animate` are gone; `tw-animate-css` provides the animation classes.
- Packages are managed with pnpm (`pnpm-lock.yaml`); CI and the deploy workflow install with `pnpm install --frozen-lockfile`.
- No visible change intended: v3 line heights, button cursor, border colour and search-input appearance are kept; the dialog and sheet keep their 150 ms animation.

## 2026-11-10 · V1 finish-line run (released as `4bdaed7`, PR #32)

**Added**
- The owner is emailed the moment a visitor sends an enquiry (`server/_notify.php`, `$OWNER_ALERTS`). Best effort, after
  the response, capped at 20 an hour, audited (D-061, K-146).
- A client's data deletion request opens at high priority and emails the owner with the reply-by date one month on (K-095).
- Every `cron.php` run leaves a per-job heartbeat, and Today shows the owner roles which scheduled jobs have not run in
  36 hours (K-145).
- `pnpm run test:browser`: a real headless Chromium drives the built site against local PHP and a throwaway database
  (the contact form at 375 and 1280 px). New dev dependency `playwright-core` 1.64.1.
- `pnpm run check:facts`: lists every placeholder still on the built public pages and the owner fact each one waits for.
- `pnpm run drill:restore`: restores a database dump into a throwaway database and checks tables, row counts and orphans.
- `docs/ROADMAP.md` (the frozen V1 finish line), this changelog, `docs/VERIFICATION.md`.

**Changed**
- The public phone number +44 20 8059 8757 (supplied by the owner) now shows on Contact and the legal pages and in the business structured data (`telephone`).
- `docs/KNOWN-ISSUES.md` compacted from 2,397 to about 1,460 lines by merging closed issues into one table; the earlier
  text stays in git (`git show d30e95b:docs/KNOWN-ISSUES.md`).
- `gk_send_email` accepts an optional `timeout` (alerts use 8 seconds; everything else keeps 20).

**On the host, the same day:** `$OWNER_ALERTS` set, a daily database and uploads backup (`scripts/gakinz-backup.sh`), and the first GAkinz cron entries ([OPERATIONS.md](OPERATIONS.md) sections 2.1 and 5). No SQL, no `.htaccess`.

**Not changed:** public copy, prices, legal pages, sign-in, payments, schema.
