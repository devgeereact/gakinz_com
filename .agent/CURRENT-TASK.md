# Current Task Contract

## Outcome

**2026-11-11, branch `goal/finish` (worktree `.local-state/wt-finish`), LOCAL ONLY, not pushed: V1.1 finish line (`docs/ROADMAP.md`, D-063).**
Opened from the parking lot at the owner's "Phase 2: open V1.1"; five items, all ticked with evidence.

| # | Item | Status |
|---|---|---|
| 1 | Every public page laid out cleanly at 375 and 1280 px | DONE: `public-layout.test.ts` 66 tests, axe 0, 11 of 32 pages viewed. K-147 found |
| 2 | Today lists data deletion requests with a reply-by date | DONE: `today.test.ts` +3 |
| 3 | Today shows failed alert emails | DONE: `alert-failures.test.ts` 5 |
| 4 | Every CMS screen laid out cleanly with realistic data | DONE: `cms-layout.test.ts` 68 tests (owner 27, client 3, editor 4 screens, two sizes), axe 0; 3 defects fixed, K-148 found |
| 5 | `npm run lint` passes and is the gate | DONE: 0 errors; CI and `release.json` run it; ratchet deleted |

**Status: V1.1 FINISHED locally (5 of 5). V1 stays at 8 of 10: items 4 and 10 wait for the owner.** Checks: `docs/VERIFICATION.md` 2026-11-11 (lint 0, 678 unit, 669 server, 140 browser three runs in a row, `npm run verify` passes).

## Next actions (owner)

FINISHED. Awaiting the owner: push, release, or open a V1.2 scope.
1. Decide whether to release V1.1 (it changes `today.php`, three screens and the CI lint step; no schema change, no config key). It needs your "approved:" to push; a push to `main` releases.
2. PR #33 (Tailwind v4 and pnpm) is a separate draft and will conflict with this branch in `package.json`, the lockfile and the docs; merge one first, then resolve (D-062 is used by both).
3. K-147: publish the two missing articles in the CMS, or tell me to stop listing static articles (V1.2).
4. The V1 owner items are unchanged: business facts (item 4), retention periods (item 10), `$REPORT_RECIPIENTS`, rotate the exposed OpenRouter key, delete the Clerk dev user, rename the `TEST owner` row.
5. Look once, signed in, at Today for a deletion request and for the alert notice.

## Resume

1. `cd ~/Developer/Projects/gakinz_com/.local-state/wt-finish` (or `git switch goal/finish`); `npm ci` (Node 24).
2. Local database for the server and browser tests: `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=<repo>/.local-test/mariadb/mysqld.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_finish_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 npm run test:server`.
3. Gate: `npm test`, `npm run test:server`, `npm run build && npm run test:browser`, `npm run lint`, `npm run docs:check -- --base main`, `npm run verify`. Results: `docs/VERIFICATION.md`.
4. `npm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Local files and commits on `goal/finish` only. No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in `docs/WORKBOOK.md` section 1.
