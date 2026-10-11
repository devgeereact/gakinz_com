# Status

**As at:** 2026-10-10. `main` is `c57eb4a`. All later work sits on branches stacked into
PR #8, ending at `chore/codebase-hygiene` (`8568a6d`): batch 1 (the local half of delivery
phase 1), the seven-destination navigation, My account, enquiry follow-ups, client portal
messages, public publishing and the article format, the lock-screen token fix, the public
redesign on D-037, the favicon and share image, and dead-code removal. **None of it is merged,
deployed or uploaded.** The owner approved the 2026 plan on 2026-10-10 (`docs/DECISIONS.md`
D-043).

**Method:** local test, build, lint and PHP syntax runs; isolated browser previews with every
API call stubbed; source inspection for everything else. **No live server, database, mailbox,
payment provider or DNS record was contacted.** Section 6 is the 2026-09-22 record, accurate
except where sections 0 to 4 say otherwise.

This is the file that changes often, and the one home for measured counts: other documents
point here rather than repeat a number. Anything about the deployed system is UNVERIFIED
unless someone with server access has checked it.

---

## 0. Current measurements

Measured on 2026-10-10 against commit `8568a6d` plus the documentation refresh. Re-measure and
update this table when a count changes.

| Measure | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **PASS.** 102 tests in 6 files |
| Server integration tests | `npm run test:server`, local throwaway `*_test` database | **PASS.** 106 tests in 9 files (2026-10-11, Ubuntu, MariaDB 10.11) |
| Type check and build | `npm run typecheck`, `npm run build` | **PASS** |
| Lint | `npm run lint:ratchet` | 44 errors, 2 warnings, at the ratchet ceiling. **`npm run lint` still fails** (K-002) |
| Documentation | `npm run docs:check` | **PASS** |
| PHP files | `ls server/*.php \| wc -l` | 46: 40 endpoints and 6 `_`-prefixed includes, all passing `php -l` |
| Tables | `grep -c "^CREATE TABLE IF NOT EXISTS" server/schema.sql` | 34 |
| CMS screens | `src/routes/index.tsx` under `/app` | 25: Today (the index), 23 module routes and My account, in seven navigation groups |
| Client API groups | `src/lib/api.ts` | 36 exported groups over one `request()` helper |
| Server files changed since `main` | `git diff --name-only c57eb4a -- server` | 23 PHP files, `.htaccess` and `schema.sql`, listed in `docs/DEPLOYMENT.md` section 5 |
| `require_auth` | `grep -c "require_auth(" server/*.php` | Called in 35 of 46 files, 129 call sites |

Not measured on this run: `npm audit` (last figure in K-041), accessibility and performance
(last runs in `qa/`), and anything on the live system.

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

| Phase | Work and dependency | Exit evidence | State on 2026-10-10 |
|---|---|---|---|
| 0. Agree scope | Design system and six services; motion contract, core workflows and navigation, positioning and feature dispositions; actual business and pricing facts | Dated decisions with clear exclusions and remaining questions | Plan approved (D-037 to D-044). Business facts outstanding (section 5) |
| 1. Establish safety | Owner credential actions; reconcile host PHP and SQL; backup and restore; a safe local synthetic backend and mail sink; payment defects and alternative sign-in reviewed | Rotation and revocation confirmed, restoration demonstrated, release manifest and rollback recorded, no accidental production calls in tests | Local fixes built (section 4), not deployed. Owner-side actions open |
| 2. Complete business journeys | Enquiry follow-up, simple bookings, client conversion, quote acceptance and version, projects and tasks, invoices and reconciliation, verified reference access, scoped messages, updates and feedback, client-linked brief, portal and support isolation | Synthetic end-to-end journey, failure, retry and concurrency tests, and record ownership tests pass | Started. Enquiry follow-ups and client messages built with server tests; bookings, timeline, feedback and the full journey not built |
| 3. Polish the CMS | Target design foundation, smaller navigation, My account, consistent page and form states, unavailable metrics, quiet optional modules | Owner usability task passes; keyboard, phone, zoom and theme checks on affected screens | Navigation grouped and My account built (K-032, K-023, K-024). CMS redesign on the target system not started |
| 4. Polish the public site | Hero and section design and motion, company and owner positioning, service copy, complete case studies, consent and legal content, safe publishing, metadata and sitemap | Buyer journey, publish and unpublish, share preview, responsive and accessibility evidence | Public surface rebuilt on D-037; publishing, article format and engineering copy fixed (K-036, K-037, K-038 in part). Six-service copy, case studies and owner material wait for owner inputs |
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
   repository-only and the work ledger has no tables behind it.
4. Restore a backup somewhere isolated and agree the recovery targets (K-010,
   `docs/OPERATIONS.md` section 10).
5. Review and merge PR #8 once CI passes, knowing that the merge deploys `dist/`, and that the
   client then expects the server set in step 3.

**P1, the core journeys**

6. One tested enquiry to client to quote to project to invoice journey against synthetic data.
7. Booking records inside Enquiries, the client timeline and private feedback
   (`docs/PRODUCT-SPEC.md` sections 5.5 and 6).
8. The remaining token work: `localStorage` exposure, token lifetime and a CSP review (K-033);
   honest contract labelling (K-034).

**P2, the CMS and the public site**

9. The CMS redesign slice on the target system (`docs/DESIGN-SYSTEM.md` section 10), starting
   with Today.
10. Six service pages, authorised case studies, owner portrait and biography, and complete
    public copy (K-038, owner inputs in section 5); route-specific metadata and a generated
    sitemap (K-018, K-019); the canonical conflict and font import (K-042, K-043).
11. After the `.htaccess` upload, confirm `/llms.txt` still serves. The deny rule exempts
    `robots.txt` and `llms.txt` by name (`server/.htaccess`); the live behaviour is UNVERIFIED.
12. Legal pages reviewed, with genuine dates (K-021).
13. A screen-reader pass with real assistive technology, and a first CMS accessibility check.
14. Exercise `work.php` against a real database before relying on it. **Done locally 2026-10-11**:
    `tests/server/work.test.ts` covers access, client consent, validation, images and ordering
    against a local `*_test` database. The live tables still do not exist until the SQL is run.

**P3, growth**

15. Social profiles, then the affiliate pilot, then the AdSense pilot
    (`docs/CONTENT-AND-GROWTH.md`).

**Ongoing:** hold the lint ratchet and bring it down (K-002); decide dependency exposure
(K-041, K-017); measure performance in the field rather than on a local preview.

## 4. What changed on 2026-10-10

Contract: `.agent/CURRENT-TASK.md`. Every row is in the repository only: client changes deploy
when PR #8 merges, and server changes need the manual upload in `docs/DEPLOYMENT.md` section 5.

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

**Safety, before any real order (phase 1)**

- [ ] The admin credential from git history rotated and all sessions revoked (K-001). Date:
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

**Brand and content (phase 4)**

- [ ] Main homepage message (draft in `docs/PRODUCT-SPEC.md` section 3).
- [ ] Sofia Sans licence file and weights confirmed (`docs/DESIGN-SYSTEM.md` section 10.3).
- [ ] Owner portrait and short biography supplied.
- [ ] Up to three case studies, each with client permission, screenshots and an honest outcome.
      Say if a project cannot be screenshotted (an internal system, or a client who permits
      naming but not imagery), because it then needs a designed answer rather than an empty
      frame.
- [ ] Sectors page: keep with genuine examples, or fold into Services.
- [ ] Motion preview reviewed on desktop and phone before it is applied everywhere.

**Product scope (phases 2 and 3)**

- [ ] "Measurement" in project briefs means agreed scope and delivery evidence
      (`docs/PRODUCT-SPEC.md` section 6.4), or something else:
- [ ] Keep XLSX export, or CSV only (K-017).

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
| CMS, 24 module routes | Built | `src/app/modules/`, all wired into routes, sidebar, global search and `access.ts` |
| Work module, the 24th | Built | `src/app/modules/Work.tsx` |
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
| Ledger component | `src/marketing/components/Ledger.tsx` | Built |
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
| Whether the seeded super-admin password has been rotated | UNVERIFIED, and important. See `docs/KNOWN-ISSUES.md` K-001 |

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
| Accessibility, automated | PASS on the public surface, measured 2026-09-22. See section 6.3 and `qa/ACCESSIBILITY-AUDIT.md` |
| Accessibility, assistive technology | **NOT TESTED.** No screen-reader pass has been run |
| Accessibility, GAkinzOS at `/app/*` | **NOT TESTED.** Out of scope for the relaunch audit |
| Performance, lab | Measured on a local preview with no throttling. See section 6.3 |
| Performance, field | **NOT TESTED.** No real-user measurement exists |
| Security | Source inspection only, and the changes are not deployed. See `qa/SECURITY-AUDIT.md` |

### 6.10 Not built, and why

| Item | Reason |
|---|---|
| Server-side rendering or a prerender step | None. The site is a client-rendered SPA, so a crawler that does not execute JavaScript sees an empty document. `public/llms.txt` exists as a hand-written mitigation, not a fix |
| Generated sitemap entries for `/work/:slug` and `/resources/:slug` | `public/sitemap.xml` is hand-maintained and lists static routes only. Database-backed URLs would need a generator or a server-rendered sitemap |
| Xero and QuickBooks accounting sync | Needs a full OAuth application and a sandbox account |
| Google Drive, Box, Dropbox storage | Same. Local file storage exists instead |
| Zoom and Google Meet meeting creation | Same |
| A staging environment | One production host, by choice |
| Automated database backups | None in this repository. The largest operational risk. See `docs/OPERATIONS.md` section 5 |
| A migration runner | See `docs/DECISIONS.md` D-008 |

