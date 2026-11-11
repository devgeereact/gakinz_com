# Current Task Contract

## Outcome

**Tailwind v4 and pnpm (D-064) is merged into this branch locally (2026-11-11, merge of `main` into `chore/tailwind-v4`, then `main` fast-forwarded).** Draft PR #33 on GitHub still shows the older branch tip. Not pushed, not released: merging to `main` on GitHub deploys, and the first CI run with `pnpm install --frozen-lockfile` in `deploy.yml` is its first real test. Details: `docs/AUDIT.md` and `docs/VERIFICATION.md` 2026-11-11.

**2026-11-11, branch `goal/finish` (worktree `.local-state/wt-finish`), LOCAL ONLY, not pushed: V1.1 finish line (`docs/ROADMAP.md`, D-063).**
Opened from the parking lot at the owner's "Phase 2: open V1.1"; five items, all ticked with evidence.

| # | Item | Status |
|---|---|---|
| 1 | Every public page laid out cleanly at 375 and 1280 px | DONE: `public-layout.test.ts` 66 tests, axe 0, 11 of 32 pages viewed. K-147 found |
| 2 | Today lists data deletion requests with a reply-by date | DONE: `today.test.ts` +3 |
| 3 | Today shows failed alert emails | DONE: `alert-failures.test.ts` 5 |
| 4 | Every CMS screen laid out cleanly with realistic data | DONE: `cms-layout.test.ts` 68 tests (owner 27, client 3, editor 4 screens, two sizes), axe 0; 3 defects fixed, K-148 found |
| 5 | `pnpm run lint` passes and is the gate | DONE: 0 errors; CI and `release.json` run it; ratchet deleted |

**Status: V1.1 FINISHED locally (5 of 5). V1 stays at 8 of 10: items 4 and 10 wait for the owner.** Checks: `docs/VERIFICATION.md` 2026-11-11 (lint 0, 678 unit, 669 server, 140 browser three runs in a row, `pnpm run verify` passes).

## Next actions (owner)

FINISHED. Awaiting the owner: push, release, or open a V1.2 scope.
1. Decide whether to release V1.1 and the Tailwind v4 and pnpm change together (V1.1 changes `today.php`, three screens and the CI lint step; Tailwind changes the build and the package manager; no schema change, no config key). It needs your "approved:" to push; a push to `main` releases.
2. Tailwind v4 and pnpm are already in this branch, so one push carries both. Run `pnpm install` once in your main folder (it was installed with npm). PR #33 on GitHub still shows the older tip until the branch is pushed.
3. K-147: publish the two missing articles in the CMS, or tell me to stop listing static articles (V1.2).
4. The V1 owner items are unchanged: business facts (item 4), retention periods (item 10), `$REPORT_RECIPIENTS`, rotate the exposed OpenRouter key, delete the Clerk dev user, rename the `TEST owner` row.
5. Look once, signed in, at Today for a deletion request and for the alert notice.

## Resume

1. `cd ~/Developer/Projects/gakinz_com/.local-state/wt-finish` (or `git switch goal/finish`); `pnpm install --frozen-lockfile` (Node 24).
2. Local database for the server and browser tests: `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=<repo>/.local-test/mariadb/mysqld.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_finish_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 pnpm run test:server`.
3. Gate: `pnpm test`, `pnpm run test:server`, `pnpm run build && pnpm run test:browser`, `pnpm run lint`, `pnpm run docs:check --base main`, `pnpm run verify`. Results: `docs/VERIFICATION.md`.
4. `pnpm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Local files and commits on `goal/finish` only. No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in `docs/WORKBOOK.md` section 1.
