# Changelog

What changed in the product, newest first. The checks behind each change are in [AUDIT.md](AUDIT.md) and
[VERIFICATION.md](VERIFICATION.md); why is in [DECISIONS.md](DECISIONS.md). Releases before 2026-11-10 are listed in
[WORKBOOK.md](WORKBOOK.md) section 1.

## 2026-11-11 (V1.2) · Public-site trust: a true cookie page, a sitemap that matches the CMS, bot signals on the contact form, a real 404, a headline read once (released 2026-11-13 as `ea6164c`)

Five items of the V1.2 finish line (`docs/ROADMAP.md`, D-065), built and reviewed locally, then **released on 2026-11-13 as `ea6164c`** (PR #34, 22 commits, a fast-forward of `main` from `ed5a724`; CI run 43389323251 green; released 08:06 UTC, snapshot `20261113T080551Z`, smoke checks passed). `server/.htaccess` had been uploaded by hand earlier that day at the owner's request, and was found byte-identical to the repo file before the merge. **Live results (read-only):** `pnpm run check:live` 20 of 20 (17 of 20 before the release); an unknown URL answers 404 with the branded "Page not found" page, `X-Robots-Tag: noindex`, `Cache-Control: no-store` and the same Content-Security-Policy as the other pages; `/blog/old` answers 404; the live sitemap lists exactly the three CMS articles; `/cookies/` names `gk-auth` and `__session` and no longer contains `gk_oauth_state` or `gk-locked`; the home `<h1>` carries the `aria-label` sentence. NOT TESTED: the contact form on the live site (no real enquiry was sent), the branded 404 and the honeypot in a real browser, Safari, Firefox, a real phone, a password manager or screen reader, Clerk's real cookie names in devtools. The checks are in [VERIFICATION.md](VERIFICATION.md) and [AUDIT.md](AUDIT.md).

**Fixed**
- **The cookie page tells the truth (item 1).** `/cookies` no longer describes the retired Google sign-in cookie (`gk_oauth_state`) or the retired lock-screen item (`gk-locked`), and no longer says `gk-auth` holds a sign-in token (it holds only name, email and role, and lasts until you sign out; an empty entry stays). It names Clerk, the sign-in service at `clerk.gakinz.com`, lists its cookies (`__client`, `__client_uat`, `__session`, and says Clerk can also set copies of the first two with a suffix) beside this site's own `sidebar_state`, `gkos-groups`, `theme` and `gk-auth`, each with who sets it, what it is for and how long it lasts, and describes Google sign-in as handled by Clerk and Google under their own cookies. The privacy page's Cookies paragraph points to it.
- **The built-in articles match the CMS (item 2, K-147).** The built-in articles (the fallback for `/resources`, and the prerendered pages and sitemap entries) are the three posts the live CMS holds (`fixed-price-how-we-scope`, `what-makes-a-website-fast`, `why-one-team-design-and-build`), with the CMS's own text and date. The two articles the CMS never held (`what-makes-a-site-fast`, `accessibility-is-not-optional`) are gone from the sitemap and stay in git history.
- **An unknown URL gets a real 404 (item 5, K-139).** An address that is not a page, a file or one of the browser app's own paths (`app`, `login`, `set-password`, `p`, `verify`, `work`, `services`, `resources`, in any case) answers **404** with the site's own not-found page, `X-Robots-Tag: noindex`, `Cache-Control: no-store` and the public pages' Content-Security-Policy, instead of the app page with 200 (a soft 404 in Search Console). `blog` is not exempt (the app has no `/blog` route). A wrong-case public path such as `/Contact` is a 404 too. Records published only in the CMS (`/work`, `/services`, `/resources`), `/login`, `/app/...`, `/p/<token>`, `/verify/...` and every prerendered page are unchanged.
- **The home headline is read once (item 6).** The `<h1>` held a visually hidden sentence and an `aria-hidden` animated copy of the same words, so a crawler (which ignores `aria-hidden`) read the line twice. The hidden span is gone: the `<h1>` carries the sentence in `aria-label`, and the animated words stay `aria-hidden`. Nothing changes on screen. The owner approved the design change on 2026-11-11.

**Added**
- **Bot signals on the contact form (item 3, D-067).** `contact.php` checks two signals after the throttle and before validation. A hidden honeypot field (`hp_site`, off screen, `tabindex="-1"`, `aria-hidden="true"`, `autocomplete="off"`, not named `website`): any value answers `201 {id: 0, reference: null}` like success, saves and mails nothing and writes the audit row `enquiry_bot_dropped` with detail `honeypot <email>` (the email the sender typed, on one line and cut to 200 characters, so the owner can write back to a real person whose password manager filled the field; `honeypot` alone when no email was sent). A minimum fill time (`fillMs`, the milliseconds the browser measured from the form opening to the send, `CONTACT_MIN_FILL_MS` = 2500): a faster post answers `429 "That was quick. Please check your details and send again."`, saves nothing and writes `enquiry_too_fast`, and the form keeps what the visitor typed. It is an elapsed time, so a visitor's wrong clock changes nothing; a missing, negative, non-numeric or over-a-day value is no signal, so older clients and direct posts still work. A second bucket caps the audit rows these refusals write: 20 per IP in 15 minutes, then the throttle's 429 with no new row. The limit is stated in `docs/SECURITY.md` and `docs/API-SPEC.md`: this stops form-filling bots; a script that POSTs JSON directly is limited only by the per-IP throttle. No cookie, storage or third-party code is added.
- **The 404 page and its rule.** The build writes `dist/404.html` (the not-found page in the same template as every page, noindex, not in the sitemap, its inline script checked against the policy like the others). `server/notfound.php` answers 404 with that file (or a short built-in page if it is missing); it is not an `ErrorDocument`, so the API's JSON 404 replies stay JSON. `server/.htaccess` sends unknown first segments to `notfound.php` and gives it, and `/404.html` asked for by name, the public pages' policy. The `.htaccess` was uploaded by hand on 2026-11-13 (`docs/DEPLOYMENT.md` section 5); the rule and the 404 page are live.
- **Checks.** `pnpm run check:htaccess` runs the real `server/.htaccess` under Apache with PHP-FPM on this Mac over a copy of `dist/` and checks the routing (67 checks). `pnpm run check:live` gains `unknown URL answers 404` (status, `Content-Security-Policy` and `X-Robots-Tag`), which passes on the live site since the release, and asks `blog.php?slug=<slug>` for every article in the live sitemap. `STORED_ITEMS` (`src/marketing/data/storage-items.ts`) is the single list the cookie page renders; a test scans `src/` and fails when code starts using cookies or browser storage the list does not know about. The public layout test also loads the not-found view at 375 and 1280 px with axe.

## 2026-11-11 (later) · One planning home (documents only)

- `.planning/` (nine GSD phases, a 2026-11-08 baseline) is folded into `docs/ROADMAP.md`: an "At a glance" table of what is done, what is left and what is parked; scope notes for the planned V1.2 and V2; the parking lot grouped by theme with the version each item would join. The folder is removed; a copy of the old files is kept in `.local-state/` (gitignored).
- `AGENTS.md` gains "How work is planned and built": brainstorm, plan in `.agent/CURRENT-TASK.md`, build test first, prove with evidence, using the Superpowers skills. `CLAUDE.md` points to it.

## 2026-11-11 (release) · V1.1 and Tailwind v4 with pnpm are live (`ed5a724`)

- Released 2026-11-11 08:34 UTC through `ci.yml` and `deploy.yml` on the owner's "Push and Deploy now": snapshot `20261111T083401Z`, smoke checks passed, `pnpm run check:live` 16 of 16, the live bundle (`index-DbqHNpCb.js`, `index-DzeMEWpu.css`) matches the local build.
- CI fix (K-149): the "does this push need a release" job no longer tries to cache with pnpm. The first push (`e73748f`) failed there and released nothing.
- `.planning/` folded into `docs/ROADMAP.md`; `AGENTS.md` states the Superpowers planning workflow; the graphify git hooks were re-pinned to the right Python.

## 2026-11-11 · V1.1 finish-line run (released as `ed5a724`; D-063)

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

## 2026-11-11 (merge) · V1.1 and Tailwind v4 with pnpm are in one branch (released as `ed5a724`)

- The Tailwind v4 and pnpm branch now contains the V1.1 work, and local `main` points at the result. The Tailwind decision is D-064 (it was D-062, which the recovery-targets decision already held). The V1.1 test harness builds with the Tailwind plugin. Checks: `docs/VERIFICATION.md`.

## 2026-11-11 · Tailwind CSS v4 and pnpm (D-064; released as `ed5a724`)

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
