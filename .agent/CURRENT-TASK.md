# Current Task Contract

## Outcome

**2026-11-01, branch `chore/cleanup-2026-11-01`.**

1. **Cleanup.** Dead code removed (the weather pill and `weather` API group, the old footer, the
   unused Avatar and Collapsible components and their two packages, the unused work-record
   hooks); merged branches and scratch files removed; the stale documents brought to the current
   state (STATUS, WORKBOOK, DEPLOYMENT section 5, DESIGN-SYSTEM, CLAUDE, README, ARCHITECTURE, this
   file); the owner's retired planning folder and the Mastercard reference left the tree (D-044).
2. **AI never out.** `server/ai.php` uses Anthropic first and OpenRouter when Anthropic fails or
   has no key; `scripts/set-server-key.sh` saves either key into the server's private config
   without showing it.

Live: `fdc5d94` (2026-10-31). The order of work after this task is [WORKBOOK.md](../docs/WORKBOOK.md)
section 3; finished sessions are in [HANDOFF.md](HANDOFF.md).

## Next actions, in order

1. Done 2026-11-01: released as `bde12c7` (owner: "push live"); checks in `docs/AUDIT.md`.
2. Owner: run `scripts/set-server-key.sh` for the Anthropic key, then the OpenRouter key.
3. Check the AI draft once signed in (NOT TESTED by an agent: it would be a live call).

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

- In scope: the 2026-11-01 cleanup (dead code, merged branches, stale documents) and the AI
  provider fallback (Anthropic first, OpenRouter second) with a script that saves the keys to the
  server's private config.
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

- Risk level: production. `server/ai.php` ships with the next release; with neither key set it
  keeps answering 503 and the interface hides AI, as today.
- The keys are entered by the owner through `scripts/set-server-key.sh`, never by an agent.

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

Earlier contracts and their next-action lists are in git history: the one before this cleanup at
`ee1281f`, the readiness audit at `8499761`, the D-046 redesign at `ef2d6f9`, 2026-10-10 at
`d314833`, batch 1 at `9db80b2`, the 2026-09-22 relaunch as `f67f05b` (#5).
