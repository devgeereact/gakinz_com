# Handoff log

Finished sessions append a dated entry here, newest last. The task in progress is
[CURRENT-TASK.md](CURRENT-TASK.md). Entries before 2026-10-30 are in git history
(`git show ee1281f:.agent/CURRENT-TASK.md`).

## Handoff: Clerk sign-in (30 October 2026, branch `move/cpanel-clerk`, D-052)
Built and tested locally, not deployed: `server/_clerk.php`, `require_auth()` accepts a Clerk bearer, SQL 20 (`users.clerk_user_id`), `src/lib/clerk.ts`, `ClerkSession`, `ClerkLogin`, `RequireAuth` (Clerk guard; lazy route so the public bundle stays 198 KB), API client sends a Clerk token when no legacy token is held, lock screen off under Clerk. Clerk app "gakinz.com" (production instance on gakinz.com, DNS verified, email code only, test user gakinz101@gmail.com). Upload order: DEPLOYMENT.md section 5.1a.
Evidence: `npm run test:server` 527 passed (new `tests/server/clerk.test.ts`); `npm test` 545 passed; lint ratchet 5/5; build OK; docs:check PASS.
Open: removing password, 2FA, Google SSO, reset after the owner confirms; staff list for Clerk; the server may have other uploads pending (section 5).

## Read-only server comparison (30 October 2026)
Live server == `main` (63 PHP files identical, same app bundle, SQL 19 applied). Branch differs only by the Clerk change. Findings and the ordered release are in docs/DEPLOYMENT.md section 5.1a. Open: config.php mode 644; no backup found; one user (dev@gakinz.com) and the owner's test email needs a users row before the first Clerk sign-in.

## Clerk release done (30 October 2026, owner said go and confirmed the test email and dev@gakinz.com)
- Backup first: `~/gakinz_backups/gakinz_db_20261030_005611.sql.gz` (42 tables, "Dump completed"), `gakinz_files_20261030_005611.tar.gz`, `config.php.before-clerk`, `index.html.before-clerk`, `app-shell.html.before-clerk`. Restore not drilled.
- `config.php` 644 -> 600; added CLERK_ISSUER and CLERK_AUTHORIZED_PARTIES (linted, loads, connects).
- SQL 20 run (clerk_user_id + unique index). Uploaded `_clerk.php` then `_bootstrap.php` (PHP lints on server). Garbage bearer JWT -> 401; old `auth.php?action=me` unchanged.
- `dist/` built with the live public key, no secret keys; uploaded by `rsync -rc` (no --delete, `.DS_Store` excluded); re-run dry run shows 0 differences. Public pages 200; the home page has no Clerk mention; `/login` renders Clerk's email-only form (screenshot) with no sign-up link.
- Users: row 1 `dev@gakinz.com` (existing super_admin), row 2 `TEST owner` gakinz101@gmail.com super_admin, password hash `!` (no password sign-in). Clerk users exist for both (production). `sign_up_mode` set to restricted.
- NOT TESTED: an actual sign-in by the owner; client portal sign-in with Clerk. Magic-link and reference flows untouched.
- Rollback: restore `_bootstrap.php` from git `main` and the saved `index.html`/`app-shell.html` (old assets still on the server); column is harmless.
- TEST records to remove later: users row 2 and the Clerk user for gakinz101@gmail.com (six Founder TEST users exist across instances).

## Verification and first sign-in (30 October 2026, later the same day)
- Independent re-run on the Mac, nothing taken from the documents: `php -l` 65 files clean; `npm test` 545; `npm run test:server` 527 (own database `gakinz_verify_test`, ports 5309/5310, cleaned up); lint ratchet 5/5; `docs:check` PASS; `npm run build` OK, no secret key in `dist/`. Public URLs 200; `/server/_clerk.php` and `/server/config.php` 404.
- Clerk production `session` config read (read-only): `email` claim present, lifetime 60 s. So the first-sign-in link by email can work.
- Owner reports a real Clerk sign-in as gakinz101@gmail.com works (owner-reported, not observed by an agent). Recorded in `docs/STATUS.md` section 0.8 and D-052.
- Still NOT TESTED: client-role portal sign-in with Clerk; `dev@gakinz.com` sign-in; live `users` rows read directly; backup restore. `/config.php`, `/_clerk.php` and `/_bootstrap.php` return 403: the deliberate `FilesMatch` deny in `server/.htaccess` (K-013), not a fault. My first check of `/server/...` paths (404) tested paths that do not exist and proved nothing.

## Merged to main (30 October 2026, owner: "Approved Merge")
- `move/cpanel-clerk` pushed (`45d37a5..a034e40`), then `main` fast-forwarded `da4d558..a034e40` and pushed. `main` and origin/main are both `a034e40`. The branch still exists on origin (not deleted).
- No workflow ran: Actions is switched off on the repo (`enabled: false`, verified with `gh api`), recorded as K-109 with the FTP-Deploy-Action deletion caveat. Site still 200; the live site is unchanged, it already ran this build.
- Same day, owner said "Fix this now" about the open notes. Done: remote and local branch `move/cpanel-clerk` deleted (D-052 item 6); read-only `ssh cpanel` checks and a backup restore drill (PASS for the database, integrity-only for the files; `docs/STATUS.md` section 0.8); deploy step replaced by `scripts/deploy-ftps.sh` (no delete, PASS locally, NOT TESTED on the real host; K-109). Branch `fix/deploy-no-delete`, pushed, not merged.
- Findings: live `users` row 1 `dev@gakinz.com` is not linked to Clerk and still has a password; row 2 `gakinz101@gmail.com` is linked and is the only working Clerk sign-in. 0 clients live. `/config.php` 403 is the deliberate deny. The repository is private (the WORKBOOK said public).
- Owner then instructed (same day): Actions on (repository now public), only `gakinz101@gmail.com` as super_admin, merge and deploy, delete what is of no use. Done: backup `gakinz_db_20261030_094555_pre-user-removal.sql.gz` on the host, then `dev@gakinz.com` (users id 1) soft-deleted with its 32 session tokens removed (this also closes the K-001 session revocation); id 2 is the only active super_admin (`docs/STATUS.md` section 0.8). Seed file confirmed absent (K-015). Found K-110 (31 `mysqli not found` fatals at 13:25 to 13:26 UTC, none since, cause unverified).
- Not done: the Clerk user for `dev@gakinz.com` (no delete tool; remove it in the Clerk dashboard); a client-role live sign-in (no client exists, would need a production record; covered by `tests/server/clerk.test.ts`); renaming the `TEST owner` row.
- Waiting on the owner: how the remaining account's name should read; whether to remove password sign-in, add 2FA or Google.

## Merged and deployed (30 October 2026, owner: "go ahead")
- `main` is `608dc7b`, the only branch locally and on origin (`fix/deploy-no-delete` merged by fast-forward after CI passed on PR #23, then deleted). Actions is on (repository public).
- CI found and I fixed two things the Mac could not (MariaDB vs MySQL): SQL 20 as live statements (K-111) and a test reading past the SQL 19 block. First deploy failed on implicit TLS (port 990), changed nothing; fixed to explicit FTPS; second deploy passed. Live site checked from outside (K-109 result). The deploy no longer deletes remote files.
- Still open for the owner: delete the Clerk user for `dev@gakinz.com` in the Clerk dashboard (no tool for it); rename the `TEST owner` row; K-110 (the `mysqli not found` burst) if it recurs; whether to remove password sign-in or add 2FA/Google.
- Next session: the two-line CI lesson: run `npm run test:server` against MySQL (or rely on CI) before merging, because the Mac uses MariaDB.
- 30 Oct 2026: push to `main` deploys `dist/` and `server/*.php` over SSH (`deploy.yml` runs `scripts/release.mjs --go`); dry run showed the live server equal to `main`. FTP route removed; owner deletes FTP secrets and account.
- 30 Oct 2026: docs tidy: four `qa/` audits and the release checklist merged into `docs/AUDIT.md` (one audit file); `qa/TEST-PLAN.md` moved to `docs/`; references updated; docs:check PASS.

## Design finalisation released (31 October 2026, owner: "Yes Build it to Live now")
- `a907824` released through `deploy.yml` and `release.mjs`; `fdc5d94` removed Clerk's footer panel. Both CI runs exit 0. Checks before and after are in `docs/AUDIT.md` (2026-10-31).
- K-112 to K-116 and K-118 fixed; K-117 resolved by decision (Google sign-in stays on). The `gakinz-design` skill was added.
- Open: owner test of the signed-in CMS on real data (K-044); Safari and phone checks.

## Go-live audit (1 November 2026, branch `golive/2026-11`, local only)
- Security audit (quick profile, source only, 7 hunters, 1 critic, 4 verifiers): no confirmed Critical or High. Fixed K-120 (SMTP command injection through a client email) test-first. Left for the owner: K-121 (Clerk skips app two-factor: decision), K-123 (host client-IP trust). Recorded K-122 (AI cap) and K-124 (stub template added, `CLERK_CACHE_DIR`). 2 units deferred (cron billing race, IMAP certificate check).
- SEO: ProfessionalService, Service and BreadcrumbList schema; sitemap `lastmod` only where real; `.htaccess` asset cache and dotfile deny (hand-applied); copy list for the owner in `docs/AUDIT.md`.
- Evidence: `npm run verify` PASS before each commit; `npm test` 551; `npm run test:server` 541 (MariaDB 11.4); lint ratchet 5/5; `docs:check --base main` PASS.
- NOT TESTED: anything on the live server or Clerk; the live mail server; CI on MySQL for this branch; CrUX field data; Rich Results Test.

## Go-live hardening, second pass (1 to 2 November 2026, branch `golive/2026-11`, local only)
- Owner: "make the best call ... fix all". Calls recorded in D-055. Fixed test-first: K-121 (Clerk must prove a second factor), K-122 (AI cap counts attempts), contact JSON only, `dev.php`/`github.php` input, cron billing lock, bcrypt 12 with rehash, API headers (no `X-Powered-By`, CSP, `no-store`), `.htaccess` (CSP, HSTS, COOP, version headers, listing 404), `weather.php` retired, mail TLS switch (off), deps 0 critical / 0 high, gitleaks + Semgrep in CI, Node 24.22.1 pinned.
- Evidence: 8 commits each verified alone (`npm run verify`, rest stashed); `npm test` 556; `npm run test:server` 562 (MariaDB 11.4); Semgrep 0; gitleaks clean; `.htaccess` on a local Apache 2.4.67 plus headless Chromium, 64 of 64 page loads with no CSP violation.
- NOT TESTED: LiteSpeed; Clerk under the shell CSP; CI on GitHub; mail TLS; the live private config and stub.

## Handoff: Phase 1 release readiness (8 November 2026, branch `phase-1/release-readiness`)
Local only: not pushed, not deployed, no server or database change, no file deleted. Branch is `golive/2026-11` (13 unreleased commits) plus 3: `scripts/live-check.mjs` (read-only post-deploy checker; 14 tests written first and mutation-checked), `npm run check:live`, and the K-125 / task records.
Evidence: `npm test` 49 files, 570 passed; lint ratchet 5/5; `docs:check` PASS, and PASS with `--base main`; `npm run verify` "Verified: the checks and build pass and every file can be uploaded". `npm run test:server` 44 files, 562 passed (exit 0) on a throwaway local MariaDB 11.4.13 (own data directory, 127.0.0.1:3399, database `gakinz_phase1_test`, test-only user limited to `*_test`), stopped afterwards; the real database was not touched.
Finding: `npm run check:live` against production passes 9 of 16. Seven fail and all are the unreleased hardening: no CSP header, `X-Powered-By` on `/api.php`, no deny rules for `.md` and backup paths (the app shell answers 200 for them, not a real file), no `immutable` cache on the bundle, and a real directory listing on `/assets/` and `/uploads/` (K-125, raised to Medium; contents not read).
Open (all need the owner's approval): the K-121 two-factor query, push and CI, `.htaccess` and private config by hand with a backup, fast-forward `main`, then `npm run check:live` (16 of 16), AI keys. Incidental: the post-commit graphify hook warns it cannot find Python; commits are unaffected.

## Handoff: Phase 1 gated steps 1-2 done (8 November 2026, owner-approved: steps 1-3 of the list)
Done on the live host with the owner's approval: (1) read-only K-121 query, `id` and `role` only through the app bootstrap, no credentials read: 0 accounts with app two-factor, 1 active user. (2) `server/.htaccess` replaced after a backup at `~/backups/gakinz_com/htaccess.before-phase1.20261108T071024Z`; the live inline script hash was checked against the CSP first (match, the other two inline scripts are JSON-LD data); atomic rename; smoke 6 of 6; no temp file left. Result: `/assets/` and `/uploads/` answer 404, CSP and HSTS present, `X-Powered-By` gone, bundle `immutable`; `npm run check:live` 16 of 16.
Checker fix (test first, 19 tests): `/README.md` and `/config.php.bak` are not uploaded, so 403, 404 or the app page all pass and a different real file fails. A slip of mine: the first smoke loop had a zsh word-splitting bug after the swap; I re-ran the checks by hand immediately (all passed) and no restore was needed.
Not done, still needs the owner: fast-forward `main` (deploys) after CI, the private-config items, AI keys.

## Release: go-live branch to production (8 November 2026, owner-approved at each gate)
PR #24 (draft) CI green: server tests 12m51s, gitleaks + Semgrep, typecheck/lint/docs/unit/build. `main` fast-forwarded 3225e01 -> `ae01cec` (20 commits: 13 go-live + 7 readiness; the PR text said 6) and pushed; `deploy.yml` released `ae01cec` (20261108T171442Z), smoke checks passed. `npm run check:live` on production: 16 of 16, new bundle `index-BMBeNQHs.js` serving.
Not done: private-config items, AI keys, the signed-in console check for CSP reports. Rollback if needed: `npm run release -- --rollback --go`, and the previous `.htaccess` is at `~/backups/gakinz_com/htaccess.before-phase1.20261108T071024Z`.

## Hand-applied server items, AI model, browser check (8 November 2026, owner-approved)
Server (all with a backup in `~/backups/gakinz_com/`, edit as a copy, `php -l`, atomic swap, health check): private config `config.php` (`CLERK_CACHE_DIR`, localhost origin removed, `MAIL_VERIFY_TLS` true), the live stub (display_errors line), and `OR_MODEL` via `scripts/set-server-key.sh`. Evidence: Clerk key cache file created in the new folder; inbox opened read-only with certificate validation (count only); `/api.php` 200 and `/auth.php?action=me` 401 after each change.
K-123: one probe at the origin with forged headers recorded the real peer, so closed. It left one audit row (`login_failed`, `k123-probe-*@invalid.test`). AI: the key already existed (no key handled); Sonnet 5.5 answered a "ping" in 1.5 s. Branch `ai/openrouter-backup-model` adds the backup model (server suite 44 files, 566 passed on throwaway MariaDB, now stopped); not pushed, not released.
Browser: owner signed in (Google via Clerk) in the automation tab; `/app` loads as Super admin; 24 CMS screens, 0 CSP violations, 0 console errors. Correction: my first "no console messages" results were meaningless because the console tool cannot see CSP reports; I proved that with a deliberate violation and switched to an in-page `securitypolicyviolation` listener. Not covered: load-time violations on a full page load (a listener cannot be registered before load); resource origins on a full `/app` load were all `gakinz.com` or `clerk.gakinz.com`, both allowed. Mailbox screen skipped on purpose (email content).

## AI backup model released (8 November 2026, owner-approved full route)
PR #25 (draft) CI green (server tests 12m29s, gitleaks + Semgrep, build); `main` fast-forwarded 5495756 -> `983606c`; `deploy.yml` released it (smoke passed); `npm run check:live` 16 of 16 after. `OR_FALLBACK_MODEL=openai/gpt-oss-120b` set with `scripts/set-server-key.sh` (backup `~/backups/gakinz_com/config.php.20261108T212529Z.OR_FALLBACK_MODEL`). On the server: models tried in order Sonnet 5.5 then gpt-oss-120b; default answered in 1158 ms, backup in 520 ms, an invalid model returned null. Not tested live: a real default-model failure, because forcing one would need a config change; the fallback loop is covered by 4 server tests that fail without it.
Merged branches left in place (delete only on request): `golive/2026-11`, `phase-1/release-readiness`, `phase-1/record-release`, `ai/openrouter-backup-model`; PRs #24 and #25 are merged.

## Phase 2 documents aligned (8 November 2026, branch `phase-2/align-docs`, not pushed)
Checked against the files, git and the live site before editing: README (redesign is live, six services, commands table, release `983606c`), CLAUDE.md and AGENTS.md (a release sends `dist/` plus `server/` minus Markdown, `*.example` and `/uploads/`, never config, `.htaccess`, SQL or keys), STATUS (575 unit and 566 server tests, host PHP 8.4.27), WORKBOOK (releases `ae01cec` and `983606c`, go-live item done), AUDIT (2026-11-08 section), KNOWN-ISSUES K-127 to K-139, `.planning/` in `.gitignore`. Merged local branches deleted with `git branch -d`; remote branches `phase-1/release-readiness` and `ai/openrouter-backup-model` are merged and left in place.
Left for Phase 2, needing the owner: deploy waits for CI (K-138; a design choice with a risk of blocking releases), `release.mjs` `pnpm` text, workspace clean-up (nothing deleted yet).

## Release now waits for CI (8 November 2026, owner-approved)
`ci.yml` calls `deploy.yml` as its last job (`needs` verify, server, security, changes); `scripts/deploy-needed.mjs` keeps the docs-only skip (11 tests first, three mutations caught). PR #26 (draft): both new jobs skipped on a PR as designed. First push to main (`7457e5e`): only a CI run started; the release job began 3 s after the slowest check finished and uploaded nothing (0 changed, 0 new); `check:live` 16 of 16. `release.mjs` text now says `npm run release -- ...`. Remote branches `phase-1/release-readiness` and `ai/openrouter-backup-model` deleted (merged). `.superpowers/` NOT deleted: I had described it wrongly as brainstorm scratch; it holds the 2026-10-18 journeys plan and task briefs.
Rollback if the pipeline ever blocks releases: revert `7457e5e`, or release by hand with `npm run release -- --go`, or start Deploy from the Actions tab (workflow_dispatch).

## Phase 3 built on `phase-3/clerk-fixes` (8 November 2026, not pushed, not released)
Housekeeping first, as the owner decided: `.superpowers/` deleted (I had wrongly called it brainstorm files; it held the 2026-10-18 journeys plan and briefs; a copy is in the session scratchpad only), remote branch `ci/deploy-after-ci` deleted (merged).
Fixes, each test-first with mutations proven to fail: K-127 `files.download` (4 tests); K-128 `files.php share` keeps a link that has no expiry (3 server tests) plus `shareNotice` (3); K-140 `guardModel` (13), `ticketPanelModel` and `projectStateModel` (7). Evidence: 613 unit tests (55 files), 569 server tests (44 files, throwaway MariaDB 11.4, stopped), `tsc` clean, ESLint clean on changed files, lint ratchet 5/5.
A slip of mine: my first mutation checks on the two small models printed nothing because of zsh word-splitting, and I committed claiming they were done; I re-ran them correctly (all three caught, files restored) before relying on the claim.
Not tested by an agent: any of these in a browser, and a real signed-in download. The pipeline gate means the release waits about 13 minutes for CI.

## Phase 3 released and verified live (8 November 2026, owner-approved full route)
PR #27 CI green; `main` fast-forwarded to `b301ec7`; the release job started 3 s after the slowest check, changed 33 and added 64 `dist/` files and 1 server file, smoke passed; `check:live` 16 of 16. Browser (signed in as the owner): 24 screens, 0 CSP violations, 0 console errors; fault-injection tests of the gate and the ticket panel passed (details in AUDIT). One discarded run: my four stacked `fetch` wrappers broke Clerk's token refresh; a fresh page was fine, so it was my rig. NOT TESTED live: a real download, a real project status change. Live state: `main` = `origin/main`; no other branches.

## Phase 4 built on `phase-4/safe-writes` (9 November 2026, not pushed, not released)
K-129/K-130: new `gk_live_row` helper; blog, testimonials, content, clients, leads meta and dev meta merge `$in += stored`; testimonials approve, content, clients, dev meta and support assign answer 404 by lookup (UPDATE reports 0 rows for a no-op). K-131: `gk_mark_invoice_paid` in `_money.php` (payment_cols_ready moved there) used by manual mark-paid, the Stripe webhook and PayPal; re-marking a paid invoice is now 409 not a false 404. K-135: `access-drift.test.ts` guard and `dashboardSources`.
**A correction of my own:** I first made payment links, chase and all paid paths refuse DRAFT invoices (from a reader's note). The existing journey test caught that it broke the owner's real flow (accept quote, draft deposit invoice, Stripe link, webhook) and would have left real customer money unrecorded. I reverted that part before committing; drafts stay payable and only the evidence and the false 404s changed. Another: the test reset did not clear `project_dev`, so my new tests leaked a row into an older test; I fixed the harness (3 tables added).
Evidence: 649 unit tests (57 files), 600 server tests (46 files, throwaway MariaDB, stopped), `tsc` clean, ratchet 5/5. Mutations proven to fail: 4 + 3 + 3 + 2. Not tested: the editor dashboard in a browser, PayPal's return path.

## Phase 4 released and verified live (9 November 2026, owner-approved full route)
PR #28 CI green (MySQL 8); `main` fast-forwarded to `cbfd527`; the release job started 3 s after the slowest check; smoke passed; `check:live` 16 of 16. Browser (signed in as the owner): 24 screens, 0 CSP violations, 0 console errors, no dashboard banner; nine routes answered 404 for an id that cannot exist. NOT TESTED live: a real payment, PayPal, the editor dashboard. Rollback: `npm run release -- --rollback --go`. Next: Phase 5 (retire the legacy sign-in) once the owner confirms every active user signs in through Clerk.


## Handoff: Phase 5, retire the legacy sign-in (9 November 2026, branch `phase-5/clerk-only`, D-057)
- Done (not pushed, not released): server `48a6f3a` (auth.php `me` only; oauth.php and client_access.php 404 stubs; users create/invite set no password; integrations drops `google`), client `10f8418` (Login/RequireAuth Clerk only, auth store persists the user only, lock screen, set-password, two-factor and sessions panels and reference sign-in deleted, `SignInSecurity` card, one "Add user" action), docs commit follows.
- Evidence: `tsc -b` clean; `npm test` 632 in 55 files; `npm run test:server` 562 in 44 files (local MariaDB 11.4, `legacy-retired` 25 new; `auth`, `client-access`, `password-rehash` tests removed, five more adapted); lint ratchet 5 of 5; `npm run verify` and `docs:check` pass.
- NOT TESTED: a signed-in browser run of the new Login and My account card (Clerk needs the live origin); the server suite on MySQL 8 (CI runs it).
- Open: owner approval to push, PR and release; confirm every active user signs in through Clerk first. After release run `npm run check:live` and the checks in `docs/DEPLOYMENT.md` 5.6 item 17. Phase 9 drops the legacy tables and `users.totp_*`.
- Throwaway MariaDB on port 3399 is still running; stop it with `mariadb-admin --no-defaults -h127.0.0.1 -P3399 -uroot shutdown`.
- Released 2026-11-09 as `ed58064` (PR #29, CI green incl. MySQL 8); live checks 16 of 16, retired routes 404, My account opens Clerk's panel in the owner's signed-in Chrome. Stop the throwaway MariaDB (port 3399) when finished.

## Handoff: Phase 6, certificates end to end (9 November 2026, branch `phase-6/certificates`, D-058)
- Done (not pushed): `server/certificates.php` (issue, list, revoke; super admin and admin), `server/verify.php` hardened (uniform 404, no-store, 20 misses in 10 minutes gives 429), `Certificates.tsx` + `certificatesModel.ts`, wiring (api, access, drift guard, nav, search, route), `/verify` reference form and 429 state. No schema change.
- Evidence: red-first tests; 4 mutation checks caught; `tsc -b` clean; `npm test` 639/56; `npm run test:server` 583/45; lint ratchet 5/5; docs:check PASS.
- NOT TESTED: the screens in a browser (Chrome extension was not connected); release; MySQL 8 (CI).
- Open: the owner tries issue, verify and revoke once in a signed-in session (it writes a real row).
- Throwaway MariaDB on port 3399 is running again; stop it with `mariadb-admin --no-defaults -h127.0.0.1 -P3399 -uroot shutdown`.
- Released 2026-11-09 as `01d2269` (PR #30, CI green incl. MySQL 8); `check:live` 16 of 16; verify/certificates probes as designed; live table empty. Screens not seen in a browser. Stop the throwaway MariaDB (port 3399) when finished.

## Handoff: Phase 7, daily-flow speed-ups (9 November 2026, branch `phase-7/daily-flow`, D-059)
- Done (not pushed): reminders and digest remember what they sent (`cron.php`, `gk_chase_detail` in `_bootstrap.php`, memory = audit log, no schema change); `tasks.php` update plus date validation and the same-status fix; client edit dialog; task edit dialog; quote accept lands on `/app/projects?project=<id>`; Draft a quote on enquiries with a prefilled new quote; optional `$CHASE_INTERVAL_DAYS`.
- Evidence: red-first tests (cron-reminders 13 with a fake SMTP server, tasks 12, 21 model/link tests); mutation checks caught; `tsc -b` clean; `npm test` 660/59; `npm run test:server` 608/47; lint ratchet 5/5; docs:check PASS.
- NOT TESTED: the new dialogs and landing in a browser; release; MySQL 8 (CI); the live cron schedule.
- Open: owner approval to push, PR and release; read-only `crontab -l` first.
- Throwaway MariaDB on port 3399 is running; stop it with `mariadb-admin --no-defaults -h127.0.0.1 -P3399 -uroot shutdown`.
- Finding 2026-11-09: read-only `crontab -l` shows no GAkinz cron entry (K-145). Reminders/billing/digest/uptime/prune are not scheduled live. Needs an owner decision before adding one.
- Released 2026-11-09 as `825600e` (PR #31, CI green incl. MySQL 8); `check:live` 16 of 16; update routes 401 anonymously; web cron 403. Dialogs not seen in a browser. Stop the throwaway MariaDB (port 3399) when finished.

## Handoff: V1 finish-line run (10 November 2026, branch `goal/finish`, local only, D-060, D-061)
Done: froze the V1 finish line in `docs/ROADMAP.md` (7 of 10 ticked); `server/_notify.php` emails `$OWNER_ALERTS` when an enquiry or a deletion request arrives (K-146, K-095); per-job cron heartbeat and a Today notice (K-145); `npm run test:browser` (contact form, Chromium), `check:facts`, `drill:restore` (first restore of a real host dump: 42 of 42 tables, 0 orphans, MariaDB 11.4.13); 34 new money and isolation tests; KNOWN-ISSUES compacted (2,397 to about 1,460 lines).
Evidence: `docs/VERIFICATION.md` (server 661, unit 674, browser 6, `verify` PASS) and `docs/AUDIT.md` 2026-11-10.
Open (owner): `$OWNER_ALERTS` in `config.php` before release; business facts (`check:facts`); adviser sign-off and retention periods; the cron entry decision; host restore, uploads and recovery targets; the owner walk. Not released.

## Release and host work (10 November 2026, owner: "Go ahead and Push" and "do these")
Released `4bdaed7` (PR #32, CI green, 16 of 16 live). On the host: `$OWNER_ALERTS` set (config backed up), SMTP login proven, `~/gakinz-backup.sh` installed, crontab gains `30 3 * * *` backup and `15 6 * * *` `cron.php job=all` (crontab and config backups in `~/backups/gakinz_com/`), one TEST enquiry sent and deleted. Phone +44 20 8059 8757 is live. Found: no daily GAkinz backup existed; the OpenRouter key was printed into the session output by a careless sed (rotate it). Not done, needs the owner: business facts, retention periods, recovery-target yes, OpenRouter limit, Clerk dev user, `TEST owner` rename (new name?), signed-in walk steps 2 to 7, `$REPORT_RECIPIENTS`.


## Live owner walk and decisions (10 November 2026, owner signed in; "you do that")
Owner decisions: TEST email arrived; OpenRouter limit "unlimited" (no cap; rotate the exposed key); recovery targets delegated ("decide for me") and set to 1 working day / 24 hours (D-062); business facts in progress. Walk done live in Chrome as the TEST owner: contact form (GK-E-2026-0003) to Leads, convert, quote £1,234.57 + £246.91 VAT, accept (project GK-P-2026-0001 and three invoices summing £1,481.48), Mark paid on 0001, Record payment (bank transfer, exact total) on 0002, certificate issued, verified and revoked. Today showed no scheduled-jobs notice. NOT TESTED: test-client portal sign-in and deletion request (steps 4, 6), invoice PDF. TEST records left in place (list in `docs/VERIFICATION.md`); invoice numbers 0001 to 0003 are used. ROADMAP 8 of 10 ticked; open: 4 (facts), 10 (retention periods). Docs-only changes, committed locally, not pushed.

## TEST data removed, backup bug fixed (10 November 2026, owner: "delete it all")
After a fresh host dump, one SQL transaction removed every TEST record (client, enquiry, quote, project, 3 invoices, certificate), the June "Smoke Test" enquiry and the `dev@gakinz.com` super_admin row; counters and auto-increments reset (next enquiry `GK-E-2026-0001`, invoice `GK-INV-0001`). `TEST owner` stays. Found the first scheduled backup (03:30 EST) FAILED on cron's PATH (CGI `php`); fixed in `scripts/gakinz-backup.sh`, reinstalled, tested under `env -i`. The 06:15 EST cron job ran (audit row 52). Server time is EST. Next: confirm tomorrow's 03:30 backup line says ok.

## Handoff: V1.1 finish-line run (11 November 2026, branch `goal/finish`, local only, D-063)
Opened V1.1 from the parking lot at the owner's word ("Phase 2: open V1.1"): five items, all ticked in `docs/ROADMAP.md` with evidence. Built: Today lists data deletion requests with a reply-by date and shows failed alert emails; browser layout tests for all 32 public pages and 34 CMS screens at 375 and 1280 px (Clerk stubbed in a test-only build); lint clean and the ratchet removed. Fixed on the way: the bell's invoice 403 for clients and editors, label-in-name on two lists, invoice and contract action overflow. Mapped the nine GSD phases onto V0, V1, V1.1, V1.2, V2 (`docs/ROADMAP.md`).
Evidence: `docs/VERIFICATION.md` 2026-11-11 (types, lint 0, 678 unit, 669 server, 140 browser x3, axe 0, verify). Found, not fixed: K-147, K-148.
Open: the owner's V1 items 4 and 10; the owner's decision to release V1.1; PR #33 (Tailwind v4 and pnpm) is still a draft and its `package.json` and docs will conflict with this branch (this run added no dependency; it deleted `scripts/lint-ratchet.mjs` and the `lint:ratchet` script; the D-062 number is used by both branches, renumber the Tailwind one at merge).

## Handoff: one planning home (11 November 2026, branch `goal/finish`, documents only)
`.planning/` folded into `docs/ROADMAP.md` (at a glance, scope notes for V1.2 and V2, parking lot by theme) and removed after a copy to `.local-state/planning-archive-2026-11-11.tar.gz`. Its baseline notes (stack, architecture, testing, concerns) were a 2026-11-08 snapshot that the repo documents have since overtaken, so they were not copied: each concern is either fixed (a K-number in `docs/KNOWN-ISSUES.md`) or in the roadmap. `AGENTS.md` now states the Superpowers workflow (brainstorm, plan in the task file, test first, prove).
