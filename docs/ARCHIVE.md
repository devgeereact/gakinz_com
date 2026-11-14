# Archive

Superseded documents, kept whole so nothing is lost. Newest first. A document lands here only when its still-true content has
moved to its proper home (named in each section). Older text is also in git history.

## 2026-11-14 · `docs/WORKBOOK.md` retired (house standard, branch `chore/house-standard`)

The Workbook was a fourth record beside `.agent/CURRENT-TASK.md`, `docs/ROADMAP.md` and `docs/CHANGELOG.md`. Where each part went:
the release log (its section 1) is the "Release log" section of `docs/CHANGELOG.md`; the standing rules (section 4) are in
`AGENTS.md`; what is left (section 3) is `docs/ROADMAP.md` ("Needs the owner" and "Parking lot"); the rest is below as it stood
on 2026-11-13 (last written 2026-11-01, with notes added up to V1.2).

#### 2. In progress

**V1.2 run, 2026-11-11 (released as `ea6164c` on 2026-11-13, D-065, D-066 and D-067).** Public-site trust: five open items ticked in `docs/ROADMAP.md`, live checks 20 of 20 after the release. Nothing is in progress; what is open is the owner's (autofill pass on the contact form, a look at Clerk's cookie names on `/app`, the adviser's review of the cookie wording, the decision on redirecting the two retired article URLs, V1 items 4 and 10) or a V1.3 scope.

**V1.1 run, 2026-11-11 (released as `ed5a724` with Tailwind v4 and pnpm, D-063 and D-064).** Five items from the parking lot, all ticked in `docs/ROADMAP.md`: layout tests for every public page and CMS screen, Today for deletion requests and failed alerts, lint as the gate. The nine GSD phases are mapped onto versions in `docs/ROADMAP.md`; V1.2 (rest of Phase 8) was released on 2026-11-13; V2 (rest of Phase 9) is planned, not started.

**Finish-line run, 2026-11-10 (released as `4bdaed7`, PR #32, D-060 and D-061).** `docs/ROADMAP.md` freezes V1 at ten items; seven are ticked with evidence and three wait for the owner (business facts, the restore of the host's copy and recovery targets, retention periods). New in the branch: an email to `$OWNER_ALERTS` when an enquiry or a data deletion request arrives, a per-job scheduled-jobs notice on Today, `pnpm run test:browser`, `check:facts`, `drill:restore`, and a compacted KNOWN-ISSUES. Also done on the host the same day: `$OWNER_ALERTS` set, a daily backup job, and the first GAkinz cron entries (`docs/OPERATIONS.md` 2.1 and 5); the public phone number is live.

The current task is [CURRENT-TASK.md](../.agent/CURRENT-TASK.md). Phase 7 (daily-flow speed-ups, D-059) was released as `825600e`; nothing else is in progress. Open: the host has no GAkinz cron entry (K-145), an owner decision. Phase 5 (retire the legacy sign-in, D-057) was released as `ed58064`; nothing else is in progress.

#### 3. What is left

##### 3a. Engineering (no owner needed)

1. ~~**Lint, K-002.**~~ Done 2026-11-11 (V1.1 item 5): 0 errors; CI and `release.json` run `pnpm run lint`; the ratchet script is gone.
2. **Analytics shows zero for a single failed source** (K-031 follow-up): decide whether each KPI
   should say "unavailable" instead.
3. **Demo status in the CMS.** A Work record can only be Live or In build; add a demo flag to
   `server/work.php` and the Work screen before Priya's Kitchen, Dhemmyn Food and Okafor Joinery
   are published from the CMS.
4. **Buildable leftovers:** K-072, K-074, K-077, K-078, K-083, K-020
   strict tsc configs.
5. **Design questions J1 and J2** ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) section 6), and the
   Safari and phone checks of the live design.
6. **Run the server suite on MySQL before merging** server or schema work: the Mac runs MariaDB
   and CI runs MySQL (K-111).
7. **Go-live leftovers (2026-11-02, `docs/AUDIT.md`):** enforce the app-shell CSP once Clerk is seen under the
   Report-Only one (K-033); the ESLint 10 major for the last 13 moderate advisories (K-041); the home-page H1 read
   twice by crawlers (needs the owner's OK); move the session token out of `localStorage` (K-033).

##### 3b. Owner actions, in order

0. **Go-live: done 2026-11-08.** The `totp_enabled` query (0 accounts), `server/.htaccess`, the section 5 list
   (stub, `CLERK_CACHE_DIR`, CORS entry, `$MAIL_VERIFY_TLS`) and K-123 (closed by a probe) are finished; `ae01cec` and
   `983606c` are released. Still yours: set a monthly limit on the OpenRouter key; consider Cloudflare Authenticated
   Origin Pulls (optional); check `clients.email` for line breaks (K-120); the SEO copy list in `docs/AUDIT.md`; the Rich
   Results Test on `/` and one service page.

1. **Safety.** Restore one backup somewhere isolated and agree recovery targets (K-010); record
   the live database engine (K-099); delete the Clerk user for `dev@gakinz.com` in the Clerk
   dashboard; rename the `TEST owner` users row; watch K-110.
2. **Stripe:** check past payments against their VAT-inclusive totals (K-025).
3. **Test on real data** (K-044, K-055): sign-in per role, Enquiries drag and drop, Site content
   publish, Work hero, portal, PDFs ([DEPLOYMENT.md](DEPLOYMENT.md) section 5.6).
4. **Publish content:** Work records with consent stored, Site content, and Site content >
   Services opened once and saved (K-093).
5. **Business facts** still shown as labelled placeholders: [STATUS.md](STATUS.md) section 5.
6. **Adviser sign-offs:** anonymisation rules (K-108), retention periods (K-062), legal pages
   (K-021), lawful bases.
7. **Switch-on decisions** for features that ship off: the ad pilot (K-104 to K-107), client anonymisation.

##### 3c. Not tested or unverified

- Signed-in journeys on the live host for every role, uploads, cron under cPanel, PHP and
  database time zones (K-067, K-075, K-085), the real client IP behind Cloudflare (K-101, K-102).
- Browser runs of ad slots, contract and invoice PDFs.
- Real assistive technology on the public site and the CMS.
- The motion on real devices, Safari and trackpads.

##### 3d. Highest risks

K-010 backup never restored outside a drill, K-062 no retention periods, K-021 and K-063 legal
placeholders, K-025 past Stripe charges ex-VAT, K-044 nothing tested on real data by an agent.
The full list: [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

#### 4. Standing rules

- **GAkinzOS is not a website builder.** It runs the studio: leads, clients, invoices, files,
  support, time and content. A new module gets one record type and a plain form.
- **No claim without evidence.** Never invent a client name, metric, portrait or certification.
  `server/work.php` refuses a named client without stored written consent.
- **Missing owner facts become labelled placeholders** (the `.gap` marker). Never guess.
- **Design:** the project skill `.claude/skills/gakinz-design/` and
  [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). No Mastercard name, logo, colour pair or circles.
- **Motion** is enhancement only: content visible without JavaScript, reduced motion honoured
  (D-051, `.rise`).
- **Security:** `access.ts` hides navigation only; every endpoint calls `require_auth`. A
  `client` caller never sees another client's data. No credential in any tracked file.
- **Development calls the live API.** Never send a real email or take a real payment to test.
- **Merging is deploying.** A push to `main` with code changes releases; agents merge and push
  only with the owner's approval for that action.

#### 5. How to work

1. **One branch per concern, short-lived**, merged once checked and approved.
2. **Small batches with a gate:** build, unit and server tests, lint, docs check, and a
   browser run for anything visible; then the owner decides on the release.
3. **Evidence over summaries.** Report command output, not an agent's word.
4. **Keep the code graph current.** `graphify-out/` (untracked) is rebuilt by git hooks after
   each commit; run `/graphify --update` after a documentation batch.

#### 6. Where the detail lives

| Need | Document |
|---|---|
| Counts and owner inputs | [STATUS.md](STATUS.md) |
| Every open problem | [KNOWN-ISSUES.md](KNOWN-ISSUES.md) |
| Release, hand-applied SQL and configuration | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Audits and release checks | [AUDIT.md](AUDIT.md) |
| Why things are the way they are | [DECISIONS.md](DECISIONS.md) |
| Scope | [PRODUCT-SPEC.md](PRODUCT-SPEC.md) |
| Current agent task and the handoff log | [CURRENT-TASK.md](../.agent/CURRENT-TASK.md), [HANDOFF.md](../.agent/HANDOFF.md) |

## 2026-11-14 · `docs/GEE-OS.md` retired (house standard, branch `chore/house-standard`)

The GEE OS adoption record. `AGENTS.md` and `.agent/PROJECT.yml` carry the live contract; the documentation profile table below
records decision D-044 as it stood. Two rows are out of date: `CHANGELOG.md` now exists (`docs/CHANGELOG.md`), and `docs/TEST-PLAN.md`
has moved into `docs/VERIFICATION.md`. `CODEX.md` was deleted the same day.


- Project: GAkinz, `gakinz.com`
- Minimum GEE OS version: 0.5.0
- Adoption stage: Active shared contract
- Default mode: Existing application
- Lifecycle: Maintenance
- Risk: Production

#### Purpose

Give Claude Code, Codex and compatible agents one shared route while keeping GAkinz product facts, production boundaries and verification rules inside this repository.

#### Entry points

| Agent or concern | Source |
|---|---|
| Shared authority | `AGENTS.md` |
| Claude mapping | `CLAUDE.md` |
| Codex mapping | `CODEX.md` |
| Project route and risk | `.agent/PROJECT.yml` |
| Current task | `.agent/CURRENT-TASK.md` |
| MCP authority | `.agent/MCP-PROFILE.yml` |
| Shared constitution and loop | `~/.agents/gee-os` |

#### Project sources of truth

The detailed map is in `AGENTS.md` and `.agent/PROJECT.yml`. Product scope lives in `docs/PRODUCT-SPEC.md`. Routes, API boundaries, permissions and deployment facts must be checked against the named code and operations documents before they are treated as current.

#### Documentation profile

The repository follows the GEE OS "Standard application" profile, with these recorded
differences (D-044):

| Profile file | Here | Reason |
|---|---|---|
| Root `KNOWN-ISSUES.md` | `docs/KNOWN-ISSUES.md` | Kept with the other flat docs; every reference already points there |
| `CHANGELOG.md` | N/A | Commit history, `docs/STATUS.md` and `docs/DECISIONS.md` already record change; a fourth record would drift |
| `docs/UX-SPEC.md` | N/A | Journeys and screen requirements are in `docs/PRODUCT-SPEC.md`; screen patterns in `docs/DESIGN-SYSTEM.md` section 10.6 |
| `docs/ACCESSIBILITY.md` | N/A | Requirements in `docs/DESIGN-SYSTEM.md` section 10.7; evidence in `docs/AUDIT.md` |
| `docs/NOTIFICATIONS-SPEC.md` | N/A | One notification route, specified in `docs/PRODUCT-SPEC.md` section 6.2 |
| `qa/FUNCTIONAL-AUDIT.md`, `qa/REGRESSION-AUDIT.md` | `docs/TEST-PLAN.md` | One test record: suites, gaps and the J01 to J12 acceptance scenarios |
| `qa/LAUNCH-CHECKLIST.md` | `docs/AUDIT.md` | Same purpose; launch gates in `docs/OPERATIONS.md` section 9 |
| Not in the profile | `docs/OPERATIONS.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/GEE-OS.md`, `docs/CONTENT-AND-GROWTH.md`, `CODEX.md`, `server/README.md` | Operations, current state, decisions, this route, the content policy, the Codex entry point, and the server folder's own guide |

#### Boundaries

- No production deploy, database change, DNS change, payment, email send or other live mutation without explicit authority in the current request.
- MCP and skill availability does not grant permission.
- Development calls the live API, so test writes require the same care as production writes.
- Record decisions, unresolved problems and manual deployment steps in their existing canonical documents.
- Report PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED or BLOCKED with evidence.

#### Maintenance

Update this file only when the GEE route changes. Update project facts in their canonical documents rather than duplicating them here, as `AGENTS.md`, "Keeping documents current", sets out; `npm run docs:check` checks links and the server-to-document rule in CI.
