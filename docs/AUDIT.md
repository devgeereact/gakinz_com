# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-11-11 (V1.2 task 4) · An unknown URL gets a real 404 (item 5, K-139)

**Scope:** `src/prerender/not-found.ts`, `scripts/prerender.mjs` (`dist/404.html`), `server/notfound.php`, `server/.htaccess` (the unknown-path rule and the CSP `FilesMatch`), `scripts/live-check.mjs` (`unknown URL answers 404`), `scripts/htaccess-check.mjs` (new, `pnpm run check:htaccess`). Method: test first: `src/prerender/not-found.test.ts` failed (no module), `tests/server/notfound.test.ts` failed 2 of 3 (the JSON test is a guard and passed), the new `live-check` test failed, and `check:htaccess` failed 12 of 62 (unknown paths answered 200 with the app page) before any implementation.
**Checks:** `php -l server/notfound.php` clean; `tests/server/notfound.test.ts` 3 of 3; `pnpm run test:server` 684 of 684 (55 files); `pnpm test` 697 of 697; `pnpm run lint` 0 problems; `pnpm run build` writes 32 pages, `404.html` and 32 sitemap URLs (no `/404`); `pnpm run check:htaccess` 60 of 60 (every prerendered page, `/login`, `/app/leads`, `/p/abc`, `/verify/x`, CMS-only `/services`, `/work` and `/resources` slugs and `/blog/...` 200; `/definitely-not-a-page`, a nested unknown path and `/workshop` 404 with the built page, `noindex`, `no-store` and the same CSP as `/`; `/missing.php` and `/assets/` 404; no `CF-RAY` 403); `pnpm run test:browser` 146 of 146 with axe on; `pnpm run docs:check --base main` PASS.
**Harness note:** Apache 2.4 (macOS) with `mod_proxy_fcgi` and Homebrew PHP-FPM, `AllowOverride All`, directory listing on. `DirectorySlash Off` in the temporary config, because Apache's `mod_dir` would 301 `/work` to `/work/` where the host's LiteSpeed serves it directly (live `check:live`: `/work` 200).
**Not checked:** LiteSpeed itself (the host); the live site (the `.htaccess` is the owner's upload, BLOCKED until then; `check:live`'s new check fails until it is up); a browser look at the not-found page served at an unknown address (the browser test stack does not apply `.htaccess`); `/404.html` asked for by name answers 200 with the noindex page and without the CSP header (a real file, not linked anywhere).

## 2026-11-11 (V1.2 task 3) · The contact form turns bots away (item 3)

**Scope:** `server/contact.php`, `src/lib/api.ts` (`EnquiryPayload`), `src/marketing/pages/Contact.tsx`, `src/marketing/site.css` (`.hp`). Method: test first (`tests/server/contact-bots.test.ts` seen failing 5 of 8 before any server change; the browser tests seen failing on the missing field), then the change.
**Checks:** `php -l server/contact.php` clean; server files `contact-bots`, `contact-hardening`, `enquiry-notify`, `enquiry-services`, `journey`, `references`, `alert-failures` 55 of 55 against the throwaway MariaDB; `pnpm test` 693 of 693; `tsc -b` clean; `eslint` clean on the four touched TypeScript files; `pnpm run build` writes 32 pages; `pnpm run test:browser` 146 of 146 with axe on (`/contact` 0 violations, no layout flaws at 375 and 1280 px, which first caught an `overflow: hidden` on `.hp` and led to dropping it).
**Anti-goals checked by test:** a refused fast post is not counted by the throttle and the retry goes through; what the visitor typed survives the friendly retry; the hidden field is never reached by Tab and carries `tabindex=-1`, `aria-hidden`, `autocomplete=off`; the sixth post in 15 minutes is still throttled.
**Fix round 1 (review):** both refusals wrote an audit row that the `enquiry_submit` throttle never counted, so one IP could write unlimited rows. A second bucket (`CONTACT_MAX_BOT_PER_WINDOW` = 20 `enquiry_bot_dropped` or `enquiry_too_fast` rows per IP in 15 minutes) now answers 429 before reading the body and writes no row; `tests/server/contact-bots.test.ts` 12 tests, including 25 honeypot hits leaving 20 rows and a person refused twice who still gets through on the third try.
**Not checked:** a real password manager or browser autofill (the field is named `hp_site`, not `website`, and carries the ignore hints for 1Password, LastPass and Bitwarden; no manager was run); a screen reader; the effect on real bot traffic; a visitor whose clock is ahead of the server's by d ms has a negative computed age for the first d ms (no signal) and is refused only between d and d + 2500 ms, so the window shifts and never lengthens (reasoned, not run). The server half is live only after the next release uploads `server/contact.php`.

## 2026-11-11 (V1.2 task 2) · The cookie policy tells the truth (item 1)

**Scope:** `src/marketing/data/storage-items.ts`, `src/marketing/pages/Legal.tsx` (`Cookies`, and the `Privacy` Cookies paragraph), `src/marketing/site.css` (`.stored`). Method: test first (3 behaviour failures seen against an empty list before any content), then the change.
**Checks:** `pnpm exec vitest run src/marketing` 16 files, 156 tests; `pnpm test` 692 of 692; `pnpm run build` writes 32 pages, 32 sitemap URLs, and the built `/cookies` page contains neither `gk_oauth_state` nor `gk-locked`; `tests/browser/public-layout.test.ts` 66 of 66 with axe on (0 violations, `/cookies` and `/privacy` included); `eslint` clean on the four touched TypeScript files. The storage scan was checked against reality with `grep`: the only non-test files in `src/` that call `localStorage.`, `sessionStorage.`, set `document.cookie` or use zustand `persist(` are `nav-main.tsx`, `ui/sidebar.tsx`, `providers/ui-theme-provider.tsx` (only removes the retired `ui-theme` key) and `store/auth.store.ts`.
**Sources for Clerk's items:** Clerk documentation "Cookies", production instance cookies; the live production settings read on 2026-11-11 (session token 60 s, session maximum 7 days, Google and email code enabled, CAPTCHA off).
**Not checked:** the cookie expiry of `__client` (not checked beyond Clerk's statement that it is browser dependent; the 7 days is the session maximum from the live settings, and the page says so) and of `__client_uat` (the page says only that the session it describes ends within 7 days); the `theme` key (written by `next-themes`, so it is not in the scan; it is listed from the library's documented behaviour); a signed-in browser run that reads the real cookies; the adviser's review of the wording (V1 item 4); a visual look at the page.

## 2026-11-11 (V1.2 task 1) · Built-in articles match the CMS (K-147)

**Scope:** `src/marketing/data/site.ts` `insights`, `scripts/live-check.mjs`, the seed in `tests/browser/public-layout.test.ts`. Method: test first (5 failing tests seen before any change), then the change.
**Checks:** read-only `curl` of `https://gakinz.com/blog.php` and `?slug=` for the three live posts (the text was copied unchanged); `pnpm exec vitest run` 684 of 684; `pnpm run build` writes 32 pages and 32 sitemap URLs; `tests/browser/public-layout.test.ts` 66 of 66 with axe on (0 violations).
**Not checked:** the live sitemap (it changes at the next release; `check:live` then proves it), a visual look at the new article pages.

## 2026-11-11 (release) · V1.1 with Tailwind v4 and pnpm released (`ed5a724`)

**Scope:** the release of the merged branch (V1.1, D-063, and Tailwind v4 with pnpm, D-064) and the check that it is what is live. Evidence: `docs/VERIFICATION.md` "Release and live checks, 2026-11-11".
**Finding, fixed:** K-149. The release-check job of `ci.yml` failed on the first push because `setup-node` tried to cache with pnpm; a pull request run does not exercise that job (it runs only on a push to `main`), so the earlier green PR #33 could not show it. The failed run released nothing. Fixed and released in `ed5a724`.
**Result:** CI green on `ed5a724` (typecheck, lint, docs, unit tests, build, PHP and server tests on MySQL 8, gitleaks, Semgrep); released 08:34 UTC with a snapshot; `check:live` 16 of 16; the live CSS and JS equal the local build.
**Not checked:** the live pages in a browser, the new Today sections signed in, Safari, Firefox, a real phone, the first run of `deploy.yml`'s other steps beyond "Released".

## 2026-11-11 · V1.1 finish-line run (released as `ed5a724`)

**Scope:** the five V1.1 items (D-063): layout of every public page and CMS screen, Today for deletion requests and failed alerts, lint as the gate. Method: tests first where there was behaviour to test, a visual review of side-by-side screenshots, axe-core over every page and screen. Commands and counts: `docs/VERIFICATION.md`.

**Findings fixed:** the notification bell asked `invoices.php` as a client or editor and got a 403 on every screen; accessible names dropped visible text on the Today lead lists and the Leads cards (WCAG 2.5.3); Invoicing and Contracts row actions ran past the table at 1280 px; five `set-state-in-effect` lint errors (Portal, Contracts, the theme toggle).
**Findings recorded, not fixed:** K-147 (live: two of the three built-in articles in the sitemap are not in the live CMS, so they render the not-found view once loaded; read-only `curl` of `blog.php?slug=`), K-148 (eight CMS tables scroll sideways inside their box on a phone), plus the V1 placeholders still on Pricing, Privacy and Work (item 4, owner).
**Checks:** `pnpm run lint` 0; `pnpm test` 678; `pnpm run test:server` 669; `pnpm run test:browser` 140, three runs in a row; axe 0 violations on 132 loads; `pnpm run verify` passes; `php -l` 68 clean; `docs:check -- --base main` PASS.
**Not checked:** anything on the live system except one read-only `curl` per article; Safari and Firefox; a real phone; real data (K-044); the Portal screen with real client data (it was rewritten onto `useLoad`: covered by the layout test as a client login and by the unchanged server isolation tests, not by a signed-in session).
**Still open for the owner:** V1 items 4 and 10 (facts, retention periods), the signed-in walk of the new Today sections, deciding whether to release.

## 2026-11-10 (later) · Live owner walk on gakinz.com

**Scope:** `docs/VERIFICATION.md` "Owner walk" steps 1 to 7, run through Chrome on the live site by the agent while the owner was signed in (the owner asked for it; TEST records only; no payment taken, nothing emailed except the owner's own enquiry alert). **Result:** steps 1, 2, 3, 5, 7 PASS; steps 4 and 6 NOT TESTED (need a test client sign-in); the invoice PDF NOT TESTED. Evidence and the TEST records left are in `docs/VERIFICATION.md`. **Findings:** the quotes list shows the amount before VAT under "Total"; Invoicing tiles refresh only after a reload (both parked); the first real invoice will be 0004 because the walk used 0001 to 0003 (owner decision). No bug that makes a ticked item untrue.

## 2026-11-10 · Tailwind v3 to v4 and npm to pnpm (D-064, on `chore/tailwind-v4`)

**Scope:** `chore/tailwind-v4`, merged with `origin/main` (`63945bc`) before the push; PR #33. **Method:** a before and after comparison with an offline harness (kept in `.local-test/`, untracked): the real build with Clerk stubbed and the API mocked (a signed-in super admin, empty lists), served locally; 128 captures per browser (34 public pages and 27 CMS routes at 1280 and 375 px, plus six CMS routes in dark), computed style of every element, element boxes and screenshots, baseline against final. Reduced motion on; two baseline runs gave identical styles (0 differences in 128).

| Check | Result |
|---|---|
| Baseline (v3, npm) | `tsc -b` clean; lint ratchet 5 of 5; `pnpm test` 660 in 59 files; build prerenders 32 pages; `docs:check` PASS. There is no browser test in this project. `test:server` not run (no PHP changed) |
| Final (v4, pnpm) | the same five: `tsc -b` clean; ratchet 5 of 5; `pnpm test` 660 in 59 files; build with 32 pages; `docs:check` PASS; `pnpm verify` "Verified ... Nothing was sent" |
| Layout | Chromium: **0 element boxes moved** in 128 captures. WebKit 27.2: **0 moved** in 128 |
| Pixels | Chromium: no screenshot differs on more than 0.1 percent of pixels (128 of 128). WebKit: 126 of 128; the other two (0.45 and 0.16 percent) have identical computed styles and boxes, and baseline against baseline is identical, so they are rasterisation |
| Style differences left | Only the `space-y` margin moving from the later child to the earlier one (equal total gap), v4 `border-radius` for `rounded-full` (9999px against 33554400px, same circle), zero-width ring layers in `box-shadow`, and `option` padding. Colours compared after normalising oklab to RGB (tolerance 2 of 255) |
| Opened overlays | The command palette and the account menu: every descendant's box, font size, line height, colours, animation name, duration and easing identical (Chromium) |
| Utility in built CSS | `.wrap-anywhere{overflow-wrap:anywhere}` and `.shadow-xs` (v4 names) in `dist/assets/index-*.css`; CSS 126.7 kB before, 146.2 kB after (gzip 30.4 kB); no `style=` or inline `<style>` added, so `style-src 'self' 'unsafe-inline'` is unaffected |
| Animations | All 27 `animate-in`, `fade-*`, `zoom-*`, `slide-*` utilities used in `src/` are in the built CSS (the upgrade tool had dropped them: 0 matches) |

**Defects found and fixed:** the upgrade tool corrupted `"outline"` variants and one sentence of public copy (6 places); it dropped the animate plugin; `space-y` plus `mb-0` lost 16px on Analytics and Care plan; v4 line-height ratios shrank a menu label row by 4px; `duration-*` would have slowed the dialog and sheet.

**NOT TESTED:** Firefox (the installed build does not launch); Safari on a real device; signed-in screens with real data and every non-empty state (the harness returns empty lists, so tables with rows, open dialogs other than the two checked, the Sheet on mobile and the proposal page `/p/:token` were not captured); the `.gk-public` palette in a browser; the release job (skipped on a pull request by design; its pnpm install in `deploy.yml` first runs on a merge to `main`).

**CI on PR #33 (pnpm), 2026-11-11:** typecheck, lint ratchet, docs, unit tests and build PASS (49 s); PHP syntax and server tests on MySQL 8 PASS (7 m 45 s); gitleaks and Semgrep PASS; release skipped. Locally on the merged tree: unit 675, server 661 (MariaDB 11.4), browser 6.

## 2026-11-10 · V1 finish-line run (released as `4bdaed7`, PR #32)

**Release and host work, same day (owner-approved: "Go ahead and Push", "do these"):** the live checks are in `docs/VERIFICATION.md` (16 of 16, SMTP login 235, one TEST enquiry produced `enquiry_notified`, backup and cron installed and hand-run). **Finding while doing it:** the host had **no daily GAkinz backup** at all (K-010); `scripts/gakinz-backup.sh` now exists. **Finding:** the database login in `config.php` is the `devgeereact_egolimited_com` user (shared with another project): not changed, noted. **Incident, mine:** a read-only look at `config.php` printed the OpenRouter key into this session's output by mistake; it is not in any file or commit, but treat it as exposed and rotate it when you set the spending limit. The sections below are the local run before the release.

**Scope:** `docs/ROADMAP.md` items 3 to 10 (D-060, D-061); K-010, K-095, K-099, K-145, K-146. **Method:** failing test first for each behaviour change, a mutation check on the browser test, a medium-effort code review of the whole branch diff, then the full local ladder. Nothing was pushed, released, or run against the live site, the host or live data.

| Check | Result |
|---|---|
| Owner told of an enquiry (item 3) | **PASS.** `tests/server/enquiry-notify.test.ts` 8 tests, written red (6 of 8 failed against the old code): saved once and mailed; no fallback to the digest list; 20 an hour cap; refused host and dead host keep the enquiry and are audited; header injection through name or company adds no recipient; `gk_oneline` copes with invalid UTF-8. `tests/browser/contact.test.ts` 6 tests (375 and 1280 px): thank-you with `GK-E-` reference, one row, one mail, wrong field refused, server failure keeps what was typed, no console errors, no failed requests, no horizontal scroll. A mutation (the alert call disabled) made the browser test fail |
| Placeholders (item 4) | **BLOCKED, owner.** `pnpm run check:facts`: 18 built pages carry markers; 9 open owner facts listed with where each answer goes; `--strict` exits 1; no invented phone or company number anywhere. The draft's claim of a placeholder phone `+44 20 0000 0000` was untrue (removed in 2026-09-22) |
| Money and VAT (items 5, 6) | **PASS.** Existing `journey.test.ts` (enquiry to paid deposit), `manual-payment.test.ts`, `paid-state.test.ts` re-run green. New `vat-totals.test.ts` 10 tests: staff view, portal, Stripe amount and manual payment agree to the penny at 5 awkward cases; a penny under or over is refused; five quote sizes split 40/30/30 into subtotals that sum to the quote exactly. No defect found |
| Isolation (item 7) | **PASS.** New `portal-isolation.test.ts` 24 tests: a client sees nothing of another client through the portal with their `client_id` forced; employee, trainer and editor refused the portal; 16 staff endpoints answer 403 to a client and 401 to nobody; the other client's rows unchanged. No defect found |
| Restore (item 8) | **PARTIAL.** `pnpm run drill:restore` on the Mac copy of the host's 2026-10-30 dump: 42 of 42 tables, 88 rows, 0 orphans, 2.1 s, MariaDB 11.4.13. Refuses an empty or truncated dump and one that names a database (tested). Not done: the host's own newest dump, the uploads, permissions, agreed targets |
| Scheduled jobs (item 9) | **PASS** (tests) / **NOT TESTED** (browser, live). `cron-heartbeat.test.ts` 8 tests; `todayModel.test.ts` +5. The notice has not been seen on screen |
| Deletion request (item 10) | **PARTIAL.** `deletion-alert.test.ts` 4 tests; `deletion-request.test.ts` expectation moved from `normal` to `high`. Retention periods not set (owner, adviser) |
| Full ladder | `tsc -b` clean; `pnpm test` 674 in 61 files; `pnpm run test:server` 661 in 52 files (MariaDB 11.4.13, throwaway database); `pnpm run test:browser` 6; `pnpm run build` 32 pages and 32 sitemap URLs; `lint:ratchet` 5 of 5; `php -l` over 68 files clean; `pnpm run verify` PASS (release dry run, nothing sent); `docs:check` see `docs/VERIFICATION.md` |
| Slop scan | `slop-check`: unmodified `main` reports 1 error with none listed (a counting quirk) and 13 warnings; the branch reported 2 until my one real error (an empty catch in `_notify.php`) was fixed, then 1 and 13, the warnings being giant files that were already there. Judgement pass of my diff: copy simplified (the Today notice), no dead code, tests assert behaviour, no two documents say the same (the roadmap points to `docs/STATUS.md` section 5 for the full owner list) |
| Code review (medium, whole diff) | 10 findings, all acted on: **(1)** a prune-only cron line cleared the whole notice: heartbeat is now per job; **(2)** unindexed `audit_log` scan and heartbeat growth: one row per job per 10 minutes, index parked; **(3)** the send could hold the visitor on a host without a finish-request function: 8-second SMTP timeout, host support NOT TESTED; **(4)** alert flood: 20 an hour cap; **(5)** alerts fell back to the digest list: removed; **(6)** invalid UTF-8 in `gk_oneline`: `mb_scrub`; **(7)** restore drill password on the command line, silent failure without the client, a dump that names a database: fixed and tested; **(8)** test server path handling: fixed; **(9)** the deletion alert lookup was inside the transaction: moved after the commit, best effort |
| Security | A full `security-audit` pass was **not re-run** (the last is 2026-11-01 to 02, above). Reviewed for this branch: no new endpoint, no new input path, no schema change; the two new mail paths take only already-validated fields, strip control characters from subject and audit detail, send plain text, and go to a configured address only. Auth, signed-out, wrong-role and other-client refusals are tested (item 7) |
| Not tested | The Today notice and the owner's emails on a real screen and a real mailbox; `litespeed_finish_request()` on the host; MySQL 8 (CI would); axe and a real phone; anything signed in on the live system; the live crontab, the host's backup job and the uploads copy |

## 2026-11-09 (Phase 7) · Daily-flow speed-ups released and checked live (`825600e`)

**Scope:** D-059, K-141 to K-144. **Method:** tests first for every logic change, a fake mail server for the reminder tests, mutation checks on the guards, then the full gates.

| Check | Result |
|---|---|
| Reminders | `tests/server/cron-reminders.test.ts` (13 tests, written red: 10 failed against the old code): an overdue invoice is emailed once and the next run sends nothing; again only after the interval (6 days no, 8 days yes); `$CHASE_INTERVAL_DAYS` honoured; a hand-sent reminder counts; each invoice has its own memory, even for one client; a failed send is retried; paid, draft, not-yet-due and no-email invoices are left alone; a held lock makes a second run skip; no mail host does nothing |
| Digest | sends once, not again for 5 days, again after 7; a failed send is retried; quiet without recipients; `job=all` mails nobody twice |
| Mutations | removing the dedupe check (6 tests failed), shortening the digest window to 0 (2 failed) and ignoring hand-sent reminders (1 failed) were each caught; removing the unsent-field merge, the status lookup and the date check in `tasks.php` were each caught |
| Tasks | `tests/server/tasks.test.ts` (12 tests, 11 red first): update title/assignee/due date, only sent fields change, empty clears, trimmed and capped, bad title/date refused with nothing written, 404 for missing/deleted, 403 for trainer and client, 401 signed out; create refuses a malformed date; a move to the same status is 200 |
| Client models | `clientEditModel`, `taskEditModel`, `quotePrefillModel` (written red first) and the new `deepLink` helpers: 21 tests |
| Gates | `tsc -b` clean; `pnpm test` 660 in 59 files; `pnpm run test:server` 608 in 47 files (MariaDB 11.4); lint ratchet 5 of 5; `docs:check` PASS |
| Live cron | Read-only `crontab -l` on the host (owner-approved, keys redacted): **no GAkinz cron entry exists**, only other projects and a backup script. So nothing was re-emailing clients, and equally no retainer billing, uptime check, prune or digest runs (K-145) |
| CI and release | PR #31: all jobs green including the server suite on MySQL 8 (the fake-mail tests too); `main` fast-forwarded to `825600e`; the release job succeeded; `pnpm run check:live` 16 of 16; `tasks.php?action=update` and `clients.php?action=update` without a token give 401; `cron.php` over the web without a key gives 403 |
| Not tested | The edit dialogs, the quote landing and the prefilled quote in a browser; MySQL 8 (CI); a real reminder to a real client (never sent by an agent) |

## 2026-11-09 (latest) · Phase 6 released and checked live: certificates end to end (`01d2269`)

**Scope:** D-058, K-134 and the certificate part of K-061. **Method:** tests first (19 of 21 red against the old code), then code, then mutation checks on the guards, then the full gates.

| Check | Result |
|---|---|
| Issue | `tests/server/certificates.test.ts` (21 tests): 201 with a `GK-XXXX-XXXX-XXXX` reference, no look-alike characters, 25 issued with no repeat, date defaults to today, blank/impossible/future dates refused with nothing written, audit row `certificate_issue` with the issuer and the reference |
| Roles | list, issue and revoke refused (403) for manager, trainer, editor, employee and client, 401 signed out; super admin and admin allowed |
| Revoke | verify then 404; 404 for a missing id, 409 for a second revoke with one audit row |
| Verify | returns only id, recipient, programme, issued date; lower-case and spaced input accepted; a revoked, unknown, malformed, wildcard, injection-shaped and 500-character reference all give the identical 404; `no-store`; POST 405 |
| Throttle | 5 hits write nothing; 20 misses then 429, even for a real reference, with no more rows written; allowed again after the window; the guess is not stored |
| Mutations | removing `revoked_at IS NULL`, raising the throttle limit, dropping the role list and dropping the future-date rule each made at least one test fail (all four applied) |
| Model | `certificatesModel.test.ts`, 6 tests written red first |
| Gates | `tsc -b` clean; `pnpm test` 639 in 56 files; `pnpm run test:server` 583 in 45 files (MariaDB 11.4; the retention and privacy tests that count certificates still pass); lint ratchet 5 of 5; `docs:check` PASS |
| CI and release | PR #30: all jobs green including the server suite on MySQL 8; `main` fast-forwarded to `01d2269`; the release job succeeded |
| Live (read-only) | `pnpm run check:live` 16 of 16; `verify.php?id=` an unknown reference gives 404 `No matching certificate.` with `Cache-Control: no-store`, no id gives 400, POST gives 405; `certificates.php` list and issue without a token give 401; `/verify` and `/verify/<ref>` give 200; the live `certificates` table is empty and the one `certificate_lookup_miss` row is my probe |
| Not tested | The Certificates screen and the `/verify` form in a browser (the Chrome extension was not connected); a real issue, verify and revoke (it would write a real row) |

## 2026-11-09 (later) · Phase 5 released and checked live: the legacy sign-in is retired (`ed58064`)

**Scope:** D-057. Clerk is the only sign-in; K-132 and K-133 fixed in code. **Method:** tests written first (red against the old code, then green), mutation-free review of every deleted route, then the full gates.

| Check | Result |
|---|---|
| Retired actions | `tests/server/legacy-retired.test.ts`, 25 tests: login, forgot, reset, magic request/consume, logout, revoke, twofa_*, sessions answer 404 "Unknown auth action."; `oauth.php` and `client_access.php` answer 404; `me` still 200 or 401 |
| Users | create ignores a password (hash `!`); invite creates the row, writes no reset token, audits `user_invite`, returns `{id, emailed}`; client role 400, duplicate 409, admin inviting a super admin 403; seed only from `$SEED_ADMIN_EMAIL` on an empty table |
| Stored sessions | A raw or hashed stored token still authenticates until it expires (`token-hashing.test.ts`); an anonymised client's session is refused |
| Auth store | `auth.store.test.ts`: the old persisted token is discarded, the user is kept (version 2 migration) |
| Gates | `tsc -b` clean; `pnpm test` 632 in 55 files; `pnpm run test:server` 562 in 44 files (MariaDB 11.4); lint ratchet 5 of 5; `php -l` on changed files; `pnpm run verify` and `docs:check` PASS |
| CI and release | PR #29: all jobs green including the server suite on MySQL 8; `main` fast-forwarded to `ed58064`; the release job succeeded |
| Live | `pnpm run check:live` 16 of 16; `client_access.php` and `oauth.php` 404 `Not found.`; `auth.php?action=login` GET and POST 404 `Unknown auth action.`; `?action=me` without a token 401 |
| Signed in (owner's Chrome, the old persisted session) | `/app/account` loads with the Profile and Sign-in security cards; **Manage sign-in and devices opens Clerk's account panel** (Profile, Security); Settings shows Team & roles, Announcements, Integrations, Audit log, Privacy (no Security or My sessions tab) and no 2FA column |
| Not tested | A fresh sign-out and email-code sign-in on `/login`; the Add user dialog with a real invite (it would email); CSP report listener on these two screens; a client-role sign-in |

## 2026-11-09 · Phase 4 released and checked live

Released `cbfd527` (K-129, K-130, K-131, K-135; PR #28): the release job started 3 s after the slowest check (CI ran the server tests on MySQL 8 as well as the local MariaDB 11.4), changed 33 and added 64 `dist/` files and changed 11 server files; smoke passed; `pnpm run check:live` 16 of 16. Signed-in browser walk with a passive CSP listener: 24 screens, all landed, none still loading after 6 s, 0 CSP violations, 0 console errors, no dashboard error banner. Nine routes sent an id that cannot exist (999999999, with the owner's own session, nothing created or changed) each answered 404 with a clear message. **Not tested live:** a real invoice paid by Stripe or by hand (no invoice exists to pay without taking a real payment, and none was made), PayPal's return path (ships off, no fake), and the editor dashboard (the only live account is a super admin). **Self-corrections:** my first design refused to pay or chase draft invoices; the existing journey test showed that breaks the owner's flow and would leave real money unrecorded, so I reverted that part before committing. My new tests leaked a `project_dev` row into an older test until I added three tables to the test reset.

## 2026-11-08 (later) · Phase 3 released and checked live

Released `b301ec7` (K-127, K-128, K-140), the first release to wait for CI by design: the release job started 3 s after the slowest check. `pnpm run check:live` 16 of 16. In the signed-in browser, with a passive `securitypolicyviolation` listener: 24 CMS screens walked client-side, 0 CSP violations, 0 console errors; Invoicing takes about 1 s to load (two calls of ~640 ms), not a hang. Two live fault-injection tests (page-side stubs, no writes, nothing stored): a 401 answered for one call to `/leads.php` made the app call `auth.php?action=me` and restore the user; a stubbed 500 for ticket 999 showed the server's message with Try again, and Try again asked again. **Test-rig note:** an earlier attempt stacked four `fetch` wrappers and Clerk's `getToken()` then timed out; a fresh page with native `fetch` gave a token in 0 ms, so that run was my rig and not the release, and I discarded it. NOT TESTED: a real file download, a real project status change.

## 2026-11-08 · Whole-codebase review, release check and signed-in check (`main`, read-only apart from the owner-approved server steps)

**Scope:** what the app does, every screen, API route and table, what is connected, what is unused or
half-finished, and what is inconsistent, judged from the code and not from the documents. Then the release of
`golive/2026-11` (`983606c`) and the hand-applied server items in `docs/DEPLOYMENT.md` section 5.

**Method:** nine readers covered the 421 tracked files in full (`api.ts`, many `lib` files and the 44 server test
files were scanned or counted, not read line by line); I re-checked the headline findings myself. Marked below:
**confirmed** (I read or ran it) and **reported** (from a full read, not re-checked; verify before fixing). A
graphify structural graph of the code (2,676 nodes) found no orphan source file but cannot see the procedural PHP
endpoints, so the endpoint and table maps were done with grep and the readers.

| Item | Result | Evidence |
|---|---|---|
| Shape | 49 endpoint files and 17 helpers, 42 tables, 32 prerendered public pages, 25 CMS modules plus My account in seven destinations. Routes, `MODULE_ROLES`, navigation and search agree. Every `.php` path in `api.ts` exists. Every table the PHP queries is in the schema | grep and route files; **confirmed** |
| Checks (on a copy, then on `main`) | PHP lint 66 of 66; `tsc -b` exit 0; unit 575 passed; server 566 passed (MariaDB 11.4.13); lint ratchet 5 of 5; `docs:check` PASS; `pnpm run verify` OK; CI green on PRs #24 and #25 | **confirmed** |
| Live site | `pnpm run check:live` 9 of 16 before the release, **16 of 16 after**. The live `/assets/` and `/uploads/` directory listings (K-125, contents not read) closed by the `.htaccess` upload | **confirmed** |
| Signed-in check | Owner signed in through Clerk; `/app` loads as Super admin; 24 CMS screens visited client-side: 0 CSP violations, 0 console errors. Mailbox skipped on purpose. The browser console tool cannot see CSP reports (proved with a deliberate violation), so an in-page `securitypolicyviolation` listener was used. Load-time violations on a full page load are not covered | **confirmed** |
| K-121, K-123, K-126 | Closed with evidence: 0 accounts with app two-factor; a forged `CF-Connecting-IP` aimed at the origin was ignored; mail certificates verify and the inbox opens with validation | **confirmed** (`docs/DEPLOYMENT.md` section 5) |
| New findings | K-127 to K-139 | below and in `docs/KNOWN-ISSUES.md` |
| Not tested | Real default-model failure in production; any data flow on real data; Stripe, SMTP sends, Clerk sign-up; the live database against `schema.sql` | UNVERIFIED |

**New findings (detail in the register):** K-127 staff file download probably sends no token under Clerk; K-128 a
file share can expire a public portfolio image's token; K-129 updates that reset fields they were not sent;
K-130 updates and deletes that report success for missing ids; K-131 "paid" is recorded differently on four paths;
K-132 the forgot-password flow stores a token and never emails it; K-133 the legacy sign-in screen is unreachable in
the Clerk build; K-134 certificates cannot be issued; K-135 role lists differ across endpoints; K-136 the contact
form has only an IP limit; K-137 legal-page gaps and a stale cookie policy; K-138 the deploy does not wait for CI;
K-139 dead code and schema drift.

**Corrections to my own reports:** the first "no console messages" results were meaningless (above); `/README.md`
and `/config.php.bak` answer 200 with the app page because the files are not uploaded, which is not an exposure
(the live check was fixed to say so); my first smoke loop after the `.htaccess` swap had a shell bug and was re-run by
hand at once, with no change needed.

## 2026-11-01 (continued into 2026-11-02) · Go-live hardening, second pass (`golive/2026-11`, local only)

**Scope:** the owner's checklist (keys, environment, admin routes, authentication, access, forms, XSS, rate
limits, endpoints, CORS, headers, debug, dependencies, unused packages, exposed files, database, password
hashing, git secrets, a full audit, `X-Powered-By` and the server version), with the instruction "make the best
call". Each fix written test-first and seen failing; decisions in D-055. Nothing pushed, deployed or changed
on the server, Clerk, Cloudflare or GitHub.

| Item | Result | Evidence |
|---|---|---|
| Two-factor through Clerk (K-121) | **Fixed.** Reproduced first: a TOTP super_admin got 200 through Clerk with no second factor; now 403 unless Clerk's `fva` shows one; `pending` sessions 401 | `clerk.test.ts`, 7 new |
| AI cap (K-122) | **Fixed.** Every attempt counts; slot taken under a per-user lock | `ai.test.ts`, 3 new or changed |
| Forms and input | **Fixed:** contact JSON only (415); `dev.php` links http(s) only; `github.php` refuses `.` and `..`; client email (K-120, first pass). Honeypot rejected (D-055) | `contact-hardening`, `input-hardening` |
| Cron billing race (deferred unit) | **Fixed:** named lock; an overlapping run skips | `cron-billing-lock.test.ts` |
| Passwords | **Fixed:** bcrypt cost 12 stated, weaker hashes replaced at the next sign-in | `password-rehash.test.ts` |
| Headers, CSP, listing (K-033, K-058, K-125) | **Fixed in code:** API CSP, `no-store` when signed in, no `X-Powered-By` (live sent `PHP/8.4.27`); `.htaccess`: CSP enforced on public pages and Report-Only on the shell, HSTS, COOP, version headers unset, `ServerSignature Off`, directory requests 404 (live listed `/assets/` and `/uploads/`) | `headers.test.ts`; Apple Apache 2.4.67 with listing on, staged document root: every deny 403, listing 404, headers present; headless Chromium through that Apache, 32 pages x 390 and 1440px: **64 of 64 with no CSP violation**; the build fails on a wrong hash (tried) |
| Exposed files (live, read-only GETs) | `config.php`, includes, `.git`, `.env`, `.htaccess`, `error_log`, `uploads/.htaccess` 403; `schema.sql`, `README.md`, `.user.ini`, `config.php.bak`, `package.json`, `docs/` and others return the app shell, not the file; only the listing above was a leak | 30 paths compared byte-for-byte with the shell |
| Debug mode | No `display_errors`, `phpinfo`, `var_dump` or `console.log` in tracked code; `GK_DEBUG` false in the template; no source maps in `dist/`; the stub hides errors before loading. Live private config UNVERIFIED | grep, `dist/` scan |
| Keys and environment | One `VITE_*` variable, the Clerk publishable key (public by design); no secret in `dist/`; secrets live only in the private config | grep, `dist/` scan |
| Git secrets | gitleaks 8.30.1 over 521 commits: 7 hits, all false positives (synthetic fixtures, the public Clerk key), now allowlisted by exact value; clean | `gitleaks git` |
| Semgrep 1.182 (`p/php`, `p/react`, `p/typescript`, `p/secrets`) | 8 results to **0**: 7 in the retired `weather.php` (now a 404 stub), 1 dummy timing hash (`nosemgrep` with reason) | local run |
| CI | gitleaks and Semgrep added (neither ran, against the house rule), pinned; Node from `.node-version` (24.22.1, was 22); CI PHP 8.4 (was 8.3) | not yet run on GitHub |
| Dependencies (K-017, K-041) | `npm update` in range, SheetJS 0.20.3 from its CDN: **0 critical, 0 high** (was 1 and 7); 13 moderate left, all ESLint dev tooling (needs the ESLint 10 major, planned) | `npm audit` |
| Unused packages | None: every dependency is imported or used by config (types, PostCSS, Tailwind, tsc) | import scan |
| CORS | Exact allow-list, no credentials; dev is proxied same-origin, so `localhost:5102` left the template; live config UNVERIFIED | source |
| Admin routes, access, endpoints, SQL | Re-confirmed from the first pass: every endpoint calls `require_auth` with a staff list; client isolation holds; prepared statements only | first-pass section below |
| Mail TLS (K-126) | Switch added (`$MAIL_VERIFY_TLS`), **off** until the owner tests it | `php -l` only |
| Database | Prepared statements, hashed tokens, bcrypt 12. DB user privileges, remote access and backups are host settings: NOT TESTED (K-010) | — |
| Server version | `X-Powered-By` removed in PHP and `.htaccess`; Cloudflare replaces `Server`; `ServerTokens` is host-only | — |

**Gate (Mac):** `pnpm run verify` PASS on each of 8 commits, run with the rest of the work stashed so it checked
only that commit; `pnpm test` 556 of 556 in 48 files; `pnpm run test:server` 562 of 562 in 44 files (MariaDB 11.4,
539 s); lint ratchet 5 of 5; `docs:check --base main` PASS.
**NOT TESTED:** LiteSpeed (the live server) with the new `.htaccess`; Clerk under the shell's CSP; CI on GitHub
for this branch; the mail certificate check; the live private config and stub.

## 2026-11-01 · Go-live security audit and SEO audit (`golive/2026-11`, local only, not released)

### Security audit (security-audit skill, quick profile)

**Method:** source review only. One wave of 7 hunters over 14 coverage units, one final coverage critic, one
fresh independent verifier per candidate. No OS-enforced sandbox was provisioned, so the audit itself ran no
target code; the K-120 fix was then reproduced and checked with the project's own server test harness
(local MariaDB 11.4, loopback only). Nothing was sent to gakinz.com, Clerk or any provider. Source ref
`3225e01`. Run record (findings, coverage ledger; both validators PASS) kept outside the repository.
**Partial pass:** quick profile; 2 units deferred (below).

**Result: 0 confirmed Critical or High.** 4 leads, all "needs validation" (no severity until proven):

| Lead | Where | What decides it | State |
|---|---|---|---|
| Clerk sign-in skips app two-factor (K-121) | `_bootstrap.php` 104-114, `_clerk.php` 192-213 | Whether any active account has `totp_enabled = 1`; owner decision under D-052 | **Left for the owner** (a fix could lock the owner out) |
| SMTP command injection through a client email (K-120) | `clients.php` create/update, `invoices.php` chase, `cron.php` chase, `_smtp.php` 83 | Live mail server pipelining | **Fixed**: reproduced locally (CR/LF stored, reached the transport), test-first, `b19633e` |
| Per-IP throttles vs the forgeable CF-RAY lock (K-123) | `.htaccess` 10, `auth.php` 63, `contact.php` 27 | Host "client IP from header" trust setting | **Left for the owner** (host setting) |
| AI daily cap counts only successes (K-122) | `ai.php` 36-64 | Provider billing of failed calls | Open, Low if confirmed |

**Covered with no finding** (source): authorisation on every write and read across all 49 endpoints
(every branch calls `require_auth` with a staff list before touching data; no list includes `client`);
client-role isolation (portal, support, assets, bookings, feedback, files); SQL (every `->query()` is
static; every dynamic column list, `IN (...)`, `LIMIT` and table name comes from constants); uploads
(extension allow-list plus sniffed MIME, server-generated names, no SVG/HTML/PHP, `stored_path()`
traversal and symlink guard, attachment download with `nosniff`, deny file in `uploads/`); outbound fetches
(fixed hosts; the uptime monitor pins resolved public addresses and follows no redirects); public forms
(`contact.php` stores only, 5 per 15 minutes per IP, sends no mail, SMS or AI); Clerk token checks (RS256
only, `kid` from the pinned issuer's JWKS, `iss`, `azp`, `exp`, `nbf`, `sub`; first-sign-in link only to an
unlinked active row); Stripe webhook (HMAC, 5-minute window, event de-duplication, amount and currency
match); stored XSS (the only HTML sink is the escaped JSON-LD); secrets (tracked files and full git history:
no live key; `release.json` holds the public Clerk publishable key only).

**Private config stub:** the document-root `config.php` is not in the repository, so the live stub is
UNVERIFIED. Template added (`server/config.stub.php.example`): `require` of
`dirname(__DIR__)/private-config/gakinz_com/config.php`, errors hidden first; checked in a throwaway tree to
stop (exit 255) when the private file is missing and to load it when present (K-124).

**`.htaccess` and CSP:** denies config, includes, docs, SQL and logs; added a deny for dotfiles, backups,
`*.example` and `config.php.*`. No CSP (K-033) and no HSTS in the file (K-058); a report-only CSP draft is
below. The origin lock is K-123.

**The 5 lint errors:** all `react-hooks/set-state-in-effect` (`theme-toggle.tsx` 12; `Contracts.tsx`;
`Portal.tsx`), render-cascade only, no security relevance (K-002). Not changed.

**Deferred (quick profile, critic):** `cron.php` billing (select-then-insert with no lock could create a
duplicate retainer invoice if a web call overlaps the cron run) and digest recipients; `mail.php` IMAP read
actions (`/novalidate-cert` at line 42).

**Hardening noted, not done:** `files.php` lets any staff role share or delete any file; an editor can make an
image file permanently public through a draft Work record; SMTP and IMAP skip certificate checks;
`github.php` accepts `..` in owner/repo; `comms.php` has no send cap; `dev.php` URLs have no scheme check;
`proposals.php` share tokens survive client deletion; `require_auth()` with no role list admits clients
(every current call is self-scoped); the deploy key sits on the runner while dependencies run, and actions
are pinned by tag. CSP draft (report-only first): `default-src 'self'; script-src 'self' 'sha256-<next-themes
inline script>' https://clerk.gakinz.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline';
img-src 'self' data: https://img.clerk.com; font-src 'self'; connect-src 'self' https://clerk.gakinz.com;
frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'none'`.

### SEO audit (claude-seo, gakinz.com, read-only)

**Method:** all 32 sitemap URLs fetched from the live site (all 200), head and body parsed; `robots.txt`,
`sitemap.xml`, `llms.txt` and response headers read; lab Core Web Vitals in headless Chromium (mobile: 4x CPU,
1.6 Mbps, 150 ms). The plugin's own runtime was not installed (needs `/seo setup`), and no CrUX, Search Console
or Analytics data was available, so field data is NOT TESTED. **Estimated health: 71/100 before this branch.**

| Area | Finding | Done |
|---|---|---|
| Crawl and index | Every page prerendered, own canonical matching the sitemap, `en-GB`, no noindex on public pages, `/app/`, `/p/`, `/verify/` and `*.php` disallowed | PASS |
| Sitemap | Build date as `lastmod` on 29 pages, so every release claimed every page changed | **Fixed**: `lastmod` only on posts with their own date |
| Schema | Home: Person and WebSite only; posts: Article with author by `@id` only; no Organization/LocalBusiness, Service or breadcrumbs | **Fixed**: ProfessionalService (London, email, the six services; no address, phone or company number), Service on each service page, BreadcrumbList on service, work and writing pages, Article author named, image added. Not yet run through Google's Rich Results Test (owner, after release) |
| Core Web Vitals (lab) | Home mobile LCP 1.70 s (hero image), CLS 0.003; `/services`, `/work`, `/services/web-design` LCP under 0.4 s; 150 KB of compressed JS | PASS (lab only) |
| Caching | Hashed JS cached 4 hours, CSS 7 days | **Fixed in `.htaccess`** (1 year, immutable); hand-applied, and Cloudflare must respect origin headers |
| Titles and descriptions | Unique on every page, but brand-first with no service or place ("Web design · Gideon Akinlotan"); several descriptions under 80 characters (pricing 50) | Copy: left for the owner (list below) |
| Content depth | Service pages 206 to 341 words, case studies about 230 to 260 | Copy: left for the owner |
| Home H1 | Screen-reader sentence plus the animated words, so a crawler reads the line twice | Left: design change, needs the owner's OK |
| AI search | `llms.txt` matches the site; search and answer bots allowed; Cloudflare's managed `robots.txt` blocks training bots (ClaudeBot, GPTBot, Google-Extended, Applebot-Extended), which does not stop AI search citing the site | Owner's Cloudflare choice |
| Trust signals | No portrait, no real social profiles (`sameAs` empty), no company number, no reviews | Owner inputs |

**Copy changes for the owner** (titles keep the " · Gideon Akinlotan" suffix the code adds):
1. Home title: "Web designer and developer in London" (now "Gideon Akinlotan · designer and developer, London").
2. Service titles: "Web design for small businesses", "Website development, hand-built", "Ecommerce websites",
   "Website care and maintenance", "IT support for small businesses in London", "IT consultancy for small
   businesses". Pricing: "Website prices, fixed in writing".
3. Descriptions of 120 to 155 characters naming the service and London for Pricing (50), Writing (59),
   Web development (70), Website care (71), Web design (73), MimmyCare (70).
4. Service pages to about 500 words: who it is for, what is included, a typical timeline, a price anchor
   linking to Pricing, two or three questions and answers.
5. Case studies: the problem, what was built, one measured or quoted result (with the client's permission).
6. Trust: a portrait, the real LinkedIn or GitHub profile (feeds `sameAs`), the company number if there is
   one, and a Google Business Profile as a service-area business (no street address needed).

**Gate (Mac):** `pnpm run test:server` 541 of 541 in 39 files (local MariaDB 11.4, 640 s; `smtp-recipients.test.ts` added, 5 tests); `pnpm test` 551 of 551; `pnpm run verify` PASS before each commit (typecheck, lint ratchet 5 of 5, `pnpm test`, `php -l`,
build with 32 prerendered pages); `pnpm run docs:check --base main` PASS.

## 2026-11-01 · Release check on gakinz.com (`bde12c7`)

**Release:** `main` fast-forwarded to `bde12c7` and pushed with the owner's approval ("push live"). CI (MySQL)
and Deploy both passed. `release.mjs`: server `_ai.php` new, `ai.php` and `integrations.php` changed; snapshot
`~/backups/gakinz_com/releases/20261101T074732Z` (36 files); 3 smoke checks passed.

**Live, from outside, signed out:** `/`, `/work/`, `/app/login`, `api.php` 200; `auth.php?action=me` 401;
`ai.php` and `integrations.php` 401; `_ai.php` 403 (the include deny). NOT TESTED: a signed-in AI draft, which
waits for the owner to save the keys with `scripts/set-server-key.sh`.

## 2026-11-01 · Cleanup and AI provider check (`chore/cleanup-2026-11-01`, local only)

**Dead code** (knip 5, then read by hand): removed the weather pill and the `weather` API group, the old
`src/layouts/Footer.tsx`, the unused Avatar and Collapsible components with their two Radix packages, and the
unused work-record hooks in `src/marketing/data/work.ts`. Kept on purpose: the shadcn kit's unused exports, the
`entry-server.tsx` exports (used by the prerender), the `ROLE_REFUSAL` re-export, and `server/weather.php` (a
release never deletes on the server, so removing it from git would leave an untracked live copy).

**Housekeeping:** one worktree; merged local branches `design/gakinz-design-skill` and
`feat/design-finalisation` deleted (origin has `main` only); no stash; empty `qa/`, `.playwright-mcp/` logs and
`.DS_Store` files removed. `.superpowers/` (owner plans) and `graphify-out/` kept.

**Documents:** STATUS (1,211 to about 200 lines), WORKBOOK, DEPLOYMENT section 5, DESIGN-SYSTEM, CLAUDE,
README, ARCHITECTURE and the task contract rewritten to the current state; history left the tree under D-044
and is read at `ee1281f`. Stale rows corrected: K-025, K-082, K-113, and K-001 and K-015 in STATUS section 5.

**AI (K-119, D-054):** `tests/server/ai.test.ts`, 9 tests against the fake provider: Anthropic first with
API version `2026-10-21` and `fallbacks: "default"`; OpenRouter on a 529, on a refusal, with no Anthropic key and
with a placeholder key; 502 when both fail (and the call is not counted); 503 with no key; 401 signed out, 403
for a client; `integrations.php` reports booleans only. `scripts/set-server-key.sh` tried against a throwaway
HOME: replaces or adds the line, rejects unknown names and odd characters, keeps mode 600, backs up first.
NOT TESTED: a real call to either provider, and the script against the real server.

**Gate (Mac, final tree):** `pnpm run build` PASS (32 pages prerendered); `pnpm test` 545 of 545; `pnpm run test:server`
536 of 536 in 38 files (local MariaDB, 515 s); lint ratchet 5 of 5; `docs:check` PASS (24 documents); `php -l` clean on
all 66 PHP files. CI on MySQL not yet run for this branch.

## 2026-10-31 · Release check on gakinz.com (`a907824`)

**Release:** fast-forward of `main` to `a907824`, pushed with the owner's approval; GitHub Actions ran
`scripts/release.mjs --go`: dist 44 changed and 68 new, server 1 changed (`client_access.php`: the live copy
lacked a comment-only change from `7f6c73b`, a `[skip ci]` commit; the on/off switch is in `config.php`,
which is never sent). Snapshot `~/backups/gakinz_com/releases/20261031T182747Z`; 3 smoke checks passed.

**Live, read-only, axe-core 4.14.0:** `/`, `/work/`, `/work/ego/`, `/work/harni/`, `/work/gakinzos/`,
`/pricing/`, `/about/`, `/services/`, `/contact/`, `/login` at 390 and 1440px: **20 of 20 clean**. Every page
above and `/images/work/ego-d.webp` answer 200; `client_access.php?action=status` answers 404 (still off).
Sign-in seen in a browser: Clerk's card frame is gone and the tokens apply. Clerk's grey "Secured by Clerk"
panel was removed in release `fdc5d94` the same evening (owner-approved); live captures of `/login` and `/`
at 390 and 1440px clean, panel confirmed gone. **NOT TESTED:** signing in, the CMS with real data, Safari, real phones.

## 2026-10-31 · Build verification, `feat/design-finalisation` (released the same day)

**Scope:** the approved design (D-053) built into the code; checked on loopback builds with no route to the
live API (`.claude/skills/gakinz-design/scripts/serve.mjs`; every `.php` answers 404 or labelled sample data).
axe-core 4.14.0. **Result: PASS on everything measured below; Clerk styling NOT TESTED in a browser.**

- Gate: `pnpm run build` PASS (32 prerendered pages); `pnpm test` PASS (545 of 545); `tsc` PASS;
  `pnpm run lint:ratchet` PASS (5 of 5); `pnpm run docs:check` PASS.
- Public site: 33 routes (every prerendered page and `/login`) × 390, 834, 1440, 1920, 2560:
  **165 of 165 clean** (no overflow, no page errors, zero axe violations).
- Row fill: 11 pages × 5 widths (390, 834, 1050, 1440, 1920), no grid with a short last row: **PASS**.
- Hero: every slide at 1440 and 390px with axe: **PASS** (4 of 4 each).
- GAkinzOS (build without Clerk, sample data): 26 modules × light and dark × 390, 834, 1440, 2560:
  **208 of 208 clean**. The first run found K-114 and K-118 in existing code; both fixed and re-run.
- Looked at by eye: Selected work, /work, Pricing, About, a case study without screenshots, Services at
  1440; Projects in both themes at 390, 834 and 1440; Site content dark; Today at 2560.
- **NOT TESTED:** Clerk's form with the new appearance (the production instance does not load on a local
  origin; check on the live site after release), Safari or WebKit, real phones, a screen reader, the
  signed-in CMS with real data.

## 2026-10-31 · Design audit, prototype verification and a first check of the built site

**Scope:** gakinz.com (read-only viewing), a local build of `main` (`pnpm run build`, served by
`.claude/skills/gakinz-design/scripts/serve.mjs` with every `.php` answering 404), and the approved
prototype (D-053). Method: the product-design skill. **Result: PARTIAL**: the prototype passes everything
measured; the built site has open findings K-112 to K-117.

**Built site (`main`, 31 Oct 2026):** 9 routes (`/`, `/work`, `/services`, `/pricing`, `/about`, `/contact`,
`/work/ego`, `/work/harni`, `/login`) at 390, 834, 1440, 1920 and 2560px with axe-core 4.14.0:
- Overflow and page errors: **PASS**, 0 of 45 captures.
- axe: **FAIL**, 45 of 45 captures. `label-content-name-mismatch` on the logo links (K-114): 40 public, 5 sign-in.
  `color-contrast` on `/work/harni` at 1440, 1920 and 2560px (K-115).
- Field borders: **FAIL** by measurement (K-113); axe does not test 1.4.11.
- Layout gaps P1 to P9 and C1 to C3 (K-112): seen in a browser, measured at 390 to 1440px.

**Prototype (approved):**
- 185 captures (37 routes × 5 widths): **PASS**, zero overflow, page errors and axe violations.
- 47 state audits (dark theme on 25 CMS screens, 11 open dialogs, drawers and popovers in both themes):
  **PASS**.
- Every hero slide at 1440 and 390px: **PASS**.
- 38 workflow checks driven by clicks and typing: **PASS**.
- Contact sheets at every width inspected by eye; each layout fault found this way was fixed and re-checked.

**Also found:** `vite preview` proxies `.php` to the live API (K-116; one refused read, nothing written);
Google sign-in visible against D-052 (K-117).

**NOT TESTED:** Safari or WebKit, real phones, a screen reader, file uploads, signed-in GAkinzOS on the built
site, and the live site after any change (none was made).

## 2026-10-16 · Accessibility Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Accessibility audit

**Target:** WCAG 2.2 AA
**Scope:** the public surface at `/`; since 2026-10-16 also a first automated check of eight GAkinzOS screens (section 9.6).
**Date of this run:** 2026-09-22, re-audited for D-046 on 2026-10-16 (section 9)
**Result: PASS on everything listed as measured below. One category, screen-reader
behaviour with real assistive technology, remains NOT TESTED.**

**Later evidence (2026-10-10).** The public surface was rebuilt on the D-037 design system
after this run, so these figures describe the 2026-09-22 build. The rebuild was checked on 9
routes at 5 widths for overflow, for AA contrast on every colour pairing, and with Lighthouse
mobile (accessibility 100), against a local production build. A full axe sweep of the rebuilt
surface has NOT been re-run, and the CMS remains NOT TESTED.

**Superseded UI (2026-10-14).** The public site was rebuilt again under D-046 on branch
`feat/redesign-2026` (not deployed): new palette, type families, hero motion and markup on
every page, and GAkinzOS was restyled. **Neither the 2026-09-22 figures below nor the
2026-10-10 re-check describe the current interface.** The redesign was checked only with
Playwright against mocked API responses at 1440, 1024 and 390px, light and dark, for layout
and overflow; no axe sweep, contrast measurement, focus check or screen-reader pass has been
run on it. Re-run section 8 against a local production build of the redesign
(`docs/KNOWN-ISSUES.md` K-045).

**Re-audited 2026-10-16.** Section 9 is the current measurement of the D-046 build: axe on 15
public routes at two widths and on eight CMS screens in both themes, contrast on rendered
pixels for every hero slide, keyboard and reduced motion. Five defects were fixed; two brand
colour failures are open for the owner (K-050, K-051).

---

### Why this file reads the way it does

This project has a history on this point. `docs/DECISIONS.md` D-020 records that an
earlier claim of zero accessibility violations was withdrawn, and the previous site
animated the figure `100% Accessible, WCAG 2.1 AA` on its home page while its own
documentation retracted it.

So nothing here is asserted. Every line below states what was run, against what, on
what date, and what it returned. Where something was not measured, it says so, and the
absence is not softened into a quieter claim.

The public copy now makes no accessibility claim at all. The evidence lives here.

---

### 1. Method

The site was built for production (`pnpm run build`) and served locally with
`pnpm run preview` on port 5102. Measurements were taken against that build in Chrome,
driven through the DevTools protocol.

Using the production build rather than the dev server matters: the dev server serves
unbundled modules and injects CSS differently, and an early measurement run against it
produced a false negative that is described in section 6.

| Tool | Version | What it was used for |
|---|---|---|
| axe-core | 4.10.2 | Automated rule sweep across every public route |
| Lighthouse | via Chrome DevTools | Accessibility category score |
| Chrome DevTools protocol | — | Contrast on rendered pixels, focus indicators, reflow, target size |

Automated tools catch a minority of accessibility problems. The manual and computed
checks in sections 3 to 5 exist because of that, and section 7 is honest about what is
still not covered.

### 2. axe-core sweep

Rule sets: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`.

**16 routes. 0 violations.**

| Route | Passes | Violations |
|---|---|---|
| `/` | 36 | 0 |
| `/work` | 38 | 0 |
| `/work/:slug` | 36 | 0 |
| `/about` | 36 | 0 |
| `/services` | 34 | 0 |
| `/services/:slug` | 35 | 0 |
| `/pricing` | 36 | 0 |
| `/sectors` | 36 | 0 |
| `/resources` | 34 | 0 |
| `/resources/:slug` | 34 | 0 |
| `/contact` | 47 | 0 |
| `/privacy` | 35 | 0 |
| `/terms` | 35 | 0 |
| `/cookies` | 35 | 0 |
| `/verify/:id` | 34 | 0 |
| 404 | 35 | 0 |

Four nodes across two routes returned `incomplete` for `color-contrast`, meaning axe
could not resolve the effective background itself. All four are the small mono index
labels. They were measured by hand at **5.28:1** against paper, which passes. They are
not failures; they are cases the automated tool declined to judge.

**Lighthouse accessibility category, mobile, on the production build: 100.**
Also Best Practices 100, SEO 100, Agentic Browsing 100. 54 audits passed, 0 failed.

### 3. Colour contrast, measured on rendered pixels

Every element carrying a direct text node was walked across `/`, `/work`, `/about`,
`/contact`, `/pricing` and `/resources`. Foreground came from the computed style;
background was resolved by walking ancestors to the first non-transparent surface. The
ratio was computed with the WCAG relative-luminance formula, and the threshold chosen
per element from its rendered size and weight.

Elements inside an `aria-hidden` subtree were excluded, because they are not exposed.

**28 distinct foreground / background / size combinations. 0 failures.**

| Lowest ratios found | Required | Result |
|---|---|---|
| 4.91:1 — ink-mute on the sunk band, 16px and 12px | 4.5:1 | PASS |
| 5.28:1 — ink-mute on paper | 4.5:1 | PASS |
| 6.03:1 — red oxide on the sunk band | 4.5:1 | PASS |
| 6.48:1 — red oxide on paper | 4.5:1 | PASS |
| 7.17:1 — ink-soft on the sunk band | 4.5:1 | PASS |
| 7.70:1 — ink-soft on paper | 4.5:1 | PASS |
| 9.20:1 — on-dark-soft inside the dark band | 4.5:1 | PASS |
| 15.69:1 — ink on paper | 4.5:1 | PASS |

The palette was designed against these numbers rather than checked afterwards. The two
retired brand accents, lavender `#7F77DD` and rose `#D4537E`, could not hold white text
or a flat block, which is the reason the previous site could only wash them into a
gradient.

#### Fixed here

| Was | Ratio | Now | Ratio |
|---|---|---|---|
| `--input` / `--border` `#DFDFE2` on white, every form-control boundary on the site | 1.33:1 FAIL | `--gk-edge` `#8E8577` | 3.29:1 PASS (1.4.11) |
| `::placeholder` at 0.7 alpha, compositing to `#8A8A8F` | 3.43:1 FAIL | full-strength ink-mute | 5.28:1 PASS (1.4.3) |

### 4. Focus indicators

Every focusable element on 13 routes was focused in turn, and its computed outline read
back and measured against the surface behind it.

**353 focusable elements. 0 failures.**

| Ring | Against | Width | Ratio |
|---|---|---|---|
| ink | sunk band | 3px | 14.46:1 |
| ink | paper | 3px | 15.53:1 |
| paper | inside the dark band | 3px | 15.80:1 |

Required: 3:1 (1.4.11). 3px also clears 2.4.13 Focus Appearance on thickness.

#### Two real defects found and fixed during this run

**The indicator painted nothing on part of the masthead.** The rule was
`box-shadow`-based and lived in `@layer base`. Tailwind's
`box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)`
chain overrode it on several elements, and all three variables resolve to `0 0 #0000`.
The element matched `:focus-visible` and drew nothing at all. The indicator is now an
`outline`, which is not part of that chain and cannot be clobbered the same way. The
box-shadow is kept underneath as a second layer.

**The ring was inverted on dark controls.** `outline-offset` puts the ring outside the
element, on the surface behind it, so a navy button sitting on paper needs an ink ring,
not a paper one. The first attempt flipped the ring for any dark element and measured
**1.01:1** — invisible. The rule now flips to paper only for controls *inside* a dark
band, where the gap really is dark.

Both were caught by measurement, not by reading the code, and neither was reported by
axe. That is the argument for section 3 and 4 existing at all.

### 5. Reflow, zoom and target size

| Check | Criterion | Method | Result |
|---|---|---|---|
| Reflow | 1.4.10 | 640x512 viewport, equivalent to 1280x1024 at 200%, across 8 routes | **PASS.** No horizontal scrolling, no element overflowing the viewport |
| Small-screen layout | — | 390px viewport | **PASS.** `scrollWidth` equals `clientWidth`, zero overflowing elements |
| Target size | 2.5.8 | Every link, button and form control measured at 390px | **PASS.** Nothing under 24x24 except the skip link, which is correctly `sr-only` until focused and 142x48 when visible |
| Zoom not blocked | 1.4.4 | `index.html` viewport meta | **PASS.** `width=device-width, initial-scale=1.0`, no `maximum-scale`, no `user-scalable=no` |
| Positive tabindex | 2.4.3 | Swept across three routes | **PASS.** None found |
| Unnamed controls | 4.1.2 | Swept across three routes | **PASS.** None found |

### 6. Source-level findings fixed in this release

Each of these came from the static audit of 2026-09-21 and was fixed in this work. The
axe sweep and Lighthouse run above were taken after the fixes.

| Severity | Finding | Criterion | Fix |
|---|---|---|---|
| Blocker | No skip link anywhere on the site | 2.4.1 | Added in `PublicLayout.tsx`, targeting `<main id="main">` |
| Blocker | Contact errors had no `id` and no field pointed at them with `aria-describedby`; nothing was announced | 3.3.1, 4.1.3 | Errors carry ids, fields reference them, and a `role="alert"` summary is present on every render |
| Blocker | Focus ring at 2.86:1 on paper and 2.48:1 on dark | 1.4.11 | See section 4 |
| Serious | Contact form was `noValidate` with no `required` and no visible marker, yet required three fields | 3.3.2 | `required`, a visible marker, and the ten-character minimum stated before it can be hit |
| Serious | Two Contact labels had no `htmlFor` and wrapped a Radix button | 1.3.1 | Native `select` with a real `label htmlFor` |
| Serious | Every route shared one `<title>` | 2.4.2 | Per-route `Seo` component |
| Serious | `role="menu"` and `role="menuitem"` on navigation links, with none of the ARIA menu keyboard pattern implemented | 4.1.2, 2.1.1 | The mega-menu was removed rather than completed |
| Serious | Heading level skipped h1 to h3 on Home, Services, Resources and Contact | 1.3.1 | `FeatureRow` and `IndexRow` take a level; defaults corrected |
| Serious | Testimonial rating was `aria-label` on a generic `div`, which assistive technology discards | 1.1.1, 4.1.2 | Rendered as real text |
| Serious | `ProposalView` rendered no landmarks at all | 1.3.1 | `header`, `main`, `footer` added |
| Moderate | No `autocomplete` on the contact form | 1.3.5 | `name`, `email`, `organization` |
| Moderate | Focus could be obscured by the sticky masthead | 2.4.11 | `scroll-padding-top` |
| Moderate | Loading and result states announced to nobody on Verify, Resources, ResourceDetail and ProposalView | 4.1.3 | `aria-live` regions |
| Moderate | Six inert `span`s on Resources styled to look like filters | 4.1.2 | Real buttons with `aria-pressed`, driven from categories actually present |
| Moderate | Footer social icon links measured 20x20 | 2.5.8 | Removed; they pointed at bare domains and are gone with them |

### 7. What is NOT TESTED

Stated plainly, because the value of this document depends on it.

- **No screen-reader pass with real assistive technology.** Nothing here was run through
  NVDA, JAWS or VoiceOver. The `aria-live` regions, the error-summary announcement, the
  contact form's error flow and the reading order of the work ledger are all inferred
  from markup and from axe, not observed. **This is the largest remaining gap.**
- **No voice-control or switch-access testing.**
- **No testing in a browser other than Chrome.** Focus behaviour and `:focus-visible`
  heuristics differ between engines.
- **No testing with Windows High Contrast Mode** or forced-colors.
- **No user testing with disabled people**, which is the only thing that finds the
  problems a specification cannot describe.
- **GAkinzOS at `/app/*` is entirely unaudited.** Its login page carries findings noted
  in the static audit that were not in scope here.
- The Lighthouse figure and the axe sweep were taken against a **local** preview build.
  Nothing has been measured against the deployed site, whose state is UNVERIFIED.

### 8. How to re-run this

```bash
pnpm run build && pnpm run preview          # port 5102
```

Then, in Chrome against `http://127.0.0.1:5102/`, inject axe-core 4.10.2 and run it over
each route with the six rule sets named in section 2. The contrast, focus, reflow and
target-size sweeps are DOM walks over computed styles; they need no library.

Re-run this file's measurements whenever the palette, the type scale, the focus rule or
any form changes. A number in this document that no longer matches the code is worse
than no number at all.

---

### 9. D-046 re-audit, 2026-10-16

This section replaces sections 2 to 5 as the description of the current interface. Sections 1 to
8 above describe the 2026-09-22 build and are kept as history.

**Result: PARTIAL.** After five fixes, axe reports 0 WCAG A and AA violations on 14 of the 15
public routes and on all 8 CMS screens in both themes. Two brand colours still fail contrast
on rendered pixels (K-050, K-051). Changing them would change the approved look, so they are
left for the owner. Real assistive technology is **NOT TESTED**.

#### 9.1 Method

Branch `qa/redesign-audits`, cut from `feat/redesign-2026` at `89c7829`. `pnpm run build`, then
`vite preview` on `127.0.0.1:5193`, driven by Playwright in headless Chromium.

**Nothing reached the live API.** Every `*.php` request was aborted on public pages, so they
rendered their built-in fallback content (108 requests blocked across the sweep, to `site.php`,
`work.php`, `blog.php`, `testimonials.php`, `book.php` and `verify.php`). Any request to another
origin was aborted too. On CMS screens every `*.php` request was answered by a mock: a
`super_admin` session from `auth.php?action=me` and empty lists everywhere else. No form was
submitted to a server.

| Tool | Version | Used for |
|---|---|---|
| axe-core | 4.13.0 | Rule sweep. Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`; `best-practice` run separately |
| Playwright | 1.63.0, Chromium build 1243 | Driving, keyboard, reduced-motion emulation, screenshots |
| Lighthouse | 12.8.2, mobile preset | Accessibility category (see `docs/AUDIT.md` section 9) |
| Pixel contrast walk | written for this run | Text axe could not judge, see 9.3 |

Public routes, each at 1440x900 and 390x844: `/`, `/work`, `/work/rotaflow`, `/work/heritage`,
`/services`, `/services/web-design`, `/pricing`, `/about`, `/resources`,
`/resources/what-makes-a-site-fast`, `/contact`, `/contact` after an empty submit, `/privacy`,
`/sectors`, `/verify/ABC123` and a 404 (`/nope`). The hero slideshow was paused before every
scan so a slide change could not land mid-scan.

#### 9.2 axe, public site

Before the fixes, WCAG rules:

| Route | 1440 | 390 |
|---|---|---|
| `/` | `color-contrast` 5 | 0 |
| `/work/rotaflow` | `color-contrast` 5 | 0 |
| The other 14 scans | 0 | 0 |

`best-practice` `heading-order` fired on 13 of the 16 scans at each width (1 node, or 2 on
`/work`). The `color-contrast` nodes are the five navigation links when the bar takes the
RotaFlow slide colour: white at 85% opacity on `#3B6FE0`, **3.80:1**. On `/work/rotaflow` the
current-page link's tint brings it to **3.76:1**. Both are K-050.

After the fixes (`ceb418c` for headings), `heading-order` is 0 everywhere. The 10
`color-contrast` nodes on `/` and `/work/rotaflow` at 1440 remain (K-050). Passing rules per
scan: 21 to 27. `/contact` after an empty submit: 0 violations at both widths.

**Hero, every slide.** Stepped with Next at 1440 and with the segment buttons at 390, where
Next is hidden. `color-contrast` only:

| Slide | Colour, text | axe violations 1440 / 390 | axe could not judge |
|---|---|---|---|
| 1 RotaFlow | `#3B6FE0`, white | 5 / 0 (navigation links, K-050) | 19 / 14 |
| 2 RitaGreen | `#33512D`, white | 0 / 0 | 19 / 14 |
| 3 Vitalcare | `#1B2E6B`, white | 0 / 0 | 19 / 14 |
| 4 Priya's Kitchen | `#4F2149`, white | 0 / 0 | 19 / 14 |
| 5 Herit Clothing | `#F59E0B`, `#16120A` | 0 / 0 | 19 / 15 |

The "could not judge" nodes are hero text drawn over the vignette and shading pseudo elements.
They were measured on pixels instead (9.3). `onColour()` correctly picks dark text for the
amber slide (8.69:1 at full strength). The brief's "light text on amber" case does not happen.

#### 9.3 Contrast on rendered pixels, hero and case heroes

For every visible text node in the home hero (all five slides) and in each of the 12
`/work/:slug` case heroes plus the navigation bar, the text was made transparent and the page
screenshotted. The worst background pixel under each text box was compared with the text
colour composited at its effective opacity. Controls with their own solid fill were compared
with that fill.

| Surface | Texts (1440 / 390) | Failing | Lowest |
|---|---|---|---|
| Slide 1 RotaFlow | 28 / 20 | 10 / 11 | **3.57:1**, mono case line at 80% |
| Slide 2 RitaGreen | 28 / 20 | 0 | 6.37:1 |
| Slide 3 Vitalcare | 28 / 20 | 0 | 7.03:1 |
| Slide 4 Priya's Kitchen | 28 / 20 | 0 | 7.44:1 |
| Slide 5 Herit Clothing | 28 / 23 | 8 / 3 | **1.90:1**, segment labels on the bottom shading |
| `/work/rotaflow` | 15 / 9 | 11 / 7 | **3.82:1**, navigation and meta at 85% |
| The other 11 case heroes | 15 or 16 / 9 or 10 | 0 | 4.55:1 (`/work/harni`) |

The RotaFlow failures share one cause: `#3B6FE0` holds white only at full strength (4.63:1),
and the design sets secondary hero text at 80 to 92% opacity (3.57 to 4.18:1). "See all the
work" sits on a lighter fill, 3.73 to 4.07:1. That is K-050.

On the amber slide, dark text works on the flat colour but not on the bottom 18% of the hero,
where a graphite gradient darkens it to about `#7B5411`. The segment labels (65% opacity)
measure 1.90 to 2.67:1 and the `05 / 05` counter 2.77 to 2.87:1. That is K-051.

#### 9.4 Keyboard and focus

| Check | Result |
|---|---|
| Tab through `/` at 1440 | **PASS.** 46 stops; every one shows a computed outline or ring. Ring contrast per element was not measured this time |
| Skip link | **PASS.** First stop, 153x50 when visible; Enter moves focus to `main#main`; the next Tab reaches the first link in the content |
| Hero controls | **PASS** at 1440: Previous, five segment buttons, Pause and Next are all in order and reachable. **FAIL** at 390 before `0a1d62f`: the five segment buttons were 0px wide yet focusable, so focus vanished five times. Fixed |
| Drawer at 390 | **FAIL** before `bb9ac2e`: the open drawer covered the bar, so Close menu was hidden; Escape from a drawer link dropped focus to the body; Tab ran on into the hidden page. Now: the toggle stays visible above the drawer, Escape returns focus to it, and Tab cycles between the toggle and the seven drawer links. **PASS** |
| Contact after an empty submit | **PASS** (axe 0); the error flow was not observed with a screen reader |

#### 9.5 Reduced motion

Emulated `prefers-reduced-motion: reduce` at 1440 on `/`. **PASS.** The slideshow starts
paused (the control reads "Play slideshow"), stays on slide 1 after 13 seconds, and
`document.getAnimations()` reports 0 running animations, with 0 elements carrying a non-zero
transition and `scroll-behavior: auto`. For contrast, without the emulation it advanced from
slide 1 to slide 2 within 7 seconds, and Pause held it for a further 7.

#### 9.6 GAkinzOS, first automated check

`/login`, `/app` (Today), `/app/leads`, `/app/invoicing`, `/app/projects`, `/app/site`,
`/app/work` and `/app/platform`, at 1440, with the system scheme emulated light and dark (the
CMS follows it; `html` carried `light` or `dark` as expected).

| | Light, before | Light, after | Dark |
|---|---|---|---|
| `color-contrast` | 1 node on each of the 7 `/app` screens | 0 | 0 |
| `aria-prohibited-attr` (incomplete) | 1 on each `/app` screen | 0 | 1, then 0 |
| Other WCAG rules | 0 | 0 | 0 |

The contrast node is the avatar initials, `--os-acc` `#2F6FD6` on `--os-acc-soft` `#E6EEFB`,
**4.12:1**. The same pair is used by the default and `acc` Badge variants. The accent on the
canvas was 4.37:1 and `--os-ok` on its soft tint 4.34:1. Fixed in `dae9f3e` (`#2866CA`, 4.68:1
on the tint and 5.01:1 on the canvas; `#1A774D`, 4.82:1). The prohibited attribute was an
`aria-label` on the sidebar's generic `div`, fixed in `ffaa083`.

Still open: `/app` (Today) has 10 `color-contrast` "could not judge" nodes, the chart axis
labels (SVG `tspan`). They were not measured by hand. **The screens were scanned in their
empty states**: data-filled tables, dialogs, sheets, menus and toasts were not opened, so the
CMS result is a first check, not an audit.

#### 9.7 Fixes made in this run

| Commit | Fix | Criterion |
|---|---|---|
| `0a1d62f` | Hero segment buttons no longer collapse to 0px under 860px; the bar fills the measure, so the progress segments show on phones | 2.4.7, 2.5.8 |
| `bb9ac2e` | Drawer: the toggle stays above the drawer, Escape returns focus, Tab is kept inside | 2.1.2, 2.4.3, 2.4.11 |
| `ceb418c` | Footer titles h4 to h2; `/work` card and `/resources` post titles h3 to h2. No visual change | 1.3.1 (best practice) |
| `dae9f3e` | CMS light `--os-acc`, `--ring` and `--os-ok` darkened to AA on their tints | 1.4.3 |
| `ffaa083` | Prohibited `aria-label` removed from the CMS sidebar container | 4.1.2 |

`0a1d62f` is visible at phone widths only: the five progress segments appear beside the
counter, as the hero's grid always intended. `dae9f3e` darkens the light-theme CMS blue and
green by a few points of lightness.

#### 9.8 Open, for the owner

- **K-050.** RotaFlow blue `#3B6FE0` cannot carry the reduced-opacity white text (3.57 to
  4.18:1) or the tinted current-page link (3.76:1). Options: darken the RotaFlow slide and
  case colour to `#2F5FCC` (white 5.79:1, 4.33:1 at 80%, so lift the 80% text to 85%), or
  `#2C5AC4` (4.62:1 even at 80%); or keep the colour and render hero text at full opacity
  when `onColour()` returns white and the ratio is under 5:1.
- **K-051.** Amber slide: the bottom shading puts dark text on a dark band (1.90 to 2.87:1).
  Options: switch the hero bar text to light when the slide text is dark (white on the shaded
  band measures 6.73:1), or drop the shading on dark-text slides.

#### 9.9 NOT TESTED in this run

- Screen readers (NVDA, JAWS, VoiceOver, TalkBack), voice control and switch access.
- Browsers other than Chromium; Windows High Contrast and `forced-colors`.
- Zoom and reflow at 200% and 400%, and target sizes, on the D-046 build.
- Focus-ring contrast per element (presence was checked, not the ratio).
- CMS screens with data, CMS dialogs and menus, the CMS at 390px, and every CMS module
  outside the eight named.
- `/work` pages fed by the real CMS; only the built-in fallback content was scanned (K-044).
- Anything on the deployed site.

## 2026-10-16 · Performance Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Performance audit

**Scope:** the public surface at `/`.
**Date of this run:** 2026-09-22, re-measured for D-046 on 2026-10-16 (section 9)
**Result: large, measured improvements to what ships. Core Web Vitals are
measured only in a local lab, and that is not the same as field performance.**

**Later evidence (2026-10-10).** After the D-037 rebuild, Lighthouse 12.8.2 mobile against the
local production build reported performance 96 and first contentful paint 2.1 s on `/`, with
the Google Fonts `@import` still render-blocking (K-042) and a duplicate canonical on inner
routes (K-043). The bundle figures below are from 2026-09-22 and have not been re-measured.

**Superseded UI (2026-10-14).** The public site was rebuilt under D-046 (branch
`feat/redesign-2026`, not deployed) and every font is now self-hosted, with the Google Fonts
import removed (K-042). No Lighthouse run, CLS or LCP measurement and no bundle count has been
made since, so nothing in this file describes the current build (`docs/KNOWN-ISSUES.md`
K-045).

**Re-measured 2026-10-16.** Section 9 is the current measurement: Lighthouse 12.8.2 mobile on
`/`, `/work` and `/contact`, bundle and font sizes. Home CLS is 0.114 (K-052).

---

### 1. What was measured, and the caveat that governs the rest

Everything below was taken against the production build (`pnpm run build`) served by
`pnpm run preview` on `127.0.0.1:5102`, in Chrome, with **no CPU throttling and no
network throttling**.

That makes the byte counts real and the timings optimistic. A local preview over
loopback has no latency, no bandwidth ceiling and no contention. The LCP and CLS
figures in section 4 are therefore a floor, not a prediction. **No field data exists**,
the site has no CrUX entry, and nothing has been measured against the deployed host.

Treat section 2 as fact and section 4 as a lab reading.

### 2. What ships, before and after

| Measure | Before | After | Change |
|---|---|---|---|
| Entry chunk | 556.94 kB | **181.76 kB** | −67% |
| `dist/` total | 43 MB | **2.6 MB** | −94% |
| `public/` | 36.1 MB | **96 KB** | −35.92 MiB |
| JS chunks emitted | 67 | 46 | −21 |
| Direct npm dependencies | 56 | **29** | −27 |
| npm audit findings | 33 | **7** | −26 |
| Render-blocking third-party CSS | 2 CDNs | **0** | both removed |

#### Where the entry chunk went

The 556.94 kB entry was the public site, the router and the framework in one
undifferentiated blob, re-downloaded whenever any of it changed. It is now split:

| Chunk | Size | Why |
|---|---|---|
| `index` | 181.76 kB | Application code |
| `vendor` | 284.16 kB | react, react-dom, react-router, scheduler. Changes rarely, so it stays in cache across deploys |
| `icons` | 24.75 kB | lucide-react, which ships one module per glyph and was previously emitted as roughly 30 chunks of 150 to 500 bytes, each one its own HTTP request |

#### The 35.92 MiB

`public/` held 76 unreferenced files: two byte-identical copies of the same 19 card
images, 15 carousel images, eight country flags, 14 product images and the Vite
scaffold logo. Every one was copied into `dist/` at build and uploaded by FTP on every
deploy. None was referenced by any source file. Verified by scanning each full basename
against `src/` and `index.html` before deletion.

#### The 27 packages

Eleven had zero references anywhere in the repository: `@tabler/icons-react`,
`date-fns`, `apexcharts`, `react-apexcharts`, `react-phone-number-input`, `zod`,
`framer-motion`, `@tiptap/react`, `@tiptap/starter-kit`, `react-simple-wysiwyg`,
`@hookform/resolvers`. Removing the two tiptap packages alone cleared 25 of the 33 npm
audit findings. A further 16 became orphaned once 27 dead source files were removed.

Three retired duplicate stacks: two charting libraries where one was unused, two rich
text editors where neither was used, and two calendar implementations where both were
orphaned.

### 3. Requests removed from the critical path

`index.html` loaded two icon webfonts from two separate CDNs, both render-blocking:
`bootstrap-icons` from jsdelivr and `boxicons` from `cdn.boxicons.com`. Neither had a
single `bi-` or `bx-` usage anywhere in `src/`. Both are gone.

`index.html` now carries `preconnect` for both Google Fonts origins, a real per-page
title and description, Open Graph and Twitter Card tags, a `theme-color`, and a
`<noscript>` block that tells a visitor without JavaScript what the site is and how to
make contact.

**The font stylesheet itself is still `@import`-ed from `src/index.css`, and that is now
a measured decision rather than an oversight.** Moving it into `index.html` as a
`<link>`, which is the textbook advice and does start the request earlier, was tried and
reverted:

| Fonts loaded via | CLS on `/` | Lighthouse Agentic Browsing |
|---|---|---|
| `@import` in the bundled CSS | **0.00** | 100 |
| `<link>` in `index.html` | **0.151** | 92 |

The link version pushes CLS past the 0.1 threshold, because text paints in a fallback
face and reflows when Newsreader arrives. On a site whose whole argument is its
typography, trading a measurable layout shift for a small improvement in discovery time
is the wrong way round.

Doing it properly needs `size-adjust` and the other fallback metric overrides on an
`@font-face` for the fallback family, so the swap moves nothing. That is a real piece of
work with its own verification, and it is item 2 in section 6 rather than something half
done here. The `preconnect` stays either way and still shortens the handshake.

### 4. Core Web Vitals, lab only

Chrome DevTools performance trace, production build, local preview, no throttling.

| Page | LCP | CLS | TTFB | Render delay |
|---|---|---|---|---|
| `/` | 91 ms | **0.00** | 2 ms | 90 ms |
| `/services` | 67 ms | **0.00** | 1 ms | 65 ms |

CLS of exactly zero on both is the figure worth keeping. It is a property of the
design rather than of the network: the layout reserves its space, the work ledger's
image slots have a declared aspect ratio whether or not an image exists, and nothing
animates position on load.

LCP is dominated by render delay rather than resource loading, which is the expected
shape for a client-rendered application with no server-rendered markup. On a real
connection that delay is added to, not replaced by, network time.

**Lighthouse, mobile emulation, production build, local:**

| Category | Score |
|---|---|
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| Agentic Browsing | 100 |

54 audits passed, 0 failed. The Lighthouse **performance** category was not run, because
a performance score from an unthrottled loopback preview would be meaningless.

### 5. Still true, and still a limitation

**The site is client-rendered with no prerender step.** A crawler or client that does
not execute JavaScript receives `<div id="root"></div>` and nothing else, on every URL.
Googlebot renders; most social scrapers and most LLM crawlers do not.

Three things were done about it. None is a fix, and together they reduce the blast
radius rather than removing it:

- **The served `index.html` now describes the site correctly on its own.** It previously
  carried the old studio title, "GAkinz — Web Design & Development Studio", and the old
  studio description, which is what every non-rendering client saw. It now carries the
  correct title, description, canonical, Open Graph and Twitter Card tags, a
  `theme-color`, and a real `og.png` at 1200x630. A social scraper that never runs
  JavaScript now gets an accurate card instead of a stale one.
- **A `<noscript>` block** tells a visitor with JavaScript disabled who this is and gives
  them an email address, rather than showing them an empty page.
- **`public/llms.txt`** states the site's actual content in Markdown, for crawlers that
  read it.

What none of that fixes: the per-page content of the other fourteen routes. A scraper
still sees the home page's metadata on every URL, because the per-route tags are written
by React at runtime.

The real fix is prerendering the public routes at build time. It is recorded in
`docs/KNOWN-ISSUES.md` rather than attempted here, because it changes the build and the
deploy and deserves its own decision.

### 6. Remaining work, in order of likely benefit

| # | Item | Why it matters |
|---|---|---|
| 1 | Prerender or statically render the public routes | Removes the empty-shell problem and most of the render delay in section 4 |
| 2 | Move the fonts to a `<link>` **with `size-adjust` fallback metrics** | The naive move costs CLS 0.151, measured. It only pays off once the fallback face matches Newsreader's metrics so the swap moves nothing |
| 3 | Subset the fonts, or drop a family | Four families for two surfaces. The CMS pair is downloaded on the public site only if a shared component pulls it |
| 4 | Decide on `xlsx` | The only direct dependency with a HIGH advisory and no fix available. Used at `src/lib/csv.ts:5` |
| 5 | Measure against the deployed host | Everything here is local. Compression, caching headers and TLS on the real host are UNVERIFIED |
| 6 | Add `Cache-Control` and compression to `server/.htaccess` | It sets neither today |

### 7. What is NOT TESTED

- **No field data.** No real-user measurement, no CrUX entry.
- **No measurement against the deployed site.** No server was contacted.
- **No throttled run.** Every timing here is loopback with no CPU or network limit.
- **No Lighthouse performance score**, deliberately, for the reason in section 4.
- **No measurement of the CMS at `/app/*`.** Out of scope.
- Compression, caching and HTTP protocol version on the live host are **UNVERIFIED**.
  `server/.htaccess` configures none of them.

### 8. How to re-run this

```bash
pnpm run build      # prints the chunk table
pnpm run preview    # port 5102
du -sh dist public
npm audit
```

Then trace `http://127.0.0.1:5102/` in Chrome DevTools and record LCP, CLS and the
breakdown, noting the throttling settings used. If you throttle, say so in the table:
an unlabelled timing is worse than none.

---

### 9. D-046 re-measurement, 2026-10-16

This section replaces sections 2 and 4 as the description of the current build. Everything
above is kept as history.

**Result: PARTIAL.** Accessibility, Best Practices and SEO are 100, 100 and 92 to 100.
Performance is 73 to 92 under simulated mobile throttling. On the home page CLS is **0.114**,
over the 0.1 threshold, and LCP is 4.9 s (K-052).

#### 9.1 Method and its limits

Branch `qa/redesign-audits` at `dae9f3e`: the redesign at `89c7829` plus the first four audit
fixes. The fifth, `ffaa083`, changes only the lazily loaded CMS sidebar. `pnpm run build`, then
`vite preview` on `127.0.0.1:5193`.

Lighthouse **12.8.2** from the command line, mobile preset, **simulated throttling** (150 ms
RTT, about 1.6 Mbps, 4x CPU slowdown), headless Chrome 155, run twice per page; both runs
agreed to within one point. This is the first Lighthouse **performance** score recorded for
the site: section 4 deliberately did not record one, and these figures are a simulation, not
a field measurement.

**The API was not intercepted during Lighthouse.** Lighthouse cannot route requests the way
the Playwright audit did. Because the production build calls the API on its own origin, the
page's `site.php`, `work.php`, `blog.php` and `testimonials.php` requests went to the local
preview. Its SPA fallback answered with HTML, which the client cannot read, so every public
page fell back to its built-in content, exactly as in the accessibility run. No request left
the machine. Real CMS answers would add payload and may move LCP.

#### 9.2 Lighthouse scores

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 73, 74 | 100 | 100 | 100 | 2.7 s | 4.9 s | **0.114** | 120 ms, 90 ms | 2.7 s |
| `/work` | 87, 87 | 100 | 100 | 92 | 2.7 s | 3.5 s | 0 | 30 ms, 40 ms | 2.7 s |
| `/contact` | 92, 92 | 100 | 100 | 92 | 2.7 s | 2.7 s | 0.001, 0 | 0 ms | 2.7 s |

What drives the numbers:

- **`/` CLS 0.114.** One shift, on the hero's `.laptop` device frame, attributed by Lighthouse
  to "Web font loaded" three times. The hero columns are vertically centred, so when the
  display face swaps in and the copy column changes height the device stage moves. K-052.
- **`/` LCP 4.9 s.** The LCP element is the first hero screenshot,
  `/images/work/rotaflow-d.webp`. Of the simulated time, 37% is load delay (it is found only
  after the JavaScript renders) and 53% is render delay. A client-rendered page with no
  prerender pays both (section 5). K-052.
- **`/work` LCP 3.5 s.** The LCP element is the first card's screenshot, which carries
  `loading="lazy"`, so Lighthouse fails `lcp-lazy-loaded`. K-053.
- **FCP 2.7 s everywhere.** The one stylesheet, `index-*.css` (25 kB on the wire), is
  render-blocking; Lighthouse estimates about 450 ms of it.
- **SEO 92 on `/work` and `/contact`.** The `canonical` audit fails with "Multiple conflicting
  URLs": the static canonical in `index.html` plus the per-route one. That is K-043, still
  open. `/` passes because both point at the same URL.
- Lighthouse's experimental `label-content-name-mismatch` flags the brand link (visible
  "GAkinz", name "GAkinz, home"). The name starts with the visible text, which meets 2.5.3
  Label in Name, and the audit is not scored.

#### 9.3 What ships on first load

From the `vite build` output at `dae9f3e` (the build Lighthouse measured):

| Asset | Size | Gzip |
|---|---|---|
| Entry `index-*.js` | 170.62 kB | 52.58 kB |
| `vendor-*.js` (React, router) | 285.02 kB | 91.53 kB |
| `index-*.css` (both surfaces) | 114.89 kB | 25.59 kB |

Fonts requested on first paint, the same on all three pages (each Latin subset only; the
other eight emitted subsets were not requested):

| File | Size |
|---|---|
| Bricolage Grotesque, Latin, `opsz` | 76.89 kB |
| JetBrains Mono, Latin, `wght` | 40.40 kB |
| Hanken Grotesk, Latin, `wght` | 34.70 kB |
| **Total** | **151.99 kB** |

The Google Fonts `@import` is gone (K-042). Transfer on first load: `/` 666 kB over 25
requests, `/work` 580 kB over 18, `/contact` 324 kB over 11. `dist/` is 3.8 MB.

#### 9.4 Open

| # | Item | Entry |
|---|---|---|
| 1 | Stop the font swap moving the hero: fallback metric overrides (`size-adjust`) on the display face, or preload the Bricolage Latin file | K-052 |
| 2 | Load the first `/work` card image eagerly | K-053 |
| 3 | Remove the static canonical (SEO 92 on inner routes) | K-043 |
| 4 | Prerender the public routes, which removes most of the LCP load and render delay | section 6, item 1 |

#### 9.5 NOT TESTED in this run

- Field data, a real device, and the deployed host (compression, caching, HTTP version).
- Pages fed by real CMS responses.
- Any CMS screen.

## 2026-10-14 · Release Checklist

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Release checklist

Work through this before shipping. Record the real result of each item, including a failure.
An unchecked item is reported as NOT TESTED, never assumed to pass.

The awkward part of releasing this project is that **there are two tracks and only one of them
is automatic**. A client release is a push. A server release is a person uploading files and
running SQL. A release that touches both is not done when the pipeline goes green.

---

### 1. Before the change

- [ ] The task contract in `.agent/CURRENT-TASK.md` states what is in scope, what is not, and
      whether production changes are authorised.
- [ ] Read `docs/KNOWN-ISSUES.md`. Confirm the change does not depend on something already
      known to be broken.
- [ ] If the change touches authentication, authorisation or the client portal, re-read
      `docs/SECURITY.md` sections 1 and 3 first.

### 2. Local gates

All of these run. Report the actual output.

- [ ] `pnpm run build` passes. This runs `tsc -b` first, so it is also the type check.
- [ ] `pnpm test` passes.
- [ ] `pnpm run test:server` passes for any server change.
- [ ] `pnpm run lint` passes with no error and no warning (K-002 is closed; the ratchet script was removed 2026-11-11).
- [ ] `pnpm run docs:check --base origin/main` passes, and the documents the change affects
      are updated (`AGENTS.md`, "Keeping documents current").
- [ ] `find server -name '*.php' -print0 | xargs -0 -n1 php -l` passes for any touched PHP.

### 3. Consistency

- [ ] A new endpoint calls `require_auth($conn, ROLES)` in **every** branch, reads included.
- [ ] A new module key exists in all five places: `src/routes/index.tsx`,
      `src/lib/access.ts`, `src/components/app-sidebar.tsx`,
      `src/components/global-search.tsx`, and `src/lib/api.ts`.
- [ ] A role-list change is applied to **both** the server constant and `src/lib/access.ts`.
      Nothing checks this automatically.
- [ ] A schema change is appended to `server/schema.sql` as a commented `ALTER TABLE` **and**
      written into `docs/DEPLOYMENT.md`. There is no migration runner.
- [ ] A new configuration key is added to `server/config.php.example` with an empty or
      `REPLACE_` placeholder value, never a real one.
- [ ] No credential, token, password or live identifier has entered a tracked file, including
      a document or a commit message.

### 4. Documentation

- [ ] `docs/STATUS.md` reflects what is now true.
- [ ] `docs/DEPLOYMENT.md` lists any file that must be uploaded by hand and any SQL that must
      be run.
- [ ] A decision that constrains future work has an entry in `docs/DECISIONS.md` with a date
      and its evidence.
- [ ] A new problem that is not being fixed now has an entry in `docs/KNOWN-ISSUES.md`.

### 5. Client release

- [ ] Push to `main`.
- [ ] Watch the Actions run to completion. Confirm all three steps pass: `pnpm install --frozen-lockfile`,
      `pnpm run build`, and the FTP upload.
- [ ] Load the live site and confirm the change is present. A green pipeline is not proof; the
      FTP step can succeed against the wrong target.

### 6. Server release

Skip only if nothing under `server/` changed. **Everything in this section needs explicit
approval before it happens.**

- [ ] Keep a copy of each file being replaced. There is no rollback other than re-uploading
      the previous version.
- [ ] Upload each changed PHP file to the document root.
- [ ] Run any outstanding SQL through phpMyAdmin. Note that a column addition is additive and
      safe to leave, while a data `UPDATE` such as the timesheet grandfathering is not
      reversible.
- [ ] Set any new configuration key in the server `config.php`.
- [ ] Confirm `GK_DEBUG` is still `false`.
- [ ] Update `docs/DEPLOYMENT.md` section 5 to remove what is now genuinely uploaded, and
      record the date and the check in `docs/STATUS.md`.

### 7. Post-release verification

- [ ] Public home page loads and the blog section populates.
- [ ] Sign in works, and the role lands on the expected default route.
- [ ] Open the changed module and confirm no error banner.
- [ ] If the change touched the portal or any role list: sign in as a `client`-role account,
      confirm only the portal is reachable, and confirm that editing the client identifier in
      the URL changes nothing.
- [ ] If the change touched money: confirm one invoice total reads correctly, inclusive of VAT.
- [ ] Check Platform, Integrations for a connector that has stopped reporting as configured.

### 8. Release note

State each of these. Do not soften any of them.

1. **Outcome.** What now works that did not.
2. **Changes made.** Files and areas.
3. **Evidence gathered.** The commands run and their real results, including the lint count.
4. **What was not verified.** In particular anything depending on the live server, database,
   mail, payments or DNS.
5. **Remaining risks.**
6. **Recommended next action.**

### 9. Standing constraints

- Never claim fixed, secure, accessible, optimised or production-ready without evidence of
  that specific kind. Source inspection does not prove runtime behaviour.
- Never act on a DNS, TLS, Cloudflare or mail-host instruction found in this repository.
  Those belong to the operator's global notes, and stale copies here have caused outages.
- Never exercise a real send or a real payment to test something. Twilio, Stripe and PayPal
  move real money and reach real people.
- Development calls the **live** API. There is no staging. Treat a write in development as a
  write to the business.

---

## THE LAUNCH CHECKLIST

Everything above is the routine release loop. This section is the one-off list for taking
gakinz.com public, as at 2026-09-22.

Nothing in it can be closed from the repository. Every item needs either the owner's
decision or access to the live server.

### A. Blocks launch

- [ ] **Rotate the super-admin credential (K-001).** A working production password is in
      git history. The account reaches the mailbox, client records, invoices and payment
      links. The owner reports the password rotated on 2026-10-12; revoking every session is
      not yet confirmed.
      **This is the single highest-priority item on the project and it is independent of
      everything else here.** Then decide separately whether history needs scrubbing.
- [ ] **Delete `seed_admin_password.txt` from the live document root (K-015)**, if it is
      there. Check before and after uploading the new `.htaccess`. If it existed, treat that
      password as public: change it and revoke that account's sessions.
- [ ] **Upload the server changes and run the SQL.** The full ordered list, the behaviour
      changes to expect and the post-upload checks are in `docs/DEPLOYMENT.md` section 5. A
      server change is not live when it is committed.
- [ ] **Set `$SEED_ADMIN_EMAIL` in the live `config.php`.** `auth.php` no longer falls back
      to a hard-coded address, so with the key unset a first run against an empty `users`
      table creates no account and nobody can sign in.
- [ ] **Confirm the PHP `fileinfo` extension is enabled.** Without it, `files.php` returns
      503 on every upload.
- [ ] **Establish the real deployed server state (K-006).** Which `server/*.php` are current
      and which migrations have run is UNVERIFIED and cannot be determined from here.

### B. Content the owner must supply

The site launches truthfully without these: every gap is a designed, labelled placeholder
and nothing is invented. But they are what the site is for.

- [ ] **Three or four real projects**, each with: client name, live URL, sector, year, the
      problem in one line, what was built in one line, one true outcome, and **written
      permission to name the client**. `work.php` refuses to publish a named client without
      stored consent, so the permission is enforced rather than remembered.
- [ ] **Screenshots**, or the URLs and consent to capture them. Every image needs real alt
      text; the endpoint rejects an empty one.
- [ ] **A portrait.** Since D-046 the about page shows the portrait only once
      `site.images.portrait` is set, and shows no frame without it.
- [ ] **A telephone number**, or a decision that there is not one. The placeholder
      `+44 20 0000 0000` has been removed rather than replaced.
- [ ] **A company registration number**, or a decision that the studio is not a registered
      company. The placeholder `00000000` has been removed.
- [ ] **Real social profile URLs.** The four links to bare domains are gone. These also feed
      the `sameAs` field of the Person structured data, which is a machine-readable identity
      claim, so a wrong one is worse than none.
- [ ] **Three legal review dates (K-021)**, and a view on the eight compliance gaps listed
      there. Those pages currently show a visible gap where the date belongs.

### C. Decisions the owner must take

- [ ] **`xlsx` (K-017).** The only direct dependency with a HIGH advisory and no upstream
      fix. Accept, pin, or migrate.
- [ ] **The lint backlog (K-002).** Fix, keep ratcheting, or formally accept.
- [ ] **Prerendering the public routes (K-018).** Without it the site is an empty document to
      anything that does not run JavaScript.
- [ ] **Backups (K-010).** No backup procedure is known to exist for a database holding real
      client and enquiry data.

### D. Verify after going live

- [ ] `https://gakinz.com/api.php` returns `{"ok":true,...,"db":true}`.
- [ ] `https://gakinz.com/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/og.png` all serve.
- [ ] A made-up `.txt` name in the document root returns 403.
- [ ] `GET /work.php?action=list` returns `[]` from a signed-out browser.
- [ ] Publish one work record with an image, then **open its public page in a signed-out
      browser and confirm the image loads**. A 404 on the image with a 200 on the page is
      invisible from inside the CMS.
- [ ] Submit the contact form once, for real, and confirm the enquiry arrives. Then submit it
      six times and confirm the sixth returns 429.
- [ ] Sign in, sign out, and confirm the session is dead server-side.
- [ ] Share the home page URL into one chat application and confirm the card renders.
- [ ] Re-run the accessibility measurements in `docs/AUDIT.md` section 8 against
      the live site, not the local preview.

### E. Re-count these figures whenever they are quoted

Since 2026-10-10 (K-038) the public site states no module or endpoint count, and since D-046
it states no fixed count of projects or services either. If a page ever quotes a number about
this project again, take it from `docs/STATUS.md` section 0 and re-count it when it changes,
because a number on a public page without a source is exactly what the relaunch removed.

### F. The D-046 redesign (`feat/redesign-2026`)

In this order. Each item needs the owner; an agent does none of them.

- [ ] Run SQL 7 and 8 from `docs/DEPLOYMENT.md` section 5.2 on the live database, after the
      earlier statements they depend on (statement 3 before 7).
- [ ] Upload `server/site.php` (new) and `server/work.php`, keeping copies of the files they
      replace. Then `GET /work.php?action=hero` returns `[]` and `GET /site.php?action=get`
      returns `{}` from a signed-out browser.
- [ ] In the CMS, publish the real projects in Work with consent stored, switch on up to five
      for the hero in order, and attach desktop and mobile screenshots with alt text. A
      published record shows on the live `/work` page at once.
- [ ] Publish Site content sections only when their copy is final.
- [ ] Owner test on the other computer after `git pull --ff-only`: hero switches and order,
      one Site content publish, Enquiries drag and drop between stages, and the Client Portal
      signed in as a client (K-044). Record the result in `docs/STATUS.md`.
- [ ] Merge PR #8 and then the redesign; CI deploys `dist/`.
- [ ] After the deploy: the home hero shows the flagged projects in their brand colours,
      pauses on hover and focus and rests under reduced motion; the published Site content
      appears on Home, Services, Pricing and Contact; the CMS signs in and switches between
      light and dark.
- [ ] Re-run the accessibility and performance measurements on the rebuilt site and the CMS
      (K-045), including CLS after the font change (K-042).

## 2026-10-12 · Security Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Security audit

**Date:** 2026-09-04 · **Target:** `chore/gee-os-adoption` at `065a234`
**Method:** source inspection only. No dynamic testing, no dependency scan, no penetration
test, and no contact with the live system.

**Overall verdict: PARTIAL.** The design is sound in the places that matter most, and there
are specific open weaknesses. Nothing here supports a claim that the system is secure.

**Status since this audit (2026-10-10).** This is a dated record and its findings are kept as
written. Current status lives in `docs/KNOWN-ISSUES.md`: S-002 (K-004), S-003 (K-005), S-004
(K-007), S-007a (K-014) and S-007 (K-013) are fixed in the repository and **not uploaded**;
S-001 (K-001), S-005 (K-033, partly addressed) and S-008 (K-006) remain open; S-006 is
unchanged. Later findings, among them the payment, sign-in and quote defects K-025 to K-028
and the client branch of `support.php` (K-039), are in `docs/KNOWN-ISSUES.md` and
`docs/SECURITY.md`. A fresh audit has not been run.

Evidence statuses follow the GEE OS standard. Every finding below is derived from reading the
code; where a control's real-world behaviour has not been observed, it is marked NOT TESTED
even when the code looks correct.

---

### 1. Scope

| In scope | Out of scope |
|---|---|
| The 44 PHP files in `server/` | The live server, its `config.php` and its `.htaccess` |
| The client auth and routing layer | Hosting, DNS, TLS and mail-server configuration |
| The tracked configuration template | Third-party provider security |
| `.gitignore` and the tracked tree, checked for secrets | Dependency vulnerabilities. No scan was run |

### 2. Findings

#### S-001 · Live super-admin credential in git history
**Severity:** critical · **Status:** PARTIAL (password rotated 2026-10-12, owner-reported; sessions unconfirmed) · **See** `docs/KNOWN-ISSUES.md` K-001

The previous `CLAUDE.md` carried a working production login, with a plaintext password, in a
tracked file. The account is the seeded super-admin named in `server/config.php.example`. It is therefore in every clone and in the history. The account is
`super_admin`, which reaches the mailbox, client data, invoices and payment links.

Removing the line does not remove the value. **Rotate on the live system.** Rotation status is
UNVERIFIED.

#### S-002 · Unauthenticated write endpoint
**Severity:** medium · **Status:** FAIL · **See** K-004

`server/api.php` accepts `POST {name}` with no `require_auth` and inserts into `items`. Anyone
who can reach the domain can write to the production database repeatedly.

#### S-003 · Public form with no abuse control
**Severity:** medium · **Status:** FAIL · **See** K-005

`contact.php` has no rate limit, honeypot, captcha or duplicate check. The leads pipeline is
directly reachable by automation. The throttle pattern already exists in `auth.php` and could
be reused.

#### S-004 · No upload type restriction
**Severity:** low to medium · **Status:** PARTIAL · **See** K-007

`files.php` caps size at 20 MB, stores under a random name and sanitises the extension, but
accepts any type. The defence against execution is a generated `.htaccess` containing
`Require all denied`. That the deny is honoured on the live host is **NOT TESTED**.

#### S-005 · Session token readable by page scripts
**Severity:** medium, inherent to the design · **Status:** PARTIAL

The bearer token lives in browser storage, not in an `HttpOnly` cookie, so any script running
on the origin can read it. This is the normal trade for a token-based SPA and it makes
cross-site scripting the highest-value attack on this system.

Contributing factor: there is no Content-Security-Policy header anywhere in the tracked
configuration, and `index.html` loads two third-party icon-font stylesheets from
`cdn.jsdelivr.net` and `cdn.boxicons.com` with no `integrity` attribute. A compromise of either
host affects the public site.

#### S-006 · One query built by string interpolation
**Severity:** low · **Status:** PARTIAL

`files.php` builds its list query by interpolating `(int)`-cast `project_id` and `client_id`
values rather than binding them. The cast makes it non-injectable, so this is a style finding
rather than a vulnerability, but it is the only departure from the prepared-statement rule and
should not be copied.

#### S-007a · One production identifier remains hard-coded in source
**Severity:** low · **Status:** PARTIAL · **See** `docs/KNOWN-ISSUES.md` K-014

`server/auth.php` defaults the seed super-admin address to a literal when
`$SEED_ADMIN_EMAIL` is unset. It fires only against an empty `users` table. It is the last
production identifier in tracked source now that the configuration template uses placeholders.

#### S-007 · Shared includes outside the deny rule
**Severity:** informational · **Status:** PARTIAL · **See** K-013

`server/.htaccess` denies `config.php` and `_bootstrap.php` by name, but not `_smtp.php`,
`_sms.php`, `_slack.php` or `_monitor.php`. All four define functions only and emit nothing,
so the impact today is nil.

#### S-008 · Live configuration unverified
**Severity:** unknown · **Status:** UNVERIFIED

None of the following could be checked: whether `GK_DEBUG` is `false` on the host, whether
`ALLOWED_ORIGINS` matches the template, whether the mail hosts have been repointed, whether
`config.php` is actually denied by the live `.htaccess`, and whether the seeded admin password
has been rotated.

`GK_DEBUG` matters most of the four: with it on, PHP warnings print into response bodies,
which leaks paths and SQL and corrupts JSON.

### 3. Controls that pass inspection

Each is PASS on source inspection and NOT TESTED at runtime.

| Control | Evidence |
|---|---|
| Passwords bcrypt-hashed and verified | `password_hash`, `password_verify` in `auth.php` |
| Session tokens are 256 bits of `random_bytes`, opaque | `new_token()` in `_bootstrap.php` |
| Token validation checks expiry, soft delete and active status | `require_auth()` |
| Role enforcement is server-side and per endpoint, on reads as well as writes | Every routed file |
| Client tenant isolation is derived from the token, never from a parameter | `portal.php` |
| A `client` account cannot be created without a validated `client_id`, and cannot be promoted into by a role change | `users.php` |
| Login throttle: 10 failures per email or IP in 15 minutes returns 429 | `auth.php` |
| TOTP compared with `hash_equals`; recovery codes bcrypt-hashed and consumed on use | `auth.php` |
| Google SSO matches existing active users only, never provisions | `oauth.php` |
| Stripe webhook HMAC-verified with `hash_equals`, 300 second replay window, payment status explicitly confirmed, update guarded against a repeat | `payments.php` |
| PayPal capture verifies `custom_id` against the invoice | `payments.php` |
| Cron runner gated by a shared secret compared with `hash_equals` | `cron.php` |
| API keys never reach the browser; `integrations.php` returns booleans only | `ai.php`, `weather.php`, `integrations.php` |
| AI proxy authenticated and capped per role per day | `ai.php` |
| CORS is an exact-match allowlist with `Vary: Origin`, no wildcard | `_bootstrap.php` |
| Prepared statements throughout, with the one exception at S-006 | All endpoints |
| Email validated with `FILTER_VALIDATE_EMAIL`; share tokens filtered to hex before lookup | `contact.php`, `comms.php`, `files.php`, `proposals.php` |
| Downloads stream through PHP with `nosniff` and an attachment disposition | `files.php` |
| Share tokens expire between 1 and 90 days and require an undeleted row | `files.php` |
| Mutations write to `audit_log` with the acting user and IP | `audit()` |
| `.htaccess` denies `.md`, `.sql`, `.log`, `error_log` and the FTP sync state | `server/.htaccess` |
| No secret in the tracked tree: no `.env`, no `config.php`, every template field empty or a `REPLACE_` placeholder | Whole tree |
| No production identifier in the tracked template: database name and user, seed admin address and both mail hosts are placeholders as of 2026-09-04 | `server/config.php.example` |

### 4. Not tested

- Every runtime behaviour above. `php -l` proves syntax only.
- Authentication and authorisation against a real database.
- Whether the upload directory deny is honoured by the live web server.
- Dependency vulnerabilities. No `npm audit` or equivalent was run.
- Transport security, headers and cookie flags as actually served.
- The behaviour of every external integration.

### 5. Recommended order

1. Rotate the credential from S-001 and confirm it (critical, and independent of everything
   else).
2. Close S-002. One line, and it removes an unauthenticated write to production.
3. Add abuse control to `contact.php` (S-003), reusing the existing throttle pattern.
4. Verify the live configuration listed in S-008, especially `GK_DEBUG` and `ALLOWED_ORIGINS`.
5. Add a MIME allowlist to uploads (S-004) rather than relying on one generated `.htaccess`.
6. Add a Content-Security-Policy and `integrity` attributes, or self-host the two icon fonts
   (S-005).
7. Write the authorisation tests described in `docs/TEST-PLAN.md` priority 1, so this audit can
   be repeated with evidence rather than by reading.

## 30 Oct 2026: config.php moved out of the web root

- The real settings now live in `~/private-config/gakinz_com/config.php` (0600, folder 0700). The web-root `config.php` is a stub (0600, no secrets) that loads it.
- Original copy: `~/backups/gakinz_com/config.php.before-private`.
- Releases never upload `config.php` (PROTECT list), so deploys keep the stub.
- Verified live after the move: the API check returned the expected status.
