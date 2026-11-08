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

