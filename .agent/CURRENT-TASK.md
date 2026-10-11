# Current Task Contract

## Outcome

The 2026-10-10 implementation work is complete and every section PR (#9 to #17) is merged into
`feat/plan-2026-batch-1`, which is PR #8 to `main`: batch 1 (money, sign-in, quotes, blog, CI),
the seven-destination navigation, My account, enquiry follow-ups, client portal messages, public
publishing and the article format, the lock-screen token fix, the public redesign on D-037, the
favicon and share image, dead-code removal, and a documentation refresh with a sync rule checked
in CI (D-045). CI on PR #8 passes. The merged section branches still exist on GitHub and can be
deleted once PR #8 is merged.
What each piece changed is in `docs/STATUS.md` section 4; what is still open is in section 3.

Nothing is merged, deployed or uploaded. The next task starts only when the owner chooses it:

1. **Owner inputs** (`docs/STATUS.md` section 5): the credential and seed-file actions, the
   server reconciliation and upload (`docs/DEPLOYMENT.md` section 5), backup and recovery, and
   the business, pricing and content facts that unlock the six-service public copy.
2. **The CMS redesign slice**: the target system from `docs/DESIGN-SYSTEM.md` section 10 applied
   to the CMS, starting with Today, without changing URLs or role access.

## Resume on another computer

1. `gh repo clone devgeereact/gakinz_com` (or `git fetch origin` in an existing
   clone), then `git switch feat/plan-2026-batch-1` and `git pull --ff-only`. Until PR #8 is
   merged, this branch, not `main`, holds all the work.
2. `npm ci` (Node 22 or newer; CI uses 22).
3. Read `docs/STATUS.md` and `docs/KNOWN-ISSUES.md` before starting (`AGENTS.md`, "Keeping
   documents current"), then this file.
4. Check the baseline: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint:ratchet`,
   `npm run docs:check`. For server work set up the local test database once
   (`docs/OPERATIONS.md` section 8) and run `npm run test:server`.
5. Never run `npm run dev` for writes: it talks to the live API. Never copy `server/config.php`
   or `.env` files between computers.
6. New work goes on a new branch from `feat/plan-2026-batch-1` (or from `main` once PR #8 is
   merged), one concern per commit, pushed per verified batch, with a pull request.

## Mode

Existing Application (GEE OS `modes/EXISTING-APPLICATION.md`, workflow
`workflows/EXISTING-APPLICATION.md`). Production risk. Development calls the live API, so no
write runs through the dev server.

## Scope

- In scope:
  - Review and merge of PR #8 once CI passes, by the owner.
  - The owner inputs above, recorded in `docs/STATUS.md` section 5 with dates.
  - The CMS redesign slice, when the owner approves it as the next task.
  - Keeping every affected document current in the same pull request (`AGENTS.md`, "Keeping
    documents current").
- Out of scope:
  - Uploading server files, running SQL or deploying without the owner's explicit approval.
  - Customer reference sign-in, bookings, feedback and the other phase 2 items not yet started,
    until named in a new contract.
  - Monetisation and social set-up.
  - DNS, TLS, mail hosting.
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

- Risk level: production (money, sign-in and client isolation code is waiting to be uploaded).
- Affected areas: `server/` (the upload set in `docs/DEPLOYMENT.md` section 5), the CMS shell and
  modules for the redesign slice, `src/index.css` and `tailwind.config.js` for CMS tokens.
- Required decisions: the owner inputs in `docs/STATUS.md` section 5, in particular K-001,
  K-006, K-010 and K-015 actions, the payment provider, and the CMS redesign go-ahead.

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
  - The deployed state remains UNVERIFIED until someone with server access checks it, and is
    reported as such.

## Previous contract

The batch 1 contract of 2026-10-10 (branch `feat/plan-2026-batch-1`) is complete; its text is in
git history at `9db80b2`. The 2026-09-22 public relaunch contract was merged as `f67f05b` (#5).
