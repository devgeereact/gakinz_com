# Current Task Contract

## Outcome

The work on `feat/journeys-2026-10-18` (PR #21, six batches, 2026-10-18 to 2026-10-20) and on
`feat/landing-motion-2026-10-21` (GSAP and Lenis scroll polish, D-051) is built, tested
locally and pushed. **Not merged, deployed or uploaded.** SQL 13 to 19 have run only on the
throwaway test database.

The branch stack is: `main` <- `feat/plan-2026-batch-1` (PR #8) <- `feat/redesign-2026` <-
`audit/readiness-2026-10-17` (PR #20) <- `feat/journeys-2026-10-18` (PR #21) <-
`feat/landing-motion-2026-10-21`. Merge in that order, and only after the operator steps
below, because a merge to `main` deploys `dist/`.

The verdict of `docs/STATUS.md` section 0.1 still stands: **not ready for production.**

The one working view is [`docs/WORKBOOK.md`](../docs/WORKBOOK.md). What each batch delivered
and its verification counts are in [`docs/STATUS.md`](../docs/STATUS.md) sections 0.2 to 0.4
and their batch subsections. This contract no longer repeats them (consolidated 2026-10-21;
the earlier ledger is in git history at `5d5f95b`).

## Next actions, in order

1. **Owner review of PR #21** (the second to sixth batches on `feat/journeys-2026-10-18`).
   An agent does not merge. **For the upload, use the one ordered list in
   `docs/DEPLOYMENT.md` section 5.1 step 13**, which supersedes the per-batch orders below:
   `.htaccess`; includes before the files that load them (`_uploads.php` before `files.php`,
   `_erasure.php` after `_retention.php`, `_uploads.php` and `_like.php`); `site.php` before
   the merge; the readiness set together; SQL 13 to 18, then SQL 19 step 1 and step 2 (one
   paste, one SQL tab) with the `reference IS NULL` check; `client_access.php` (step 14,
   switched off); then merge. Keep `$RETENTION_APPLY = false` and
   `$REFERENCE_SIGNIN_ENABLED = false`, and never pass `--apply`. Walk section 5.6 checks 16
   and 17.
2. **Operator order for the second batch** (`docs/DEPLOYMENT.md` section 5.1 step 10): read and
   record the live PHP version (8.1 or later expected; K-082, K-068), upload `today.php`,
   `search.php` with `_like.php`, `briefs.php`, `privacy.php` with `_retention.php` and
   `cron.php`, and the new `.htaccess`; run SQL 16; then merge. Walk section 5.6 check 14,
   including `curl -sI` on a missing `.php` (expect 404).
   **Then the third batch** (section 5.1 step 11): upload `_time.php` with or before
   `support.php` and `time.php`, `projects.php` with `_templates.php`, and `files.php`,
   `portal.php` and `privacy.php`; run SQL 17, then SQL 18; then merge. Walk section 5.6
   check 15, with no real send and only real records. The whole SQL run for this branch is
   13 to 18, in order, after anything earlier in section 5.2 that is not yet live.
   **Owner decisions from the third batch** (`docs/STATUS.md` section 5): review the five
   templates' wording before using them with a client (K-086), and whether ticket time should
   start as billable.
3. **Owner decisions** raised by the second batch (`docs/STATUS.md` section 5): the retention
   periods for the nine `$RETENTION_*` keys and the erasure procedure (K-062); whether staff
   notes about a client go into a subject access export (K-079); the affiliate disclosure
   wording that replaces the gap on recommendation blocks (D-027). **The fourth batch** (section
   5.1 step 12): upload `site.php` before the merge, then save Site content > Services once;
   the six service pages are built, and IT coverage, area, IT prices, the package price
   confirmation and VAT basis, and the inferred exclusions wait on the owner (K-038, K-090 to
   K-092). **The fifth batch** (section 5): a random yearly offset for references (K-094),
   how deletion requests are prioritised or notified (K-095), and the retention periods
   before `$RETENTION_APPLY` is ever switched on (K-062). **The sixth batch** (section 5):
   whether and when to switch on reference sign-in, after the sign-in policy and the gates
   (D-050); the ad pilot decisions (CMP, AdSense IDs, Purpose 1 only, cookie notices, a
   privacy choices link; K-104 to K-107); and the client anonymisation rules with an adviser
   (K-108, built 2026-10-20 and switched off; the adviser reviews its rules).
4. **Housekeeping for the owner**: the stash `int-wave-lintcheck-x1` (made by an agent for a
   lint comparison and already applied back; a hook blocked dropping it) and four agent
   worktrees under `.claude/worktrees/` can be removed. The git-ignored `.playwright-mcp`
   folder (other sessions' browser logs) was deleted by an agent on 2026-10-19; its contents
   were captured in the session tool results before deletion.
5. **Owner decisions** raised by the first batch (`docs/STATUS.md` section 5): whether clients see
   the meeting link in their calendar file and portal (K-070); whether and how the owner is
   notified of portal requests and supplied assets (K-071); whether the 40/30/30 schedule is
   shown on the public shared quote; the earliest allowed "acceptance received" date (the
   quote's creation day today, as there is no sent date).
6. **Owner answers parked on 2026-10-17** (`docs/STATUS.md` section 5, "Parked by the owner";
   `docs/PRIVACY-READINESS.md` section 10). Each answer replaces a placeholder; do not invent
   any of them.
7. **Operator, P0** (`docs/STATUS.md` section 3): confirm sessions revoked after the K-001
   rotation, delete the seed-password file and check the PHP error log (K-015, K-061), record
   what is live on the server (K-006), restore a backup (K-010).
8. **Operator, upload** (`docs/DEPLOYMENT.md` section 5, step 13 order): SQL 1 to 19 as needed, then the PHP
   set with `.htaccess`, keeping `_bootstrap.php`, `auth.php`, `oauth.php` and `users.php`
   together and `bookings.php` with `_ics.php`, `_money.php` present for `invoices.php`,
   `_time.php` with `support.php` and `time.php`, and `_templates.php` with `projects.php`;
   change the cPanel cron entry to the command-line form; run the post-upload checks in
   section 5.6, with no real payment and no real send.
9. **Owner test** on real data (K-044, K-055), recorded in `docs/STATUS.md`.
10. **Adviser review** of the legal pages and `docs/PRIVACY-READINESS.md` sections 9 and 11.
11. **Merge** PR #8, then `feat/redesign-2026`, then PR #20, then this branch (or each into the
   one below first). An agent does not merge.
12. Afterwards: the server time zone (K-067, K-075), header link contrast over the hero (K-069), a
   client upload path for assets (K-072), `requested_at` for asset waits (K-074), a quote
   detail view (K-077), deep-link misses (K-078), retention periods and client erasure (K-062), certificate ID length
   and throttle (K-061), `/sectors` keep-or-fold (K-066), the rest of the draft guard (K-083),
   the unnamed Client select in New project (K-088).

## Resume on another computer

1. `git fetch origin`, then `git switch feat/journeys-2026-10-18` and `git pull --ff-only`
   (the branch is pushed to origin). This branch holds everything in `audit/readiness-2026-10-17` plus the
   journeys batch.
2. `npm ci` (Node 22 or newer).
3. Read `docs/STATUS.md` (sections 0.1 to 0.6, 3 and 5) and `docs/KNOWN-ISSUES.md` K-056 to K-099,
   then this file and `docs/PRIVACY-READINESS.md`.
4. Baseline: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint:ratchet`,
   `npm run docs:check`; for server work, `npm run test:server` against a local `*_test`
   database (`docs/OPERATIONS.md` section 8). On the Mac run it with
   its own `GK_TEST_DB` and free ports, for example
   `GK_TEST_DB=gakinz_docs_test GK_TEST_PHP_PORT=5309 GK_TEST_PROVIDER_PORT=5310`, because
   ports 5191 and 5192 are taken there. Since 2026-10-19 the suite refuses a busy port with a
   message naming it, and stops its PHP workers when it ends or is interrupted.
5. `npm run dev` talks to the live API: any save is real. For browser checks use `npm run build`
   and `npx vite preview`, whose relative API paths reach no server, and stub the calls.
6. New work goes on a new branch from `feat/journeys-2026-10-18`, one concern per commit,
   pushed per verified batch, with a pull request.

## Mode

Existing Application (GEE OS `modes/EXISTING-APPLICATION.md`, workflow
`workflows/EXISTING-APPLICATION.md`). Production risk. Development calls the live API, so no
agent write runs through the dev server.

## Scope

- In scope:
  - Filling the parked placeholders as the owner supplies each answer.
  - Fixes from the owner's review of this branch, the operator's upload checks and the owner's test.
  - Building each owner decision listed in next actions 3 and 5 once it is made.
  - The retention job once periods are decided; the K-061 and K-066 leftovers.
  - Keeping every affected document current in the same pull request.
- Out of scope:
  - Uploading server files, running SQL, merging or deploying by an agent.
  - Writing legal substance (bases, periods, governing law) without the owner's answer.
  - A consent banner, until optional analytics, advertising or embeds are planned
    (`docs/PRIVACY-READINESS.md` section 4).
  - DNS, TLS, Cloudflare and mail hosting; HSTS belongs there (K-058).
  - Rewriting git history.

## Authority

- Research: yes.
- Create planning artefacts: yes.
- Edit local files: yes, on a feature branch. One concern per commit.
- Commit and push: on a feature branch only. No merge to `main` by an agent, because a push to
  `main` deploys `dist/`.
- Use external services: no. No real send, no real payment, no live API call.
- Change production: no. Server files and SQL are uploaded and run by the owner by hand.
- MCP reads: local only.
- MCP mutations: none.
- Local database: creating and dropping `*_test` databases on the local MariaDB or MySQL is
  permitted. Synthetic data only.

## Risk and dependencies

- Risk level: production (sign-in, token storage, money and client isolation code waiting to be
  uploaded).
- The upload-together rule for `_bootstrap.php`, `auth.php`, `oauth.php` and `users.php` is the
  one way this set can break sign-in.
- `bookings.php` without `_ics.php` breaks the calendar download; `invoices.php` without
  `_money.php` breaks every invoice action; `search.php` without `_like.php` breaks record
  search; `privacy.php` without `_retention.php` breaks the retention report; `time.php`
  without `_time.php` stops Log time on the Time screen (503).
- Required decisions: the parked owner answers, the P0 operator actions, and the go-ahead to
  merge after the owner test.

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
  - The deployed state remains UNVERIFIED until someone with server access checks it.

## Previous contracts

The 2026-10-17 readiness audit contract (`audit/readiness-2026-10-17`, PR #20) is complete;
its text is in git history at `8499761`. The D-046 redesign contract (2026-10-12 to
2026-10-16, `feat/redesign-2026`) is at `ef2d6f9`. The 2026-10-10 contract is at `d314833`, the batch 1
contract at `9db80b2`, and the 2026-09-22 public relaunch contract was merged as `f67f05b` (#5).
