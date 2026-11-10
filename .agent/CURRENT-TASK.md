# Current Task Contract

## Outcome

**2026-11-10, branch `goal/finish` (worktree `.local-state/wt-finish`, from `main` at `d30e95b`, local only): take GAkinz to
its frozen V1 finish line (`docs/ROADMAP.md`, D-060).** Owner's brief: adopt the draft finish line, correct it, build only the eight
open items in the owner's order, park the rest, cut the documents' sprawl by merging, leave everything local.

**Status: 7 of 10 items ticked with evidence; 3 wait for the owner. Not FINISHED.** Nothing pushed, released or run against the live site.

| # | Item | Status |
|---|---|---|
| 1, 2 | Public pages prerendered; Clerk-only sign-in | DONE (already true; re-built, 32 pages) |
| 3 | A visitor's enquiry reaches the owner | DONE locally: `$OWNER_ALERTS` email (D-061, K-146). **Owner sets `$OWNER_ALERTS`** |
| 4 | True business facts, no placeholder | BLOCKED, owner. `npm run check:facts` lists 9 open facts |
| 5, 6, 7 | Enquiry to invoice; payment and VAT; portal isolation | DONE locally (existing journey tests plus 34 new cases); live walk is the owner's |
| 8 | Restore once; recovery targets | PARTIAL: Mac copy of the host dump restored (42 of 42 tables, 0 orphans); host copy, uploads, targets are the owner's |
| 9 | Scheduled work running or visibly off | DONE locally: per-job heartbeat and a Today notice; the cron entry is the owner's decision (K-145) |
| 10 | Privacy basics | PARTIAL: deletion requests high priority plus owner email (K-095); retention periods need the owner and an adviser |

## Next actions (owner; each exact step is in `docs/ROADMAP.md` "Needs the owner")

1. Say **push** to have the release proposed. Before it goes live: add `$OWNER_ALERTS = '...'` to `config.php` and check `$SMTP_*` (`docs/DEPLOYMENT.md` section 5, first paragraph).
2. Business facts and adviser sign-off (items 4 and 10): `npm run build && npm run check:facts`.
3. Decide the cron entry: two steps in `docs/OPERATIONS.md` 2.1 (K-145).
4. Restore the host's newest dump and the uploads, agree the recovery targets (`docs/OPERATIONS.md` 10.1, K-010); confirm the live engine (K-099).
5. The owner walk in `docs/VERIFICATION.md`; set the OpenRouter limit; delete the Clerk dev user; rename the `TEST owner` row.

## Resume

1. `cd ~/Developer/Projects/gakinz_com/.local-state/wt-finish` (or `git switch goal/finish`); `npm ci` (Node 24).
2. Local database for the server and browser tests: `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=<repo>/.local-test/mariadb/mysqld.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_finish_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 npm run test:server`.
3. Gate: `npm test`, `npm run test:server`, `npm run build && npm run test:browser`, `npm run lint:ratchet`, `npm run docs:check -- --base main`, `npm run verify`. Results: `docs/VERIFICATION.md`.
4. `npm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Local files and commits on `goal/finish` only. No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in `docs/WORKBOOK.md` section 1.
