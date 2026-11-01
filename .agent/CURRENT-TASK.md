# Current Task Contract

## Outcome

**2026-11-01, branch `golive/2026-11` (local only: not pushed, not deployed).** Owner asked: get ready for live.

1. **Security audit** (security-audit skill, quick profile, source only): no confirmed Critical or High.
   K-120 (SMTP command injection through a client email) fixed test-first. Leads for the owner: K-121
   (Clerk skips app two-factor), K-123 (per-IP throttles vs the host's client-IP trust); K-122 (AI cap) and
   K-124 (settings stub, Clerk cache folder) recorded. Details in `docs/AUDIT.md`.
2. **SEO audit** (claude-seo, live site read-only): ProfessionalService, Service and BreadcrumbList schema;
   sitemap `lastmod` only where real; one-year cache for hashed assets (`.htaccess`, hand-applied). Copy
   changes listed for the owner in `docs/AUDIT.md`.

Live: `bde12c7` (2026-11-01). The order of work is [WORKBOOK.md](../docs/WORKBOOK.md) section 3; finished
sessions are in [HANDOFF.md](HANDOFF.md).

## Next actions, in order

1. Owner: review the branch; approve push and merge (merging releases `dist/` and `server/*.php`).
2. Owner: K-121 decision, K-123 host setting, then the hand-applied items in `docs/DEPLOYMENT.md` section 5.
3. Owner: AI keys with `scripts/set-server-key.sh` (still pending from the previous task).
4. Run the server suite on MySQL (CI) before merging: this branch changes `_smtp.php` and `clients.php`.

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

- In scope: the go-live security audit and SEO audit, fixes for Critical and High findings, safe SEO
  fixes in code, and the documents they touch.
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

- Risk level: production. `_smtp.php` and `clients.php` ship with the next release; `clients.php` then
  refuses a client email that is not one valid address (two addresses in one field included).
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
