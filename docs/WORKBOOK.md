# Workbook

The one page to work from. It gathers the state of the project, what is left, the standing
rules from agent memory, and the order of work, in one place. It points to the detailed
documents rather than copying them; when this page and a linked document disagree, the linked
document wins and this page is wrong.

**As at:** 2026-10-21, branch `feat/journeys-2026-10-18` (PR #21), pushed. The landing-motion
branch was folded into it and deleted. Read this first, then only the linked section you need.

## 1. Where things stand

**Deployed 2026-10-21 to 2026-10-22.** The whole stack is merged and live. PR #21 was
retargeted to `main` and merged as `3fc6a31`, which carries #8, `feat/redesign-2026` and #20 with
it. PR #20 (base `feat/redesign-2026`) and #19 stay open and can be closed.

What was done, in order, from the Mac over `ssh cpanel`:

1. Backup to `~/private_backups/gakinz.com-predeploy-20261021-160114/` on the host:
   `docroot.tar.gz` (the whole `~/gakinz.com` docroot) and `db.sql.gz` (a full dump, 33 tables).
   This is the rollback point (DEPLOYMENT.md section 6).
2. K-015 check: no `seed_admin_password.txt` in the docroot. Live PHP is 8.4.26 (K-082).
3. The schema in the dump showed SQL 1 to 4 already applied and SQL 5 to 19 not.
4. Every file under `server/` except `README.md`, `schema.sql` and `config.php.example` was
   uploaded in the order of DEPLOYMENT.md 5.1 step 13 (`.htaccess`, the includes, the
   endpoints, then `_bootstrap.php`, `auth.php`, `oauth.php` and `users.php` together). No file
   was deleted, and `config.php` and `uploads/` were not touched.
5. SQL 5 to 18, then SQL 19, ran through a one-off runner that loads the live `config.php`, so
   no credential left the server. Afterwards no enquiry or project has a null `reference`, both
   anchor rows exist in `reference_counters`, and `files.client_visible`,
   `users.totp_last_step` and `work.hero_order` exist.
6. **GitHub Actions did not run.** No run exists for `3fc6a31`, and none since 2026-10-10 on
   any branch or PR. Cause found 2026-10-30: the repository's Actions permission is `enabled: false`
   (`gh api`), and the repository was private at that point; the owner made it public on 2026-10-30 (K-109). So `dist/` was built on the Mac from a tree identical to `origin/main` (`npm run
   build`, 32 prerendered pages) and uploaded with `rsync` (no `--delete`; 150 new files, 6
   changed, nothing removed). The FTP deploy's `.ftp-deploy-sync-state.json` on the host is
   now stale. The deploy step was replaced on 2026-10-30 by `scripts/deploy-ftps.sh`, which does not
   use that file and never deletes (K-109).

**Live check, 2026-10-22 07:00 UTC** (unauthenticated GET requests): every endpoint answers
JSON (`site`, `today`, `search`, `briefs`, `privacy`, `assets`, `bookings`, `feedback`,
`client_access`, `auth`, `files`, `work`, `portal`, `support`, `api`). `api.php` answers
`{"ok":true,"db":true}`. `index.html` is dated 2026-10-22 and `/`, `/services`, `/work`,
`/pricing`, `/privacy`, `/terms`, `/cookies` and `/app/login` answer 200, with the CMS scripts
loading. `site.php?action=get` answers `{}` and `work.php?action=hero` answers `[]`, as
expected before any content is published. Signed-in journeys are NOT TESTED on the live host.

**Re-check, 2026-10-22 12:20 (Mac, after consolidation to one branch).** A fresh `npm run build`
of `main` was compared with the docroot by `rsync -rcn` (checksums, dry run): zero differences,
so the live `dist/` is byte-identical to the build of `main` and no upload was needed. The live
home page loads `assets/index-BUGis-UK.js`, the same file as `dist/index.html`. `/`,
`/services`, `/work`, `/pricing`, `/privacy`, `/terms`, `/cookies`, `/app/login`, `api.php` and
`site.php?action=get` answer 200, `api.php` reports `db:true`, and a missing `.php` answers 404.
In a browser the home page logs no console error. `/app/login` logs one 404 for
`client_access.php?action=status`, which is the designed answer while
`$REFERENCE_SIGNIN_ENABLED` is off (D-050), plus React Router's `HydrateFallback` warning.
Local: `npm run test:server` PASS (519 tests, local MariaDB), `npm test` PASS (540),
`npm run typecheck` PASS, `npm run lint:ratchet` PASS (5 of 5), `npm ci` PASS. Signed-in
journeys remain NOT TESTED on the live host.

Owner actions left: K-025 Stripe VAT reconciliation; publish Work records and Site content
(DEPLOYMENT.md 5.1 step 7); open Site content > Services once and save (K-093); revoke the old
super-admin's sessions (K-001); find out why Actions stopped running. Gated features stay off
(D-050): `$RETENTION_APPLY`, `$REFERENCE_SIGNIN_ENABLED`, `$CLIENT_ANONYMISE_ENABLED`, PayPal.

Last measured on the Mac (2026-10-21): `npm test` 540 PASS, build with 32 prerendered pages
PASS, `php -l` on every server file PASS.

## 2. Done (on branches, not live)

| Batch | Where | What |
|---|---|---|
| Batch 1 and PRs #9 to #18 | #8 | VAT-correct Stripe, 2FA bypass fixes, quote acceptance, navigation, My account, follow-ups, portal messages |
| D-046 redesign | `feat/redesign-2026` | Public site rebuilt, CMS restyled, Work hero, Site content, `site.php` |
| Readiness audit | #20 | Security, privacy and public-site fixes, hashed sign-in tokens, SQL 12, labelled owner placeholders |
| Journeys 1 to 6 | #21 | Payments, acceptance evidence, portal requests, ICS, Today, search, briefs, privacy export, ticket time, shared files, templates, service pages, work references, deletion tooling, reference sign-in and ads (both off), client anonymisation (off). SQL 13 to 19 |
| Lint, groups A to C | #21 | `useLoad` hook, 22 screens and the sign-in page moved off set-state-in-effect; ratchet 33 to 5; thrown Dashboard and Analytics loads show unavailable (K-031) |
| Landing motion, footer, project status | #21 | GSAP and Lenis scroll polish on the public site (D-051) |

Detail per batch: [STATUS sections 0.2 to 0.4](STATUS.md) and the ledger in
[CURRENT-TASK](../.agent/CURRENT-TASK.md).

## 3. What is left

### 3a. Engineering (no owner needed)

1. **Lint, K-002.** Groups A to C are done (5 errors left). Last are Contracts, Portal
   (security review first: its effect handles which client's data a `client` caller sees) and
   the theme toggle. Then replace `lint:ratchet` with `lint` in CI and close K-002.
2. **Analytics shows zero for a single failed source.** A thrown load now marks every source
   unavailable (K-031, fixed 2026-10-21), but when one request fails Analytics still computes
   its KPIs from the rest and shows zero for the missing part, under a "Showing what loaded"
   banner. Decide whether each KPI should say "unavailable" instead.
3. **Demo status in the CMS.** On 2026-10-21 the owner confirmed RitaGreen, Harni, MimmyCare
   and Volume are live, and Priya's Kitchen, Dhemmyn Food and Okafor Joinery are demos. The
   built-in project list now says so, but a Work record from the CMS can only be "Live" (it
   has a live address) or "In build". Add a demo flag to `server/work.php` and the Work
   screen before those three are published from the CMS, or they will show as "In build".
4. **Buildable leftovers:** K-069, K-072, K-074, K-077, K-078, K-083, K-061 certificate IDs,
   K-020 strict tsc configs.
5. **Measure the current public site.** Accessibility and performance were last measured
   before D-046; run Lighthouse and axe on the built preview, including the new motion.
6. **Housekeeping:** done 2026-10-21 for branches, worktrees and the old stash (all
   already contained in `feat/journeys-2026-10-18`). Still open: track the task plan in git
   (`.superpowers/` is excluded, so Tasks 27 to 30 exist only on the Mac).

### 3b. Owner actions, in order

1. **Safety first.** Confirm sessions were revoked after the K-001 rotation; delete the seed
   password file from the server (K-015); record the live state (K-006), PHP version (K-082)
   and database engine (K-099); restore one backup and agree recovery targets (K-010).
2. **Upload and SQL**, in the single ordered list in
   [DEPLOYMENT section 5.1 step 13](DEPLOYMENT.md): `.htaccess`, the includes, `_uploads.php`
   before `files.php`, the readiness set together, SQL 1 to 19 in order (SQL 19 after all the
   PHP), `client_access.php` switched off, the Stripe VAT check (K-025), then the section 5.6
   checks. Keep `$RETENTION_APPLY = false`.
3. **Test on real data** (K-044, K-055): sign-in, Enquiries drag and drop, Site content
   publish, Work hero, portal, PDFs.
4. **Merge in order:** #8, then the redesign (it needs a PR), then #20, then #21. Merging
   deploys `dist/`. Decide PR #19. Agents do not merge.
5. **Business facts** still parked as labelled placeholders: trading identity, VAT, prices
   and IT prices, coverage and area (K-090), exclusions (K-092), budget bands (K-091), payment
   schedule, terms, contact details, retention periods (K-062), deletion requests (K-095).
   List: [STATUS section 5](STATUS.md).
6. **Adviser sign-offs:** anonymisation rules (K-108), retention periods, legal pages (K-021),
   lawful bases.
7. **Switch-on decisions** for features that ship off: reference sign-in (D-050 and the four
   gates in DEPLOYMENT section 5.4), the ad pilot (K-104 to K-107), client anonymisation.

### 3c. Not tested or unverified

- Everything on the live host: real data, real sign-in, uploads, cron under cPanel, PHP and
  database time zones (K-067, K-075, K-085), real client IP (K-101, K-102).
- Browser runs of reference sign-in, ad slots, contract and invoice PDFs, the draft guard on
  Back and tab close.
- Real assistive technology and the CMS for accessibility.
- The new motion on real devices, Safari and trackpads.

### 3d. Highest risks

K-001 leaked credential (sessions unconfirmed), K-015 seed file on server, K-006 unknown live
state, K-010 no known backup, K-062 no retention periods, K-021 and K-063 legal placeholders,
K-025 past Stripe charges ex-VAT, K-044 nothing tested on real data. 57 of 108 K items are open
or partly open: [KNOWN-ISSUES](KNOWN-ISSUES.md).

## 4. Standing rules (from agent memory)

- **GAkinzOS is not a website builder.** It runs the studio: leads, clients, invoices, files,
  support, time and content. A new module gets one record type and a plain form. No canvas,
  block editor, live preview or page composition.
- **No claim without evidence.** Never invent a client name, metric, portrait or
  certification. `server/work.php` refuses a named client without stored written consent.
- **Missing owner facts become labelled placeholders** such as `[email provider to supply]`
  (rendered as the `.gap` marker). Keep working; never guess; swap only for a value the owner
  gave.
- **Design:** the public site is the D-046 graphite design in `src/marketing/site.css`; the
  CMS follows `src/index.css`. The D-037 Mastercard system is superseded and kept as record.
  Never use Mastercard's logo colours or circles.
- **Motion** is enhancement only: content visible without JavaScript, reduced motion honoured
  (D-051, `.rise`).
- **Security:** `access.ts` hides navigation only; every endpoint calls `require_auth`. A
  `client` caller never sees another client's data. No credential in any tracked file.
- **Development calls the live API.** Never send a real email or take a real payment to test.

## 5. How to work better

1. **Shrink the stack before adding to it.** Five unmerged levels make every review harder and
   every fix travel further. Get #8 tested and merged first; new feature work waits until at
   least #8 and the redesign are in `main`.
2. **One page for status.** Update this workbook and the counts in STATUS section 0. Batch
   reports go into STATUS only; CLAUDE.md and CURRENT-TASK point here and no longer repeat
   them (consolidated 2026-10-21).
3. **Owner sessions, not owner interruptions.** Work through 3b in one sitting per step, with
   the checklist open, and record the outcome here.
4. **Small batches with a gate.** Each batch ends with tests, build, docs check and a browser
   run, then a push. Push the same day (nine commits sat unpushed until 2026-10-21).
5. **Evidence over summaries.** Report command output, not an agent's word.
6. **Keep the code graph current.** `graphify-out/` (untracked, local to each computer) holds
   the knowledge graph used by the `graphify` MCP. Git hooks installed with `graphify hook
   install` rebuild the code part after every commit, checkout, merge and rebase. Document
   changes are not picked up by the hooks: run `/graphify --update` after a documentation
   batch. Rebuilt in full on 2026-10-21 (2,928 nodes, 7,725 edges, 167 communities; the 24
   images under `public/` were left out).

## 6. Where the detail lives

| Need | Document |
|---|---|
| Counts and batch history | [STATUS.md](STATUS.md) |
| Every open problem | [KNOWN-ISSUES.md](KNOWN-ISSUES.md) |
| Upload list, SQL order, checks | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Why things are the way they are | [DECISIONS.md](DECISIONS.md) |
| Scope | [PRODUCT-SPEC.md](PRODUCT-SPEC.md) |
| Release steps | [RELEASE-CHECKLIST.md](AUDIT.md) |
| Current agent task | [CURRENT-TASK.md](../.agent/CURRENT-TASK.md) |
