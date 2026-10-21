# Workbook

The one page to work from. It gathers the state of the project, what is left, the standing
rules from agent memory, and the order of work, in one place. It points to the detailed
documents rather than copying them; when this page and a linked document disagree, the linked
document wins and this page is wrong.

**As at:** 2026-10-21, branch `feat/journeys-2026-10-18` (PR #21), pushed. The landing-motion
branch was folded into it and deleted. Read this first, then only the linked section you need.

## 1. Where things stand

Nothing since 2026-10-10 is merged, uploaded or deployed. `main` is still `c57eb4a`. All the
work sits on one stack of branches, about 416 commits ahead of `main`:

`main` ← #8 `feat/plan-2026-batch-1` ← `feat/redesign-2026` (no PR) ← #20 `audit/readiness-2026-10-17` ← #21 `feat/journeys-2026-10-18`

PR #19 `design/hero-nav-footer-demo` targets #8 and sits outside the stack.

Last measured on the Mac (2026-10-21, this branch): `npm test` 540 PASS, build with 32
prerendered pages PASS, `tsc -b` PASS, `npm run docs:check` PASS, lint ratchet 5 errors and 0
warnings (`npm run lint` still fails, K-002). `npm run test:server` last ran at `468b884`: 519
PASS. Counts and their history: [STATUS section 0](STATUS.md).

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
| Release steps | [RELEASE-CHECKLIST.md](../qa/RELEASE-CHECKLIST.md) |
| Current agent task | [CURRENT-TASK.md](../.agent/CURRENT-TASK.md) |
