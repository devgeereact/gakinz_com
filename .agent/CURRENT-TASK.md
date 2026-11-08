# Current Task Contract

## Outcome

**2026-11-01 to 02, branch `golive/2026-11` (local only: not pushed, not deployed).** Owner asked: get ready for
live, then "make the best call for me ... fix all".

1. **First pass:** security audit (quick profile) and SEO audit; K-120 fixed; schema, sitemap, caching.
2. **Second pass (D-055):** K-121 Clerk two-factor and K-122 AI cap fixed; contact form JSON only; staff
   links and GitHub input checked; cron billing locked; bcrypt cost 12 with rehash; API and page headers
   (CSP, HSTS, no version headers, no directory listing); `weather.php` retired; mail TLS switch; dependencies
   to 0 critical and 0 high; gitleaks and Semgrep in CI. Details and evidence: `docs/AUDIT.md`.

Live: `bde12c7` (2026-11-01). The order of work is [WORKBOOK.md](../docs/WORKBOOK.md) section 3; finished
sessions are in [HANDOFF.md](HANDOFF.md).

**2026-11-08, branch `phase-1/release-readiness` (from `golive/2026-11`, local only):** release readiness for
the 13 unreleased commits. `npm run verify` passes on the candidate, and so does the server suite (44 files,
562 tests, throwaway local MariaDB 11.4). Added `npm run check:live`
(`scripts/live-check.mjs`, read-only GETs, tests written first). Before any server change it passed 9 of 16
checks; the 7 failures were the unreleased hardening, including **a live directory listing on `/assets/` and
`/uploads/` (K-125)**.

**Done with the owner's approval on 2026-11-08 (steps 1 and 2 of 3):** the K-121 query ran read-only (**0 accounts
with app two-factor**, 1 active user); `server/.htaccess` was uploaded after a server-side backup
(`~/backups/gakinz_com/htaccess.before-phase1.20261108T071024Z`) and smoke-tested; the listing is closed and
`npm run check:live` now passes **16 of 16**. Step 3, pushing this branch so CI runs, was approved and follows this
commit. Not merged, not deployed.

## Next actions, in order

1. Owner: wait for CI on the pushed branch (MySQL tests, gitleaks, Semgrep). Then approve the fast-forward of
   `main`, which releases `dist/` and `server/*.php`. After it, run `npm run check:live` again: 16 of 16.
2. Owner: the remaining hand-applied items in `docs/DEPLOYMENT.md` section 5 (private config `CLERK_CACHE_DIR`,
   remove the localhost origin, the mail TLS test, compare the live stub), then K-123 with the host.
3. Owner: AI keys with `scripts/set-server-key.sh` (pending from the cleanup task).

## Resume on another computer

1. `git fetch origin`, `git switch main`, `git pull --ff-only`, then `npm ci` (Node 24).
2. Read `docs/WORKBOOK.md`, `docs/STATUS.md` and `docs/KNOWN-ISSUES.md`.
3. Baseline: `npm run build`, `npm test`, `npm run lint:ratchet`, `npm run docs:check`; for server
   work `npm run test:server` with its own database and free ports, for example
   `GK_TEST_DB=gakinz_docs_test GK_TEST_PHP_PORT=5309 GK_TEST_PROVIDER_PORT=5310`.
4. `npm run dev` talks to the live API: any save is real. For browser checks serve `dist/` with the
   design skill's `serve.mjs` and stub the calls.

## Mode

Existing Application (GEE OS `modes/EXISTING-APPLICATION.md`, workflow
`workflows/EXISTING-APPLICATION.md`). Production risk. Development calls the live API, so no
agent write runs through the dev server.

## Scope

- In scope: the go-live security audit and SEO audit, every fix that can be tested locally, safe SEO fixes,
  in-range dependency updates, CI security checks, and the documents they touch.
- Out of scope: switching on any gated feature (D-050); DNS, TLS, Cloudflare and mail hosting;
  rewriting git history.

## Authority

- Research: yes.
- Create planning artefacts: yes.
- Edit local files: yes, on a feature branch. One concern per commit.
- Commit and push: on a feature branch. Merge to `main` only with the owner's approval for that
  action, because a push to `main` with code changes releases `dist/` and `server/*.php`.
- Use external services: no. No real send, no real payment, no live API call.
- Change production: only through an owner-approved release. SQL, `.htaccess` and `config.php` keys
  are applied by a person (`docs/DEPLOYMENT.md` section 5).
- MCP reads: local only.
- MCP mutations: none.
- Local database: creating and dropping `*_test` databases on the local MariaDB or MySQL is
  permitted. Synthetic data only.

## Risk and dependencies

- Risk level: production. The next release changes sign-in (K-121: a TOTP account needs a Clerk second factor),
  the AI cap, the contact form (JSON only) and client emails (one valid address). All covered by tests.
- `server/.htaccess` and `CLERK_CACHE_DIR` are applied by a person; nothing on the server was read or changed.

## Evidence

- Required checks:
  - `npm run typecheck` and `npm run build`
  - `npm test`, and `npm run test:server` for any server change
  - `npm run lint:ratchet` (must not grow)
  - `npm run docs:check`, with `-- --base origin/<base branch>` before opening a pull request
  - `php -l` over any touched PHP
- Completion conditions:
  - Each change has a test or a recorded manual check.
  - The documents it affects are updated in the same pull request.
  - Anything not checked on the live system is marked NOT TESTED.

## Previous contracts

Earlier contracts and their next-action lists are in git history: the 2026-11-01 cleanup at `3225e01`,
the one before it at `ee1281f`, the readiness audit at `8499761`, the D-046 redesign at `ef2d6f9`, 2026-10-10 at
`d314833`, batch 1 at `9db80b2`, the 2026-09-22 relaunch as `f67f05b` (#5).
