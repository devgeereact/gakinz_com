# Current Task Contract

## Outcome

**2026-11-01 to 02, branch `golive/2026-11` (released 2026-11-08, see below).** Owner asked: get ready for
live, then "make the best call for me ... fix all".

1. **First pass:** security audit (quick profile) and SEO audit; K-120 fixed; schema, sitemap, caching.
2. **Second pass (D-055):** K-121 Clerk two-factor and K-122 AI cap fixed; contact form JSON only; staff
   links and GitHub input checked; cron billing locked; bcrypt cost 12 with rehash; API and page headers
   (CSP, HSTS, no version headers, no directory listing); `weather.php` retired; mail TLS switch; dependencies
   to 0 critical and 0 high; gitleaks and Semgrep in CI. Details and evidence: `docs/AUDIT.md`.

Live: `cbfd527` (released 2026-11-09, snapshot `20261109T002637Z`; before that `b301ec7`, `983606c` and `ae01cec` on 2026-11-08). The order of work is [WORKBOOK.md](../docs/WORKBOOK.md) section 3; finished
sessions are in [HANDOFF.md](HANDOFF.md).

**2026-11-08, branch `phase-1/release-readiness` (from `golive/2026-11`, local only):** release readiness for
the 13 unreleased commits. `npm run verify` passes on the candidate, and so does the server suite (44 files,
562 tests, throwaway local MariaDB 11.4). Added `npm run check:live`
(`scripts/live-check.mjs`, read-only GETs, tests written first). Before any server change it passed 9 of 16
checks; the 7 failures were the unreleased hardening, including **a live directory listing on `/assets/` and
`/uploads/` (K-125)**.

**Released 2026-11-08, owner-approved at each gate:** K-121 query (0 accounts with app two-factor); `server/.htaccess`
uploaded after a backup; branch pushed; draft PR #24 ran CI (MySQL server tests, gitleaks, Semgrep, build: all green);
`main` fast-forwarded to `ae01cec` and `deploy.yml` released it (smoke checks passed). `npm run check:live` on
production: **16 of 16**. Phase 1 of the GSD roadmap is complete except the hand-applied items below.

**Hand-applied items finished 2026-11-08 (owner-approved):** private config (`CLERK_CACHE_DIR` set and in use,
stale localhost origin removed, `MAIL_VERIFY_TLS` on after a verified SMTP and IMAP test), live stub aligned,
K-123 closed by a direct-to-origin probe, AI default model `anthropic/claude-sonnet-5.5` live on the existing
OpenRouter key (D-056). Signed-in check: the app loads for the owner, and 24 of 24 CMS screens visited client-side
gave 0 CSP violations and 0 console errors (listener proven on a deliberate violation; the console tool alone cannot
see CSP reports). PR #24 was already merged by GitHub.

## Next actions, in order

1. Done: the OpenRouter backup model was released as `983606c` (PR #25) and `OR_FALLBACK_MODEL=openai/gpt-oss-120b` is set; a live
   test answered on both models.
2. Owner: set a monthly spending limit on the OpenRouter key in the OpenRouter dashboard (the key has none today).
3. **Phase 3 (fix what Clerk broke): released 2026-11-08 as `b301ec7` (PR #27) and checked live** (see the 2026-11-08 later section of
   `docs/AUDIT.md`). K-127 staff downloads send the Clerk token; K-128 sharing keeps a public image's permanent link; K-140 the gate,
   the ticket panel and the project dropdown no longer hang. Owner: when a real file and a real project exist, try a download and a status
   change once; those two could not be tested live.
4. **Phase 4 (make writes safe): released 2026-11-09 as `cbfd527` (PR #28) and checked live** (see the 2026-11-09 section of
   `docs/AUDIT.md`). Owner: when a real invoice is paid, look once that it shows the method and amount; PayPal and the editor
   dashboard could not be tested live.
5. **Phase 5 (retire the legacy sign-in, D-057): coded and checked on branch `phase-5/clerk-only`, NOT released.** Clerk is the only
   sign-in; `auth.php` answers `me` only; `oauth.php` and `client_access.php` are 404 stubs; nobody has a password; My account opens
   Clerk's panel (see the 2026-11-09 Phase 5 section of `docs/AUDIT.md`). Needs the owner's approval to push, open the PR and release,
   and first the owner's confirmation that every active user signs in through Clerk (1 active user on 2026-11-08). After release:
   `npm run check:live` and the Phase 5 checks in `docs/DEPLOYMENT.md` 5.6 item 17. Not tested in a browser before release.
6. Next after that: Phase 6 (certificates end to end, K-134).

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
