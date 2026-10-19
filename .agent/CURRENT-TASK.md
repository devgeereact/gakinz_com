# Current Task Contract

## Outcome

The client journeys batch of 2026-10-18 to 2026-10-19 is built, tested locally and documented
on `feat/journeys-2026-10-18`: 43 commits on `audit/readiness-2026-10-17` at `8499761`
(PR #20), plus the documentation commits. **Pushed to origin, not merged, deployed or uploaded.** SQL 13
to 15 have run only on the throwaway test database. The owner reviews it at 06:00 on
2026-10-19.

The branch stack is now: `main` <- `feat/plan-2026-batch-1` (PR #8) <- `feat/redesign-2026` <-
`audit/readiness-2026-10-17` (PR #20) <- `feat/journeys-2026-10-18`. Merge in that order, and
only after the operator steps below, because a merge to `main` deploys `dist/`.

The verdict of `docs/STATUS.md` section 0.1 still stands: **not ready for production.**

### Done on `feat/journeys-2026-10-18` (2026-10-18 to 2026-10-19)

Server (upload by hand; `docs/DEPLOYMENT.md` section 5.3):

- `invoices.php`: `record_payment`, a bank transfer, cash, cheque or other payment checked
  against the `_money.php` payable total (needs SQL 13; requires `_money.php`).
- `proposals.php`: acceptance evidence and a SHA-256 terms fingerprint, the 40/30/30 split in
  integer pence, "Accepted on" on the public view (needs SQL 14; K-068).
- `support.php`: client `update_request`. `bookings.php`: client `request` and `mine`, at most
  five open call requests, and `ics` / `mine_ics` calendar files built by the new `_ics.php`.
  **Upload `bookings.php` and `_ics.php` together.**
- `assets.php` (new): project asset checklist with a client `mine` and `supply` branch (needs
  SQL 15; K-072).
- `schema.sql`: SQL 13, 14 and 15 at the foot.

Client: Record payment dialog in Invoicing; evidence fields in the Quotes accept dialog;
Requests card (update and call requests) and "What we need from you" in the portal; the asset
panel on the project board; calendar download in Enquiries, Calls and the portal; "Client
sign in" in the public header, drawer and footer; `favicon.ico` and `site.webmanifest`
(K-066); the lint ceiling cut to 33 errors and 0 warnings (K-002); toasts following the theme
at AA, a focusable Projects board region and an inline refused-acceptance message (K-073).

Documents: `docs/STATUS.md` (sections 0, 0.2, 2, 3, 4, 5), `docs/KNOWN-ISSUES.md` (K-002,
K-046, K-048, K-054 row, K-055, K-066, new K-067 to K-073), `docs/DEPLOYMENT.md` section 5,
`docs/DATA-MODEL.md`, `docs/API-SPEC.md`, `docs/SECURITY.md`, `docs/PRODUCT-SPEC.md` section 7,
`docs/ARCHITECTURE.md`, `server/README.md`, `CLAUDE.md`.

### Verification status, 2026-10-19 (Mac)

- `npx tsc -b`, `npm run build` (30 pages prerendered): PASS.
- `npm test`: PASS, 239 (223 before the final-review fixes added 16 in `portalRequestsModel` and `assetChecklistModel`). `GK_TEST_PHP_PORT=5291 GK_TEST_PROVIDER_PORT=5292 npm run test:server`
  (local MariaDB `*_test`; port 5192 is held by another project on the Mac): PASS, 275.
- `npm run lint:ratchet`: PASS at 33 errors, 0 warnings. `npm run lint`: FAIL (K-002).
- `php -l` over 51 server files: PASS. `npm run docs:check -- --base audit/readiness-2026-10-17`:
  PASS.
- Production build in a browser with every API call stubbed and off-origin requests blocked:
  Invoicing, Quotes and the public quote, the client portal, the Projects asset panel,
  Enquiries Calls and the public site at 1440 and 390px, light and dark. axe 4.13: 0
  violations after the K-073 fixes. One design risk recorded (K-069).
- NOT TESTED: the live server and database, a real sign-in, SQL 13 to 15 on the host, the
  asset 503 state, races between two requests, real calendar apps importing the file, real
  assistive technology.
- Deployed server state: UNVERIFIED (K-006).

## Next actions, in order

1. **Owner review** of `feat/journeys-2026-10-18` (06:00, 2026-10-19), then push it and open a
   pull request into `audit/readiness-2026-10-17` (PR #20's branch). An agent does not merge.
2. **Owner decisions** raised by this batch (`docs/STATUS.md` section 5): whether clients see
   the meeting link in their calendar file and portal (K-070); whether and how the owner is
   notified of portal requests and supplied assets (K-071); whether the 40/30/30 schedule is
   shown on the public shared quote; the earliest allowed "acceptance received" date (the
   quote's creation day today, as there is no sent date).
3. **Owner answers parked on 2026-10-17** (`docs/STATUS.md` section 5, "Parked by the owner";
   `docs/PRIVACY-READINESS.md` section 10). Each answer replaces a placeholder; do not invent
   any of them.
4. **Operator, P0** (`docs/STATUS.md` section 3): confirm sessions revoked after the K-001
   rotation, delete the seed-password file and check the PHP error log (K-015, K-061), record
   what is live on the server (K-006), restore a backup (K-010).
5. **Operator, upload** (`docs/DEPLOYMENT.md` section 5): SQL 1 to 15 as needed, then the PHP
   set with `.htaccess`, keeping `_bootstrap.php`, `auth.php`, `oauth.php` and `users.php`
   together and `bookings.php` with `_ics.php`, and `_money.php` present for `invoices.php`;
   change the cPanel cron entry to the command-line form; run the post-upload checks in
   section 5.6, with no real payment and no real send.
6. **Owner test** on real data (K-044, K-055), recorded in `docs/STATUS.md`.
7. **Adviser review** of the legal pages and `docs/PRIVACY-READINESS.md` sections 9 and 11.
8. **Merge** PR #8, then `feat/redesign-2026`, then PR #20, then this branch (or each into the
   one below first). An agent does not merge.
9. Afterwards: the server time zone (K-067), header link contrast over the hero (K-069), a
   client upload path for assets (K-072), the retention job (K-062), certificate ID length
   and throttle (K-061), `/sectors` keep-or-fold (K-066).

## Resume on another computer

1. `git fetch origin`, then `git switch feat/journeys-2026-10-18` and `git pull --ff-only`
   (the branch is pushed to origin). This branch holds everything in `audit/readiness-2026-10-17` plus the
   journeys batch.
2. `npm ci` (Node 22 or newer).
3. Read `docs/STATUS.md` (sections 0.1, 0.2, 3 and 5) and `docs/KNOWN-ISSUES.md` K-056 to K-073,
   then this file and `docs/PRIVACY-READINESS.md`.
4. Baseline: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint:ratchet`,
   `npm run docs:check`; for server work, `npm run test:server` against a local `*_test`
   database (`docs/OPERATIONS.md` section 8). On the Mac run it with
   `GK_TEST_PHP_PORT=5291 GK_TEST_PROVIDER_PORT=5292`, because port 5192 is taken there.
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
  - Building each owner decision listed in next action 2 once it is made.
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
  `_money.php` breaks every invoice action.
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
