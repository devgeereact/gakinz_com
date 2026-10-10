# Current Task Contract

## Outcome

The first implementation batch of the 2026 production plan (`docs/Plans 2026/05-DELIVERY-AND-HOUSEKEEPING.md`, "First implementation batch") is built on a branch, one concern per commit, each with evidence. At the end, money and sign-in defects A22, A23, A25, A26, A27 and A12 are fixed in source and covered by tests against a local synthetic database. The blog edit (A06), dashboard zeros (A08) and mobile overflow (A07) are fixed. CI runs tests and PHP syntax, and deploy waits for CI (A15). Project contract files match the GEE OS templates.

Started 10 October 2026 on the owner's instruction "Lets Build now And make sure files and packages are Matching the GEE OS".

## Mode

Existing Application (GEE OS `modes/EXISTING-APPLICATION.md`, workflow `workflows/EXISTING-APPLICATION.md`). Production risk. Development calls the live API, so nothing in this task runs the dev server against it for writes.

## Scope

- In scope:
  - A synthetic test path. A local PHP server runs a copy of `server/` against a throwaway local `gakinz_test` database, with no live host and no transports.
  - Server fixes in `auth.php`, `payments.php` and `proposals.php`, plus the schema additions they need. Schema changes are commented at the foot of `server/schema.sql` and recorded in `docs/DEPLOYMENT.md`.
  - Client fixes in `Blog.tsx`, `Dashboard.tsx`, Invoicing and Platform layout, and `csv.ts` if time allows.
  - The `.github/workflows` gating.
  - Correcting the stale facts in agent and contract files (plan document 01, A28).
- Out of scope:
  - The design-system rebuild and the six-service public content (plan phases 3 and 4). These wait for the owner's document 10 inputs.
  - Customer messaging and feedback (phase 2).
  - Monetisation and social.
  - Deleting the plan folder.
  - DNS, TLS, mail hosting.
  - Git history rewriting.

## Authority

- Research: yes.
- Create planning artefacts: yes.
- Edit local files: yes, on branch `feat/plan-2026-batch-1`.
- Commit: one concern per commit on the branch. No merge to `main`, because a push to `main` deploys `dist/`.
- Use external services: no. No real send, no real payment, no live API call.
- Change production: no. Server files and SQL are uploaded and run by the owner by hand.
- MCP reads: local only.
- MCP mutations: none.
- Local database: creating and dropping `gakinz_test` on the local MariaDB is permitted. It holds synthetic data only.

## Risk and dependencies

- Risk level: production (money and sign-in code).
- Affected areas: `server/auth.php`, `server/payments.php`, `server/proposals.php`, `server/schema.sql`, `src/app/modules/Blog.tsx`, `src/app/modules/Dashboard.tsx`, `src/app/modules/Invoicing.tsx`, `src/app/modules/Platform.tsx`, `.github/workflows/*.yml`, `docs/DEPLOYMENT.md`, `docs/KNOWN-ISSUES.md`.
- Required decisions still open (plan document 10): owner-side K-001, K-006, K-010 and K-015 actions; payment provider choice (the recommendation of Stripe only is applied by hiding PayPal links, which is reversible).

## Evidence

- Required checks:
  - `npm test` (unit and server integration)
  - `npm run typecheck`
  - `npm run build`
  - `php -l` over `server/`
  - `npm run lint` must not exceed 47 errors and 2 warnings
- Completion conditions:
  - Each fix has a failing-then-passing test or a recorded manual check.
  - `docs/DEPLOYMENT.md` lists every server file and SQL statement to upload.
  - `docs/KNOWN-ISSUES.md` and `docs/STATUS.md` reflect the new state.
  - Deployed state remains UNVERIFIED and is reported as such.

## Previous contract

The 2026-09-22 public relaunch contract was completed and merged as `f67f05b` (#5). Its full text remains in git history at that commit.
