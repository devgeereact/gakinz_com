# Current Task Contract

## Outcome

The client journeys work of 2026-10-18 to 2026-10-19 is built, tested locally and documented
on `feat/journeys-2026-10-18`, in two batches: 43 commits on `audit/readiness-2026-10-17` at
`8499761` (PR #20), then a second batch of 53 commits from `6789b47` to `def1909` (PR #21),
then a third batch of 39 commits from `029f867` to `bdca4aa` on the same branch, then a fourth
batch of nine commits from `8193555` to `ebcb002` (the six service pages), then a fifth batch
of 31 commits from `3636373` to `b0bbf8b` (work references, deletion tooling, business
details and a final fix wave), then a sixth batch of 15 commits from `54d593a` to `fa88266`
(client sign-in by reference and email, and consent and ad slots, both switched off), each
with its documentation commits. **Not merged, deployed or uploaded.** SQL 13 to 19 have run
only on the throwaway test database; the sixth batch has no SQL.

The branch stack is now: `main` <- `feat/plan-2026-batch-1` (PR #8) <- `feat/redesign-2026` <-
`audit/readiness-2026-10-17` (PR #20) <- `feat/journeys-2026-10-18`. Merge in that order, and
only after the operator steps below, because a merge to `main` deploys `dist/`.

The verdict of `docs/STATUS.md` section 0.1 still stands: **not ready for production.**

### Done on `feat/journeys-2026-10-18` (2026-10-18 to 2026-10-19)

Server (upload by hand; `docs/DEPLOYMENT.md` section 5.3):

- `invoices.php`: `record_payment`, a bank transfer, cash, cheque or other payment checked
  against the `_money.php` payable total (needs SQL 13; requires `_money.php`).
- `proposals.php`: acceptance evidence and a SHA-256 terms fingerprint, the 40/30/30 split in
  integer pence, "Accepted on" on the public view (needs SQL 14; K-068).
- `support.php`: client `update_request`. `bookings.php`: client `request` and `mine`, at most
  five open call requests, and `ics` / `mine_ics` calendar files built by the new `_ics.php`.
  **Upload `bookings.php` and `_ics.php` together.**
- `assets.php` (new): project asset checklist with a client `mine` and `supply` branch (needs
  SQL 15; K-072).
- `schema.sql`: SQL 13, 14 and 15 at the foot.

Client: Record payment dialog in Invoicing; evidence fields in the Quotes accept dialog;
Requests card (update and call requests) and "What we need from you" in the portal; the asset
panel on the project board; calendar download in Enquiries, Calls and the portal; "Client
sign in" in the public header, drawer and footer; `favicon.ico` and `site.webmanifest`
(K-066); the lint ceiling cut to 33 errors and 0 warnings (K-002); toasts following the theme
at AA, a focusable Projects board region and an inline refused-acceptance message (K-073).

Documents: `docs/STATUS.md` (sections 0, 0.2, 2, 3, 4, 5), `docs/KNOWN-ISSUES.md` (K-002,
K-046, K-048, K-054 row, K-055, K-066, new K-067 to K-073), `docs/DEPLOYMENT.md` section 5,
`docs/DATA-MODEL.md`, `docs/API-SPEC.md`, `docs/SECURITY.md`, `docs/PRODUCT-SPEC.md` section 7,
`docs/ARCHITECTURE.md`, `server/README.md`, `CLAUDE.md`.

### Done in the second batch (2026-10-19, `6789b47..def1909`, PR #21)

Server (upload by hand; `docs/DEPLOYMENT.md` section 5.3; all staff or admin only):

- `today.php` (new): the Today attention list, six sections gated per role. No SQL.
- `search.php` with `_like.php` (both new): record search across clients, projects,
  enquiries, invoices and quotes. **Upload together.**
- `briefs.php` (new): project brief, measurements and the sanitised GEE OS handoff (SQL 16;
  K-080).
- `privacy.php` with `_retention.php` (both new) and `cron.php job=retention_report`: subject
  access export and a read-only retention dry run, nine `$RETENTION_*` keys all `null`. No
  deletion (K-062, K-079). **Upload the three together.**
- `.htaccess`: a missing `.php` answers 404 instead of the SPA shell (LiteSpeed NOT TESTED).
- `schema.sql`: SQL 16 (`project_briefs`, `project_measurements`).

Client: "Needs attention" leads the dashboard; a Records group in Cmd or Ctrl+K; the Brief
panel on the project board; "Export data" on the client record and a Privacy tab in Settings;
record deep links (`?project=` with `&task=` or `&asset=`, `?invoice=`, `?enquiry=`,
`?view=calls&call=`, `?client=`); recommendation blocks in articles; one shared "not on the
server yet" rule (`src/lib/notAvailable.ts`); a named search dialog with its status outside the
listbox, and a focusable retention table.

Documents: `docs/STATUS.md` (sections 0, 0.3, 2, 3, 4, 5), `docs/KNOWN-ISSUES.md` (K-062,
K-067, new K-074 to K-082), `docs/DEPLOYMENT.md` section 5, `docs/DATA-MODEL.md`,
`docs/API-SPEC.md`, `docs/SECURITY.md`, `docs/PRIVACY-READINESS.md` sections 6 and 7,
`docs/OPERATIONS.md` section 2, `docs/PRODUCT-SPEC.md` section 7, `docs/ARCHITECTURE.md`,
`server/README.md`, `CLAUDE.md`.

### Done in the third batch (2026-10-19, `029f867..bdca4aa`)

Server (upload by hand; `docs/DEPLOYMENT.md` section 5.3):

- `_time.php` (new) with `support.php` and `time.php`: `support.php?action=log_time` (staff,
  not trainer) logs ticket time onto the client's standing "IT support" project, made once
  (SQL 17: `time_entries.ticket_id`, `projects.kind`). **Upload `_time.php` with or before
  `support.php` and `time.php`**, or time logging answers 503, the Time screen included.
- `files.php`: `client_share`, and the client routes `mine` and `mine_download` (SQL 18:
  `files.client_visible`, `files.shared_at`), security-critical. Every download now uses one
  hardened path: plain stored names only, `realpath` inside `uploads/`, `filename*` with an
  ASCII fallback, `private, no-store`, except `public, max-age=86400` for a never-expiring
  share link (K-087).
- `projects.php` with `_templates.php` (new): five work-type templates, the client checklist
  opt-in (K-086). Without `_templates.php` only the template routes answer 503.
- `portal.php`: the standing project shows as "IT support". `privacy.php`: the export's file
  rows add `client_visible` and `shared_at`.
- `schema.sql`: SQL 17 and 18 at the foot.

Client: Log time and Logged time on a ticket, `/app/support?ticket=<id>`, "Ticket #N" on the
Time screen; "IT support" and a "Shared files" card in the portal; "Visible to client" in
Files; "Start from template" with a preview in New project; "Leave without saving?" on the
Blog post editor, New quote, New contract, Work, Site content and the Brief sections (K-083,
K-084). Test harness: busy-port refusal and process-group clean-up (K-089).

Documents: `docs/STATUS.md` (sections 0, 0.4, 2, 3, 4, 5), `docs/KNOWN-ISSUES.md` (K-067,
new K-083 to K-089), `docs/DEPLOYMENT.md` section 5, `docs/DATA-MODEL.md`,
`docs/API-SPEC.md`, `docs/SECURITY.md`, `docs/OPERATIONS.md` section 8,
`docs/PRIVACY-READINESS.md`, `docs/PRODUCT-SPEC.md` sections 5.6 and 7, `CLAUDE.md`.

### Done in the fourth batch (2026-10-19, `8193555..ebcb002`)

Server (upload by hand; `docs/DEPLOYMENT.md` section 5.1 step 12):

- `site.php`: a services row may carry `slug`, `group`, `hook`, `detail`, `needs`,
  `deliverables`, `exclusions` and `price_basis`; all but `detail` come together or not at
  all. No SQL. **Upload before merging**: the new Site content editor sends those fields and
  the 2026-10-14 file refuses them. The public site is safe in either order.

Client: six service pages in two groups (Websites, IT support) from spec 4.3, each with hook,
needs, what you get, not included and price basis; the six choices on the enquiry form, carried
from each service page (`/contact?service=<slug>`); Site content > Services edits whole pages,
refuses a half page and upgrades an older title-and-summary list when opened (adding the IT
pages at the end). After the merge the owner opens Site content > Services once and saves
(K-093). Prerender now 32 pages.

Documents: `docs/STATUS.md` (sections 0, 0.5, 2, 3, 4, 5), `docs/KNOWN-ISSUES.md` (K-038, new
K-090 to K-093), `docs/DEPLOYMENT.md` section 5, `docs/DECISIONS.md` D-048, `docs/API-SPEC.md`
section 7a, `docs/ARCHITECTURE.md`, `docs/PRODUCT-SPEC.md` sections 4.1, 4.3 and 7, `CLAUDE.md`.

Owner inputs this batch leaves open (`docs/STATUS.md` section 5): IT coverage, area and
response time (K-090); IT prices; confirmation of the package prices with a VAT basis; the three
inferred website exclusions (K-092); whether the budget bands should add a smaller band (K-091).

### Done in the sixth batch (2026-10-19, `54d593a..fa88266`): gated features

Both features ship switched off, with tests proving nothing changes while off (D-050).

- **Task 24, client sign-in by reference and email** (spec 6.1 phase 2): new
  `server/client_access.php` (`status`, `request`, `redeem`), off unless the live `config.php`
  sets `$REFERENCE_SIGNIN_ENABLED = true`; 404 on every route while off. Links reuse
  `magic_links` (no SQL). The sign-in page form and `#access` redemption show only when the
  server says it is on. J02 and J03 pass locally. Upload `client_access.php` with or after the
  K-059 `_bootstrap.php` and `_smtp.php` (`docs/DEPLOYMENT.md` section 5.1 step 14). **Do not
  switch it on** before the four gates in `docs/DEPLOYMENT.md` section 5.4: early finish or
  fast SMTP (K-101), a `purpose` column on `magic_links` (K-100), the real client IP behind
  Cloudflare (K-102), and the owner's sign-in policy.
- **Task 25, consent and ad slots**: tracked settings in `src/marketing/lib/monetisation.ts`,
  all off; a TCF consent loader on public routes only; up to two labelled article ad slots
  that render only after Purpose 1 consent; a prerender gate that fails the build on any
  third-party markup. Ships in `dist/` with the merge; switching it on is a code change and a
  deploy, not an upload.
- **Task 26, client anonymisation: not built.** The dispatch was refused by the session's
  safety check and not worked around. Owner and adviser decision (K-108).

Documents: `docs/STATUS.md` (sections 0, 0.7, 3, 4, 5), `docs/KNOWN-ISSUES.md` (K-100 to
K-108), `docs/DEPLOYMENT.md` section 5 (step 14, the 5.4 gates, check 17),
`docs/SECURITY.md` section 2, `docs/API-SPEC.md`, `docs/DECISIONS.md` D-050 (and a note on
D-049), `docs/PRODUCT-SPEC.md` sections 6.1 and 7, `docs/PRIVACY-READINESS.md` section 4,
`docs/CONTENT-AND-GROWTH.md` section 3, `qa/TEST-PLAN.md` J02 and J03, `server/README.md`,
`CLAUDE.md`, and the comment text in `server/_reference.php` and the SQL 19 block of
`server/schema.sql`.

### Verification status, sixth batch, 2026-10-19 (Mac, `fa88266`)

- `npx tsc -b`, `npm run build` (32 public pages and `app-shell.html`, 32 sitemap URLs, with
  the third-party gate): PASS.
- `npm test`: PASS, 499 tests in 41 files.
- `GK_TEST_DB=gakinz_docs6_test GK_TEST_PHP_PORT=5423 GK_TEST_PROVIDER_PORT=5424 npm run test:server`:
  PASS, 496 tests in 35 files (459 s).
- `npm run lint:ratchet`: PASS at 33 errors, 0 warnings. `npm run lint`: FAIL (K-002).
- `php -l` over 63 server files: PASS. `npm run docs:check -- --base audit/readiness-2026-10-17`:
  PASS.
- NOT TESTED: a browser run of the sign-in form, the `#access` redemption or the ad slots; a
  real CMP or AdSense script; real SMTP; the early-finish timing path; the live server
  (UNVERIFIED).

### Done in the fifth batch (2026-10-19, `3636373..b0bbf8b`)

Server (upload by hand in the order of `docs/DEPLOYMENT.md` section 5.1 step 13):

- `_reference.php` (new) and SQL 19: `GK-E-YYYY-NNNN` and `GK-P-YYYY-NNNN` on every new
  enquiry and project, per kind and year, never reused; carried by `contact.php`,
  `leads.php`, `projects.php`, `proposals.php`, `invoices.php`, `contracts.php`, `portal.php`,
  `search.php` and `support.php`. Never read from a request (D-049). SQL 19 is two steps;
  step 2 is one paste in one SQL tab, safe to repeat, and changes existing rows.
- `_erasure.php` (new), `privacy.php` (`erase_preview`, `erase_enquiry`, super admin),
  `cron.php` (`job=retention_apply`, gated by `--apply`, `$RETENTION_APPLY` and the period),
  `support.php` (client `deletion_request`), `config.php.example` (`$RETENTION_APPLY =
  false`).
- `_uploads.php` (new): `files.php` now requires it on every route, the public Work image
  links included, so **upload `_uploads.php` before `files.php`**.
- `site.php`: the `business` section. **Upload before merging.**

Client: references on the contact thank-you, Enquiries, Projects, Proposals, Contracts, the
PDFs and the portal; "Erase enquiry" in the Enquiries drawer for a super admin; "Ask to delete
my data" in My account for a client; Site content > Business details, read by the footer,
About, the legal pages and the JSON-LD `sameAs`.

Documents: `docs/STATUS.md` (sections 0, 0.6, 2, 3, 4, 5), `docs/KNOWN-ISSUES.md` (K-062, new
K-094 to K-099), `docs/DEPLOYMENT.md` section 5, `docs/DECISIONS.md` D-049,
`docs/DATA-MODEL.md`, `docs/API-SPEC.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`,
`docs/OPERATIONS.md`, `docs/PRIVACY-READINESS.md`, `docs/PRODUCT-SPEC.md` sections 4.4 and 7,
`server/README.md`, `CLAUDE.md`.

Ruled out of this batch: sign-in by reference (needs J03 and the owner's policy), an
acknowledgement email (K-097), a consent banner (no analytics or ads planned yet) and AdSense
(needs an account and a consent platform).

Owner inputs this batch leaves open (`docs/STATUS.md` section 5): a random yearly offset for
references (K-094); priority, due date or notification for deletion requests (K-095); the
retention periods, with `$RETENTION_APPLY` kept `false` until then (K-062).

### Verification status, fifth batch, 2026-10-19 (Mac, `b0bbf8b`)

- `npx tsc -b`, `npm run build` (32 public pages and `app-shell.html`, 32 sitemap URLs): PASS.
- `npm test`: PASS, 450 tests in 36 files.
- `GK_TEST_DB=gakinz_docs5_test GK_TEST_PHP_PORT=5411 GK_TEST_PROVIDER_PORT=5412 npm run test:server`:
  PASS, 455 tests in 34 files (394 s).
- `npm run lint:ratchet`: PASS at 33 errors, 0 warnings. `npm run lint`: FAIL (K-002).
- `php -l` over 62 server files: PASS. `npm run docs:check -- --base audit/readiness-2026-10-17`:
  PASS.
- Production build in a browser with the API stubbed, at `486d77c` (before the fix wave):
  references, prospect erase, the client deletion request and Business details with hostile
  values, at 390 and 1440px, light and dark: PASS, axe 0 violations.
- NOT TESTED: the fix wave's two CMS changes in a browser, the contract and invoice PDFs,
  SQL 19 on MySQL (K-099), `cron.php` under the cPanel cron binary, the live server
  (UNVERIFIED), real data, a real sign-in, real assistive technology.

### Verification status, fourth batch, 2026-10-19 (Mac, `ebcb002`)

- `npx tsc -b`, `npm run build` (32 public pages and `app-shell.html`, 32 sitemap URLs): PASS.
- `npm test`: PASS, 415 tests in 34 files.
- `GK_TEST_DB=gakinz_docs4_test GK_TEST_PHP_PORT=5399 GK_TEST_PROVIDER_PORT=5400 npm run test:server`:
  PASS, 405 tests in 30 files.
- `npm run lint:ratchet`: PASS at 33 errors, 0 warnings. `npm run lint`: FAIL (K-002).
- `php -l` over 59 server files: PASS. `npm run docs:check -- --base audit/readiness-2026-10-17`:
  PASS.
- Production build in a browser with the API stubbed: public Services and six detail pages at
  390, 1024 and 1440px, enquiry preselection (12 click-throughs, 2 direct loads), the CMS
  Services editor (on the build before fix rounds 1 and 2) and the single leave prompt: PASS,
  axe 0 violations.
- NOT TESTED: the editor's legacy-list note and upgrade in a browser, the `?package=` note after
  hydration, the live server and what is published there (UNVERIFIED), a real sign-in, real
  data, real assistive technology.

### Verification status, third batch, 2026-10-19 (Mac, `bdca4aa`)

- `npx tsc -b`: PASS. `npm run build`: PASS at `af151cb` and at `bdca4aa` for the browser
  check (30 public pages prerendered); not re-run for the documentation commit.
- `npm test`: PASS, 396 tests in 34 files (at 2ba81ae; 395 at bdca4aa).
- `GK_TEST_DB=gakinz_docs3_test GK_TEST_PHP_PORT=5395 GK_TEST_PROVIDER_PORT=5396 npm run test:server`:
  PASS, 398 tests in 29 files, on the rerun. The first run failed 1 of 398, a `beforeEach`
  timeout in `blog.test.ts` under a load average of about 25; the file alone passed 4 of 4.
- `npm run lint:ratchet`: PASS at 33 errors, 0 warnings. `npm run lint`: FAIL (K-002).
- `php -l` over 59 server files (PHP 8.5.10): PASS. `npm run docs:check -- --base 029f867`
  and `-- --base audit/readiness-2026-10-17`: PASS.
- Production build in a browser with every `*.php` stubbed and off-origin requests aborted:
  Support Log time and the Time link, the portal's IT support project and Shared files, the
  Files switch, Start from template and the Brief draft guard, at 1440 and 390px, light and
  dark: PASS. axe: 0 violations except an older unnamed Client select in New project (K-088).
- NOT TESTED: the live server and database, SQL 17 and 18 on the host, a real sign-in, real
  data, a real client download, browser Back and tab close with the draft guard, the guard on
  the other five screens in a browser, share-link caching behind Cloudflare, real assistive
  technology.

### Verification status, second batch, 2026-10-19 (Mac, `def1909`)

- `npx tsc -b`, `npm run build` (30 public pages and `app-shell.html` prerendered): PASS.
- `npm test`: PASS, 355 tests in 30 files.
- `GK_TEST_DB=gakinz_docs_test GK_TEST_PHP_PORT=5309 GK_TEST_PROVIDER_PORT=5310 npm run test:server`
  (local MariaDB `*_test`; ports 5191 and 5192 belong to another project on the Mac): PASS,
  340 tests in 26 files.
- `npm run lint:ratchet`: PASS at 33 errors, 0 warnings. `npm run lint`: FAIL (K-002).
- `php -l` over 57 server files (PHP 8.5.10): PASS. `npm run docs:check -- --base
  audit/readiness-2026-10-17`: PASS.
- Production build in a browser with every `*.php` stubbed and off-origin requests aborted:
  Today, record search, the Brief panel, client export, Settings Privacy, recommendation
  blocks, and each new endpoint missing, at 1440 and 390px, light and dark. axe 4.13: 0
  violations after the fix wave, except the `cmdk` empty state (K-081). `.htaccess` rule on a
  local Apache: PASS.
- NOT TESTED: the live server and database, SQL 16 on the host, a real sign-in, real data,
  asset and call deep links from Today, server-rendered recommendation blocks, PHP before 8.1
  (K-082), the `.htaccess` rule on LiteSpeed, real assistive technology. Live PHP version:
  UNVERIFIED.

### Verification status, first batch, 2026-10-19 (Mac)

- `npx tsc -b`, `npm run build` (30 pages prerendered): PASS.
- `npm test`: PASS, 239 (223 before the final-review fixes added 16 in `portalRequestsModel` and `assetChecklistModel`). `GK_TEST_PHP_PORT=5291 GK_TEST_PROVIDER_PORT=5292 npm run test:server`
  (local MariaDB `*_test`; port 5192 is held by another project on the Mac): PASS, 275.
- `npm run lint:ratchet`: PASS at 33 errors, 0 warnings. `npm run lint`: FAIL (K-002).
- `php -l` over 51 server files: PASS. `npm run docs:check -- --base audit/readiness-2026-10-17`:
  PASS.
- Production build in a browser with every API call stubbed and off-origin requests blocked:
  Invoicing, Quotes and the public quote, the client portal, the Projects asset panel,
  Enquiries Calls and the public site at 1440 and 390px, light and dark. axe 4.13: 0
  violations after the K-073 fixes. One design risk recorded (K-069).
- NOT TESTED: the live server and database, a real sign-in, SQL 13 to 15 on the host, the
  asset 503 state, races between two requests, real calendar apps importing the file, real
  assistive technology.
- Deployed server state: UNVERIFIED (K-006).

## Next actions, in order

1. **Owner review of PR #21** (the second to sixth batches on `feat/journeys-2026-10-18`).
   An agent does not merge. **For the upload, use the one ordered list in
   `docs/DEPLOYMENT.md` section 5.1 step 13**, which supersedes the per-batch orders below:
   `.htaccess`; includes before the files that load them (`_uploads.php` before `files.php`,
   `_erasure.php` after `_retention.php`, `_uploads.php` and `_like.php`); `site.php` before
   the merge; the readiness set together; SQL 13 to 18, then SQL 19 step 1 and step 2 (one
   paste, one SQL tab) with the `reference IS NULL` check; `client_access.php` (step 14,
   switched off); then merge. Keep `$RETENTION_APPLY = false` and
   `$REFERENCE_SIGNIN_ENABLED = false`, and never pass `--apply`. Walk section 5.6 checks 16
   and 17.
2. **Operator order for the second batch** (`docs/DEPLOYMENT.md` section 5.1 step 10): read and
   record the live PHP version (8.1 or later expected; K-082, K-068), upload `today.php`,
   `search.php` with `_like.php`, `briefs.php`, `privacy.php` with `_retention.php` and
   `cron.php`, and the new `.htaccess`; run SQL 16; then merge. Walk section 5.6 check 14,
   including `curl -sI` on a missing `.php` (expect 404).
   **Then the third batch** (section 5.1 step 11): upload `_time.php` with or before
   `support.php` and `time.php`, `projects.php` with `_templates.php`, and `files.php`,
   `portal.php` and `privacy.php`; run SQL 17, then SQL 18; then merge. Walk section 5.6
   check 15, with no real send and only real records. The whole SQL run for this branch is
   13 to 18, in order, after anything earlier in section 5.2 that is not yet live.
   **Owner decisions from the third batch** (`docs/STATUS.md` section 5): review the five
   templates' wording before using them with a client (K-086), and whether ticket time should
   start as billable.
3. **Owner decisions** raised by the second batch (`docs/STATUS.md` section 5): the retention
   periods for the nine `$RETENTION_*` keys and the erasure procedure (K-062); whether staff
   notes about a client go into a subject access export (K-079); the affiliate disclosure
   wording that replaces the gap on recommendation blocks (D-027). **The fourth batch** (section
   5.1 step 12): upload `site.php` before the merge, then save Site content > Services once;
   the six service pages are built, and IT coverage, area, IT prices, the package price
   confirmation and VAT basis, and the inferred exclusions wait on the owner (K-038, K-090 to
   K-092). **The fifth batch** (section 5): a random yearly offset for references (K-094),
   how deletion requests are prioritised or notified (K-095), and the retention periods
   before `$RETENTION_APPLY` is ever switched on (K-062). **The sixth batch** (section 5):
   whether and when to switch on reference sign-in, after the sign-in policy and the gates
   (D-050); the ad pilot decisions (CMP, AdSense IDs, Purpose 1 only, cookie notices, a
   privacy choices link; K-104 to K-107); and the client anonymisation rules with an adviser
   (K-108, not built).
4. **Housekeeping for the owner**: the stash `int-wave-lintcheck-x1` (made by an agent for a
   lint comparison and already applied back; a hook blocked dropping it) and four agent
   worktrees under `.claude/worktrees/` can be removed. The git-ignored `.playwright-mcp`
   folder (other sessions' browser logs) was deleted by an agent on 2026-10-19; its contents
   were captured in the session tool results before deletion.
5. **Owner decisions** raised by the first batch (`docs/STATUS.md` section 5): whether clients see
   the meeting link in their calendar file and portal (K-070); whether and how the owner is
   notified of portal requests and supplied assets (K-071); whether the 40/30/30 schedule is
   shown on the public shared quote; the earliest allowed "acceptance received" date (the
   quote's creation day today, as there is no sent date).
6. **Owner answers parked on 2026-10-17** (`docs/STATUS.md` section 5, "Parked by the owner";
   `docs/PRIVACY-READINESS.md` section 10). Each answer replaces a placeholder; do not invent
   any of them.
7. **Operator, P0** (`docs/STATUS.md` section 3): confirm sessions revoked after the K-001
   rotation, delete the seed-password file and check the PHP error log (K-015, K-061), record
   what is live on the server (K-006), restore a backup (K-010).
8. **Operator, upload** (`docs/DEPLOYMENT.md` section 5, step 13 order): SQL 1 to 19 as needed, then the PHP
   set with `.htaccess`, keeping `_bootstrap.php`, `auth.php`, `oauth.php` and `users.php`
   together and `bookings.php` with `_ics.php`, `_money.php` present for `invoices.php`,
   `_time.php` with `support.php` and `time.php`, and `_templates.php` with `projects.php`;
   change the cPanel cron entry to the command-line form; run the post-upload checks in
   section 5.6, with no real payment and no real send.
9. **Owner test** on real data (K-044, K-055), recorded in `docs/STATUS.md`.
10. **Adviser review** of the legal pages and `docs/PRIVACY-READINESS.md` sections 9 and 11.
11. **Merge** PR #8, then `feat/redesign-2026`, then PR #20, then this branch (or each into the
   one below first). An agent does not merge.
12. Afterwards: the server time zone (K-067, K-075), header link contrast over the hero (K-069), a
   client upload path for assets (K-072), `requested_at` for asset waits (K-074), a quote
   detail view (K-077), deep-link misses (K-078), retention periods and client erasure (K-062), certificate ID length
   and throttle (K-061), `/sectors` keep-or-fold (K-066), the rest of the draft guard (K-083),
   the unnamed Client select in New project (K-088).

## Resume on another computer

1. `git fetch origin`, then `git switch feat/journeys-2026-10-18` and `git pull --ff-only`
   (the branch is pushed to origin). This branch holds everything in `audit/readiness-2026-10-17` plus the
   journeys batch.
2. `npm ci` (Node 22 or newer).
3. Read `docs/STATUS.md` (sections 0.1 to 0.6, 3 and 5) and `docs/KNOWN-ISSUES.md` K-056 to K-099,
   then this file and `docs/PRIVACY-READINESS.md`.
4. Baseline: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint:ratchet`,
   `npm run docs:check`; for server work, `npm run test:server` against a local `*_test`
   database (`docs/OPERATIONS.md` section 8). On the Mac run it with
   its own `GK_TEST_DB` and free ports, for example
   `GK_TEST_DB=gakinz_docs_test GK_TEST_PHP_PORT=5309 GK_TEST_PROVIDER_PORT=5310`, because
   ports 5191 and 5192 are taken there. Since 2026-10-19 the suite refuses a busy port with a
   message naming it, and stops its PHP workers when it ends or is interrupted.
5. `npm run dev` talks to the live API: any save is real. For browser checks use `npm run build`
   and `npx vite preview`, whose relative API paths reach no server, and stub the calls.
6. New work goes on a new branch from `feat/journeys-2026-10-18`, one concern per commit,
   pushed per verified batch, with a pull request.

## Mode

Existing Application (GEE OS `modes/EXISTING-APPLICATION.md`, workflow
`workflows/EXISTING-APPLICATION.md`). Production risk. Development calls the live API, so no
agent write runs through the dev server.

## Scope

- In scope:
  - Filling the parked placeholders as the owner supplies each answer.
  - Fixes from the owner's review of this branch, the operator's upload checks and the owner's test.
  - Building each owner decision listed in next actions 3 and 5 once it is made.
  - The retention job once periods are decided; the K-061 and K-066 leftovers.
  - Keeping every affected document current in the same pull request.
- Out of scope:
  - Uploading server files, running SQL, merging or deploying by an agent.
  - Writing legal substance (bases, periods, governing law) without the owner's answer.
  - A consent banner, until optional analytics, advertising or embeds are planned
    (`docs/PRIVACY-READINESS.md` section 4).
  - DNS, TLS, Cloudflare and mail hosting; HSTS belongs there (K-058).
  - Rewriting git history.

## Authority

- Research: yes.
- Create planning artefacts: yes.
- Edit local files: yes, on a feature branch. One concern per commit.
- Commit and push: on a feature branch only. No merge to `main` by an agent, because a push to
  `main` deploys `dist/`.
- Use external services: no. No real send, no real payment, no live API call.
- Change production: no. Server files and SQL are uploaded and run by the owner by hand.
- MCP reads: local only.
- MCP mutations: none.
- Local database: creating and dropping `*_test` databases on the local MariaDB or MySQL is
  permitted. Synthetic data only.

## Risk and dependencies

- Risk level: production (sign-in, token storage, money and client isolation code waiting to be
  uploaded).
- The upload-together rule for `_bootstrap.php`, `auth.php`, `oauth.php` and `users.php` is the
  one way this set can break sign-in.
- `bookings.php` without `_ics.php` breaks the calendar download; `invoices.php` without
  `_money.php` breaks every invoice action; `search.php` without `_like.php` breaks record
  search; `privacy.php` without `_retention.php` breaks the retention report; `time.php`
  without `_time.php` stops Log time on the Time screen (503).
- Required decisions: the parked owner answers, the P0 operator actions, and the go-ahead to
  merge after the owner test.

## Evidence

- Required checks:
  - `npm run typecheck` and `npm run build`
  - `npm test`, and `npm run test:server` for any server change
  - `npm run lint:ratchet` (must not grow)
  - `npm run docs:check`, with `-- --base origin/<base branch>` before opening a pull request
  - `php -l` over any touched PHP
- Completion conditions:
  - Each change has a test or a recorded manual check.
  - The documents it affects are updated in the same pull request.
  - The deployed state remains UNVERIFIED until someone with server access checks it.

## Previous contracts

The 2026-10-17 readiness audit contract (`audit/readiness-2026-10-17`, PR #20) is complete;
its text is in git history at `8499761`. The D-046 redesign contract (2026-10-12 to
2026-10-16, `feat/redesign-2026`) is at `ef2d6f9`. The 2026-10-10 contract is at `d314833`, the batch 1
contract at `9db80b2`, and the 2026-09-22 public relaunch contract was merged as `f67f05b` (#5).
