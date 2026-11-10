# Current Task Contract

## Outcome

**2026-11-10, branch `goal/finish` (worktree `.local-state/wt-finish`), RELEASED as `4bdaed7` (PR #32) on the owner's "Go ahead and Push": take GAkinz to
its frozen V1 finish line (`docs/ROADMAP.md`, D-060).** Owner's brief: adopt the draft finish line, correct it, build only the eight
open items in the owner's order, park the rest, cut the documents' sprawl by merging, leave everything local.

**Status: 8 of 10 items ticked with evidence; 2 wait for the owner (4 business facts, 10 retention periods). Not FINISHED.** Released and live-checked (`docs/VERIFICATION.md`). Also done on the host with the owner's go-ahead: `$OWNER_ALERTS`, daily backup, cron entry.

| # | Item | Status |
|---|---|---|
| 1, 2 | Public pages prerendered; Clerk-only sign-in | DONE (already true; re-built, 32 pages) |
| 3 | A visitor's enquiry reaches the owner | DONE locally: `$OWNER_ALERTS` email (D-061, K-146). **Owner sets `$OWNER_ALERTS`** |
| 4 | True business facts, no placeholder | BLOCKED, owner. `npm run check:facts` lists 9 open facts |
| 5, 6, 7 | Enquiry to invoice; payment and VAT; portal isolation | DONE locally (journey tests plus 34 new cases) and walked live 2026-11-10 as owner (enquiry to two paid invoices, VAT correct); the client-side sign-in is NOT TESTED |
| 8 | Restore once; recovery targets | DONE: daily host backup; host dump restored (42 of 42 tables, 0 orphans); targets agreed (D-062). Open: off-host copy |
| 9 | Scheduled work running or visibly off | DONE and live: per-job heartbeat, Today notice, and the cron entry now exists (the 06:15 server-time run on 2026-11-10 was seen in the audit log) |
| 10 | Privacy basics | PARTIAL: deletion requests high priority plus owner email (K-095); retention periods need the owner and an adviser |

## Next actions (owner)

1. Business facts still missing (`npm run build && npm run check:facts`) and the adviser's retention periods (K-062). The owner is working on these.
2. **Rotate the OpenRouter key** (it was shown in a session log by mistake). The owner chose no spending limit (D-062).
3. TEST data on live now: clients `TEST Client A` and `TEST Client B`, their quotes, projects, invoices 0001 to 0006, deletion ticket #1, CMS client user `gakinz101+clienta@gmail.com`. Ask for them to be cleared (backup first, numbering reset) and delete that user in Clerk yourself. Walk steps 1 to 7 are all done.
3b. Stripe is not connected: follow "Connecting Stripe" in `docs/DEPLOYMENT.md` (test mode first).
4. Say what to rename the `TEST owner` row to (the `dev@gakinz.com` row is gone; Clerk has no such user).
5. Tomorrow after 03:30 server time (EST, five hours behind UTC): `~/backups/gakinz_com/backup.log` has an `ok` line. The first scheduled run failed on cron's PATH and was fixed; this is the proof.
6. Set `$REPORT_RECIPIENTS` if you want the weekly digest. Decide how dumps get off the host (K-010).

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
