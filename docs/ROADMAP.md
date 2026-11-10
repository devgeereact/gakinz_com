# Roadmap

One list decides when GAkinz V1 is **finished**. Nothing else does. Adopted on 2026-11-10 from the
draft in `~/Developer/build-kit/docs/finish-drafts/gakinz_com.md` after checking it against the code
(corrections are in "Draft corrections" below).

## V1 finish line (frozen)

**Frozen on 2026-11-10** (D-060) · changed only with the owner's written OK.
Rules: at most 10 items. Each is something a real user can do, with a check that proves it. An item is
ticked on **local** evidence (tests on a throwaway database, a browser run on localhost). What can only be
shown on the live system is gate item 6 of the live-ready gate and is listed as BLOCKED under "Needs the
owner". Mark an item `[~]` while part of it waits for the owner.

The product: a trustworthy public site that turns visitors into enquiries, and a CMS where the owner runs
one enquiry to a paid invoice and a client sees only their own work.

- [x] **1. A visitor reads the six services and the prices on prerendered pages with a sitemap.** Check:
  `npm run build` prerenders 32 public pages and writes `sitemap.xml` (see `docs/VERIFICATION.md`); live:
  `npm run check:live` 16 of 16 on 2026-11-09 (`docs/AUDIT.md`).
- [x] **2. The owner signs in with Clerk only; the retired password, magic-link, Google and reference
  routes answer 404.** Check: `tests/server/legacy-retired.test.ts`, D-057, `npm run check:live`. The owner
  still confirms one fresh email-code sign-in (BLOCKED, owner).
- [x] **3. A visitor submits the contact form and the owner is told at once.** Found 2026-11-10: `contact.php` saved
  the enquiry and sent no mail, and the digest cannot run without a cron entry (K-145, K-146). Now it emails
  `$OWNER_ALERTS`. Evidence: `tests/server/enquiry-notify.test.ts` (8 tests: saved once, owner emailed, no fallback to
  the digest list, 20 an hour cap, mail failure and a dead mail host never lose the enquiry, header injection) and
  `npm run test:browser` (`tests/browser/contact.test.ts`: the real form in Chromium at 375 and 1280 px against local PHP,
  thank-you with reference, row stored once, mail received, bad field refused, server failure keeps what was typed, no
  console errors or failed requests). **Live: the owner must set `$OWNER_ALERTS`** (table row g) or nothing is sent.
- [~] **4. Every public page states true business facts and shows no "to supply" placeholder.** Needs the
  owner's facts (trading identity, VAT, prices, phone, IT support area, legal pages). Check:
  `npm run check:facts -- --strict` exits 0 (today it lists every open gap with the page and the exact
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

**Progress (2026-11-10, released as `4bdaed7`): 8 of 10 ticked, 2 waiting for the owner (4, 10).** There is no `npm run finish` here; the boxes are the progress.

## Needs the owner (BLOCKED, with the exact action)

Prepared in this run: the scripts, tests and instructions below. None of these was done on the server.

| # | Owner action | Unblocks | How |
|---|---|---|---|
| a | Business facts: trading identity and number, VAT status and whether prices include VAT, confirmed prices, IT support pricing and coverage area, ~~public phone~~ (done: +44 20 8059 8757), working hours, cancellation terms | item 4 | `npm run check:facts` lists each gap; answers go into `src/marketing/data/site.ts` and the legal pages (`docs/STATUS.md` section 5) |
| b | Adviser sign-off: privacy, terms, retention periods, anonymisation (K-021, K-062, K-108) | items 4, 10 | proposed periods and the questions to ask are in `docs/PRIVACY-READINESS.md` section 6 |
| c | ~~Cron entry~~ **done 2026-11-10.** Still yours: `$REPORT_RECIPIENTS` if you want the weekly digest (K-145) | item 9 | exact line and checks in `docs/OPERATIONS.md` section 2 |
| d | ~~Restore the host's latest backup~~ **done 2026-11-10**; engine recorded (MariaDB 11.4.13). **Targets agreed (D-062).** Still open: decide how dumps get off the host (K-010) | item 8 | steps in `docs/OPERATIONS.md` section 10 |
| e | ~~OpenRouter limit~~ owner chose none (D-062), but **rotate the exposed key**; delete the Clerk user for `dev@gakinz.com`; rename the `TEST owner` row (name needed) | safety | Clerk and OpenRouter dashboards; one `UPDATE` in `docs/DEPLOYMENT.md` section 5 |
| f | ~~One live walk~~ **done 2026-11-10 for steps 1, 2, 3, 5, 7** (`docs/VERIFICATION.md`). Left: a test client sign-in (steps 4, 6), the invoice PDF, a real phone | gate 6 (real browser and phone) | `docs/VERIFICATION.md` "Owner walk" |
| g | ~~`$OWNER_ALERTS`~~ **done 2026-11-10** (`hello@gakinz.com`, SMTP login proven). Confirmed by the owner: the TEST email arrived | item 3 live | `docs/DEPLOYMENT.md` section 5 |

## Parking lot (V1.1 and later)

Every other idea, refactor and audit finding, one line each. Do not build from this list until the owner
opens a new scope. Nothing here was deleted from the code or the issue list.

- Phase 8 public-site trust beyond the placeholders (needs legal inputs) and Phase 9 (drop retired legacy columns and tables).
- Certificates screen checked live (issue, verify, revoke); recipient consent per certificate (K-061).
- Demo flag for Work records in the CMS (WORKBOOK 3a.3); the three portfolio demos are already labelled "Demo" on the site.
- Analytics shows "unavailable" instead of zero when a source fails (K-031).
- `npm run lint` clean and replace the ratchet (5 errors left, K-002).
- Enforce the app-shell CSP; move the session token out of `localStorage` (K-033).
- ESLint 10 for the 13 moderate advisories (K-041).
- The home-page H1 read twice by crawlers.
- Strict tsc leftovers: K-072, K-074, K-077, K-078, K-083, K-020.
- Ad pilot (K-104 to K-107), switched off.
- Client anonymisation switch-on (K-108).
- Cloudflare Authenticated Origin Pulls.
- OpenRouter-backed AI assistant features.
- PayPal (hidden until a webhook exists).
- Server suite on MySQL 5.7 and 8 (K-099, K-111); CI runs MySQL 8.
- Large files: `server/work.php`, `Dashboard.tsx`, `bookings.php`, `proposals.php`, `Invoicing.tsx` (over 600 lines each).
- Acknowledgement email to the visitor (K-097).
- A due-date column and a Today item for data deletion requests (K-095 remainder).
- An index on `audit_log (action, created_at)`: the heartbeat, the contact throttle and the reminder memory all filter on `action`; fine at today's size, schema change when it grows.
- Owner alerts: a retry or queue if a send fails (today: audited, the item is in Leads or Support either way).
- Real assistive-technology pass on the public site and the CMS.
- Quotes list "Total" is the amount before VAT (label it, or show the VAT-inclusive total); Invoicing tiles refresh after "Mark paid" without a reload.

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
