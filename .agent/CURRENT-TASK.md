# Current Task Contract

## Outcome

**Also open (2026-11-11): branch `chore/tailwind-v4`, Tailwind v4 and pnpm (D-062), pushed as a branch and a draft PR, not merged.** Merging it to `main` deploys; the first CI run with pnpm is its first real test. Details: `docs/AUDIT.md` 2026-11-10 and `.agent/HANDOFF.md`. The commands below say `pnpm`.

**2026-11-10, branch `goal/finish` (worktree `.local-state/wt-finish`), RELEASED as `4bdaed7` (PR #32) on the owner's "Go ahead and Push": take GAkinz to
its frozen V1 finish line (`docs/ROADMAP.md`, D-060).** Owner's brief: adopt the draft finish line, correct it, build only the eight
open items in the owner's order, park the rest, cut the documents' sprawl by merging, leave everything local.

**Status: 7 of 10 items ticked with evidence; 3 wait for the owner. Not FINISHED.** Released and live-checked (`docs/VERIFICATION.md`). Also done on the host with the owner's go-ahead: `$OWNER_ALERTS`, daily backup, cron entry.

| # | Item | Status |
|---|---|---|
| 1, 2 | Public pages prerendered; Clerk-only sign-in | DONE (already true; re-built, 32 pages) |
| 3 | A visitor's enquiry reaches the owner | DONE locally: `$OWNER_ALERTS` email (D-061, K-146). **Owner sets `$OWNER_ALERTS`** |
| 4 | True business facts, no placeholder | BLOCKED, owner. `pnpm run check:facts` lists 9 open facts |
| 5, 6, 7 | Enquiry to invoice; payment and VAT; portal isolation | DONE locally (existing journey tests plus 34 new cases); live walk is the owner's |
| 8 | Restore once; recovery targets | PARTIAL: daily host backup installed; the host's own fresh dump restored (42 of 42 tables, 0 orphans); the owner's yes on the targets is left |
| 9 | Scheduled work running or visibly off | DONE and live: per-job heartbeat, Today notice, and the cron entry now exists (first scheduled run 06:15 on 2026-11-11) |
| 10 | Privacy basics | PARTIAL: deletion requests high priority plus owner email (K-095); retention periods need the owner and an adviser |

## Next actions (owner)

1. Look in hello@gakinz.com for "New enquiry from TEST Finish Run (ignore)": that confirms item 3 end to end.
2. Say yes (or change) the recovery targets: back within one working day, lose at most 24 hours (K-010).
3. Business facts still missing (`pnpm run build && pnpm run check:facts`) and the adviser's retention periods (K-062).
4. Set the OpenRouter monthly limit and **rotate that key** (it was shown in a session log by mistake); delete the Clerk dev user; say what to rename the `TEST owner` row to.
5. The signed-in walk, steps 2 to 7 in `docs/VERIFICATION.md`. Tomorrow also check that `backup.log` has a 03:30 line and Today shows no scheduled-jobs notice after 06:15.
6. Set `$REPORT_RECIPIENTS` if you want the weekly digest.

## Resume

1. `cd ~/Developer/Projects/gakinz_com/.local-state/wt-finish` (or `git switch goal/finish`); `pnpm install --frozen-lockfile` (Node 24).
2. Local database for the server and browser tests: `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=<repo>/.local-test/mariadb/mysqld.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_finish_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 pnpm run test:server`.
3. Gate: `pnpm test`, `pnpm run test:server`, `pnpm run build && pnpm run test:browser`, `pnpm run lint:ratchet`, `pnpm run docs:check --base main`, `pnpm run verify`. Results: `docs/VERIFICATION.md`.
4. `pnpm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Local files and commits on `goal/finish` only. No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in `docs/WORKBOOK.md` section 1.
