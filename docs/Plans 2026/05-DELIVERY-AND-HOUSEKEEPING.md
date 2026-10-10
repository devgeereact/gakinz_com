# Delivery, safety gates and a clean repository

Status: proposed. This is a sequence of reviewable future changes, not authority to perform them now. No application files, active contracts, memories or rules have been changed by this planning work.

## Delivery sequence

| Phase | Work and dependency | Exit evidence |
|---|---|---|
| 0. Agree scope | Mastercard-inspired foundation and six services already decided (10 October); approve the motion contract, approve core workflows/navigation, company positioning and feature dispositions; confirm actual business/pricing facts | Dated decisions with clear exclusions and remaining questions |
| 1. Establish safety | Owner credential actions; reconcile host/PHP/SQL; backup and restore; safe local synthetic backend/mail sink; payment defects and alternative sign-in/MFA paths reviewed | Rotation/revocation confirmed, restore demonstrated, release manifest and rollback recorded, no accidental production calls in tests |
| 2. Complete business journeys | Enquiry follow-up, simple bookings, client conversion, quote acceptance/version, project/tasks, invoice/reconciliation, verified reference access, scoped messages/updates/feedback, client-linked brief and portal/support isolation | Synthetic end-to-end journey, failure/retry/concurrency tests and record ownership tests pass |
| 3. Polish CMS | Apply selected shared design foundation, smaller navigation, My account, consistent page/form states, mobile overflow, unavailable metrics and quiet optional modules | Owner usability task pass; keyboard, phone, zoom and theme checks on affected screens |
| 4. Polish public site | Selected hero/section design and motion, company/owner positioning, service copy, complete case studies, consent/legal content, safe blog edit/publishing, metadata/sitemap | Buyer journey, publish/unpublish, share preview, responsive and accessibility evidence |
| 5. Social and affiliate pilot | Owned profile setup, approved copy/media, initial resources, disclosed links | Exact profile URLs, disclosure/link checks and repeatable small publishing routine |
| 6. AdSense pilot | Account approval and certified consent solution, article-only slots | Consent/network proof, no scripts on private layouts, performance comparison and reversible enable/disable |
| 7. Consolidate and operate | Promote approved requirements to canonical documents, retire duplicate plans, monthly review | References valid, one source per fact, current task/decision/release records accurate |

Public content drafting can run alongside safety planning, but no confident production acceptance announcement precedes phase 1-2 gates. Affiliate/ad work is secondary. Use small feature branches and reviewed batches; exact dates/effort require live-state and owner-input discovery first. Do not promise a complete launch in a fixed number of days from this audit.

## First implementation batch proposed

Ordered by risk to money and access. Each item cites its finding in document 01.

1. Establish a synthetic-data test path that cannot reach the live API, mail or payment providers (prerequisite for everything below).
2. Magic-link sign-in: enforce 2FA on every route and consume links atomically (A22, A23).
3. Stripe: charge the VAT-inclusive payable total, compare amount and currency in the webhook, record provider event IDs; hide PayPal until it has a webhook or manual reconciliation (A04, A05, A25, A26). Check any invoice already paid through Stripe.
4. Quote acceptance: accept only from the sent state and make conversion single-use (A27, A12).
5. Blog edit preservation (A06).
6. Mobile overflow in Invoicing and Platform (A07).
7. Unavailable metrics instead of zeros on Today (A08).
8. CI: run `npm test` and `php -l` in `ci.yml`, and make `deploy.yml` depend on CI success (A15).

Each is one concern with its own validation. The deployed credential/backups checks remain owner-controlled prerequisites, not something these local fixes can close. Do not use `npm audit fix --force`, change framework or merge all improvements into one unreviewable release.

## Test environment without overbuilding

The current dev API points at production. Start UI tests with API fixtures and a network rule that fails any request outside local test origins. Create a local PHP/MySQL test database with fake organisations/clients when endpoint testing begins. This is necessary safety infrastructure, not a new hosting architecture. A Docker setup is optional, chosen only if it makes repeatable tests simpler.

Use two unrelated fake clients plus owner and representative staff roles. No exported real client database, live mailbox credentials, copied sessions or provider live keys. Email goes to a sink; payment tests use provider sandbox/test data; SMS/WhatsApp/cron transports are disabled by default. A permitted test environment must explicitly declare its endpoints and reject production host names.

## Production acceptance gates

| Gate | Required proof before claiming readiness |
|---|---|
| Authentication | Every sign-in route honours the approved MFA policy; one-time links expire, are consumed atomically, and cannot enumerate customers; sessions revoke correctly |
| Credentials | Owner confirmation of required rotation, active-session revocation, 2FA/recovery and seed artefact checks |
| Deployment | Approved PHP file manifest/hash/date, schema/version evidence, debug off, correct configuration and dependencies; client and server compatibility established |
| Recovery | Automated or reliably scheduled backup, protected destination, database plus files, actual restoration and checks |
| Client isolation | Synthetic Client A/B attempts across portal, ticket replies, files/downloads, invoices/payment links and public tokens |
| Business integrity | Duplicate enquiry/conversion/acceptance handling, legal quote version, accurate invoice tax/rounding and provider reconciliation |
| Publication | Edit round-trip, draft privacy, consent, publish/unpublish, approved media, safe links and metadata/sitemap |
| UX/accessibility | No document overflow on tested widths, form/keyboard/assistive-tech checks, owner/client task completion |
| Delivery | Build/test/PHP pass in CI, deploy waits for CI, lint ratchet enforced then backlog reduced, advisory remediation/exposure decisions recorded |
| Operations | Response expectations, error observation, renewal review, retention decisions, incident/owner-lockout procedure |

Suggested recovery targets for owner approval: recover within one working day and lose no more than 24 hours of ordinary changes. If that loss is unacceptable for invoices/bookings, tighten the backup cadence. These are proposed RTO/RPO values, not achieved service levels. Initial retention proposal: rotating daily copies plus a modest weekly history, constrained by actual retention/contract requirements. Backups are encrypted/protected, credentials separate, access limited, and restoration tested periodically. Do not delete financial records on an arbitrary GDPR timer.

Minimal incident procedure: restrict affected function, preserve relevant logs without duplicating personal data, recover from known-good versions, investigate access/payment discrepancies, assess required notifications with appropriate advice, verify before reopening and record the incident. No secret values in tickets or logs.

For future production mutation, record rollback before deployment: previous client artefact, previous PHP files, schema/data backup, compatibility impact and exact post-change checks. Additive SQL may not need reversal, but data transformations need a specific restoration path. Owner approval covers a named release and its checks, not unrestricted hosting changes. Hosting/DNS/TLS/mail configuration remains in operator notes.

## CI and release proposal

Keep Vite build and the existing client/server model. Add unit tests and PHP syntax to CI, plus targeted synthetic endpoint/browser checks when available. Initially enforce the current lint error/warning ratchet in a machine-readable manner, then clear errors in small batches and make lint blocking. Current `continue-on-error` is advisory, not an enforced ratchet.

Make production deployment depend on the required successful checks or use a deliberate approved release trigger. Current independent main-push workflows do not establish this dependency. Do not push planning documentation to main without considering automatic deploy. Server files and SQL remain deliberate operator actions with recorded evidence.

Dependency work: identify reachable advisories, update compatible versions in small batches and remove unnecessary exports only with approval. A CSV-only export may avoid `xlsx` maintenance if users do not need workbooks; retain a maintained workbook solution only for a confirmed need. Tailwind major migration is not an automatic audit fix. Lockfile updates need fresh build/test verification.

## Folder audit and proposed destinations

The starting tracked tree has 18 files under docs, five under qa, three `.agent` files, root agent entry files/README/HTML/design proposal, source, server, public, build configuration and workflows. Untracked/ignored directories such as node_modules, dist and IDE state are not duplicate application work. Do not read or move `.env` or `config.php` for cleanup.

| Current location | Proposed action after approval |
|---|---|
| `src/` | Keep client source and UI here; no documentation dumping or component-library rewrite |
| `server/` | Keep PHP, schema, templates and server-only assets; move narrative README content into docs/API/DEPLOYMENT and update references |
| `public/` | Keep actual served images/robots/sitemap/metadata assets; generated content follows a documented build/publication path |
| `.github/` | Keep machine-consumed workflow configuration; gates reviewed separately |
| `.agent/` | Keep machine-consumed project/MCP contracts in expected locations; narrative CURRENT-TASK may become thin pointer only if router compatibility is verified |
| Root `AGENTS.md`, `CLAUDE.md`, `CODEX.md` | Retain minimal discoverable agent entry files, point to one canonical policy; do not remove tool entry points blindly |
| Root `README.md` | Keep a short discoverable project introduction and links to docs. This is a deliberate convention exception to “all md in docs” |
| Root `DESIGN-SYSTEM.md` | Superseded proposal: search references, preserve necessary decision history, then approve retirement; no second active guide |
| `GAkinzOS.html` | Preserve historical brief in an appropriate docs source location after approval, or retire after verified feature register promotion; never keep it as competing active scope |
| `qa/*.md` | Move useful evidence/checklists to flat docs filenames, update all rule and source links, retain dated methods/results |
| `docs/adoption/*` | Merge still-useful conclusions into GEE-OS/DECISIONS/STATUS; proposal files not active instructions; retire only after reference/evidence check |
| `docs/design/CONTENT-BRIEF.md` | Merge current content requirements into canonical PRODUCT-SPEC/DESIGN-SYSTEM; remove historical contradictions after approval |
| `docs/design/.../direction-approved.md` | Preserve relevant approval evidence in DECISIONS and implemented design guide; retire duplicate proposal only after review |
| `docs/superpowers/specs/...` | Extract durable decisions/requirements/evidence into canonical docs; record relaunch as historical completed local work |
| `docs/Plans 2026/` | Temporary review folder for this plan; promote approved sections, verify, then delete only with explicit authority |
| `node_modules`, `dist`, `.idea`, local env and uploads | Leave in proper generated/private locations and ignored state; do not move secrets into docs or Git |

Proposed flat docs set: PRODUCT-SPEC, ARCHITECTURE, API-SPEC, DATA-MODEL, DESIGN-SYSTEM, SECURITY, OPERATIONS, DEPLOYMENT, STATUS, DECISIONS, KNOWN-ISSUES, GEE-OS and the five moved QA records. Combine documents only when their responsibilities genuinely overlap. For example, performance/accessibility evidence can remain separate flat files with dates, not repeated claims copied into every specification. Marketing/social operating guidance can occupy one new `CONTENT-AND-GROWTH.md` after approval if the owner will use it.

Root README and tool-required Markdown entry points need an explicit owner decision: retain thin conventional pointers, as recommended, or verify each tool still discovers instructions after relocation. Most prose can live in docs while code/configuration remains where tools expect it. This avoids breaking the build or agent discovery to satisfy a cosmetic file rule.

## Worktrees and merges

Local evidence: one worktree, main at `c57eb4a`, no local feature branches. Relaunch is already merged via `f67f05b`. There is nothing to merge or remove locally based on the audit. Cached origin refs do not prove the current GitHub inventory. Further remote/other-machine review can be authorised separately.

Before any future removal, check exact worktree path, branch/ref, worktree status, untracked content and whether commits are reachable from approved main. A clean branch is not automatically obsolete. Preserve unique changes and env safety. Use ordinary reviewed merges, never force-push shared history. Deletion requires a named target and explicit approval.

## Approval to canonical documents

1. Record approved sections and unresolved choices in one dated approval record.
2. Update PRODUCT-SPEC to the owner/client product, making the original mega-feature brief historical.
3. Update CURRENT-TASK/PROJECT with the new scope and actual merged state, while keeping no-production-without-approval limits.
4. Update DESIGN-SYSTEM, API/DATA/ARCHITECTURE only where approved design or implementation changes their facts.
5. Add dated DECISIONS for navigation, branding, content authority, payment policy and scope exclusions. Keep STATUS and KNOWN-ISSUES factual.
6. Update release/test/operations evidence and manual server requirements as implementation occurs.
7. Correct the stale facts listed in document 01 (A28): `CLAUDE.md`, `AGENTS.md`, `server/README.md`, `docs/SECURITY.md`, `docs/KNOWN-ISSUES.md`, `.agent/CURRENT-TASK.md` and the workflow name in `.agent/PROJECT.yml`. Simplify agent entry files to one authority, update links and check discovery. Verified on 10 October 2026: the project `.claude/` folder has no hooks, agents or rules (only `launch.json` and `settings.local.json`), so project-level reshaping is limited to the Markdown entry files and `.agent/`. Changes to global GEE OS files or `~/.claude` rules and hooks are a separate approval; no new hook framework.
8. Update the two project memories in the Claude project memory folder. Rewrite `gakinz-public-design-direction` to record the 10 October decision: the full Mastercard-inspired system with the substitutions in document 03, replacing the September palette and the "no borrowed design language" rule, while keeping its evidence rule (no unsourced claim, no invented client or metric). `gakinzos-is-not-a-website-builder` stays as it is; it already matches this plan, though its "24 modules" count should be checked at the time. Add matching dated entries to `docs/DECISIONS.md`: design system change, six services, GAkinz-led naming, navigation, payment provider policy and scope exclusions. No client data goes into memories.
9. Search all old paths/contradictions, validate links and required tool/config entry points, run appropriate gates and review the diff.
10. Delete this temporary plan folder only after approved material is preserved, traceable and checked, and deletion is explicitly authorised. Git retains history; do not leave duplicate active specifications.

## Research references used

Research was confined to public authoritative material, not business accounts. Vite documentation was queried through Context7 first. Other sources are standards/provider/regulator guidance. Read dates: 10 October 2026; recheck before implementation.

- [OWASP ASVS 5.0](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en): scoped verification for authentication, authorisation, file handling and logging; no claim of certification.
- [Stripe fulfilment](https://docs.stripe.com/checkout/fulfillment): repeat/concurrent delivery, payment status, webhooks and delayed payments inform the payment test plan.
- [PayPal capture definitions](https://developer.paypal.com/sdk/orders/v2/definitions/capture/): returned payment identifiers/amount/currency inform reconciliation tests.
- [ICO small organisation privacy/cookie guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/cookies-and-privacy-notices-in-detail/): factual notices and processing review.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum): responsive and keyboard acceptance.
- [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals): performance targets, distinct from observed local results.
- [Vite static deployment](https://vite.dev/guide/static-deploy.html): build/preview deployment boundary, queried through Context7.

Monetisation and social references are placed beside their relevant claims in document 04. Suggestions about content frequency, navigation and channel priority are recommendations for a sole owner, not platform requirements or proven revenue strategies.

## Customer journey release boundary

The requirements and synthetic acceptance scenarios in [document 08](08-CLIENT-JOURNEYS-AND-ACCEPTANCE.md) are part of phases 1-3. Launch does not require every optional historical module, AdSense approval or a social posting integration. It does require safe enquiry intake, owner follow-up, simple booking requests, accurate quotes/invoices, scoped customer access and messages, recoverable records and honest public content. Customer reference access cannot ship until the authentication and ownership gates pass.
