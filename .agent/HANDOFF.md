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
