# Changelog

What changed in the product, newest first. The checks behind each change are in [AUDIT.md](AUDIT.md) and
[VERIFICATION.md](VERIFICATION.md); why is in [DECISIONS.md](DECISIONS.md). Releases before 2026-11-10 are listed in
[WORKBOOK.md](WORKBOOK.md) section 1.

## 2026-11-11 · Tailwind CSS v4 and pnpm (branch `chore/tailwind-v4`, D-062; not released)

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
- `npm run test:browser`: a real headless Chromium drives the built site against local PHP and a throwaway database
  (the contact form at 375 and 1280 px). New dev dependency `playwright-core` 1.64.1.
- `npm run check:facts`: lists every placeholder still on the built public pages and the owner fact each one waits for.
- `npm run drill:restore`: restores a database dump into a throwaway database and checks tables, row counts and orphans.
- `docs/ROADMAP.md` (the frozen V1 finish line), this changelog, `docs/VERIFICATION.md`.

**Changed**
- The public phone number +44 20 8059 8757 (supplied by the owner) now shows on Contact and the legal pages and in the business structured data (`telephone`).
- `docs/KNOWN-ISSUES.md` compacted from 2,397 to about 1,460 lines by merging closed issues into one table; the earlier
  text stays in git (`git show d30e95b:docs/KNOWN-ISSUES.md`).
- `gk_send_email` accepts an optional `timeout` (alerts use 8 seconds; everything else keeps 20).

**On the host, the same day:** `$OWNER_ALERTS` set, a daily database and uploads backup (`scripts/gakinz-backup.sh`), and the first GAkinz cron entries ([OPERATIONS.md](OPERATIONS.md) sections 2.1 and 5). No SQL, no `.htaccess`.

**Not changed:** public copy, prices, legal pages, sign-in, payments, schema.
