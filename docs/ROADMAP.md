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
- [ ] **3. A visitor submits the contact form and the owner is told at once.** Today the enquiry is saved
  and appears in Leads, but nothing emails the owner (found 2026-11-10: `contact.php` sends no mail, and the
  weekly digest never runs, K-145). Check: `tests/server/enquiry-notify.test.ts` (saved once, owner emailed,
  mail failure never loses the enquiry) and `npm run test:browser` (`tests/browser/contact.mjs`, the real form
  in a real browser against local PHP).
- [~] **4. Every public page states true business facts and shows no "to supply" placeholder.** Needs the
  owner's facts (trading identity, VAT, prices, phone, IT support area, legal pages). Check:
  `npm run check:facts -- --strict` exits 0 (today it lists every open gap with the page and the exact
  wording). BLOCKED, owner.
- [ ] **5. The owner turns an enquiry into a client, a quote, an accepted project and an invoice.** Check:
  `tests/server/journey.test.ts` steps 2 to 7 plus the Phase 7 quote-from-enquiry and quote-to-project
  tests; one live walk with TEST records is BLOCKED (owner).
- [ ] **6. The owner issues an invoice and records a payment (Stripe or manual) with the right VAT.**
  Check: `journey.test.ts` steps 7 to 9, `manual-payment.test.ts`, `paid-state.test.ts` and a VAT case at
  an awkward amount (`tests/server/vat-totals.test.ts`). Whether the business is VAT registered and the
  review of past Stripe charges (K-025) are the owner's.
- [ ] **7. A client signs in to the portal and sees only their own project, invoice and files.** Check:
  `journey.test.ts` step 10, `portal-files.test.ts`, `support-client.test.ts` and the signed-out, wrong-role
  and other-client matrix in `tests/server/portal-isolation.test.ts`.
- [~] **8. A backup is restored once and the recovery target is agreed (K-010).** Check: `npm run
  drill:restore` restores the newest Mac copy of the database dump into a throwaway database and compares
  tables and row counts; the dated result is in `docs/OPERATIONS.md` section 10. Restoring the **host's**
  copy, the uploads, and agreeing the targets are BLOCKED (owner).
- [ ] **9. Scheduled work is either running or visibly switched off.** The host has no GAkinz cron entry
  (K-145), so invoice reminders, retainer billing, the weekly digest, uptime checks and pruning do not run.
  Check: `tests/server/cron-heartbeat.test.ts` (a run leaves a heartbeat; no heartbeat in 36 hours shows the
  owner a notice in Today and Settings naming what is off). The crontab line and the decision to add it are
  the owner's (BLOCKED).
- [~] **10. Privacy basics work: a deletion request reaches the owner with a due date, and retention periods
  are set.** Check: `tests/server/deletion-request.test.ts` (extended for K-095: high priority, due in 30
  days, owner emailed, shown in Today). The `$RETENTION_*` periods need the owner and an adviser (K-062);
  `$RETENTION_APPLY` stays false. BLOCKED, owner.

`node scripts/finish-status.mjs` or `npm run finish` is not set up here; progress is the boxes above.

## Needs the owner (BLOCKED, with the exact action)

Prepared in this run: the scripts, tests and instructions below. None of these was done on the server.

| # | Owner action | Unblocks | How |
|---|---|---|---|
| a | Business facts: trading identity and number, VAT status and whether prices include VAT, confirmed prices, IT support pricing and coverage area, public phone, working hours, cancellation terms | item 4 | `npm run check:facts` lists each gap; answers go into `src/marketing/data/site.ts` and the legal pages (`docs/STATUS.md` section 5) |
| b | Adviser sign-off: privacy, terms, retention periods, anonymisation (K-021, K-062, K-108) | items 4, 10 | proposed periods and the questions to ask are in `docs/PRIVACY-READINESS.md` section 6 |
| c | Cron entry on the host, and the `$REPORT_RECIPIENTS` / `$OWNER_ALERTS` / `$SMTP_*` checks (K-145) | items 3 (digest), 9 | exact line and checks in `docs/OPERATIONS.md` section 2 |
| d | Restore the host's latest backup and the uploads somewhere isolated; agree the recovery targets; record the live database engine (K-010, K-099) | item 8 | steps in `docs/OPERATIONS.md` section 10 |
| e | OpenRouter monthly spending limit; delete the Clerk user for `dev@gakinz.com`; rename the `TEST owner` row | safety | Clerk and OpenRouter dashboards; one `UPDATE` in `docs/DEPLOYMENT.md` section 5 |
| f | One live walk with TEST records: contact form to paid invoice, certificates, downloads, a client sign-in | gate 6 (real browser and phone) | `docs/VERIFICATION.md` "Owner walk" |
| g | Add `$OWNER_ALERTS = 'your address'` to `config.php` (and check `$SMTP_*`) before the release that carries item 3; there is no fallback to the digest list | item 3 live | `docs/DEPLOYMENT.md` section 5 |

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
- Real assistive-technology pass on the public site and the CMS.

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
| 1 | Enquiry notification and the contact browser test | 3 | PLANNED |
| 2 | Placeholder check and owner input list | 4 | PLANNED |
| 3 | Money, VAT and portal isolation evidence | 5, 6, 7 | PLANNED |
| 4 | Restore drill | 8 | PLANNED |
| 5 | Cron heartbeat and visible notice | 9 | PLANNED |
| 6 | Deletion request handling | 10 | PLANNED |
| 7 | Docs merge, audit, ladder, handoff | all | PLANNED |
