# Current Task Contract

## Outcome

**V1.2 (public-site trust, D-065) is IN PROGRESS: spec and plan written, build started, Task 1 done (awaiting review).** Spec: `docs/superpowers/specs/2026-11-11-v1-2-public-trust-design.md`. Plan: `docs/superpowers/plans/2026-11-11-v1-2-public-trust.md` (seven tasks, test first). Frozen list: `docs/ROADMAP.md` "V1.2 finish line". Working in this folder on branch `goal/v1.2` (D-066: nothing is built outside the project folder). V0, V1 (8 of 10) and V1.1 are live as `ed5a724`; the record is in `docs/ROADMAP.md` and `.agent/HANDOFF.md`.

Build progress (V1.2): task 1 (built-in articles match the CMS, item 2, K-147) is implemented and committed on `goal/v1.2` (`a8182c3`) and awaits review; tasks 2 to 6 are not started.

Spec history: a fresh agent checked the spec cold; its findings changed the design (item 4 dropped as already true, the 404 served by `server/notfound.php`, `services` exempt, Google kept in the cookie page; see the spec's "Builder check"). The build is under way task by task; nothing is pushed or released.

## Next actions

1. Owner: read the spec and the plan, and say "build" (agents then build task by task, each reviewed, then a whole-branch review), or change either.
2. Then the build follows `AGENTS.md` "How work is planned and built": fresh agent per task, fresh reviewer per task, fix and re-review, ladder, one final reviewer, records. Nothing is pushed or deployed.
3. Still the owner's: V1 items 4 and 10, K-147's CMS side (done by the plan), rotate the OpenRouter key, delete the Clerk dev user, rename the `TEST owner` row; later, upload `server/.htaccess` and set `$TRUST_CLOUDFLARE_IP`.

## Resume

1. `cd ~/Developer/Projects/gakinz_com`, `git switch goal/v1.2` (or `main` for the released state); `pnpm install --frozen-lockfile` (Node 24). The old worktrees (`.local-state/wt-finish`, and `~/Developer/worktrees/gakinz-tailwind-v4`, which is outside the folder and now detached) are finished and can be removed with `git worktree remove`.
2. Local database for the server and browser tests: `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=<repo>/.local-test/mariadb/mysqld.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_dev_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 pnpm run test:server`.
3. Gate: `pnpm test`, `pnpm run test:server`, `pnpm run build && pnpm run test:browser`, `pnpm run lint`, `pnpm run docs:check --base main`, `pnpm run verify`. Results: `docs/VERIFICATION.md`.
4. `pnpm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Work on a branch, then a pull request or the owner's "approved:" for any push to `main` (a push to `main` releases). No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in `docs/WORKBOOK.md` section 1.
