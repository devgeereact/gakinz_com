# Current Task Contract

## Outcome

The production and privacy readiness audit of 2026-10-17 is complete on
`audit/readiness-2026-10-17`, open as **PR #20** into `feat/redesign-2026`, and pushed. Every
fix that needed no owner decision is built, tested and documented. Nothing is merged,
deployed or uploaded.

The branch stack is now: `main` ← `feat/plan-2026-batch-1` (PR #8) ← `feat/redesign-2026` ←
`audit/readiness-2026-10-17` (PR #20). Merge in that order, and only after the operator steps
below, because a merge to `main` deploys `dist/`.

The audit's verdict (`docs/STATUS.md` section 0.1): **not ready for production.** The P0
operator items still stand, retention and deletion do not exist (K-062), and the legal pages
carry labelled placeholders for owner facts (K-063).

### Done on `audit/readiness-2026-10-17` (2026-10-17)

Server (upload by hand; `docs/DEPLOYMENT.md` section 5.3):

- `users.php`: an admin can no longer demote or suspend a super admin (K-056).
- `auth.php`: login throttle per email and address; ten-attempt cap on signed-in two-factor
  checks; reset links claimed atomically; even timing for unknown emails; a two-factor code
  works once (needs SQL 12) (K-057).
- `_bootstrap.php`, `auth.php`, `oauth.php`, `users.php`: sign-in, reset and magic-link tokens
  stored hashed, with no schema change and nobody signed out (K-059). **These four files must
  be uploaded together**, or every sign-in fails with a 500.
- `.htaccess`: four browser security headers on every response (K-058).
- `api.php` drops the PHP version; `work.php` refuses non-image Work pictures; `payments.php`
  ignores a PayPal return while PayPal is off (K-061).
- `proposals.php`: declined and lapsed links answer 410; `unshare` revokes a link (K-060).
- `cron.php`: runs from the command line; new `prune` job for expired tokens (K-061, K-062).
  The cPanel cron entry must change (`docs/OPERATIONS.md` section 2).
- `schema.sql`: SQL 12, `users.totp_last_step` (optional; replay is blocked once it runs).

Client:

- Plain-language API failures (`api.ts`), no exception text on the error page.
- Contact form: real-error-only descriptions, length cap, privacy notice, package carried from
  Pricing.
- 404 noindex, footer mailto and cookie link, robots fix, case-study call to action and honest
  status, ISO post dates, `llms.txt` corrected, Proposals Revoke button.
- `/privacy`, `/cookies`, `/terms`, `/pricing`: verified facts, and every unknown owner fact as
  a bracketed placeholder rendered as the D-027 `.gap` marker (owner's instruction,
  2026-10-17). Replace the bracketed text in `src/marketing/pages/Legal.tsx` or `Pricing.tsx`
  to remove a marker.

Documents: `docs/PRIVACY-READINESS.md` (new: data inventory, vendors, cookies and storage,
proposed retention, rights, draft notice, owner and legal questions, ICO sources), K-056 to
K-066 in `docs/KNOWN-ISSUES.md`, `docs/STATUS.md` section 0.1, `docs/DEPLOYMENT.md` section 5
(SQL 12, upload list, upload-together rule, header check), `docs/OPERATIONS.md` section 2,
`docs/SECURITY.md`, `docs/DATA-MODEL.md`.

### Verification status, 2026-10-17 (Mac)

- `npx tsc -b`, `npm run build` (30 pages prerendered): PASS.
- `npm test`: PASS, 179. `npm run test:server` (local MariaDB `*_test`): PASS, 184.
- `npm run lint:ratchet`: PASS at 41 errors, 1 warning. `npm run lint`: FAIL (K-002).
- `npm run docs:check -- --base feat/redesign-2026`: PASS. `php -l`, 49 files: PASS.
- Production build in a browser, every API call stubbed and every non-local request blocked:
  30 pages and the 404 at 320, 390, 768 and 1440px, no horizontal scroll, no console errors,
  no third-party request, no cookie or browser storage on public pages. axe 4.13 (WCAG 2.2 AA
  rules) on seven pages at 1280 and 390px: 0 violations. Contact form failure states, the
  pricing-to-contact package and the Proposals Revoke button checked with mocked responses.
- NOT TESTED: the live server, live headers, a real sign-in, real data, real assistive
  technology, the CMS beyond the screens named.
- Deployed server state: UNVERIFIED (K-006).

## Next actions, in order

1. **Owner answers, parked on 2026-10-17** (`docs/STATUS.md` section 5, "Parked by the owner";
   `docs/PRIVACY-READINESS.md` section 10): trading form and legal name, ICO fee and number,
   which integrations are live and where data is hosted, AI drafting with client text (K-064),
   retention periods, VAT basis, governing law, testimonial sources and ratings (K-065). Each
   answer replaces a placeholder on the site; do not invent any of them.
2. **Operator, P0** (`docs/STATUS.md` section 3): confirm sessions revoked after the K-001
   rotation, delete the seed-password file and check the PHP error log for a seed password
   (K-015, K-061), record what is live on the server (K-006), restore a backup (K-010).
3. **Operator, upload** (`docs/DEPLOYMENT.md` section 5): SQL 1 to 12 as needed, then the PHP
   set with `.htaccess`, keeping `_bootstrap.php`, `auth.php`, `oauth.php` and `users.php`
   together; change the cPanel cron entry to the command-line form; run the post-upload checks
   in section 5.6, including the header check.
4. **Owner test** on real data (K-044, K-055), recorded in `docs/STATUS.md`.
5. **Adviser review** of the legal pages and `docs/PRIVACY-READINESS.md` sections 9 and 11.
6. **Merge** PR #8, then `feat/redesign-2026`, then PR #20 (or PR #20 into the redesign first).
   An agent does not merge.
7. Afterwards: retention job once periods are agreed (K-062), certificate ID length and
   throttle (K-061), `/sectors` keep-or-fold, `favicon.ico` and web manifest (K-066).

## Resume on another computer

1. `git fetch origin`, then `git switch audit/readiness-2026-10-17` and `git pull --ff-only`.
   This branch holds everything in `feat/redesign-2026` plus the audit.
2. `npm ci` (Node 22 or newer).
3. Read `docs/STATUS.md` (sections 0.1, 3 and 5) and `docs/KNOWN-ISSUES.md` K-056 to K-066,
   then this file and `docs/PRIVACY-READINESS.md`.
4. Baseline: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint:ratchet`,
   `npm run docs:check`; for server work, `npm run test:server` against a local `*_test`
   database (`docs/OPERATIONS.md` section 8).
5. `npm run dev` talks to the live API: any save is real. For browser checks use `npm run build`
   and `npx vite preview`, whose relative API paths reach no server, and stub the calls.
6. New work goes on a new branch from `audit/readiness-2026-10-17`, one concern per commit,
   pushed per verified batch, with a pull request.

## Mode

Existing Application (GEE OS `modes/EXISTING-APPLICATION.md`, workflow
`workflows/EXISTING-APPLICATION.md`). Production risk. Development calls the live API, so no
agent write runs through the dev server.

## Scope

- In scope:
  - Filling the parked placeholders as the owner supplies each answer.
  - Fixes from the operator's upload checks and the owner's test.
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

The D-046 redesign contract (2026-10-12 to 2026-10-16, `feat/redesign-2026`) is complete; its
text is in git history at `ef2d6f9`. The 2026-10-10 contract is at `d314833`, the batch 1
contract at `9db80b2`, and the 2026-09-22 public relaunch contract was merged as `f67f05b` (#5).
