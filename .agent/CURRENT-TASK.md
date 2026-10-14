# Current Task Contract

## Outcome

The D-046 redesign build is complete on `feat/redesign-2026`, stacked on
`feat/plan-2026-batch-1` (PR #8) and pushed. It now waits for the operator steps and the
owner's test. Nothing is merged, deployed or uploaded.

The owner approved, through working prototypes, direction A "Live Wall" with the brand-colour
hero from direction C (`docs/DECISIONS.md` D-046, 2026-10-14), superseding D-037's visual
direction. What each piece changed is in `docs/STATUS.md` section 4; open work is in section 3.

### Done (2026-10-12 to 2026-10-14)

- Public site rebuilt on D-046, every page including legal, sectors, certificate check,
  articles and testimonials: `src/marketing/site.css` scoped to `.gk-site`, `site-ui.tsx`,
  `site-helpers.ts`, the owner's real projects and screenshots (`showcase.ts`,
  `public/images/work/`), editable copy with built-in defaults (`content.ts`).
- Server: `work.php` hero fields and the `setHero`, `heroOrder` and `hero` actions; new
  `site.php` (`site_content` draft and publish); schema at the foot of `server/schema.sql`;
  `docs/DEPLOYMENT.md` section 5 SQL 7 and 8 and the upload list.
- Client: `siteContent` and hero calls in `api.ts`; `site` in `access.ts`.
- CMS: D-046 tokens; self-hosted Bricolage Grotesque (opsz), Hanken Grotesk and JetBrains Mono,
  with the Google Fonts import removed; a dark sidebar in both themes, new header, `AuthFrame`
  sign-in pages; shared `ui` primitives restyled; background themes retired (light and dark
  only); the page kit (`src/app/components/page-kit.tsx`) and every screen restyled on it.
- New: Work hero switches, the Site content module (`Site.tsx`, `siteContentModel.ts`),
  Enquiries drag and drop between stages (a new write path calling the existing `move()`).
- Fixes: the Verify page error state; iPhone and iPad sessions labelled iOS; Work edit no
  longer crashes on a detail response without images (K-049).
- Documents brought up to date with the build (this sweep, branch `docs/redesign-state`).

### Verification status, 2026-10-14

- Type check (`npx tsc -b`): PASS.
- Unit tests (`npm test`): PASS, 128.
- Server integration tests (`npm run test:server`, local MariaDB 10.11): PASS, 140.
- Build (`npm run build`): PASS.
- Lint ratchet: PASS at the ceiling, 41 errors and 1 warning, unchanged. `npm run lint`: FAIL
  (K-002).
- Documentation check (`npm run docs:check`): PASS.
- PHP syntax (`php -l`, 47 files): PASS.
- Public site and CMS in a browser: PARTIAL. Playwright against mocked API responses only, at
  1440, 1024 and 390px, light and dark.
- Real data, real sign-in, Work hero, Site content publish and Enquiries drag and drop on the
  live API: NOT TESTED (K-044).
- Accessibility (axe, contrast, focus, real assistive technology) of the rebuilt public site
  and the CMS: NOT TESTED (K-045).
- Lighthouse and CLS after the font change: NOT TESTED (K-042, K-045).
- Deployed server state: UNVERIFIED (K-006).

## Next actions, in order

1. **Operator** (`docs/DEPLOYMENT.md` section 5.1): run SQL 7 and 8 on the live database;
   upload `server/site.php` (new) and `server/work.php`, together with the rest of the PR #8
   upload set if it is not already live.
2. **Operator, in the CMS:** publish the real projects in Work with consent stored, switch on
   up to five for the hero, attach the screenshots with alt text. A published record shows on
   the live `/work` page straight away.
3. **Owner test** on the other computer after `git pull --ff-only`: the Work hero switches,
   a Site content publish, Enquiries drag and drop, and the Client Portal signed in as a
   client. Development calls the live API, so every save is real. Record the result in
   `docs/STATUS.md` and close or update K-044.
4. **Merge**, which deploys `dist/` through CI: PR #8, then the redesign. An agent does not
   merge.
5. Afterwards: re-run the accessibility and performance audits (K-045), the small hygiene
   change in K-046, and the Site content tabs at 390px (K-048).

The owner inputs in `docs/STATUS.md` section 5 (credential and seed-file checks, backup,
business and pricing facts) still gate any real order.

## Resume on another computer

1. `gh repo clone devgeereact/gakinz_com` (or `git fetch origin` in an existing
   clone), then `git switch feat/redesign-2026` and `git pull --ff-only`. Until PR #8 and the
   redesign are merged, this branch, not `main`, holds all the work.
2. `npm ci` (Node 22 or newer; CI uses 22).
3. Read `docs/STATUS.md` and `docs/KNOWN-ISSUES.md` before starting (`AGENTS.md`, "Keeping
   documents current"), then this file.
4. Check the baseline: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint:ratchet`,
   `npm run docs:check`. For server work set up the local test database once
   (`docs/OPERATIONS.md` section 8) and run `npm run test:server`.
5. `npm run dev` talks to the live API: any save is real. Never copy `server/config.php` or
   `.env` files between computers.
6. New work goes on a new branch from `feat/redesign-2026` (or from `main` once merged), one
   concern per commit, pushed per verified batch, with a pull request.

## Mode

Existing Application (GEE OS `modes/EXISTING-APPLICATION.md`, workflow
`workflows/EXISTING-APPLICATION.md`). Production risk. Development calls the live API, so no
agent write runs through the dev server.

## Scope

- In scope:
  - The operator steps and owner test above, recorded in `docs/STATUS.md` with dates.
  - Fixes the owner's test turns up, on a branch from `feat/redesign-2026`.
  - The small follow-ups K-046 and K-048, and re-running the audits (K-045).
  - Keeping every affected document current in the same pull request (`AGENTS.md`, "Keeping
    documents current").
- Out of scope:
  - Uploading server files, running SQL, merging or deploying by an agent.
  - Customer reference sign-in, bookings, feedback and the other phase 2 items not yet started,
    until named in a new contract.
  - Monetisation and social set-up.
  - DNS, TLS, mail hosting.
  - Rewriting git history, including the malformed commit subjects in K-047.

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

- Risk level: production (money, sign-in and client isolation code from PR #8, plus the new
  hero and site content writes, are waiting to be uploaded).
- Affected areas: `server/work.php`, `server/site.php` and the rest of the upload set in
  `docs/DEPLOYMENT.md` section 5; the public site; every CMS screen.
- Required decisions: the owner inputs in `docs/STATUS.md` section 5, in particular K-001,
  K-006, K-010 and K-015 actions, and the go-ahead to merge after the owner test.

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

## Previous contracts

The 2026-10-10 contract (batch 1 to the documentation refresh, merged into
`feat/plan-2026-batch-1` as PR #9 to #17) is complete; its text is in git history at
`d314833`. The batch 1 contract text is at `9db80b2`, and the 2026-09-22 public relaunch
contract was merged as `f67f05b` (#5).
