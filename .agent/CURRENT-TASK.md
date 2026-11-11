# Current Task Contract

## Outcome

**2026-11-11: V1.1 finish line (`docs/ROADMAP.md`, D-063) and Tailwind CSS v4 with pnpm (D-064) are RELEASED together as `ed5a724`** (live 08:34 UTC, snapshot `20261111T083401Z`, CI green, `check:live` 16 of 16), on the owner's "Push and Deploy now". The first push (`e73748f`) failed its release-check job on pnpm (K-149) and released nothing; the fix went out as `ed5a724`.

| # | V1.1 item | Status |
|---|---|---|
| 1 | Every public page laid out cleanly at 375 and 1280 px | DONE and live: `public-layout.test.ts` 66 tests, axe 0, 11 of 32 pages viewed. K-147 found |
| 2 | Today lists data deletion requests with a reply-by date | DONE and live: `today.test.ts` +3 |
| 3 | Today shows failed alert emails | DONE and live: `alert-failures.test.ts` 5 |
| 4 | Every CMS screen laid out cleanly with realistic data | DONE and live: `cms-layout.test.ts` 68 tests, axe 0; 3 defects fixed, K-148 found |
| 5 | `pnpm run lint` passes and is the gate | DONE and live: 0 errors; CI and `release.json` run it; ratchet deleted |

**Status: V1.1 FINISHED and released (5 of 5). V1 stays at 8 of 10: items 4 and 10 wait for the owner.** Checks: `docs/VERIFICATION.md` 2026-11-11 (lint 0, 678 unit, 669 server, 140 browser three runs in a row, `pnpm run verify`, then the live checks). Not seen: the live site in a browser, the new Today sections signed in.

## Next actions

FINISHED. Awaiting the owner: look at the live site, supply the V1 inputs, or open a V1.2 scope.
1. Run `pnpm install` once in your main folder (it was installed with npm).
2. Look once, signed in, at Today (a deletion request, the alert notice) and at the restyled CMS; say what looks wrong.
3. K-147: publish the two missing articles in the CMS, or tell me to stop listing static articles (V1.2).
4. The V1 owner items are unchanged: business facts (item 4), retention periods (item 10), `$REPORT_RECIPIENTS`, rotate the exposed OpenRouter key, delete the Clerk dev user, rename the `TEST owner` row.
5. When you want V1.2 (public-site trust): brainstorm first (`AGENTS.md`, "How work is planned and built"), then freeze up to ten items in `docs/ROADMAP.md`.

## Resume

1. `cd ~/Developer/Projects/gakinz_com`, `git switch main`, `git pull --ff-only`; `pnpm install --frozen-lockfile` (Node 24). The worktrees `.local-state/wt-finish` and `~/Developer/worktrees/gakinz-tailwind-v4` are finished and can be removed (`git worktree remove`).
2. Local database for the server and browser tests: `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=<repo>/.local-test/mariadb/mysqld.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_dev_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 pnpm run test:server`.
3. Gate: `pnpm test`, `pnpm run test:server`, `pnpm run build && pnpm run test:browser`, `pnpm run lint`, `pnpm run docs:check --base main`, `pnpm run verify`. Results: `docs/VERIFICATION.md`.
4. `pnpm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Work on a branch, then a pull request or the owner's "approved:" for any push to `main` (a push to `main` releases). No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in `docs/WORKBOOK.md` section 1.
