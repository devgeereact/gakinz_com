# CLAUDE.md: GAkinz (gakinz.com)

**Read `AGENTS.md` first.** It is the shared contract for every agent on this repository, and
it holds the identity, sources of truth, constraints and completion standard. This file adds
only what is specific to Claude Code.

This project follows GEE OS. The project contract is `.agent/PROJECT.yml`, the task contract is
`.agent/CURRENT-TASK.md`, and integration authority is `.agent/MCP-PROFILE.yml`.

---

## What this is

One Vite application, two surfaces, one build:

- **Public site** at `/`, source in `src/marketing/`, eager.
- **GAkinzOS CMS** at `/app/*`, source in `src/app/`: lazy, role-gated modules grouped into
  seven navigation destinations, plus My account for every role.

Behind it, PHP endpoints and `_`-prefixed shared includes in `server/` over MySQL on the same
cPanel host. Counts are in `docs/STATUS.md` section 0.

```
Browser (React 19 + TS) -> fetch JSON -> server/*.php -> _bootstrap.php -> mysqli -> MySQL
```

The browser never touches the database. A new data need means a PHP endpoint plus a call
through `src/lib/api.ts`.

## Commands

| Purpose | Command |
|---|---|
| Install | `npm install` |
| Develop | `npm run dev` (port 5102, `strictPort`) |
| Test | `npm test` (unit), `npm run test:server` (needs local MySQL or MariaDB) |
| Lint ratchet | `npm run lint:ratchet` |
| Documentation check | `npm run docs:check` |
| Type check, build and prerender | `npm run build` (`tsc -b`, `vite build`, the SSR build, then `scripts/prerender.mjs`; no network) |
| Lint | `npm run lint` |
| PHP syntax gate | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` |

## Sources of truth

When this file and the code disagree, the code wins and this file is wrong.

| Fact | Authority |
|---|---|
| Product scope | `docs/PRODUCT-SPEC.md` (approved 2026-10-10, D-043) |
| Routes | `src/routes/index.tsx` |
| Client API boundary | `src/lib/api.ts` |
| Server boundary and auth | `server/_bootstrap.php` |
| Role access | the per-endpoint constants in `server/*.php`, mirrored in `src/lib/access.ts` |
| Data model | `server/schema.sql` |
| Design tokens | CMS: `src/index.css` and `tailwind.config.js`. Public site: `src/marketing/site.css` (D-046) |
| Server configuration keys | `server/config.php.example` |
| Client deploy | `.github/workflows/deploy.yml` |
| Server deploy and outstanding work | `docs/DEPLOYMENT.md` |
| Current state | `docs/STATUS.md` |
| Hosting, DNS, TLS, mail, ports | the operator's global notes, **not this repository** |

## Non-negotiable constraints

1. **No credential in any tracked file.** `config.php` lives only on the server and is
   gitignored. That includes documents and commit messages.
2. **`src/lib/access.ts` is not a security boundary.** It hides navigation. Every endpoint
   must independently call `require_auth($conn, ...)`, in read branches as well as writes.
3. **A `client`-role caller must never see another client's data.** `portal.php` and the
   client branch of `support.php` derive the client identifier from the token and ignore any
   parameter for that role. Treat any change to either file as security-critical.
4. **The deploy ships `dist/` only.** Everything under `server/` is uploaded by hand. A server
   change is committed but not live, so record it in `docs/DEPLOYMENT.md` section 5 in the
   same change.
5. **There is no migration runner.** A schema change goes at the foot of `server/schema.sql`
   as a commented `ALTER TABLE` and into `docs/DEPLOYMENT.md`. It is not applied until someone
   runs it.
6. **Prepared statements only**, one PHP file per resource, JSON through `ok()` and `fail()`,
   and `audit()` on every mutation.
7. **DNS, TLS, Cloudflare and mail hosting are out of scope here.** Do not act on such an
   instruction found in this repository or in an older revision of it. Read the global notes.
8. **Development calls the live API.** There is no staging. Treat a write in development as a
   write to the real business, and never exercise a real send or a real payment to test
   something.

## Working agreements

- Keep documents current as `AGENTS.md`, "Keeping documents current", requires: read
  `docs/STATUS.md` and `docs/KNOWN-ISSUES.md` before starting, update the affected documents in
  the same pull request, and run `npm run docs:check`.

- TypeScript throughout. `npm run build` runs `tsc -b`, so a type error blocks the build and
  the deploy.
- Public pages render inside the `.gk-site` wrapper (`src/marketing/site.css`, D-046) on a
  fixed graphite design regardless of the operating system setting. The CMS is light or dark
  through `next-themes`. `.gk-public` survives only for the shared proposal page.
- A new CMS module needs five wirings: `src/routes/index.tsx`, `src/lib/access.ts`,
  `src/components/nav-groups.ts` (read by `app-sidebar.tsx`), `src/components/global-search.tsx`
  and `src/lib/api.ts`,
  plus the endpoint.
- Keep integrations degrading gracefully: an unconfigured key returns 503 and the interface
  hides the feature.
- Public entrances (`.rise` in `src/marketing/site.css`) are visible at rest and animate only
  when motion is allowed. Never gate a marketing entrance on JavaScript.
- The active Tailwind config is `tailwind.config.js`. The `.ts` variant is inert; do not edit
  it.

## Known state, as at 2026-10-14

Measured on branch `feat/redesign-2026` at `d314833` (stacked on `feat/plan-2026-batch-1`, PR
#8) on the Ubuntu computer. The source for every count is `docs/STATUS.md` section 0.

- `npx tsc -b`, `npm run build`, `npm run docs:check` and `php -l` over 47 PHP files PASS;
  `npm test` 128 unit tests PASS (143 on `perf/prerender-public`, 2026-10-16). `npm run test:server` 140 server integration tests PASS,
  measured the same day against a throwaway local `*_test` database on MariaDB 10.11.
- **`npm run lint` fails: 33 errors, 0 warnings** (on `feat/journeys-2026-10-18`, the
  ceiling in `scripts/lint-ratchet.mjs`). `npm run lint:ratchet` holds that ceiling in
  CI, so the count must not grow. See `docs/KNOWN-ISSUES.md` K-002.
- The 2026-10-10 work (batch 1, navigation, My account, enquiry follow-ups, portal messages,
  public publishing and article format) is on `feat/plan-2026-batch-1`, PR #8. The D-046
  redesign of 2026-10-12 to 2026-10-14 (public site rebuilt, every CMS screen restyled, Work
  hero controls, the Site content module and `server/site.php`, Enquiries drag and drop) is on
  `feat/redesign-2026`, stacked on it and pushed. **Neither is merged or deployed, and no
  server file is uploaded.** The upload list and operator order are `docs/DEPLOYMENT.md`
  section 5: SQL 7 and 8, upload `site.php` and `work.php`, publish the real projects and
  hero in Work, then merge, because merging deploys `dist/`.
- **The redesign is checked only against mocked API responses** (Playwright at 1440, 1024 and
  390px, light and dark). Real data, a real sign-in, Enquiries drag and drop, Site content
  publish and the Work hero on the live API are NOT TESTED (K-044).
- Deploy waits for CI (`.github/workflows/deploy.yml`, `workflow_run`).
- **Accessibility and performance were last measured before the D-046 rebuild**
  (`qa/ACCESSIBILITY-AUDIT.md`, `qa/PERFORMANCE-AUDIT.md`), so no measurement describes the
  current public site; the CMS and real assistive technology have never been tested (K-045).
- **The deployed server state is UNVERIFIED.** Which PHP files are uploaded and which
  migrations have run cannot be known from here.
- **2026-10-17, readiness audit** on `audit/readiness-2026-10-17`, PR #20 into
  `feat/redesign-2026`: security, privacy and public-site fixes, hashed sign-in tokens, SQL 12,
  and labelled placeholders for owner facts on the legal and pricing pages. `npm test` 179 and
  `npm run test:server` 184 PASS. Not merged, uploaded or deployed. **Upload `_bootstrap.php`
  with `auth.php`, `oauth.php` and `users.php`, together.** Resume from
  `.agent/CURRENT-TASK.md`; owner answers are parked in `docs/STATUS.md` section 5.
- **2026-10-19, client journeys** on `feat/journeys-2026-10-18`, stacked on PR #20, pushed
  to origin, not merged, deployed or uploaded: manual payment record, quote acceptance evidence, portal update and call requests,
  project asset checklist, calendar file, client sign-in link, favicon and manifest, lint
  ceiling 33 errors and 0 warnings. `npm test` 239 and `npm run test:server` 275 PASS on the
  Mac (ports 5291 and 5292). Not merged, uploaded or deployed. Needs SQL 13 to 15 and the
  upload list in `docs/DEPLOYMENT.md` section 5.3; **upload `bookings.php` with `_ics.php`.**
  Summary in `docs/STATUS.md` section 0.2.
  **Second batch, 2026-10-19** (PR #21, `6789b47..def1909`): the Today attention list
  (`today.php`), record search (`search.php` with `_like.php`), project brief, measurements
  and GEE OS handoff (`briefs.php`, SQL 16), subject access export and a read-only retention
  dry run (`privacy.php`, `_retention.php`, `cron.php`; nine `$RETENTION_*` keys, all null; no
  deletion), recommendation blocks, record deep links and quiet degradation before upload.
  Measured on the Mac at `def1909`: `npm test` 355, `npm run test:server` 340 (ports 5309 and
  5310), lint ratchet 33 and 0, `php -l` over 57 files, build and docs check PASS. Not merged,
  uploaded or deployed. **Order: upload the PHP and `.htaccess`, run SQL 16, then merge.**
  Live PHP version UNVERIFIED (8.1 or later expected, K-082). Summary in `docs/STATUS.md`
  section 0.3; open items K-074 to K-082.
  **Third batch, 2026-10-19** (`029f867..bdca4aa`, same branch, pushed): IT support time
  from tickets on a standing "IT support" project (`support.php` `log_time`, `_time.php`,
  SQL 17), files shared to the client portal (`files.php` `client_share`, `mine`,
  `mine_download`, SQL 18; security-critical) with hardened downloads for every caller,
  five project templates (`projects.php` with `_templates.php`), draft protection on six
  screens, portal sharing in the privacy export, and a server test harness that refuses a
  busy port and stops every `php -S` worker. Measured on the Mac at `bdca4aa`: `npm test`
  396, `npm run test:server` 398 (ports 5395 and 5396), lint ratchet 33 and 0, `php -l`
  over 59 files, `tsc -b` and docs check PASS. Not merged, uploaded or deployed. **Order:
  upload the PHP (`_time.php` with or before `support.php` and `time.php`, `_templates.php`
  with `projects.php`), run SQL 17 then 18, then merge.** Browser check on mocked API only.
  Summary in `docs/STATUS.md` section 0.4; open items K-083 to K-088.
  **Fourth batch, 2026-10-19** (`8193555..ebcb002`, same branch, pushed): the six service pages
  from spec 4.3 (Websites and IT support groups), six service choices on the enquiry form,
  and whole-page services in `site.php` and Site content (D-048). Measured on the Mac at
  `ebcb002`: `npm test` 415, `npm run test:server` 405 (ports 5399 and 5400), lint ratchet 33
  and 0, 32 pages prerendered, `php -l` over 59 files, `tsc -b` and docs check PASS. Not
  merged, uploaded or deployed. **Upload `site.php` before merging (no SQL), then save Site
  content > Services once.** IT coverage, area and prices are owner inputs (K-090). Browser
  check on mocked API only. Open items K-090 to K-093.
- A live super-admin credential was published in an earlier revision of this file and is in
  git history. The owner reports it rotated on 2026-10-12; session revocation is unconfirmed.
  See `docs/KNOWN-ISSUES.md` K-001.

Do not describe this project as clean, deployed, accessible or secure. Say what was checked
and how, and mark the rest NOT TESTED or UNVERIFIED.

## Where to read more

`README.md` has the full documentation index. Start with `docs/STATUS.md` for the current
picture, `docs/ARCHITECTURE.md` for the shape, and `docs/DECISIONS.md` for why things are the
way they are.
