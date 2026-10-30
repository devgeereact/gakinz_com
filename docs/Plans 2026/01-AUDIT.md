# Current state and audit evidence

Date: 10 October 2026. Baseline: local `main`, commit `c57eb4a`. Findings concern this checkout unless explicitly labelled historical. This is a broad planning audit, not a penetration test or proof that every business action works.

## What is built

| Layer | Evidence | Assessment |
|---|---|---|
| Public website | `src/marketing/pages/`, `src/routes/index.tsx` | Home, services/detail, pricing, sectors, about, work/detail, resources/detail, contact, three legal pages, verification and shared proposals |
| Private workspace | `src/app/modules/`, sidebar and routes | 24 routed modules, plus login, password setup and guard |
| Client boundary | `server/portal.php`, `support.php`, `files.php`, `payments.php` | Server checks exist, but complete cross-client behaviour needs synthetic integration tests |
| API | `src/lib/api.ts`, 45 tracked PHP files | Resource endpoints plus transports, auth and helpers. File count is not endpoint count |
| Data | `server/schema.sql` | 33 `CREATE TABLE IF NOT EXISTS` declarations, including work and work images; declarations do not establish live schema state |
| Publishing | Blog, testimonials and Work modules/endpoints | Dynamic public content exists; static identity/services/pricing remain in source |
| Integrations | Booking link, email, payments, AI, GitHub/Figma and others | Configuration-dependent; no account or deployed behaviour verified |
| Delivery | Two GitHub workflows and manual PHP/SQL release notes | Client push can deploy independently of server readiness |

This is Vite and React, not Next.js. `package.json`, `vite.config.ts` and `src/main.tsx` establish the architecture. Generated project-type hints should not drive a migration.

## What was inspected

Routes, navigation, API boundary, auth persistence/guard, layout, public content and hooks, blog renderer/editor, module action inventories, schema declarations, critical PHP branches for contact, client conversion, proposals, invoices, payments, portal, support, files, contracts and work. Existing architecture, product, design, deployment, decisions, known issues, operations, September relaunch/adoption plans and QA records supplied context. Module presence and called actions were inventoried across all 24 screens and public pages.

The highest-risk journeys received closer source inspection. Not every line or dormant integration was manually audited. No claim of a complete security review follows from inventory counts. A later implementation phase must exercise each changed action and its neighbouring failure paths.

## Fresh local checks

| Check | Exact command | Result |
|---|---|---|
| Checkout | `git status --short` | PASS, initially clean |
| History | `git log -8 --oneline` | Relaunch merged as `f67f05b`, followed by two later changes |
| Worktrees | `git worktree list` | One registered worktree, this checkout on main |
| Branches | `git branch -avv` | Only local main and cached origin/main; both at `c57eb4a` |
| Build | `npm run build` | PASS, TypeScript and Vite; build completed in 2.84 seconds |
| Tests | `npm test`, re-run as `npx vitest run` | PASS, one file, 21 tests; access-rule tests only. Re-run 10 Oct: PASS |
| Lint | `npm run lint`, re-run as `npx eslint .` | FAIL, 47 errors and two warnings; matches recorded September count. Re-run 10 Oct: same |
| PHP | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | PASS, 45 files. Re-run 10 Oct: PASS |
| Dependencies | `npm audit --json` | FAIL, 15 affected packages: ten high, four moderate, one low, no critical |

The build and test timings are local measurements, not performance guarantees. Advisory counts can change without code changes. `xlsx` still has no automatic fix; several suggested fixes involve a Tailwind major upgrade, which must not be applied blindly. Separate runtime exposure from development/build exposure and check individual advisories before choosing remediation. The September seven-package figure is historical.

## Isolated browser evidence

Command: `npm run preview -- --host 127.0.0.1 --port 5199 --strictPort`. This was a temporary local preview override, not a changed project port. Chrome used a new isolated context and a pre-navigation fetch replacement returning 503 for all application API requests. No backend was contacted. A fictional local persisted account permitted inspection of CMS shells and error states. This does not validate login or authorisation.

Sampled public pages: home, services, pricing, contact, work and resources. Sampled CMS pages: dashboard, enquiries, clients, projects, proposals, invoicing, portal, blog, work and platform. Route checks inspected rendered text and document dimensions. A home screenshot was visually inspected. No forms were submitted.

| Observation | Result and limit |
|---|---|
| 390px emulated touch viewport | Home, contact, services, dashboard, leads, projects, blog and work had document width 390px in sampled offline state |
| Invoicing at 390px | FAIL, layout expanded to 448px |
| Platform at 390px | FAIL, layout expanded to 642px; tab row extends beyond the viewport |
| Initial window resize | Browser clamped requested 390px window to 500px; mobile measurements above use explicit device emulation instead |
| Dashboard API failure | Error is visible, but cards still show £0, zero records and reassuring labels such as “All on time” |
| Public home on API failure | Static fallback renders project gaps, portrait-to-supply and technical build commentary |

No data-filled tables, dialogs, payment success screens, screen-reader session, full keyboard journey or new axe/Lighthouse run was completed. The older public accessibility/performance reports remain historical evidence, not evidence for the CMS or future changes.

## Findings and proposed priority

The "Re-check" column records the second read-only source pass on 10 October 2026: **CONFIRMED** (evidence matches), **CORRECTED** (finding holds but the detail changed), **NEW** (found in the second pass) or **NOT RE-CHECKED** (owner-side or browser evidence, not repeatable from source).

| ID | Priority | Re-check | Evidence and implication | Required resolution |
|---|---|---|---|---|
| A01 | P0 | NOT RE-CHECKED | K-001/K-015 and the release checklist record exposed administrator credentials and a possible seed-password file. Current rotation and deletion state unknown | Owner confirms rotation, session revocation and file deletion without putting secrets in documents |
| A02 | P0 | NOT RE-CHECKED | Deployment notes list manual PHP/SQL work; live state UNVERIFIED (K-006) | Compare approved file versions, schema and configuration on the host; record each result and rollback |
| A03 | P0 | NOT RE-CHECKED | Operations/K-010 contain no demonstrated backup restoration | Restore database and uploaded files in an isolated environment; verify relationships and permissions |
| A04 | P0 for Stripe | CONFIRMED | `server/payments.php:37` sums `qty * unit_price` as `total`; `:47` charges `round($total * 100)`. No `vat_rate`. PayPal (`:188,197`), `invoices.php:50-51,70-73` and `portal.php` do add VAT | Make payable amount identical across invoice, PDF, portal and provider; test £100 plus 20% VAT gives £120 |
| A05 | P0 for online payments | CONFIRMED | Stripe checks HMAC (`payments.php:119-120`), 300s timestamp (`:122`) and paid status (`:137-139`); PayPal checks `COMPLETED` and `custom_id` (`:260-263`). Neither compares amount or currency with the invoice. No processed-event table exists; only `status <> "paid"` guards repeats | Bind provider payment to invoice, expected amount and currency; record provider event IDs; test mismatch, duplicate and delayed events |
| A06 | P1, before blog use | CONFIRMED | `src/app/modules/Blog.tsx:63,68` set `excerpt` and `body` to `""` in `startEdit`; `:79-80` send them to `blog.update`. K-016 | Fetch the full draft before edit, preserve fields, block save while loading or failed, regression test |
| A07 | P1 | NOT RE-CHECKED | Mobile Invoicing (448px) and Platform (642px) overflow at 390px, reproduced in the first browser pass | Wrap actions and tabs, constrain widths, adapt tables; prove 320px, 390px and 200% zoom |
| A08 | P1 | CORRECTED | On failure `Dashboard.tsx:352-358` does show a `role="alert"` banner ("Couldn't reach … Showing what loaded"), but the cards beneath still show £0 and "All on time" (`:416,425`) | Render unavailable data as "Unavailable, retry" on each card, never as zero |
| A09 | P1 | CONFIRMED | `src/components/app-sidebar.tsx:49-72` is one flat, ungrouped list of 24 entries, filtered per role by `canAccess` | Seven main destinations, supporting tools inside records; keep existing URLs until migration is verified |
| A10 | P1 | CONFIRMED | `src/components/nav-user.tsx:122,128` link to `/app/account/profile` and `/app/account/notifications`, which are not routes (K-023). Security and sessions live only in admin-only Platform (`Platform.tsx:65-84`, `access.ts:62`, K-024) | One My account screen for every signed-in role, with server-side ownership checks |
| A11 | P1 | CORRECTED | `src/store/auth.store.ts:30-43` persists the bearer token in localStorage (`gk-auth`). The lock screen (`LockScreen.tsx:19,28`) is a sessionStorage flag; unlocking calls real login with 2FA (`:53`) but issues a second token and leaves the first valid (`:56`) | Review token lifetime, revocation and CSP; revoke or reuse the existing token on unlock; never describe the lock as logout |
| A12 | P1 | CORRECTED | `server/proposals.php:174` checks `project_id` outside the transaction (begins `:183`); the UPDATE at `:192` has no `AND project_id IS NULL`. Split is 40/30/30 of the **ex-VAT** subtotal (`:176,198-200`), due today, +30 and +60 days (`:203-205`); each invoice stores `vat_rate` (`:210`) | Serialise acceptance (guarded UPDATE or row lock), test double and concurrent accept; preview the schedule with VAT before accepting |
| A13 | P1 | CONFIRMED | `server/contracts.php:16,103` restrict signing to STAFF; `:106,110` store the typed `signed_name` and IP | Label as an internal acknowledgement; use an externally signed document initially |
| A14 | P1 | NOT RE-CHECKED | Portal aggregates projects, invoices and tickets; Comms is staff-only | Do not promise client messaging, assets or approvals until delivery and isolation are demonstrated |
| A15 | P1 | CONFIRMED | `.github/workflows/ci.yml` runs typecheck, advisory lint (`continue-on-error: true`) and build only; no `npm test`, no `php -l`. `deploy.yml` deploys `dist/` on push to main with no dependency on CI | Run tests and PHP syntax in CI; gate deploy on CI success or a deliberate release trigger |
| A16 | P2 | CONFIRMED | `src/marketing/data/blog.ts:73,83` and `work.ts:209,219,224` start with static content and keep it on failure and on a successful empty response; `useMarketingPost` (`blog.ts:99-100`) still serves a static post by slug | Distinguish success-empty from failure; unpublishing must not bring fallback content back |
| A17 | P2 | CONFIRMED | `src/marketing/pages/ResourceDetail.tsx:39-43,123-142` render only `h2`, `h3` and plain paragraphs; no links, lists or emphasis | Add a small safe format for links, lists and recommendation blocks before any affiliate content |
| A18 | P2 | CONFIRMED | `src/marketing/components/Seo.tsx:1-16` sets metadata at runtime; `public/sitemap.xml` is hand-maintained, lists 15 fixed URLs and omits `/work/:slug` and `/resources/:slug` (K-018, K-019) | Route-specific public HTML and metadata; sitemap generated from published records |
| A19 | P2 | CONFIRMED | Visible fallback text includes "twenty-four modules … Forty server endpoints" and a `docs/AUDIT.md` path (`work.ts`), plus "Portrait, to supply" (`Home.tsx:94`, `About.tsx:130`), "Biography, to supply" (`About.tsx:165`), "Screenshot, to supply" (`WorkDetail.tsx:152`), "review date to supply" (`Legal.tsx:63`) | Replace with buyer-relevant proof and complete content; unpublish incomplete entries rather than invent replacements |
| A20 | P1 legal/content | NOT RE-CHECKED | Legal review dates absent (K-021); trading entity, VAT and retention unknown; `site.ts:60` registration is `null` | Review actual processing and terms; date only a genuine review |
| A21 | P1/P2 | CORRECTED | `src/lib/csv.ts:10` quotes fields but does not neutralise leading `=`, `+`, `-`, `@`, tab or CR. `downloadXlsx` is also unsanitised | Neutralise formula prefixes in both exports; regression test; or drop XLSX (see K-017) |
| A22 | P0 | CONFIRMED | `server/auth.php:470-503` (`magic_consume`) checks only that the user is active, then issues a full session. Password login enforces TOTP at `:86-88`. Applies to every role including `super_admin` | Every sign-in route honours 2FA; customer-only links never become owner login |
| A23 | P1 | CONFIRMED | `auth.php:460-461` selects `used_at IS NULL`, then `:477` runs an unconditional `UPDATE … SET used_at = NOW() WHERE id = ?` with no affected-rows check | Consume atomically (`AND used_at IS NULL` plus affected-rows check); test concurrent requests |
| A24 | P1 | CONFIRMED | `server/support.php:17,80,139` require STAFF for create and reply; no client branch. `testimonials.php:18,59,97,111` require editors | Add an ownership-checked client branch to support; private feedback with separate publication consent |
| A25 | **P0** | NEW | A04 and A05 combine into lost money: proposal invoices carry `vat_rate` (`proposals.php:210`), Stripe charges the ex-VAT total (`payments.php:37`), then the webhook marks the invoice fully paid (`:141`). The VAT is written off silently | Fix A04 and A05 together; reconcile any invoice already paid through Stripe against its VAT-inclusive total |
| A26 | P0 for PayPal | NEW | PayPal payment is recorded only on browser return (`payments.php:239`, `paypal_return`). There is no PayPal webhook. If the customer closes the tab, money is captured but the invoice stays unpaid | Keep PayPal hidden until a verified webhook or manual reconciliation exists |
| A27 | P1 | NEW | `proposals.php:169` selects `status` but never checks it, so a draft or declined proposal can be accepted and converted | Accept only from `sent` (or the approved state); reject others with a clear message |
| A28 | P2 | NEW | Live agent and contract documents carry stale facts (see drift table). `.agent/PROJECT.yml` names workflow `existing-app-recovery`, which does not exist in `~/.agents/gee-os/workflows/`; the closest is `EXISTING-APPLICATION.md` | Correct after approval as part of the documentation step in document 05 |

These are confirmed source-level gaps, not claims of an exploited or deployed defect. A12 and A23 are race concerns needing integration tests, not reproduced duplicates. A21 needs testing in the intended spreadsheet apps. Payment, legal and auth changes need focused specialist review during implementation.

Roles verified: seven, at `server/_bootstrap.php:57` (`super_admin`, `admin`, `manager`, `trainer`, `editor`, `employee`, `client`). `require_auth` is called in 35 of 45 PHP files (124 call sites). `portal.php:26-28` derives the client from the token for the `client` role and ignores request parameters, as CLAUDE.md requires. `book.php:11` only returns the configured Calendly URL; there is no booking table.

## Drift from the earlier plans

| Earlier direction | Actual state or new brief | Proposed resolution |
|---|---|---|
| Original cover: 168 features, 52 AI features | `MODULES` contains 175 feature objects, 55 marked as AI. Cover counts cannot define completion | Use feature register, retire obsolete counts after approval |
| Twelve core modules | 24 routed screens including publishing, mailbox, design, dev, leave and monitoring | Keep core journeys and demote optional tools; do not double the product again |
| Agency roles and workforce management | Owner now explicitly runs one company alone | Preserve access model for safety, default UI to owner and client; no role-engine rewrite |
| Personal site first, studio only when team needed | Current request stresses company services and company social identity | Approve GAkinz-led positioning with an honest named owner |
| September public-only styling | CMS retains a different palette, shape and auth styling | Apply the owner-selected Mastercard-inspired foundation to both surfaces, retaining suitable functional density differences |
| Relaunch contract says not merged | Local history shows merged `f67f05b` | Refresh contract/status after approval; deployment remains separately unverified |
| Docs say 23 modules/31 tables in places | Source now has 24 routed modules/33 table declarations | Reconcile canonical inventories, not another duplicated spec |
| More AI and external integration features | Not needed for the stated simple workflow | Defer assistants, forecasting, sync and automation unless a repeated need is measured |
| Accessibility is complete | Prior public automated measurements, no new CMS/assistive-tech proof | Maintain specific dated claims and test both surfaces before broad compliance claims |
| September rule: no borrowed design language | Owner chose the full Mastercard-inspired system on 10 October | Record a dated decision withdrawing the rule; keep the evidence rule (document 05) |
| Four services in `site.ts` | Owner added general IT support and IT consultancy on 10 October | Two new service entries and pages; networking and hardware stay excluded |
| "Owner must supply prices" (earlier draft of this plan) | `src/marketing/data/site.ts` already holds Starter £1,500, Business £3,500 (featured), Ecommerce £6,000, Bespoke quoted; £180 per page, £350 copywriting, £600 brand mark; care plans £90 and £450 per month; 40/30/30 terms | Owner confirms or replaces these and states the VAT basis; IT support and consultancy need new prices |
| CI described as a quality gate | `ci.yml` omits tests and PHP syntax; lint is advisory; `deploy.yml` does not wait for CI (A15) | Gate deploy on CI after approval |

### Stale facts in live documents (A28)

Verified by search on 10 October 2026. Current values: 24 modules, 45 PHP files, 33 tables, 21 tests, lint 47 errors and 2 warnings.

| File and line | States | Should state |
|---|---|---|
| `CLAUDE.md:17` | 23 modules | 24 modules |
| `CLAUDE.md:98-99` | 11 tests; lint 60 errors, 7 warnings | 21 tests; 47 errors, 2 warnings |
| `AGENTS.md:33` | 31 tables | 33 tables |
| `AGENTS.md:94` | lint backlog 60/7 | 47/2 |
| `server/README.md:61` | 31 tables | 33 tables |
| `docs/SECURITY.md:65` | 11 tests | 21 tests |
| `docs/KNOWN-ISSUES.md:63` | 60/7 | 47/2 |
| `.agent/CURRENT-TASK.md:7` | relaunch "not merged" | merged as `f67f05b` (#5); deployment still UNVERIFIED |
| `.agent/CURRENT-TASK.md:126,129` | 11 tests, 60/7 baseline | current baseline |
| `.agent/PROJECT.yml` | workflow `existing-app-recovery` | an existing GEE OS workflow name, such as `EXISTING-APPLICATION` |

The `docs/adoption/*` files, `docs/DECISIONS.md:305` and the relaunch specification also hold old numbers, but they are dated historical records and can stay as they are. `src/index.css:934` references Space Grotesk, which is never imported (cosmetic).

## Git and folder conclusions

One registered worktree and one local branch were found. Nothing requires a local merge or worktree removal based on this evidence. Remote branches/PRs may differ from cached refs; no remote inventory or fetch was performed. A matching project-name check in the immediate WebstormProjects directory found this project only; this is not a machine-wide abandoned-worktree audit.

Tracked Markdown is distributed across root, docs, `.agent`, qa and server. These placements and archival overlaps are mapped in document 05. No file is approved for deletion merely because it appears old. Existing deployment notes and rule paths must survive until references are migrated.

## Readiness verdict

**PARTIAL:** a substantial locally buildable system exists. **BLOCKED:** confidence in taking orders through the full system cannot be established until credential, deployed-state, recovery, money and isolation gates pass. **NOT TESTED:** production, live database, transports and integrations. UI improvements alone cannot close those gaps.

## Second verification pass, 10 October 2026

Three independent read-only reviews re-read the cited files for payments, auth, proposals, support, portal, the CMS shell, the public content hooks, workflows, schema and documentation. Tests, lint and PHP syntax were re-run (results above); `npm run build` was not re-run because it writes `dist/`. No production session, customer message, payment or feedback was exercised. The customer access and GEE OS handoff are specified in [document 08](08-CLIENT-JOURNEYS-AND-ACCEPTANCE.md).

Other facts confirmed in this pass: `server/schema.sql` has 33 live `CREATE TABLE IF NOT EXISTS` statements and 24 commented `ALTER TABLE` lines; `GAkinzOS.html` has 12 modules and 175 feature entries, 55 marked `ai:true`, while its cover says 168 and 52; `docs/DESIGN-SYSTEM.md` is the current design document and root `DESIGN-SYSTEM.md` is marked superseded; the project `.claude/` folder holds only `launch.json` and `settings.local.json` (no project hooks, agents or rules); `.playwright-mcp/` holds 28 gitignored QA files from 22 September; only `main` exists, one worktree, no stashes.
