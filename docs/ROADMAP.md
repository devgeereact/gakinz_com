# Roadmap

The one place for what is done, what is left and what is parked on GAkinz. Everything planned lives here; the task in
progress is `.agent/CURRENT-TASK.md`, the history is `docs/WORKBOOK.md`, the issue list is `docs/KNOWN-ISSUES.md`.
Updated 2026-11-13 (V1.2 released as `ea6164c`). An earlier planning folder (`.planning/`, nine GSD phases) was folded into this file on that date.

## At a glance

**Live today:** V0, V1 (8 of 10), V1.1 (5 of 5) and V1.2 (5 of 5 open items). V1.1 was released together with Tailwind v4 and pnpm as `ed5a724` on 2026-11-11; V1.2 as `ea6164c` on 2026-11-13.

| | What | State |
|---|---|---|
| **Done** | **V0**, go-live and repair (GSD phases 1 to 7): hardening, CI gate on deploys, Clerk repairs, safe writes, Clerk-only sign-in, certificates, daily-flow speed-ups | Released (`ae01cec` to `825600e`) |
| **Done** | **V1**, enquiry to paid invoice (ten items): public site, Clerk sign-in, enquiry email to the owner, enquiry to invoice, payment and VAT, client portal isolation, backup restored and targets agreed, scheduled jobs visible, deletion-request alert | Released `4bdaed7`; **8 of 10 ticked** |
| **Done** | **V1.1**, safety nets (five items): layout tests for every public page and CMS screen, Today shows deletion requests and failed alerts, lint is the gate | **Released 2026-11-11** (`ed5a724`) |
| **Left 1** | Look once, signed in, at Today (deletion requests, alert notice) and at the restyled CMS | You; the agent has only seen them against test data |
| **Left 2** | V1 items 4 and 10, and the small owner list | Waiting for you: business facts, the adviser's retention periods, rotate one key, two clean-ups (table "Needs the owner") |
| **Done** | **V1.2**, public-site trust (rest of GSD phase 8) | **Released 2026-11-13** (`ea6164c`): 5 of 5 open items ticked (item 4 dropped as already true); `check:live` 20 of 20 after the release; the owner's checks are in the table "Needs the owner" |
| **Left 3** | **V2**, clean-up and live verification (rest of GSD phase 9) | Planned, not frozen; scope notes below |
| **Parked** | Everything else, grouped by theme | "Parking lot" below; nothing deleted |

How a new version opens: you say so, I propose at most ten items from the parking lot by value to users, we freeze the list
in this file with a date and a check per item, then each item is designed and planned before it is built (`AGENTS.md`,
"How work is planned and built").

## V1 finish line (frozen)

**Frozen on 2026-11-10** (D-060) · changed only with the owner's written OK.
Rules: at most 10 items. Each is something a real user can do, with a check that proves it. An item is
ticked on **local** evidence (tests on a throwaway database, a browser run on localhost). What can only be
shown on the live system is gate item 6 of the live-ready gate and is listed as BLOCKED under "Needs the
owner". Mark an item `[~]` while part of it waits for the owner.

The product: a trustworthy public site that turns visitors into enquiries, and a CMS where the owner runs
one enquiry to a paid invoice and a client sees only their own work.

- [x] **1. A visitor reads the six services and the prices on prerendered pages with a sitemap.** Check:
  `pnpm run build` prerenders 32 public pages and writes `sitemap.xml` (see `docs/VERIFICATION.md`); live:
  `pnpm run check:live` 16 of 16 on 2026-11-09 (`docs/AUDIT.md`).
- [x] **2. The owner signs in with Clerk only; the retired password, magic-link, Google and reference
  routes answer 404.** Check: `tests/server/legacy-retired.test.ts`, D-057, `pnpm run check:live`. The owner
  still confirms one fresh email-code sign-in (BLOCKED, owner).
- [x] **3. A visitor submits the contact form and the owner is told at once.** Found 2026-11-10: `contact.php` saved
  the enquiry and sent no mail, and the digest cannot run without a cron entry (K-145, K-146). Now it emails
  `$OWNER_ALERTS`. Evidence: `tests/server/enquiry-notify.test.ts` (8 tests: saved once, owner emailed, no fallback to
  the digest list, 20 an hour cap, mail failure and a dead mail host never lose the enquiry, header injection) and
  `pnpm run test:browser` (`tests/browser/contact.test.ts`: the real form in Chromium at 375 and 1280 px against local PHP,
  thank-you with reference, row stored once, mail received, bad field refused, server failure keeps what was typed, no
  console errors or failed requests). **Live: the owner must set `$OWNER_ALERTS`** (table row g) or nothing is sent.
- [~] **4. Every public page states true business facts and shows no "to supply" placeholder.** Needs the
  owner's facts (trading identity, VAT, prices, phone, IT support area, legal pages). Check:
  `pnpm run check:facts --strict` exits 0 (today it lists every open gap with the page and the exact
  wording). BLOCKED, owner.
- [x] **5. The owner turns an enquiry into a client, a quote, an accepted project and an invoice.** Check:
  `tests/server/journey.test.ts` steps 2 to 7 plus the Phase 7 quote-from-enquiry and quote-to-project
  tests; one live walk with TEST records is BLOCKED (owner).
- [x] **6. The owner issues an invoice and records a payment (Stripe or manual) with the right VAT.**
  Check: `journey.test.ts` steps 7 to 9, `manual-payment.test.ts`, `paid-state.test.ts` and a VAT case at
  an awkward amount (`tests/server/vat-totals.test.ts`). Whether the business is VAT registered and the
  review of past Stripe charges (K-025) are the owner's.
- [x] **7. A client signs in to the portal and sees only their own project, invoice and files.** Check:
  `journey.test.ts` step 10, `portal-files.test.ts`, `support-client.test.ts` and the signed-out, wrong-role
  and other-client matrix in `tests/server/portal-isolation.test.ts`.
- [x] **8. A backup is restored once and the recovery target is agreed (K-010).** **Update 2026-11-10 (released): the host had no daily backup; `gakinz-backup.sh` now runs daily and the host's own fresh dump was restored locally (42 of 42 tables, 0 orphans). Targets agreed the same day (D-062: back within one working day, lose at most 24 hours).** Still open under K-010: dumps are not copied off the host, and the first 03:30 run is not yet seen. Check: `npm run
  drill:restore` restores the newest Mac copy of the database dump into a throwaway database and compares
  tables and row counts; the dated result is in `docs/OPERATIONS.md` section 10. Restoring the **host's**
  copy, the uploads, and agreeing the targets are BLOCKED (owner).
- [x] **9. Scheduled work is either running or visibly switched off.** The host has no GAkinz cron entry
  (K-145), so invoice reminders, retainer billing, the weekly digest, uptime checks and pruning do not run.
  Evidence: `tests/server/cron-heartbeat.test.ts` (8 tests: a run leaves a per-job heartbeat; a job not seen in 36 hours
  is listed on Today for the owner roles; a prune-only line does not hide the others; not shown to an editor) and
  `scheduledJobsNotice` unit tests. Not seen in a browser. Adding the crontab line is the owner's decision (BLOCKED,
  table row c). **Update 2026-11-10: the entry now exists** (`15 6 * * *`, `job=all`, installed after counting 0 clients and 0 invoices), so the jobs run and the notice clears.
- [~] **10. Privacy basics work: a deletion request reaches the owner with a due date, and retention periods
  are set.** Done (K-095): a deletion request opens at high priority and emails the owner with the reply-by date
  one month on (`tests/server/deletion-alert.test.ts`, 4 tests; `deletion-request.test.ts`). Not built: a due-date
  column and a Today item (parked). Open, owner and adviser: the `$RETENTION_*` periods (K-062, proposals in
  `docs/PRIVACY-READINESS.md` section 6) and the legal deadline wording; `$RETENTION_APPLY` stays false. BLOCKED.

**Progress (2026-11-10, released as `4bdaed7`): 8 of 10 ticked, 2 waiting for the owner (4, 10).** There is no `pnpm run finish` here; the boxes are the progress.

## V1.1 finish line (frozen)

**Frozen on 2026-11-11** (D-063) · opened by the owner's "Phase 2: open V1.1 from the parking lot"; the run chose the items and the owner may overrule them.
V1 stays as it is (8 of 10 ticked, 4 and 10 wait for the owner). Same rules: at most 10 items, each something a real
person can do or see, ticked on **local** evidence with the commit, anything that needs the live system or the owner
is BLOCKED and says so. Chosen because each one either guards a flaw class the V1 run never looked for (layout on real
pages and screens) or closes a way the owner could miss something that matters (a legal deadline, a lost alert).

- [x] **1. A visitor on a phone or a desktop sees every public page laid out cleanly.** Check: `tests/browser/public-layout.test.ts`
  loads all 32 prerendered pages at 375 and 1280 px and fails on sideways page scroll, clipped text, a console error or a failed
  request; every page screenshot looked at; an axe run over the same pages (WCAG 2.0 to 2.2 A and AA) recorded in `docs/VERIFICATION.md`.
  **Evidence 2026-11-11:** 66 tests (the sitemap list, then 32 pages at 375 and at 1280 px) pass; axe-core (WCAG 2.0 to 2.2 A and AA) over the same 64 loads found 0 violations; 11 pages viewed side by side at both sizes (home, services, a service, pricing, work, a work page, about, contact, privacy, an article, the 404) and every template class is among them. Found and parked: K-147 (two sitemap articles render the not-found page on the live CMS), and the pricing, privacy and work pages still carry the V1 item 4 placeholders (owner). The test also fails if a sitemap page shows the not-found view.
- [x] **2. The owner sees a client's data deletion request on Today with its reply-by date.** No schema change: the date is the
  ticket's creation date plus one month (K-095 remainder). Check: new cases in `tests/server/today.test.ts` (listed, oldest or
  most urgent first, a closed ticket is not listed, an editor does not see it) and a unit test for the date rule.
  **Evidence 2026-11-11:** `tests/server/today.test.ts` (4 new cases, 13 in the file): listed oldest first with company, reply-by date and `/app/support?ticket=`; "Reply was due ..., overdue" past the date; resolved, deleted and other-subject tickets left out; a request whose client row is gone still listed; the subject literal is checked against `support.php`; the section list for every role. `todayModel.test.ts` mirrors the roles (support.php STAFF: all five staff roles). Not seen in a browser with real data.
- [x] **3. The owner is told when an alert email did not go out.** `enquiry_notify_failed` and `deletion_notify_failed` audit rows
  from the last 7 days show as a Today notice that names the enquiry or ticket (D-061 left them invisible). Check: new cases
  in `tests/server/today.test.ts` and `tests/server/enquiry-notify.test.ts`.
  **Evidence 2026-11-11:** `tests/server/alert-failures.test.ts` (5 tests): empty when nothing failed; failed enquiry, failed deletion and held-back alerts newest first; older than 7 days left out and at most 5 listed while all are counted; owner roles only (an editor gets no key); end to end, a mail host that refuses leaves the enquiry saved and Today names its reference. `todayModel.test.ts` (3 new cases) covers the wording. Rendered in `Dashboard.tsx` next to the scheduled-jobs notice; not seen in a browser.
- [x] **4. Every CMS screen holds realistic data on a phone and a desktop.** Check: `tests/browser/cms-layout.test.ts` opens all
  CMS routes at 375 and 1280 px from a test-only build with Clerk replaced by a stub and every API answer labelled sample data
  (long names, many rows, empty and error states); no sideways page scroll, no page error; every screenshot looked at;
  axe over the same screens. Not the live site, not real data (K-044).
  **Evidence 2026-11-11:** `tests/browser/cms-layout.test.ts`, 68 tests: 27 owner screens, the 3 client screens and 4 editor screens, each at 375 and 1280 px, against the real PHP and a throwaway MariaDB seeded with 40 clients (one with a 100-character name), 40 enquiries in every stage, 14 projects, 70 tasks, 30 invoices in every status, proposals, tickets, posts, certificates, calls and time entries (`tests/browser/seed.ts`); the Clerk package is replaced by a stub in a separate test-only build (`vite.cms-test.config.ts`, never shipped). No sideways page scroll, no console error, no failed request; axe (WCAG 2.0 to 2.2 A and AA) 0 violations on all 68. Found and fixed: (1) every client and editor login asked `invoices.php` and got a 403 on every screen (the notification bell); (2) axe label-in-name on the Today lead lists and the Leads cards (an `aria-label` that dropped visible text); (3) Invoicing and Contracts row actions ran 209 px and 42 px past the box at 1280 px, now they wrap. Looked at: 8 screens side by side at both sizes (Enquiries, Clients, Invoicing, Contracts and others). **Not fixed, parked as K-148:** on a phone, 8 tables (Blog, Certificates, Clients, Contracts, Invoicing, Platform, Proposals, Time) scroll sideways inside their box, so the last columns need a swipe. Not real data, not Safari or a real phone, not the Today, Support and Portal screens beyond the automated checks.
- [x] **5. `pnpm run lint` passes and CI runs it instead of the ratchet** (K-002). The five errors are in Contracts, Portal and the
  theme toggle; Portal is security-critical, so `portal-isolation.test.ts`, `journey.test.ts` and `support-client.test.ts` must stay
  green. Check: `pnpm run lint` exits 0; `.github/workflows/ci.yml` calls it.
  **Evidence 2026-11-11:** `pnpm run lint` exits 0 (0 errors, 0 warnings). Portal (staff preview and client login) and Contracts moved onto `useLoad`, the theme toggle onto `useSyncExternalStore`; the template of a new contract is now applied by the handlers that change it instead of an effect. `ci.yml` and `release.json` run `pnpm run lint`; `scripts/lint-ratchet.mjs` and its npm script are deleted; the living docs are updated. `portal-isolation`, `journey` and `support-client` are server-side and unchanged; the Portal screen itself is NOT TESTED in a browser yet (item 4 covers it).

**Discovery fixes (not items):** two parking-lot lines were checked against the code and were already untrue: Analytics and the
Dashboard show "unavailable" for a failed source (K-031), and the browser holds no session token in `localStorage` (K-033).
They are closed with that evidence in the same commit that proves it.

**Progress V1.1 (2026-11-11): 5 of 5 ticked. Released as `ed5a724` on 2026-11-11.** The ladder is in `docs/VERIFICATION.md` (lint 0, 678 unit, 669 server, 140 browser three runs in a row, axe 0, `pnpm run verify`).

## V1.2 finish line (frozen)

**Frozen on 2026-11-11** (D-065) · opened by the owner's "Let's go with V1.2 /finish-app" after a short brainstorm; the owner said "Go ahead" to the list below.
Goal: the public site says only true things, and does not invite abuse. Same rules as V1 and V1.1: at most ten items, each a
user outcome with a check, ticked on **local** evidence; what needs the host or the owner is BLOCKED and says so.

- [x] **1. The cookie policy tells the truth.** Today it describes a Google sign-in cookie that was retired in Phase 5 and names
  neither Clerk nor the `gk-auth` browser storage. Check: a test compares the policy with the storage keys the code really uses
  (`sidebar_state`, `gkos-groups`, `theme`, `gk-auth`) and with Clerk's documented cookies; it fails if the page lists the retired
  `gk_oauth_state` or `gk-locked`, or if a key used in `src/` is missing. Google sign-in is enabled in Clerk (read 2026-11-11), so
  the page says it is handled by Clerk and Google rather than denying it. Facts only; the adviser still reviews the wording (V1 item 4).
  **Evidence 2026-11-11 (local, on `goal/v1.2`; released 2026-11-13 as `ea6164c`):** `src/marketing/data/storage-items.ts` is the one list (`STORED_ITEMS`: the four
  items this site stores plus Clerk's `__client`, `__client_uat`, `__session`) and `/cookies` renders it; `storage-items.test.ts` (6 tests) fails
  on the retired items, on any file in `src/` that uses cookies or storage but is not in its list of four, on any storage name those files use that `STORED_ITEMS` lacks, and on a `gk-auth` lifetime that does not follow the "Lasts:" label; `cookies.test.tsx` (5 tests) checks the
  rendered pages (Clerk named, the suffixed copies of its cookies allowed for, no claim of a complete Clerk list); `public-layout.test.ts` 68 of 68 with axe 0 violations (`/cookies`, `/privacy` included). The review fix wave dropped the claim that Clerk sets only three cookies. **Owner, still open:** look at the cookies on `/app` once in the browser's developer tools to confirm Clerk's names, and the adviser's review of the wording.
- [x] **2. The sitemap lists exactly the articles that exist (K-147).** The built-in articles are made to match the three posts in
  the live CMS (`fixed-price-how-we-scope`, `what-makes-a-website-fast`, `why-one-team-design-and-build`); the two built-in
  articles the CMS does not hold are dropped (they stay in git). Check: a unit test ties the sitemap's article URLs to that list;
  `check:live` gains a read-only check that every article in the live sitemap answers 200 from `blog.php?slug=`.
  **Evidence 2026-11-11 (local, on `goal/v1.2`; released 2026-11-13 as `ea6164c`):** `src/marketing/data/insights.test.ts` (3 tests) ties `insights` and the
  prerendered `/resources/` pages to the three CMS slugs; `scripts/live-check.test.mjs` (24 tests, 3 of them new for this item) covers `articleSlugsFromSitemap` and the
  per-article check; the build still writes 32 pages and 32 sitemap URLs; `public-layout.test.ts` 68 of 68 with axe 0 violations. Live proof 2026-11-13: the live sitemap lists exactly the three CMS articles and `check:live` is 20 of 20. The two retired article URLs may still be indexed and are not redirected (owner decision, "Needs the owner").
- [x] **3. The contact form turns bots away without bothering people.** A hidden honeypot field and a minimum fill time. A
  honeypot hit saves nothing and sends no alert; a too-fast post gets a friendly retry; a real enquiry is unaffected. Check:
  server tests (honeypot, too fast, normal, the throttle still works) and `tests/browser/contact.test.ts` at 375 and 1280 px. This reverses D-055's rejection of a honeypot, with mitigations (D-067).
  **Evidence 2026-11-11 (local, on `goal/v1.2`; released 2026-11-13 as `ea6164c`):** `tests/server/contact-bots.test.ts` (15 tests, written first and seen failing) with the
  existing `contact-hardening`, `enquiry-notify`, `enquiry-services`, `journey`, `references` and `alert-failures` files; `tests/browser/contact.test.ts`
  12 of 12 at 375 and 1280 px (friendly retry keeps what was typed and the retry goes through; a filled hidden field gets a thank-you and stores nothing;
  `tabindex=-1`, `aria-hidden`, `autocomplete=off`, off screen, never reached by Tab); full `test:browser` 148 of 148 with axe on (0 violations on `/contact`).
  The form sends `fillMs`, an elapsed time the browser measures (minimum 2500 ms), not a timestamp, so a visitor's wrong clock changes nothing; a honeypot hit records the sender's email so a real person caught by autofill can be written back to; a second cap bounds the audit rows the refusals write (20 per IP in 15 minutes).
  The limit is stated in `docs/SECURITY.md` section 4 and `docs/API-SPEC.md`: it stops form-filling bots; a script that POSTs JSON directly is limited only by the throttle. **Owner, still open:** the manual autofill pass (NOT TESTED).
  The server half is live since the release of `ea6164c` (2026-11-13); the contact form itself was not exercised on the live site (no real enquiry was sent).
- [x] ~~**4. The contact throttle sees the real visitor IP behind Cloudflare.**~~ **Dropped 2026-11-11 after the builder check: already
  true.** `server/.htaccess` documents that Cloudflare IP restoration is on, and K-123 was closed with evidence (a forged
  `CF-Connecting-IP` ignored; 45 audit rows held visitor addresses). K-102 belongs to the retired reference sign-in.
- [x] **5. An unknown URL gets a real 404.** Today it answers 200 with the not-found page (a soft 404 in Search Console, K-139).
  The build writes `404.html`; `server/notfound.php` sends it with status 404 and `noindex` for any path whose first segment is not
  one the CMS can publish under (`app`, `login`, `set-password`, `p`, `verify`, `work`, `services`, `resources`, any case; not `blog`, which has no route; a wrong-case public path such as `/Contact` is a 404 too). Check: a
  build test for `404.html`; a server test for `notfound.php`; a local Apache run (`pnpm run check:htaccess`) shows 404 for an
  unknown path and 200 for every sitemap page, `/login`, `/app`, `/p/<token>` and a CMS-only article or service. **Live: done 2026-11-13** (the rule is in the host's `.htaccess`, uploaded by hand, `docs/DEPLOYMENT.md`; the release carried `notfound.php` and `404.html`).
  **Evidence 2026-11-11 (local, on `goal/v1.2`; released 2026-11-13 as `ea6164c`):** `src/prerender/not-found.test.ts` (3 tests: `404.html` titled "Page not found",
  noindex, its inline script covered by the CSP in `server/.htaccess`, not in the sitemap); `tests/server/notfound.test.ts` (3 tests: 404 with the
  page, `noindex`, `no-store`; the short fallback page; `blog.php?slug=<unknown>` still a JSON 404); `pnpm run check:htaccess` 67 of 67 under the
  Mac's Apache with PHP-FPM (every prerendered page, `/login`, `/app/leads`, `/App/leads` (any case), `/p/abc`, `/verify/x` and CMS-only `/services`, `/work` and
  `/resources` slugs 200; unknown paths and `/blog/...` 404 with the built page, `noindex`, `no-store` and the same CSP as `/`; `/404.html` by name 200 with the CSP; `/missing.php` and `/assets/` 404);
  all written first and seen failing. `scripts/live-check.mjs`'s `unknown URL answers 404` also requires the `Content-Security-Policy` and `X-Robots-Tag` headers, the one alarm for whether LiteSpeed applies the CSP rule to `notfound.php`. The build writes 32 pages, `404.html` and 32 sitemap URLs; the final ladder (`docs/VERIFICATION.md`): `pnpm test` 701, `test:server` 687 and
  `test:browser` 148, all passing. **Live proof 2026-11-13 (after the release of `ea6164c`):** an unknown URL answers 404 with the branded "Page not found" page, `X-Robots-Tag: noindex`, `Cache-Control: no-store` and the same Content-Security-Policy as the other pages; `/blog/old` 404; `/`, `/work`, `/services/web-design`, `/resources`, the three CMS articles, `/services/a-service-only-in-the-cms`, `/Work/x`, `/cookies`, `/contact` and `/sitemap.xml` 200; `check:live` 20 of 20 (17 of 20 before the release). The branded 404 and the honeypot in a real browser are NOT TESTED.
- [x] **6. The home page's headline is read once by crawlers.** The animated words are marked so a crawler or a screen reader gets
  the sentence one time. Check: a test on the prerendered home page. **Needs the owner's OK** (asked 2026-11-11; "Go ahead").
  Done on `goal/v1.2` (released 2026-11-13 as `ea6164c`): the `.sr` span is removed and the `<h1>` carries the sentence in `aria-label`; the animated words stay `aria-hidden`.
  Evidence: `src/marketing/pages/home-heading.test.tsx` (seen failing, the lead twice; then passing: the lead once, each name once, label equals the sentence); built `dist/index.html` checked; final ladder: `pnpm test` 701, `pnpm run lint` 0, `pnpm run build` 32 pages, `test:browser` 148 with axe 0 violations on `/`. A real screen reader and a crawler's own reading are NOT TESTED.

**Not in V1.2 (parked or the owner's):** the legal "[to supply]" gaps (V1 item 4), prerendering CMS posts and work automatically
(parked: new posts work in the browser but are not in the sitemap until the next build), the phone tables (K-148), the owner
list. **Progress V1.2: 5 of 5 open items ticked (item 4 dropped as already true); released 2026-11-13 as `ea6164c`.** Ticked on local evidence (1, 2, 3, 5, 6); item 5 was then verified live (`check:live` 20 of 20). The final ladder is in `docs/VERIFICATION.md` (types clean, lint 0, 701 unit, 687 server, 148 browser three runs in a row with axe 0, `check:htaccess` 67 of 67, `php -l` 69, `verify` PASS); the review record is in `docs/AUDIT.md`.

## Versions and the nine GSD phases (2026-11-11)

The nine phases of the earlier planning sheet are mapped onto versions so the two cannot disagree.

| Version | What it holds | GSD phases | State |
|---|---|---|---|
| **V0** (go-live and repair) | Hardening, docs and CI gate, Clerk repairs, safe writes, Clerk-only sign-in, certificates, daily-flow speed-ups | 1 to 7 | **Released** (`ae01cec`, `b301ec7`, `cbfd527`, `ed58064`, `01d2269`, `825600e`; Phase 2 closed 2026-11-08 with the CI gate, K-138, and the `release.mjs` wording) |
| **V1** (frozen 2026-11-10) | Ten outcomes from enquiry to paid invoice | the owner-input core of 8 (items 4 and 10) | Released `4bdaed7`; 8 of 10 ticked; 4 and 10 BLOCKED on the owner |
| **V1.1** (frozen 2026-11-11) | The five items above | the lint slice of 9 (item 5); layout and Today safety nets are new | **Released 2026-11-11** (`ed5a724`) |
| **V1.2** (frozen 2026-11-11) | Five open items (one dropped), the buildable rest of Phase 8 | 8 | **Released 2026-11-13** (`ea6164c`; 5 of 5 ticked); the legal wording still waits for the owner's V1 inputs |
| **V2** (PLANNED, not frozen) | The rest of Phase 9 | 9 | Opens only when the owner says so |

A planned version is not started and not frozen: its items are chosen when it opens, by the same two tests as D-063.

### Scope notes for the planned versions

Carried over from the planning sheet (goals, what is in, what is out, how we will know). They are starting points for the
design step, not a frozen list.

**V1.2, public-site trust.** Released 2026-11-13 as `ea6164c`; the frozen list and its evidence are above ("V1.2 finish line"). The original note also named the
legal "[to supply]" gaps (V1 item 4, the owner's inputs, never invented) and prerendering CMS-published posts and work (parked, V2);
neither was in the frozen list.

**V2, clean-up and live verification.** *Goal:* no dead code or schema drift remains, and the whole app is checked signed in on
real data. *In:* remove dead client functions, `fallbackWork`, weather leftovers and unused UI exports (K-139); drop the orphan
`items` table and the legacy auth columns and tables (hand-applied SQL, approved, backed up first); add the missing unique keys
(`files.share_token`, `invoices.number`) and the `audit_log` index; one shared formatter and one error banner; split the files over
600 lines; ESLint 10 for the 13 moderate advisories (K-041); the owner's signed-in walk on real data, which closes K-044.
*Out:* new features. *Done when:* `schema.sql` and the live database are compared, not assumed; docs match measured counts; the
walk is recorded in `docs/AUDIT.md`.

## Needs the owner (BLOCKED, with the exact action)

Prepared in this run: the scripts, tests and instructions below. None of these was done on the server.

| # | Owner action | Unblocks | How |
|---|---|---|---|
| a | Business facts: trading identity and number, VAT status and whether prices include VAT, confirmed prices, IT support pricing and coverage area, ~~public phone~~ (done: +44 20 8059 8757), working hours, cancellation terms | item 4 | `pnpm run check:facts` lists each gap; answers go into `src/marketing/data/site.ts` and the legal pages (`docs/STATUS.md` section 5) |
| b | Adviser sign-off: privacy, terms, retention periods, anonymisation (K-021, K-062, K-108) | items 4, 10 | proposed periods and the questions to ask are in `docs/PRIVACY-READINESS.md` section 6 |
| c | ~~Cron entry~~ **done 2026-11-10.** Still yours: `$REPORT_RECIPIENTS` if you want the weekly digest (K-145) | item 9 | exact line and checks in `docs/OPERATIONS.md` section 2 |
| d | ~~Restore the host's latest backup~~ **done 2026-11-10**; engine recorded (MariaDB 11.4.13). **Targets agreed (D-062).** Still open: decide how dumps get off the host (K-010) | item 8 | steps in `docs/OPERATIONS.md` section 10 |
| e | ~~OpenRouter limit~~ owner chose none (D-062), but **rotate the exposed key**; delete the Clerk user for `dev@gakinz.com`; rename the `TEST owner` row (name needed) | safety | Clerk and OpenRouter dashboards; one `UPDATE` in `docs/DEPLOYMENT.md` section 5 |
| f | ~~One live walk~~ **done 2026-11-10, all seven steps** (`docs/VERIFICATION.md`). Left: the invoice PDF, a real phone | gate 6 (real browser and phone) | `docs/VERIFICATION.md` "Owner walk" |
| g | ~~`$OWNER_ALERTS`~~ **done 2026-11-10** (`hello@gakinz.com`, SMTP login proven). Confirmed by the owner: the TEST email arrived | item 3 live | `docs/DEPLOYMENT.md` section 5 |

**V1.2 (released 2026-11-13, `ea6164c`): what still needs you**

| # | Owner action | Unblocks | How |
|---|---|---|---|
| h | ~~Upload `server/.htaccess` after the release~~ **Done 2026-11-13** (early, at the owner's request; backup `htaccess.before-v1.2-404.20261113T074141Z`; re-checked byte-identical before the merge). ~~Run `pnpm run check:live`~~ **Done: 20 of 20** | item 5 live (verified) | `docs/DEPLOYMENT.md` section 5 |
| i | **A manual autofill pass on the contact form** in Chrome, Safari, Firefox and one password manager (local build or live), then watch `enquiry_bot_dropped` rows for a few weeks (each holds the sender's email, so a misfire can be written back to) | item 3 (NOT TESTED) | `docs/SECURITY.md` section 4, D-067 |
| j | Sign in at `/app` once and look at the cookies in the browser's developer tools, to confirm Clerk's cookie names (the cookie page allows for suffixed copies) | item 1 | `/cookies` lists `__client`, `__client_uat`, `__session` |
| k | The adviser's review of the cookie wording (facts and a citation of Clerk's documentation, not legal advice) | item 1, V1 item 4 | `/cookies`, `src/marketing/data/storage-items.ts` |
| l | Optional decision: redirect the two retired article URLs (`what-makes-a-site-fast`, `accessibility-is-not-optional`, possibly still indexed) to a current article, or leave them (they show the not-found view) | K-147 tail | one redirect rule in `server/.htaccess`, uploaded by hand like the 404 rule |

## Parking lot (V1.2 and later)

Every other idea, refactor and audit finding, one line each, grouped by theme; the version in brackets is where it would join.
Do not build from this list until the owner opens a new scope. Nothing here was deleted from the code or the issue list.

**Public site**
- The home hero eyebrow shows "London" twice ("Designer and developer · London" beside "London 21:11"; it dates from `9859760`, not V1.2). [V2]
- A wrong-case public path such as `/Contact` answers 404 (it used to get the app page); redirect it or fold case, and add a `check:htaccess` case. [V2]
- Prerender CMS-published posts and work and list them in the sitemap automatically (a build that reads the live CMS; today the built-in articles mirror the CMS by hand, V1.2 item 2). [V2]
- Certificates screen checked live (issue, verify, revoke); recipient consent per certificate (K-061). [V1.2]
- Demo flag for Work records in the CMS, which needs a schema change (WORKBOOK 3a.3); the three portfolio demos are already labelled "Demo" on the site. [V1.2]
- Acknowledgement email to the visitor with the enquiry reference (K-097; held back on purpose, a spam-relay risk). [later]

**CMS and daily use**
- Eight CMS tables scroll sideways inside their box on a phone (K-148); stacked rows or a column picker would fix it. [V1.2]
- Quotes list "Total" is the amount before VAT (label it, or show the VAT-inclusive total); Invoicing tiles refresh after "Mark paid" without a reload. [V1.2]
- One-step "Grant portal access" (CMS client account plus Clerk user) and a friendlier message than Clerk's "Couldn't find your account"; the manual steps are in `docs/OPERATIONS.md` 10.2. [V1.2]
- Real assistive-technology pass (screen reader, keyboard-only) on the public site and the CMS; axe in V1.1 is not the same thing. [V2]

**Safety, privacy and money**
- An index on `audit_log (ip, action, created_at)`: `contact.php` runs two counts per post (the throttle and the bot-signal cap); fine at today's size. [V2]
- `gk_oneline()` strips only C0 controls and DEL, so C1 controls, U+2028/U+2029 and bidi overrides pass into the audit `detail` (the honeypot email); low risk. [V2]
- The privacy export and erasure by email do not find a honeypot-only address (they need an enquiry for the same address); handled by hand today (`docs/SECURITY.md`). [V2]
- Enforce the app-shell CSP, which is Report-Only today (K-033; the session token is already out of `localStorage`, checked 2026-11-11, D-057). [V2]
- Cloudflare Authenticated Origin Pulls. [V2]
- A due-date column for data deletion requests (V1.1 item 2 computes the date from the ticket instead). [V2]
- Owner alerts: a retry or queue if a send fails (V1.1 item 3 only makes the failure visible). [V2]
- An index on `audit_log (action, created_at)`: the heartbeat, the contact throttle and the reminder memory all filter on `action`; fine at today's size, a schema change when it grows. [V2]
- Client anonymisation switch-on (K-108; needs the adviser). [owner]
- Stripe: switch on pay links (owner steps in `docs/DEPLOYMENT.md`, then test mode, then live). [owner]
- Server suite on MySQL 5.7 and 8 (K-099, K-111); CI runs MySQL 8. [V2]

**Code health**
- ESLint 10 for the 13 moderate advisories (K-041). [V2]
- Strict tsc leftovers: K-072, K-074, K-077, K-078, K-083, K-020. [V2]
- Large files: `server/work.php`, `Dashboard.tsx`, `bookings.php`, `proposals.php`, `Invoicing.tsx` (over 600 lines each). [V2]
- Dead code and schema drift (K-139): the `items` table, unused client functions, `fallbackWork`, missing unique keys, duplicated formatters and error banners. [V2]

**Switched off on purpose**
- Ad pilot (K-104 to K-107). OpenRouter-backed AI assistant features. PayPal (hidden until a webhook exists). [later, only if you ask]

## Cut (decided not to build for V1; the code stays)

- The 175-feature spec and the modules that do not help win or bill work: Design, DevPipeline, Resourcing,
  Knowledge, CarePlan, Time, Analytics and the Figma, GitHub, Slack and SMS integrations get no V1 work.
- Six staff roles for one user: kept for safety, no new work on them.
- The AI module (`_ai.php`, `ai.php`): spend risk and no V1 outcome. Left switched as it is.
- Ad pilot and monetisation policy for a services site.
- New features to the public `/verify` certificates until a recipient-consent decision exists.
- A separate Playwright dependency tree and a staging environment: the browser test drives built `dist/` against
  local PHP on a throwaway database.

## Draft corrections (what the draft said and what is true)

| Draft | Found |
|---|---|
| "`site.ts:22` placeholder phone `+44 20 0000 0000`" | Untrue. That number was removed in the 2026-09-22 relaunch; `phone` is `null` and renders a labelled gap. The live gaps are the `[... to supply]` markers in `/privacy`, `/terms` and `/pricing`. |
| Item "owner receives it" implied the mail path only needed testing | There is no mail path: `contact.php` stores the row and sends nothing. Building it is part of item 3. |
| Demo portfolio entries are "demo content in the live data file" | They are labelled `status: "Demo"` on the site, which is honest; the missing piece is a CMS flag (parked). |
| "planned-features tables mark items 'Built, needs SQL N' that are already applied" | NOT VERIFIED; not acted on. |
| 10 items, 9 open | Re-cut to 10 items, 8 open (two ticked with evidence). Item 5 to 7 are largely built and tested at API level; what is open is evidence in a browser and on real data. |

## What may jump the queue

Only a security hole, data loss, a broken legal requirement, or something that makes a ticked item untrue.
The commit message says which.

## Slices (working order)

| # | Slice | Items | Status |
|---|---|---|---|
| 1 | Enquiry notification and the contact browser test | 3 | DONE |
| 2 | Placeholder check and owner input list | 4 | DONE (the facts: owner) |
| 3 | Money, VAT and portal isolation evidence | 5, 6, 7 | DONE |
| 4 | Restore drill | 8 | DONE (targets agreed, D-062; off-host copy still open) |
| 5 | Cron heartbeat and visible notice | 9 | DONE |
| 6 | Deletion request handling | 10 | DONE (retention periods: owner and adviser) |
| 7 | Docs merge, audit, ladder, handoff | all | DONE |
