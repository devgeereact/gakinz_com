# Workbook

The one page to work from: where things stand, what is left and in what order, and the standing
rules. It points to the detailed documents rather than copying them; when this page and a linked
document disagree, the linked document wins and this page is wrong.

**As at:** 2026-11-01. `main` is the only long-lived branch; the earlier record of this page is
`git show ee1281f:docs/WORKBOOK.md`.

## 1. Where things stand

**Live.** gakinz.com runs the build of `main`. Releases since the stack was merged (`3fc6a31`,
2026-10-21):

| Date | Commit | What | How |
|---|---|---|---|
| 2026-10-21 to 22 | `3fc6a31` | The whole branch stack: server files, SQL 5 to 19, `dist/` | By hand over SSH, `rsync` (Actions was off) |
| 2026-10-30 | `a034e40` | Clerk sign-in (D-052), SQL 20, the old super-admin retired | By hand over SSH, owner-approved |
| 2026-10-30 | `608dc7b` | Actions back on (K-109); no-delete upload | GitHub Actions |
| 2026-10-30 | `560949d` onwards | Releases over SSH through `scripts/release.mjs` | GitHub Actions on push to `main` |
| 2026-10-31 | `a907824` | The D-053 design finalisation | GitHub Actions, owner-approved |
| 2026-10-31 | `fdc5d94` | Clerk's grey footer panel removed | GitHub Actions, owner-approved |
| 2026-11-01 | `bde12c7` | Cleanup; AI on Anthropic first with OpenRouter as backup (D-054) | GitHub Actions, owner-approved ("push live") |

The checks of each release are in [AUDIT.md](AUDIT.md) (newest first). Measured counts are in
[STATUS.md](STATUS.md) section 0. Signed-in use of the live system is NOT TESTED by an agent; the
owner reports a working Clerk sign-in (2026-10-30).

Gated features ship switched off (D-050): `$RETENTION_APPLY`, `$REFERENCE_SIGNIN_ENABLED`,
`$CLIENT_ANONYMISE_ENABLED`, PayPal, the ad slots.

## 2. In progress

The current task is [CURRENT-TASK.md](../.agent/CURRENT-TASK.md).

## 3. What is left

### 3a. Engineering (no owner needed)

1. **Lint, K-002.** 5 errors left: Contracts, Portal (security review first: its effect decides
   which client's data a `client` caller sees) and the theme toggle. Then replace `lint:ratchet`
   with `lint` in CI and close K-002.
2. **Analytics shows zero for a single failed source** (K-031 follow-up): decide whether each KPI
   should say "unavailable" instead.
3. **Demo status in the CMS.** A Work record can only be Live or In build; add a demo flag to
   `server/work.php` and the Work screen before Priya's Kitchen, Dhemmyn Food and Okafor Joinery
   are published from the CMS.
4. **Buildable leftovers:** K-072, K-074, K-077, K-078, K-083, K-061 certificate IDs, K-020
   strict tsc configs.
5. **Design questions J1 and J2** ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) section 6), and the
   Safari and phone checks of the live design.
6. **Run the server suite on MySQL before merging** server or schema work: the Mac runs MariaDB
   and CI runs MySQL (K-111).
7. **Go-live audit leftovers (2026-11-01, `docs/AUDIT.md`):** the AI cap reservation (K-122); the two
   deferred audit units (`cron.php` billing race, `mail.php` IMAP certificate check); a report-only CSP
   from the draft in the audit (K-033); the home-page H1 read twice by crawlers (needs the owner's OK).

### 3b. Owner actions, in order

0. **Go-live (2026-11-01):** decide K-121 (Clerk and app two-factor; run the `totp_enabled` query first);
   read the host's client-IP trust setting and consider Authenticated Origin Pulls (K-123); after merging
   `golive/2026-11`, upload `server/.htaccess`, set `CLERK_CACHE_DIR` and compare the live stub (K-124,
   `docs/DEPLOYMENT.md` section 5); check `clients.email` for line breaks (K-120); the SEO copy list in
   `docs/AUDIT.md`; run the Rich Results Test on `/` and one service page after release.

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
7. **Switch-on decisions** for features that ship off: reference sign-in (D-050 and the gates in
   DEPLOYMENT section 5.4), the ad pilot (K-104 to K-107), client anonymisation.

### 3c. Not tested or unverified

- Signed-in journeys on the live host for every role, uploads, cron under cPanel, PHP and
  database time zones (K-067, K-075, K-085), the real client IP behind Cloudflare (K-101, K-102).
- Browser runs of reference sign-in, ad slots, contract and invoice PDFs.
- Real assistive technology on the public site and the CMS.
- The motion on real devices, Safari and trackpads.

### 3d. Highest risks

K-010 backup never restored outside a drill, K-062 no retention periods, K-021 and K-063 legal
placeholders, K-025 past Stripe charges ex-VAT, K-044 nothing tested on real data by an agent.
The full list: [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## 4. Standing rules

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

## 5. How to work

1. **One branch per concern, short-lived**, merged once checked and approved.
2. **Small batches with a gate:** build, unit and server tests, lint ratchet, docs check, and a
   browser run for anything visible; then the owner decides on the release.
3. **Evidence over summaries.** Report command output, not an agent's word.
4. **Keep the code graph current.** `graphify-out/` (untracked) is rebuilt by git hooks after
   each commit; run `/graphify --update` after a documentation batch.

## 6. Where the detail lives

| Need | Document |
|---|---|
| Counts and owner inputs | [STATUS.md](STATUS.md) |
| Every open problem | [KNOWN-ISSUES.md](KNOWN-ISSUES.md) |
| Release, hand-applied SQL and configuration | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Audits and release checks | [AUDIT.md](AUDIT.md) |
| Why things are the way they are | [DECISIONS.md](DECISIONS.md) |
| Scope | [PRODUCT-SPEC.md](PRODUCT-SPEC.md) |
| Current agent task and the handoff log | [CURRENT-TASK.md](../.agent/CURRENT-TASK.md), [HANDOFF.md](../.agent/HANDOFF.md) |
