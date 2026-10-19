# Status

**As at:** 2026-10-19 (sections 0 and 0.2); 2026-10-17 (section 0.1); otherwise 2026-10-14. `main` is `c57eb4a`. All later work sits on branches stacked into
PR #8. The newest is `feat/journeys-2026-10-18` (section 0.2), stacked on
`audit/readiness-2026-10-17` (PR #20), not pushed. `feat/plan-2026-batch-1` (PR #8) holds batch 1 (the local half of delivery phase 1), the
seven-destination navigation, My account, enquiry follow-ups, client portal messages, public
publishing and the article format, the lock-screen token fix, the D-037 public redesign, the
favicon and share image, and dead-code removal. `feat/redesign-2026` (`d314833`), stacked on
it and pushed, holds the D-046 redesign of 2026-10-12 to 2026-10-14: the public site rebuilt,
GAkinzOS restyled, Work hero controls, the Site content module and `server/site.php`
(section 4). **None of it is merged, deployed or uploaded.** The owner approved the 2026 plan
on 2026-10-10 (`docs/DECISIONS.md` D-043) and the redesign on 2026-10-14 (D-046).

**Method:** local test, build, lint and PHP syntax runs; isolated browser previews with every
API call stubbed; source inspection for everything else. **No live server, database, mailbox,
payment provider or DNS record was contacted.** Section 6 is the 2026-09-22 record, accurate
except where sections 0 to 4 say otherwise.

This is the file that changes often, and the one home for measured counts: other documents
point here rather than repeat a number. Anything about the deployed system is UNVERIFIED
unless someone with server access has checked it.

---

## 0. Current measurements

Re-measured on 2026-10-19 on the Mac on `feat/journeys-2026-10-18` at `05020f7`, except where
a row names another date or computer. Re-measure and update this table when a count changes.

| Measure | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **PASS.** 223 tests in 21 files on 2026-10-19 (`feat/journeys-2026-10-18`: `paymentModel`, `acceptanceModel`, `portalRequestsModel`, `assetChecklistModel` and `scripts/head-assets.test.mjs` added). Before that 179 tests in 16 files on 2026-10-17 (`audit/readiness-2026-10-17`: `api-errors.test.ts` and `blog-date.test.ts` added). Before that 171 in 14 files (2026-10-16, after merging `feat/generated-sitemap` and `feat/bookings-timeline-feedback`: 15 added for the page metadata checks and the sitemap, 13 in `bookingModel.test.ts`) |
| Server integration tests | `npm run test:server`, local throwaway `*_test` database | **PASS.** 275 tests in 22 files on 2026-10-19 on the Mac, run as `GK_TEST_PHP_PORT=5291 GK_TEST_PROVIDER_PORT=5292 npm run test:server` because port 5192 is held by another project there (`manual-payment`, `acceptance-evidence`, `portal-requests`, `project-assets` and `booking-ics` added). Before that 184 tests in 17 files on 2026-10-17 on the Mac (20 added: `security-hardening.test.ts`, `cron-prune.test.ts`, `token-hashing.test.ts`, and new cases in `work`, `proposals` and `payments`). Before that 164 tests in 14 files, 2026-10-16 on local MariaDB 10.11, `feat/bookings-timeline-feedback` (24 added in `bookings.test.ts` and `feedback.test.ts`) |
| Type check | `npx tsc -b` | **PASS** |
| Build | `npm run build` | **PASS.** 30 public pages prerendered, `sitemap.xml` with 30 URLs (re-measured 2026-10-19; first 2026-10-16, `feat/generated-sitemap`) |
| Lint | `npm run lint:ratchet` | **PASS** at the ceiling: 33 errors, 0 warnings on 2026-10-19, all `react-hooks/set-state-in-effect`; the ceiling in `scripts/lint-ratchet.mjs` was lowered from 41 and 1. **`npm run lint` still fails** (K-002) |
| Documentation | `npm run docs:check` | **PASS.** 26 documents (re-checked 2026-10-19; `docs/PRIVACY-READINESS.md` added 2026-10-17). With `-- --base audit/readiness-2026-10-17` the sync rule also passes for this branch |
| PHP files | `ls server/*.php \| wc -l`, then `php -l server/*.php` | 51: 44 endpoints and 7 `_`-prefixed includes, all 51 passing `php -l` on 2026-10-19 (`assets.php` and `_ics.php` added 2026-10-18; `bookings.php` and `feedback.php` 2026-10-16) |
| Tables | `grep -c "^CREATE TABLE IF NOT EXISTS" server/schema.sql` | 39 (`project_assets` added 2026-10-18; `bookings`, `booking_events`, `client_feedback` 2026-10-16) |
| Public routes | `src/routes/index.tsx`, children of `PublicLayout` | 17: the home page, 15 paths and the 404. Outside the layout: `/login`, `/set-password` and `/p/:token` |
| CMS screens | `src/routes/index.tsx` under `/app` | 26: Today (the index), 24 module routes and My account, in seven navigation groups (Site content added 2026-10-14) |
| Client API groups | `grep -cE "^export const [a-zA-Z]+ *= *\{" src/lib/api.ts` | 41 exported groups over one `request()` helper (`portalRequests` and `projectAssets` added 2026-10-18; `bookings` and `feedback` 2026-10-16) |
| Server files changed since `main` | `git diff --name-only c57eb4a -- server` | 33 PHP files, `.htaccess`, `schema.sql`, `README.md` and `config.php.example` (2026-10-19); the upload list is `docs/DEPLOYMENT.md` section 5 |
| Server files changed by the journeys batch | `git diff --name-only 8499761..HEAD -- server` | `_ics.php` (new), `assets.php` (new), `bookings.php`, `invoices.php`, `proposals.php`, `support.php`, `schema.sql` |
| Server files changed by the redesign | `git diff --stat origin/feat/plan-2026-batch-1...origin/feat/redesign-2026 -- server` | `site.php` (new), `work.php`, `schema.sql`, `README.md` |
| `require_auth` | `grep -c "require_auth(" server/*.php` | Called in 39 of 51 files, 150 call sites (2026-10-19) |

Not measured on this run: `npm audit` (last figure in K-041) and anything on the live system.
Accessibility and performance were re-measured on the D-046 build on 2026-10-16, locally; see
section 6.3 and `qa/` section 9 of each audit.

## 0.1 Production and privacy readiness audit, 2026-10-17

On `audit/readiness-2026-10-17`, from `feat/redesign-2026`. Method: three read-only source
reviews (server security, privacy data map, public site), a browser run of the production
build at 320, 390, 768 and 1440px over all 30 prerendered pages and the 404 with every
non-local request blocked, mocked contact-form failures, and axe 4.13 (WCAG 2.2 AA rules) on
seven pages at 1280 and 390px: **0 violations**. No horizontal scroll at any width, no console
errors, no request to another domain, no cookie or browser storage on any public page.

Fixed and tested, none deployed or uploaded: K-056 (admin could lock out the owner), K-057
(sign-in lockout, code guessing, reset race, timing), K-058 in part (security headers), two
items of K-061, K-063 in part (privacy and cookie facts), K-066 (404 noindex, raw error text,
contact form, footer, robots, work pages, `llms.txt`), and later the same day K-060
(proposal link expiry and revoke), the cron key and PayPal items of K-061, token pruning for
K-062, ISO post dates and the pricing-to-contact package, then K-059 (hashed tokens) and
two-factor replay (SQL 12). Recorded, open: K-061 (two items), K-062 (retention periods),
K-064, K-065. Privacy inventory, proposed retention and a draft notice: `docs/PRIVACY-READINESS.md`.

Verdict: **not ready for production.** The P0 items in section 3 still stand (credential and
session revocation, server state, backups, upload), retention and deletion do not exist
(K-062), and the legal pages lack the controller's identity and the required content (K-021,
K-063). Live headers, a real sign-in and real data: NOT TESTED.

## 0.2 Client journeys batch, 2026-10-18 to 2026-10-19

On `feat/journeys-2026-10-18`, 43 commits on `audit/readiness-2026-10-17` at `8499761`
(PR #20), on the Mac. Not pushed, merged, deployed or uploaded, and SQL 13 to 15 have run
only on the throwaway test database. Method: each task was built test first and reviewed
before the next began; server behaviour runs over HTTP against a local MariaDB `*_test`
database; the new screens were then driven in a production build with Playwright at 1440
and 390px, light and dark, with every API call stubbed and every off-origin request
blocked, and axe 4.13 (WCAG 2.2 AA rules) run in each state.

Built: a manual payment record on invoices (SQL 13), quote acceptance evidence with a terms
fingerprint and the 40/30/30 split in integer pence (SQL 14), client update and call requests
from the portal with a cap of five open call requests, a project asset checklist (SQL 15), a
calendar file for a confirmed call, `favicon.ico` and a web manifest (K-066), a quiet client
sign-in link on the public site, the lint ceiling cut to 33 errors and 0 warnings (K-002),
and three accessibility fixes found by the browser check (K-073). Section 4 has the detail;
the upload list and SQL order are `docs/DEPLOYMENT.md` section 5.

Browser check (six screens, stubbed API): **PASS**, axe 0 violations in every state after the
K-073 fixes. One risk recorded rather than fixed: the 0.85 opacity header links over an
owner-chosen hero colour (K-069).

Recorded, open: the server clock for "not in the future" dates (K-067), the 1p split shift
on PHP 8.4 and later (K-068), the client calendar file without a meeting link and no
cancellation file (K-070), requests that notify nobody (K-071), and note-only asset supply
(K-072). **NOT TESTED:** the live server and database, a real sign-in, SQL 13 to 15 on the
host, the 503 states before each SQL in a browser, real calendar apps importing the file,
races between two requests, and real assistive technology.

## 1. Audit and readiness, 2026-10-10

A broad planning audit of `main` at `c57eb4a`, re-verified the same day by three independent
read-only source reviews. It is not a penetration test or proof that every business action
works. Its findings are recorded in `docs/KNOWN-ISSUES.md`: some matched existing entries
(K-001, K-006, K-010, K-015, K-016, K-018, K-019, K-021, K-023, K-024), and the rest became
K-025 to K-043, where K-029 and K-040 were found during batch 1 and K-042 and K-043 during the
public redesign. The checks below are the audit-day figures; section 0 has today's.

### Local checks at audit time

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | **PASS.** TypeScript and Vite, 2.84 seconds |
| Unit tests | `npx vitest run` | **PASS.** One file, 21 tests, access rules only |
| Lint | `npx eslint .` | **FAIL.** 47 errors, 2 warnings, unchanged since 2026-09-22 (K-002) |
| PHP syntax | `php -l` over `server/` | **PASS.** 45 files |
| Dependencies | `npm audit --json` | **FAIL.** 15 affected packages: ten high, four moderate, one low, none critical (K-041) |
| Source claims | Three read-only reviews with file and line evidence | **PARTIAL.** 14 findings confirmed, 4 corrected, 4 added, 6 not re-checked (owner-side or browser evidence) |

Timings are local measurements, not performance guarantees.

Also confirmed: seven roles at `server/_bootstrap.php`; `require_auth` called in 35 of the 45
PHP files (124 call sites); `portal.php` derives the client from the token for the `client`
role and ignores request parameters; `book.php` only returns the configured Calendly URL and
there is no booking table; `server/schema.sql` declared 33 tables (34 since `payment_events`).

### Isolated browser evidence

`npm run preview -- --host 127.0.0.1 --port 5199 --strictPort`, a temporary local override, in
a new isolated Chrome context with a pre-navigation fetch replacement returning 503 for every
API request. No backend was contacted. A fictional local persisted account allowed inspection
of CMS shells and error states; that does not validate sign-in or authorisation. No form was
submitted.

| Observation | Result |
|---|---|
| 390px emulated touch viewport | Home, contact, services, dashboard, leads, projects, blog and work kept a 390px document width |
| Invoicing and Platform at 390px | **FAIL** at audit (448px and 642px). Fixed in batch 1 (K-031) |
| Dashboard on API failure | **FAIL** at audit: an error banner, but cards showed £0 and "All on time". Fixed in batch 1 (K-031) |
| Public home on API failure | **FAIL** at audit: the static fallback rendered project gaps, the portrait placeholder and technical build commentary. Engineering copy removed since; placeholders remain until the owner supplies material (K-038) |

Not done: data-filled tables, dialogs, payment success screens, a screen-reader session, a full
keyboard journey, or a new axe or Lighthouse run. The 2026-09-22 public measurements in section
6.3 remain historical evidence, not evidence for the CMS or later changes.

### Drift the audit resolved

| Earlier position | Actual state | Resolution |
|---|---|---|
| The brief's cover: 168 features, 52 AI | The `MODULES` array holds 175 entries, 55 AI | Counts do not define completion; the register is `docs/PRODUCT-SPEC.md` Appendix B |
| Twelve core modules | 24 routed screens | Core journeys kept, optional tools quiet (D-040) |
| Agency roles and workforce management | One owner runs the business alone | Access model kept for safety; interface defaults to owner and client |
| Personal site first | Company services and a company social identity | GAkinz-led, with Gideon named (D-039) |
| No borrowed design language | Full Mastercard-inspired system chosen | D-037 |
| Four services | Six (D-038) | Two IT services added; networking and hardware excluded |
| CI described as a quality gate | No tests, no `php -l`, deploy did not wait | Fixed (K-035) |
| Stale counts in agent and contract files | Counts drifted between documents | Counts now live in section 0 only; `npm run docs:check` and the rule in `AGENTS.md` keep documents current |

### Readiness verdict

**PARTIAL:** a substantial, locally buildable system exists. **BLOCKED:** confidence in taking
orders through the full system cannot be established until the credential, deployed-state,
recovery, money and isolation gates pass (`docs/OPERATIONS.md` section 9). **NOT TESTED:** real
authentication, client isolation, database writes on the live system, email, bookings,
payments, restoration, assistive technology, production and social accounts. Interface
improvements alone cannot close those gaps.

## 2. Delivery phases

A sequence of reviewable changes, not authority to make them. Exact dates and effort need
live-state discovery and owner inputs first; no launch is promised in a fixed number of days.

| Phase | Work and dependency | Exit evidence | State on 2026-10-14, phase 2 on 2026-10-19 |
|---|---|---|---|
| 0. Agree scope | Design system and six services; motion contract, core workflows and navigation, positioning and feature dispositions; actual business and pricing facts | Dated decisions with clear exclusions and remaining questions | Plan approved (D-037 to D-044). Business facts outstanding (section 5) |
| 1. Establish safety | Owner credential actions; reconcile host PHP and SQL; backup and restore; a safe local synthetic backend and mail sink; payment defects and alternative sign-in reviewed | Rotation and revocation confirmed, restoration demonstrated, release manifest and rollback recorded, no accidental production calls in tests | Local fixes built (section 4), not deployed. Owner-side actions open |
| 2. Complete business journeys | Enquiry follow-up, simple bookings, client conversion, quote acceptance and version, projects and tasks, invoices and reconciliation, verified reference access, scoped messages, updates and feedback, client-linked brief, portal and support isolation | Synthetic end-to-end journey, failure, retry and concurrency tests, and record ownership tests pass | Started. Enquiry follow-ups, client messages, call bookings, the client timeline and private feedback built with server tests (bookings, timeline and feedback 2026-10-16, not deployed). On 2026-10-18 (section 0.2, not deployed or uploaded): manual payment record, acceptance evidence with a terms fingerprint, portal update and call requests, the asset checklist and a calendar file for a confirmed call, each with server tests and a mocked-API browser check. The full journey with these steps not yet run against real data |
| 3. Polish the CMS | Target design foundation, smaller navigation, My account, consistent page and form states, unavailable metrics, quiet optional modules | Owner usability task passes; keyboard, phone, zoom and theme checks on affected screens | Navigation grouped and My account built (K-032, K-023, K-024). Every CMS screen restyled to D-046 on `feat/redesign-2026`, checked against mocked API responses only. Owner usability task, keyboard and zoom checks NOT TESTED |
| 4. Polish the public site | Hero and section design and motion, company and owner positioning, service copy, complete case studies, consent and legal content, safe publishing, metadata and sitemap | Buyer journey, publish and unpublish, share preview, responsive and accessibility evidence | Rebuilt again on D-046 (2026-10-14): brand-colour hero fed by Work, the owner's real projects with screenshots, copy editable in Site content. Publishing, article format and engineering copy fixed (K-036, K-037, K-038 in part). Six-service copy, client consent records, portrait and legal review dates wait for owner inputs. Accessibility and performance re-measured 2026-10-16 (K-045 closed); the two brand-colour contrast failures fixed (K-050, K-051), home CLS fixed and LCP measured (K-052, LCP still open), `/work` LCP measured (K-053), the heading-size regression fixed (K-054), all 2026-10-16. Public pages prerendered with checked per-page metadata and a generated sitemap (K-018, K-019, K-043), not deployed. A quiet client sign-in link (header, drawer and footer), `favicon.ico` and a web manifest added 2026-10-18, not deployed |
| 5. Social and affiliate pilot | Owned profile set-up, approved copy and media, first resources, disclosed links | Exact profile URLs, disclosure and link checks, a repeatable small publishing routine | Not started |
| 6. AdSense pilot | Account approval and a certified consent platform, article-only slots | Consent and network proof, no scripts on private layouts, performance comparison, reversible switch | Not started |
| 7. Consolidate and operate | Promote approved requirements to canonical documents, retire duplicates, review monthly | Valid references, one source per fact, accurate task, decision and release records | Documents consolidated 2026-10-10 (D-043, D-044); sync rule and `npm run docs:check` added (D-045) |

Public content drafting can run alongside the safety work, but no production-readiness
announcement comes before the phase 1 and 2 gates. Affiliate and ad work is secondary. Customer
reference access cannot ship until the authentication and ownership gates pass.

## 3. Open work, in priority order

**P0, before any real order**

1. Confirm the credential published in an earlier `CLAUDE.md` is rotated and every session
   revoked (K-001), and that the seed-password file is gone from the live server (K-015).
   Nothing else in this list matters as much.
2. Establish the real server state: which files are uploaded, which migrations have run (K-006).
3. Upload the server set and run the SQL in `docs/DEPLOYMENT.md` section 5, and check past
   Stripe payments against their VAT-inclusive totals (K-025). Until then every server fix is
   repository-only and the work ledger has no tables behind it. Since 2026-10-18 the set
   includes SQL 13 to 15 and `invoices.php`, `proposals.php`, `support.php`, `bookings.php`
   with the new `_ics.php`, and the new `assets.php` (section 0.2).
4. Restore a backup somewhere isolated and agree the recovery targets (K-010,
   `docs/OPERATIONS.md` section 10).
5. Review and merge PR #8 and `feat/redesign-2026` once CI passes, knowing that the merge
   deploys `dist/`, and that the client then expects the server set in step 3. For the
   redesign, the operator order is in `docs/DEPLOYMENT.md` section 5.1: SQL 7 and 8, upload
   `site.php` and `work.php`, publish the real projects in Work, switch on up to five for the
   hero with screenshots attached, and only then merge. The same holds for PR #20 and
   `feat/journeys-2026-10-18` (section 0.2): their server files and SQL 12 to 15 go up before
   the merge that deploys their screens.
6. Before merging, the owner tests the redesign on the other computer after
   `git pull --ff-only`: the Work hero switches, a Site content publish, Enquiries
   drag-and-drop between stages, and the Client Portal signed in as a client. Development
   calls the live API, so every save there is real, and nothing in this list has been
   exercised against real data yet (K-044).

**P1, the core journeys**

7. One tested enquiry to client to quote to project to invoice journey against synthetic data.
   **Done locally 2026-10-11**: `tests/server/journey.test.ts` runs contact form, conversion,
   quote, acceptance, the VAT-inclusive deposit through the fake Stripe provider and the client
   portal. Not run against the live server.
8. Booking records inside Enquiries, the client timeline and private feedback
   (`docs/PRODUCT-SPEC.md` sections 5.5 and 6). **Built locally 2026-10-16** on
   `feat/bookings-timeline-feedback`: `bookings.php`, `feedback.php`, the timeline in
   `clients.php`, SQL 9 to 11, and the Enquiries, Clients and portal screens. 24 server tests
   and 13 unit tests; browser checked with mocked responses only. Not merged, uploaded or run
   against real data (K-055). Owner decisions are listed in K-055.
   **Extended locally 2026-10-18** on `feat/journeys-2026-10-18` (section 0.2): a client can
   ask for an update or propose times for a call from the portal (at most five open call
   requests), and a confirmed call has a calendar file for staff and for the client. Not
   merged or uploaded; the owner decisions are K-070 and K-071.
   Money and delivery evidence from the same sections and section 7 are **done locally
   2026-10-18** on that branch too, not merged or uploaded: a manual bank transfer, cash or cheque record on an
   invoice (SQL 13), acceptance evidence and a terms fingerprint on a quote (SQL 14), and a
   project asset checklist the client answers in the portal (SQL 15). Server tests and a
   mocked-API browser check only; open points are K-067, K-068 and K-072.
9. The remaining token work: `localStorage` exposure, token lifetime and a CSP review (K-033);
   honest contract labelling (K-034).

**P2, the CMS and the public site**

10. **Done locally 2026-10-14 (D-046):** every CMS screen restyled on the page kit, on
    `feat/redesign-2026`. Still open: a check with real data, a keyboard and zoom pass, and a
    first CMS accessibility check (item 14).
11. Six service pages, authorised case studies, owner portrait and biography, and complete
    public copy (K-038, owner inputs in section 5). The technical parts are **done locally
    2026-10-16**, not deployed: the public pages are prerendered with their own metadata, which
    the build now checks page by page, and `sitemap.xml` is generated by the build (K-018,
    K-019); the canonical conflict is fixed (K-043); the hero contrast and CLS findings are
    fixed or measured (K-050 to K-054). Still open: home LCP (K-052), and CMS-only records,
    which are neither prerendered nor in the sitemap.
12. After the `.htaccess` upload, confirm `/llms.txt` still serves. The deny rule exempts
    `robots.txt` and `llms.txt` by name (`server/.htaccess`); the live behaviour is UNVERIFIED.
13. Legal pages reviewed, with genuine dates (K-021).
14. A screen-reader pass with real assistive technology. A first automated CMS check ran on
    2026-10-16 (8 screens, empty states, light and dark); CMS screens with data are still unchecked.
15. Exercise `work.php` against a real database before relying on it. **Done locally 2026-10-11**:
    `tests/server/work.test.ts` covers access, client consent, validation, images and ordering
    against a local `*_test` database. The live tables still do not exist until the SQL is run.

**P3, growth**

16. Social profiles, then the affiliate pilot, then the AdSense pilot
    (`docs/CONTENT-AND-GROWTH.md`).

**Ongoing:** hold the lint ratchet and bring it down (K-002; cut from 41 errors and 1 warning
to 33 and 0 on 2026-10-19, locally); decide dependency exposure
(K-041, K-017); measure performance in the field rather than on a local preview.

## 4. What changed since `main`

Contract: `.agent/CURRENT-TASK.md`. Every row is in the repository only: client changes deploy
when PR #8 (and, for the redesign, `feat/redesign-2026`) merges, and server changes need the
manual upload in `docs/DEPLOYMENT.md` section 5.

### Client journeys, 2026-10-18 to 2026-10-19

On `feat/journeys-2026-10-18`, stacked on `audit/readiness-2026-10-17` (PR #20) at `8499761`.
Not pushed, merged, deployed or uploaded. Summary and method in section 0.2.

| Area | Change | Evidence |
|---|---|---|
| Invoices | `invoices.php?action=record_payment`: a bank transfer, cash, cheque or other payment with method, reference, date and amount, on a sent invoice only. The amount must equal the VAT-inclusive payable total from `_money.php`, the date cannot be in the future, and moving an invoice back from paid clears the record. Record payment dialog in Invoicing. Answers 503 until SQL 13 | `tests/server/manual-payment.test.ts`, `paymentModel.test.ts`, mocked-API browser check |
| Quotes | Accepting a quote records how the client accepted (email, letter, in person, phone, other), a reference, the day it arrived, who recorded it and a SHA-256 fingerprint of the exact terms. The 40/30/30 split and the fingerprint use integer pence only (K-068). The shared public quote shows "Accepted on" and nothing else of the evidence. Until SQL 14 runs, accept behaves as before and asks for no evidence | `tests/server/acceptance-evidence.test.ts`, `acceptanceModel.test.ts`, mocked-API browser check |
| Portal requests | A client asks for an update (`support.php?action=update_request`, an ordinary ticket titled "Update request: ...") or proposes up to three times for a call (`bookings.php?action=request`, a `requested` booking the owner confirms in Enquiries, Calls). At most five open call requests per client (429 on the sixth). `bookings.php?action=mine` lists the client's own requests. No SQL | `tests/server/portal-requests.test.ts`, `portalRequestsModel.test.ts`, mocked-API browser check |
| Asset checklist | New `assets.php` and table `project_assets` (SQL 15): the owner lists what a client must send, the client marks an item supplied with an optional note, the owner accepts or reopens it. Panel under the project's task board and a "What we need from you" card in the portal. Supply is note-only (K-072) | `tests/server/project-assets.test.ts`, `assetChecklistModel.test.ts`, mocked-API browser check |
| Calendar file | New `_ics.php`; `bookings.php?action=ics` (staff) and `?action=mine_ics` (the client's own confirmed call) return an RFC 5545 file with UTC times and a SEQUENCE from the reschedule count. The client's file has no location or meeting link (K-070). Download buttons in Enquiries, Calls and the portal | `tests/server/booking-ics.test.ts`; import into real calendar apps NOT TESTED |
| Public site | "Client sign in" link to `/login` in the header above 1100px, in the drawer under "Already working with us?", and in the footer. `favicon.ico` (from `scripts/make-favicon-ico.mjs`) and `site.webmanifest` linked from `index.html` (K-066) | `scripts/head-assets.test.mjs`, mocked-API browser check with contrast over every hero slide (K-069) |
| Lint | Non-component exports moved to `badge-variants.ts`, `button-variants.ts`, `sidebar-context.ts` and `seo-schema.ts`; the sidebar skeleton, set-password token and Team cost-rate cell no longer break React rules. Ceiling 33 errors, 0 warnings (K-002) | `npm run lint:ratchet`; the changed screens NOT TESTED in a browser, prerendered HTML identical |
| Accessibility | Toasts follow the CMS theme and reach AA; the Projects task board scroll region is keyboard focusable; a refused quote acceptance shows inside the dialog (K-073) | axe 0 violations on the rerun, mocked API |

Verification on the final branch, 2026-10-19 on the Mac: section 0. **NOT TESTED:** the live
server, real data, a real sign-in, SQL 13 to 15 on the host and real assistive technology.

### The D-046 redesign, 2026-10-12 to 2026-10-14

On `feat/redesign-2026`, stacked on `feat/plan-2026-batch-1`, built in batches merged into that
branch and pushed. Not merged into PR #8, not deployed, no server file uploaded.

| Area | Change | Evidence |
|---|---|---|
| Decision | The owner approved direction A "Live Wall" with the brand-colour hero from direction C, through working prototypes; supersedes D-037's visual direction | `docs/DECISIONS.md` D-046 |
| Public site | Every public page rebuilt, legal, sectors, certificate check, articles and testimonials included: `src/marketing/site.css` scoped to `.gk-site`, shared parts in `site-ui.tsx` and `site-helpers.ts`, the owner's real projects and screenshots in `showcase.ts` and `public/images/work/`, editable copy with built-in defaults in `content.ts`. The D-037 primitives, `FadeIn.tsx` and `action-class.ts` removed | `npm test` (`content.test.ts`), build, browser check with mocked API |
| Homepage hero | Full-screen hero in the active project's brand colour, up to five published Work records in CMS order, pause, previous and next, arrow keys, still under reduced motion. Falls back to the built-in projects until one record is published | `src/marketing/data/showcase.ts`, browser check with mocked API |
| Server | `work.php`: hero fields and the `setHero`, `heroOrder` and `hero` actions, at most five, published only. New `site.php`: `site_content` draft and publish. Both degrade until their SQL has run | `tests/server/work-hero.test.ts`, `tests/server/site.test.ts`; SQL 7 and 8 in `docs/DEPLOYMENT.md` section 5 |
| Client API and access | `siteContent` and the Work hero calls in `api.ts`; `site` in `access.ts`, matching `site.php` EDITORS | `src/lib/access.test.ts` |
| CMS foundation | D-046 tokens; Bricolage Grotesque (opsz), Hanken Grotesk and JetBrains Mono self-hosted, Google Fonts `@import` removed (K-042); a graphite sidebar in both themes, new header, sign-in pages on `AuthFrame`; shared `ui` primitives restyled; the custom background themes retired, so the CMS is light or dark only | `docs/DESIGN-SYSTEM.md` section 11 |
| CMS screens | Every screen restyled on the page kit (`src/app/components/page-kit.tsx`: page header, stat tiles, status badges) | Browser check with mocked API |
| New CMS module | Site content (`/app/site`, `Site.tsx`, `siteContentModel.ts`): hero, services, process, pricing, add-ons, terms, FAQs and contact copy, saved as drafts and published | `siteContentModel.test.ts`, browser check with mocked API |
| Work module | Homepage hero switches, brand colour, hero word and desktop and mobile screenshots. Fixed: editing no longer crashes on a detail response without images (`24c25ff`) | `tests/server/work-hero.test.ts` for the server half |
| Enquiries | Drag and drop between stages, a new write path that calls the existing `move()` | Browser check with mocked API only |
| Fixes | Verify page error state; iPhone and iPad sessions labelled iOS in My account | Browser check with mocked API |

Verification on the final branch: `npx tsc -b`, `npm test` (128), `npm run build`,
`npm run lint:ratchet` (41 errors, 1 warning, unchanged), `npm run docs:check` and `php -l` over
47 files PASS on 2026-10-14; `npm run test:server` (140) PASS the same day on local MariaDB
10.11. The public site and the CMS were checked only with Playwright against mocked API
responses at 1440, 1024 and 390px, light and dark. **NOT TESTED:** real data, a real sign-in,
real assistive technology, an axe sweep, Lighthouse and CLS after the font change (K-044,
K-045). Known leftovers are K-046 to K-048.

### Batch 1, the local half of delivery phase 1

| Area | Change | Evidence |
|---|---|---|
| Payments | VAT-inclusive Stripe amounts, amount and currency checked in the webhook, event log, PayPal off | `tests/server/payments.test.ts`, K-025, K-026 |
| Sign-in | Magic links client-only, never past two-factor, single-use under concurrency; Google sign-in respects two-factor | `tests/server/auth.test.ts`, K-027 |
| Quotes | Accept only sent, unexpired quotes, exactly once; confirmation shows VAT-inclusive instalments | `tests/server/proposals.test.ts`, K-028 |
| Records | Create endpoints return the new record's id | `tests/server/create-ids.test.ts`, K-029 |
| Blog | Editing keeps the body | `tests/server/blog.test.ts`, K-016 |
| Exports | CSV formula neutralising | `src/lib/csv.test.ts`, K-030 |
| CMS | Dashboard shows unavailable data as a dash with a retry hint; no phone overflow at 320px or 390px | isolated preview, K-031 |
| Server | `.htaccess` denies every `_*.php` include | regex check only, K-013 |
| Schema | The reserved column name `stored` is quoted | found by the CI server-test job, K-040 |
| CI | Unit tests, server tests, `php -l`, lint ratchet; deploy waits for CI | workflow files, K-035. The CI run on the pushed branch found K-040; the latest run's result is not recorded here |

### After batch 1

| Area | Change | Evidence |
|---|---|---|
| Navigation | The sidebar groups its entries under Today, Enquiries, Clients, Projects, Money, Website and Settings; empty groups hide per role; every URL unchanged | Isolated preview with stubbed API, K-032 |
| My account | `/app/account` for every role, client included: profile, two-factor, signed-in devices with revoke. `auth.php` `me` returns `totp_enabled` | `tests/server/account.test.ts`, `src/lib/access.test.ts`, K-023, K-024 |
| Enquiry follow-ups | Next-action date, note and owner priority; overdue and due-today marks; a follow-ups card on Today. Degrades on an un-migrated database | `tests/server/leads.test.ts`, `src/lib/format.test.ts` |
| Portal messages | Clients list, read, start and reply to their own support tickets; the client id comes from the token | `tests/server/support-client.test.ts`, 22 isolation tests, K-039 |
| Public publishing | A successful empty CMS answer removes unpublished posts and work; fallback only on failure. Engineering counts and paths gone from the work fallback | `src/marketing/data/cmsResult.test.ts`, K-036, K-038 in part |
| Article format | Headings, lists, bold and safe links, rendered without raw HTML; `{sponsored}` links | `src/marketing/lib/articleFormat.test.ts`, K-037 |
| Lock screen | Unlock revokes the previous token; a wrong password no longer signs out | `src/lib/session-revoke.test.ts`, browser check with stubbed API, K-033 in part |
| API-SPEC | Brought up to date with the server | Source review |
| Public redesign | The public surface on D-037: Sofia Sans, cream and warm-black palette, pill navigation and actions, CSS and SVG motion with a reduced-motion fallback | 9 routes at 5 widths, contrast check, Lighthouse mobile accessibility 100, `docs/DESIGN-SYSTEM.md` |
| Brand | Favicon, 32px and apple-touch icons and the share image on the D-037 palette | Files in `public/` |
| Hygiene | Six unused public primitives, an unused API client and formatter removed | `knip`, typecheck, tests, build |
| Documents | One upload list in `docs/DEPLOYMENT.md`; counts in section 0 only; the sync rule in `AGENTS.md` and `npm run docs:check` in CI | This file, D-045 |

Production, live database, real payments and real sends: NOT TESTED.

## 5. Owner inputs outstanding

Each item unlocks the work named beside it. Tick it and add the date when it is decided, and
record a decision in `docs/DECISIONS.md` where it constrains future work. Silence is not
approval. **Never write a password, key or recovery code here.** Already decided on
2026-10-10: the design system (D-037), the six services (D-038), the GAkinz-led name (D-039),
the seven-destination navigation (D-040), the content and monetisation policy (D-041), the
feature list, the "deliberately not doing" list and phase 1 client access by password (D-043).
On 2026-10-14 the owner approved the redesign that replaces D-037's visual direction (D-046).

**Safety, before any real order (phase 1)**

- [ ] The admin credential from git history rotated and all sessions revoked (K-001). Date: password rotated
      2026-10-12 (owner-reported); session revocation unconfirmed
- [ ] The seed-password file deleted from the live server (K-015). Date:
- [ ] Which PHP files and SQL migrations are live, checked and recorded (K-006). Date:
- [ ] A backup restored somewhere safe and checked (K-010). Date:
- [ ] Recovery targets agreed. Proposed: back within one working day, lose no more than 24
      hours of changes (`docs/OPERATIONS.md` section 10). Agreed:
- [ ] Payment provider for launch. Recommended and applied reversibly: Stripe only, PayPal off
      until it has a webhook (D-034). Confirmed:
- [ ] Who can help if the owner loses access, and where recovery information is kept, outside
      this repository. Date:

**Business facts (phases 2 and 4)**

- [ ] Trading identity: sole trader or limited company, registered name and number if any
      (`site.ts` registration is `null`).
- [ ] VAT: registered or not, and whether shown prices include VAT.
- [ ] Website prices in `site.ts`, confirmed or replaced: Starter £1,500, Business £3,500,
      Ecommerce £6,000, Bespoke quoted, £180 per extra page, £350 copywriting, £600 brand mark,
      care £90 and £450 per month.
- [ ] New prices: general IT support (hourly or block) and IT consultancy (session or fixed
      review).
- [ ] IT support coverage: remote only, or on-site, and which area.
- [ ] Payment schedule: keep 40/30/30 (ex-VAT, due at acceptance, +30 and +60 days) or change
      it (D-035). Also whether partial payments are always separate instalment invoices.
- [ ] Cancellation, change and revision terms.
- [ ] Public contact details: email (`hello@gakinz.com` today), phone (`null` today), working
      hours, reply promise. This also sets the enquiry acknowledgement target in
      `docs/PRODUCT-SPEC.md` section 1.4.
- [ ] The operating targets in `docs/PRODUCT-SPEC.md` section 1.4, confirmed or changed.
- [ ] Data retention periods for enquiries, client records and invoices.
- [ ] Legal pages reviewed by the owner, and by a professional if wanted (K-021).
- [ ] Parked by the owner on 2026-10-17, shown on the site as labelled placeholders until
      answered (`docs/PRIVACY-READINESS.md` section 10): ICO data protection fee and
      registration number; which integrations are live (mail provider, Stripe, Twilio, Google
      sign-in, Slack, OpenRouter) and the host and data location; whether AI drafting keeps
      client text (K-064); lawful bases and international transfers (with an adviser);
      governing law for the terms. The trading identity, VAT and retention items above are
      also placeholders on `/privacy`, `/terms` and `/pricing`.

**Brand and content (phase 4)**

- [ ] Main homepage message (draft in `docs/PRODUCT-SPEC.md` section 3).
- [x] ~~Sofia Sans licence file and weights confirmed.~~ Moot since D-046 (2026-10-14): the
      site now uses Bricolage Grotesque, Hanken Grotesk and JetBrains Mono, whose
      `@fontsource-variable` packages declare OFL-1.1.
- [ ] Owner portrait and short biography supplied.
- [ ] Up to three case studies, each with client permission, screenshots and an honest outcome.
      Screenshots of the owner's projects were captured on 2026-10-13 and ship in
      `public/images/work/`; the owner confirmed naming the client sites (D-046). Still to do:
      publish them as Work records with consent stored, so the CMS takes over from the
      built-in list.
      Say if a project cannot be screenshotted (an internal system, or a client who permits
      naming but not imagery), because it then needs a designed answer rather than an empty
      frame.
- [ ] Sectors page: keep with genuine examples, or fold into Services.
- [ ] Motion preview reviewed on desktop and phone before it is applied everywhere. The D-046
      working prototypes, motion included, were approved on 2026-10-14; whether they were
      reviewed on a phone is not recorded.

**Product scope (phases 2 and 3)**

- [ ] "Measurement" in project briefs means agreed scope and delivery evidence
      (`docs/PRODUCT-SPEC.md` section 6.4), or something else:
- [ ] Keep XLSX export, or CSV only (K-017).
- [ ] Raised by the 2026-10-18 journeys batch (section 0.2), each built the simplest way until
      decided: whether a client's calendar file and portal show the meeting link (K-070);
      whether the owner is notified of a portal update request, call request or supplied
      asset, and how (K-071); whether the 40/30/30 schedule is shown on the public shared
      quote (it is part of the accepted-terms fingerprint but not displayed); and the earliest
      allowed "acceptance received" date, which is the quote's creation day today because a
      quote has no sent date.

**Monetisation and social (phases 5 and 6)**

- [ ] Existing social accounts and handles checked; preferred `@gakinz`, fallback
      `@gakinzstudio`.
- [ ] Profile copy for Instagram, Facebook, LinkedIn, TikTok and WhatsApp Community
      (`docs/CONTENT-AND-GROWTH.md` section 6).
- [ ] Amazon Associates account status and the approved site or channels.
- [ ] AdSense account status, and agreement to use a certified consent platform first.
- [ ] Weekly time available for content. Proposed: two to three hours.

**Outside this repository**

- [ ] Any change to global GEE OS files or `~/.claude` rules and hooks, approved separately.

---

## 6. The 2026-09-22 record

Kept as dated evidence. Where sections 1 to 4 report a later state, they win.

### 6.1 What changed on 2026-09-22

Three pieces of work landed together on this branch.

1. **The public surface was rebuilt** on a new design system, scoped to `.gk-public`. New
   palette, a nine-value type scale, three new families, a new set of primitives, per-route
   metadata, and the retirement of the lavender and rose accents along with the animated
   gradient, the aurora hero and the card idiom. GAkinzOS at `/app/*` keeps its own tokens
   and is untouched. See `docs/DESIGN-SYSTEM.md` and `docs/DECISIONS.md` D-023.
2. **The work ledger was added.** A new `work` table with a `work_images` child, a new
   `server/work.php`, a new public route `/work/:slug`, and a 24th CMS module. One record
   type carries four kinds of work. See section 6.5 below.
3. **Server security hardening and dead-weight removal.** Fourteen server files changed,
   35.92 MiB of unreferenced assets and 27 npm packages were removed. Every server change is
   committed to the branch and **none of it is uploaded**.

---

### 6.2 Verification baseline

Run locally on 2026-09-22 against this working tree.

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **PASS.** 1 file, 21 tests, 87 ms. Was 11 tests |
| Type check and build | `npm run build` | **PASS.** `tsc -b` clean |
| PHP syntax | `php -l` over 45 files in `server/` | **PASS.** No syntax errors. Was 44 files |
| Lint | `npm run lint` | **FAIL, but improved.** 47 errors, 2 warnings, 33 files. Baseline was 60 errors, 7 warnings, 42 files |

Lint breakdown, measured from the ESLint JSON report on 2026-09-22:

| Count | Severity | Rule |
|---|---|---|
| 37 | error | `react-hooks/set-state-in-effect` |
| 5 | error | `react-refresh/only-export-components` |
| 2 | error | `prefer-const` |
| 1 | error | `react-hooks/immutability` |
| 1 | error | `react-hooks/purity` |
| 1 | error | `@typescript-eslint/no-unused-expressions` |
| 1 | error | `react/no-danger`. "Definition for rule was not found" |
| 1 | warning | `react-hooks/exhaustive-deps` |
| 1 | warning | `unused-imports/no-unused-vars` |

Two errors are auto-fixable. The count fell by twelve and must not be allowed to rise again;
the backlog is a ratchet. See `docs/KNOWN-ISSUES.md`.

The `react/no-danger` entry is not a code problem in the usual sense. An
`eslint-disable-next-line react/no-danger` comment in `src/marketing/components/Seo.tsx`
names a rule that this project's ESLint configuration does not define, and ESLint reports
the unknown rule name as an error. Removing the comment removes the error.

### 6.3 Measured results, public surface only

**Current figures, 2026-10-16, D-046 build, local preview.** axe-core 4.13.0, WCAG A and AA:
0 violations on 14 of 15 public routes at 1440 and 390px; `/` and `/work/rotaflow` keep 5
`color-contrast` nodes at 1440 (K-050). Rendered-pixel contrast fails on hero slide 1 (lowest
3.57:1, K-050) and slide 5 (lowest 1.90:1, K-051). 8 CMS screens, light and dark: 0 violations
after the fixes. Lighthouse 12.8.2 mobile, simulated throttling: performance 73 to 74 on `/`,
87 on `/work`, 92 on `/contact`; accessibility 100 and best practices 100 on all three; SEO 100,
92 and 92 (K-043); home CLS 0.114 and LCP 4.9 s (K-052). Detail: section 9 of
`qa/ACCESSIBILITY-AUDIT.md` and of `qa/PERFORMANCE-AUDIT.md`. The rest of this section is the
2026-09-22 measurement of an earlier interface, kept as history.

Everything in this section was measured on 2026-09-22 against the production build
(`npm run build`) served locally by `npm run preview`, driven through the Chrome DevTools
protocol. None of it was measured against the deployed site, because no server was contacted.
The detail sits in `qa/ACCESSIBILITY-AUDIT.md` and `qa/PERFORMANCE-AUDIT.md`.

| Measurement | Result |
|---|---|
| axe-core 4.10.2 across 16 public routes | **PASS.** 0 violations |
| Lighthouse mobile, local production build | Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100. 54 audits passed, 0 failed |
| Contrast on rendered pixels | **PASS.** 28 distinct foreground, background and size combinations, 0 failures, lowest 4.91:1 |
| Focus indicators | **PASS.** 353 focusable elements across 13 routes, 0 failures, lowest ring contrast 14.46:1 |
| Reflow at 640x512, equivalent to 1280x1024 at 200 per cent | **PASS.** No horizontal scrolling on 8 routes |
| 390px viewport | **PASS.** No overflow, no target smaller than 24x24 |
| LCP and CLS on the home page | LCP 91 ms, CLS 0.00 |

**Two cautions on the numbers above, and they matter.**

The Lighthouse and Core Web Vitals figures come from a local preview with **no CPU throttling
and no network throttling**. They describe the build, not the experience of a real visitor on
a real connection. They are not a field measurement and must never be quoted as one.

The accessibility figures are automated. Automated tooling catches a specific and limited
class of problem. **A screen-reader pass with real assistive technology has not been run**, so
the area is PARTIAL, not PASS overall. `docs/DECISIONS.md` D-030 records this.

#### Size, before and after

| Measure | Before | After |
|---|---|---|
| Entry chunk (`index`) | 556.94 kB | 181.76 kB |
| `dist/` total | 43 MB | 2.6 MB |
| `public/` total | 36.1 MB | 96 KB |
| Direct npm dependencies | 56 | 29 |

`vite.config.ts` now cuts two chunks by hand: a `vendor` chunk holding the React and router
runtime, and one `icons` chunk that replaces roughly thirty lucide micro-chunks of a few
hundred bytes each. `index.html` no longer loads two render-blocking icon webfonts from two
CDNs, which had zero usages between them.

#### Dependency audit

`npm audit` reports 7 findings: 1 low, 3 moderate, 3 high. It was 33. Only `xlsx` is a direct
dependency, and it has no fix available.

### 6.4 Client, built and in the repository

| Area | State | Evidence |
|---|---|---|
| Public site, 16 routes under `PublicLayout` including the 404 | Built, rebuilt on the new design system | `src/routes/index.tsx`, `src/marketing/` |
| Public work detail, `/work/:slug` | Built. The one route this relaunch adds | `src/marketing/pages/WorkDetail.tsx` |
| Per-route metadata on every public page | Built | `src/marketing/components/Seo.tsx` |
| CMS, 25 module routes | Built | `src/app/modules/`, all wired into routes, sidebar, global search and `access.ts` |
| Work module, the 24th | Built. Homepage hero switches, brand colour, hero word and screenshots since 2026-10-14 (D-046) | `src/app/modules/Work.tsx` |
| Site content module, the 25th | Built on branch `feat/redesign-2026`, not merged or deployed. Needs `site.php` and the `site_content` table live; the UI is checked against mocked responses only | `src/app/modules/Site.tsx` |
| Authentication, 7 roles | Built | `src/app/Login.tsx`, `RequireAuth.tsx`, `src/lib/access.ts` |
| Two-factor, recovery codes | Built. Setup now requires a current code when 2FA is already on | `src/app/modules/Platform.tsx`, `server/auth.php` |
| Magic-link sign-in | Built | Login page |
| Invite and set-password | Built | `src/app/SetPassword.tsx` |
| Google SSO button | Built, shown only when the server reports it configured | `oauth.php?action=status` |
| Idle lock screen, 15 minutes | Built | `src/app/components/LockScreen.tsx` |
| Notification bell | Built, derived from overdue invoices and open tickets | `src/app/components/NotificationBell.tsx` |
| Code splitting | Built. Every CMS route is lazy, plus two hand-cut vendor chunks | `src/routes/index.tsx`, `vite.config.ts` |
| Public design system | Built | `src/index.css` `.gk-public` block, `tailwind.config.js` |
| CMS design system | Unchanged | `src/index.css` `:root` and `.dark` |

`src/lib/api.ts` now exports 36 groups over one `request()` helper.

#### Access control

`src/lib/access.ts` changed in five ways, all of them narrowing:

- `work` added, matching `work.php`'s EDITORS list.
- `files` lost `trainer`, which the server list never held.
- `dashboard` narrowed, so `trainer` and `employee` now land on a module they can open
  instead of bouncing off the index.
- `portal` narrowed to match the server.
- **`canAccess` now fails closed.** An unmapped module key used to return `true`, which meant
  a route added without a `MODULE_ROLES` entry was reachable by every signed-in user, the
  `client` role included. A missing entry now hides the module. See D-028.

### 6.5 The work ledger

New, and the largest functional addition on this branch.

| Piece | Where | State |
|---|---|---|
| Tables `work` and `work_images` | `server/schema.sql`, at the foot | Written. **Not applied to any database** |
| Endpoint | `server/work.php` | Written, `php -l` clean. **Not uploaded.** Never exercised at runtime |
| Public route | `/work/:slug`, `src/marketing/pages/WorkDetail.tsx` | Built |
| Work cards | `src/marketing/components/site-ui.tsx` (`ProjectCard`); the D-037 ledger was removed under D-046 | Built |
| Data layer | `src/marketing/data/work.ts` | Built. Reads the API with a typed static fallback |
| CMS module | `src/app/modules/Work.tsx` | Built, with all five client wirings |

One record type carries four kinds: `case_study`, `product`, `experiment` and `writing`. The
three ledger row labels change with the kind, so Problem, Built and Outcome become Question,
Made and Learned for an experiment. That is how one table expresses four kinds without a
badge doing the explaining.

Two rules are enforced on the server. A record that names a client **cannot be published**
unless consent is stored, and the public read omits `client_name` entirely, key and all,
unless `client_consent = 1`. An image cannot be attached without alt text.

Because the tables do not exist anywhere yet, the public pages render from the static
fallback in `src/marketing/data/work.ts`. Every fallback record is true and describes the
owner's own work. No client is named and no figure is quoted without a measurement behind it.

### 6.6 Server, in the repository

45 PHP files, all passing `php -l`. Full contract in `docs/API-SPEC.md`.

| Group | Files |
|---|---|
| Shared | `_bootstrap.php`, `_smtp.php`, `_sms.php`, `_slack.php`, `_monitor.php` |
| Public | `contact.php`, `verify.php`, `book.php`, `api.php`, `work.php` (public branch) |
| Auth and platform | `auth.php`, `oauth.php`, `users.php`, `audit.php`, `integrations.php` |
| Sales | `leads.php`, `clients.php`, `proposals.php`, `contracts.php` |
| Delivery | `projects.php`, `tasks.php`, `design.php`, `dev.php`, `resourcing.php`, `time.php`, `careplan.php`, `files.php` |
| Money | `invoices.php`, `payments.php`, `reports.php` |
| Client-facing | `portal.php`, `support.php`, `comms.php`, `mail.php` |
| Content | `blog.php`, `testimonials.php`, `content.php`, `knowledge.php`, `announcements.php`, `work.php` |
| Services | `ai.php`, `weather.php`, `github.php`, `figma.php`, `slack.php` |
| Automation | `cron.php` |

#### Security changes made on this branch

All of these are in the repository and **none of them is on the live server**. Each is
verified by source inspection only; no endpoint was exercised.

| Change | File |
|---|---|
| The generated seed password no longer goes to a web-served `seed_admin_password.txt`; it goes to the error log. The hard-coded `dev@gakinz.com` fallback is gone | `auth.php` |
| `.txt` is denied at the document root, with `robots.txt` exempted by a negative lookahead inside the same pattern | `.htaccess` |
| Rewritten as a read-only health check. The unauthenticated POST insert is gone | `api.php` |
| The staff branch is restricted to super_admin, admin and manager. The client branch is unchanged | `portal.php` |
| Two-factor setup requires a current code when 2FA is already enabled, and is audited. Failed TOTP attempts count towards the login throttle | `auth.php` |
| A CSRF `state` parameter in a short-lived HttpOnly cookie, plus validation of the id_token's `aud` and `iss` | `oauth.php` |
| An extension allowlist plus a `finfo_file()` sniff. The browser-supplied Content-Type is no longer stored or replayed | `files.php` |
| An IP throttle on the public enquiry form | `contact.php` |
| `X-Content-Type-Options: nosniff`, `Referrer-Policy` and `X-Frame-Options: DENY` | `_bootstrap.php` |
| Private and link-local addresses blocked, redirects no longer followed, TLS verified | `_monitor.php` |
| `audit()` added to six previously unlogged mutations; seven concatenated SQL fragments now use bound parameters; five endpoints stopped leaking upstream error text | various |

**Do not read this table as "the server is secure".** It is a list of specific defects closed
in source, none of it uploaded, none of it exercised at runtime, and none of it reviewed
against the live configuration. `qa/SECURITY-AUDIT.md` holds the audit.

### 6.7 Deployed state

**UNVERIFIED, all of it.** No server was contacted, and the gap is now wider than it was,
because this branch changes fourteen server files, adds a fifteenth and adds two tables.

| Question | Status |
|---|---|
| Which `server/*.php` files on the host match the repository | UNVERIFIED, and now certainly out of date |
| Whether the `work` and `work_images` tables exist | **No.** They have not been applied to any database |
| Whether the `files.share_token` unique key has been applied | UNVERIFIED. The `ALTER TABLE` is written and not run |
| Which earlier schema migrations have been applied | UNVERIFIED |
| Whether the live `ALLOWED_ORIGINS` contains `http://localhost:5102` | UNVERIFIED |
| Whether `$SMTP_HOST` and `$IMAP_HOST` on the host point at the retired server | UNVERIFIED |
| Whether the cPanel cron entry for `cron.php` exists | UNVERIFIED |
| Whether the seeded super-admin password has been rotated | Owner-reported rotated 2026-10-12. Session revocation unconfirmed. See `docs/KNOWN-ISSUES.md` K-001 |

Closing these needs someone with server access. Until then no release note should describe
this project as deployed. `docs/DEPLOYMENT.md` holds the upload list and the outstanding SQL.

### 6.8 Integrations

Configuration state on the server is UNVERIFIED for every row. The column below records only
whether the code path exists in the repository.

| Integration | Code | Notes |
|---|---|---|
| OpenRouter | Present | Authenticated, per-role daily caps |
| OpenWeather | Present | Cached 10 minutes |
| SMTP | Present | Built-in client, `mail()` fallback |
| IMAP | Present | Needs the PHP `imap` extension |
| Twilio SMS | Present | |
| Twilio WhatsApp | Present | Reuses the Twilio credentials |
| Stripe | Present | Verified webhook, replay guard |
| PayPal | Present | Orders v2, capture on return |
| Google SSO | Present | Matches existing users only. Now carries a CSRF state parameter |
| GitHub | Present | Works tokenless on public repositories |
| Figma | Present | Needs a token |
| Slack | Present | Incoming webhook, best effort |
| Calendly | Present | Link only |

### 6.9 Quality

| Area | State |
|---|---|
| Type safety | PASS. `tsc -b` clean, and it gates the build |
| Unit tests | PASS, but narrow. 21 tests, access control only |
| Endpoint tests | None. `work.php` has never been executed |
| Component tests | None |
| End-to-end tests | None |
| Lint | FAIL. 47 errors, 2 warnings, down from 60 and 7 |
| Accessibility, automated | PARTIAL on the D-046 build, measured 2026-10-16: two brand-colour contrast failures found and fixed the same day (K-050, K-051), not re-measured by this table. See section 6.3 and `qa/ACCESSIBILITY-AUDIT.md` section 9 |
| Accessibility, assistive technology | **NOT TESTED.** No screen-reader pass has been run |
| Accessibility, GAkinzOS at `/app/*` | PARTIAL. First automated check 2026-10-16: 8 screens in empty states, light and dark, 0 axe violations after fixes. Data-filled screens, dialogs and 390px NOT TESTED |
| Performance, lab | Lighthouse mobile with simulated throttling on a local preview, 2026-10-16: 73 to 92. See section 6.3. With the prerender (`perf/prerender-public`): 81 to 94, CLS 0, SEO 100 on `/`, `/work`, `/contact`; home LCP still 4.5 to 4.8 s (`docs/KNOWN-ISSUES.md` K-052) |
| Performance, field | **NOT TESTED.** No real-user measurement exists |
| Security | Source inspection only, and the changes are not deployed. See `qa/SECURITY-AUDIT.md` |

### 6.10 Not built, and why

| Item | Reason |
|---|---|
| Server-side rendering | None at request time. Since 2026-10-16 (`perf/prerender-public`, not merged or deployed) the 30 public pages are prerendered at build time from the built-in content; the CMS, `/verify/:id` and CMS-only records are still client-rendered. See `docs/ARCHITECTURE.md` section 2 |
| Sitemap entries for records that exist only in the CMS | Since 2026-10-16 (`feat/generated-sitemap`, not deployed) the build writes `sitemap.xml` from the prerendered pages, built-in projects, services and posts included. A CMS-only record would need the build to read the API, which it must not, or a server-rendered sitemap (K-019) |
| Xero and QuickBooks accounting sync | Needs a full OAuth application and a sandbox account |
| Google Drive, Box, Dropbox storage | Same. Local file storage exists instead |
| Zoom and Google Meet meeting creation | Same |
| A staging environment | One production host, by choice |
| Automated database backups | None in this repository. The largest operational risk. See `docs/OPERATIONS.md` section 5 |
| A migration runner | See `docs/DECISIONS.md` D-008 |

