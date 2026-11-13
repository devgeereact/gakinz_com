# GAkinz

The website and private workspace for **GAkinz**, websites and everyday IT support for small
businesses, run by Gideon Akinlotan. One Vite application serves two surfaces from one domain
and one build:

- **Public site** at `/`. The live site is the approved 2026 redesign (D-046, in `main` and
  released): a brand-colour hero fed by the CMS Work module, the owner's real projects, and key
  copy edited in the CMS Site content module. It offers six services under the GAkinz name with
  Gideon named as the owner (D-038, D-039; six service pages are in the live sitemap). The copy
  rule is in the
  header of `src/marketing/data/site.ts` and is worth reading before changing a word of it.
- **GAkinzOS** at `/app/*`, the CMS that runs enquiries, clients, projects, quotes,
  invoicing, support, time, content, the public work and site copy, and a client portal.

Behind them sits a PHP and MySQL API on cPanel shared hosting.

---

## Quick start

```bash
pnpm install
pnpm run dev          # http://localhost:5102
```

Port 5102 is pinned with `strictPort`, so a clash fails loudly. This matters: in development
the app calls the **live** API at `https://gakinz.com`, and the live CORS allowlist names one
localhost port. A drifted port shows up as an opaque CORS failure, not as a port error.

The dev server has no local PHP or MySQL behind it. **Development runs against production
data.** Treat every write as a write to the real business. Server behaviour is tested only
through `pnpm run test:server`, against a throwaway local database (`docs/OPERATIONS.md`
section 8).

## Commands

| Command | Purpose |
|---|---|
| `pnpm run dev` | Dev server on port 5102 |
| `pnpm run build` | `tsc -b`, `vite build`, an SSR build, then `scripts/prerender.mjs` (32 public pages, `404.html`, `app-shell.html`, `sitemap.xml`); output in `dist/`, no network |
| `pnpm run preview` | Serve the built output on port 5102 |
| `pnpm test` | Vitest unit tests, single run |
| `pnpm run test:server` | PHP endpoints against a throwaway local `*_test` database |
| `pnpm run test:watch` | Vitest in watch mode |
| `pnpm run verify` | The release checks and build plus the upload guard, on uncommitted work. Never contacts the host |
| `pnpm run release` | Dry run of a release over SSH; add `-- --go` to upload. A push to `main` does this from GitHub Actions |
| `pnpm run check:live` | After a release: 17 read-only GET checks, plus one per sitemap article, against the live site (`docs/DEPLOYMENT.md` section 5). `unknown URL answers 404` passes since the V1.2 release and `server/.htaccess` upload (2026-11-13; 20 of 20) |
| `pnpm run check:htaccess` | After `pnpm run build`: runs `server/.htaccess` under the Mac's Apache with PHP-FPM (ports 5491 and 5492) over a copy of `dist/` and checks its routing and 404s. Exit 2 (BLOCKED) without `httpd` or `php-fpm` |
| `pnpm run typecheck` | `tsc -b --noEmit` |
| `pnpm run lint` | ESLint. Must report 0 errors and 0 warnings; CI and `release.json` run it (K-002 closed) |
| `pnpm run docs:check` | Fails on a broken document link, or (with `-- --base <ref>`) a server or schema change without its documents. CI runs it |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | PHP syntax gate |

## Stack

React 19 and TypeScript on Vite 7, Tailwind v4 (Vite plugin) with shadcn and Radix primitives, React Router
7, Zustand. The API is plain PHP 8 over `mysqli`, one file per resource, with no framework and
no Composer dependency. Tests are Vitest. Deploys run on GitHub Actions.

## Layout

```
src/
  marketing/     public site: layout, pages, site.css (styles, scoped to .gk-site)
    components/  site-ui.tsx and site-helpers.ts (shared public parts), Seo.tsx
    data/        site.ts (default copy), content.ts (Site content over the defaults),
                 showcase.ts (projects and hero), work.ts and blog.ts (API reads)
  app/           GAkinzOS CMS: modules, My account, login, route guard
  components/    shared UI, shadcn primitives under ui/
  layouts/       CMS shell
  lib/           api.ts (the client API boundary), access.ts (role map)
  routes/        the single route table
  store/         auth state
  index.css      design tokens for both surfaces, and the utility layer
server/          PHP endpoints and shared includes, schema.sql, .htaccess, config template
tests/server/    server integration tests, run against a local *_test database
scripts/         release, prerender and documentation check
docs/            project documentation, flat, see below
.claude/skills/  the gakinz-design project skill (design rules and checks)
```

## Deployment, in one paragraph

A push to `main` that changes more than documents, once every CI check has passed, runs
`scripts/release.mjs --go` through GitHub Actions (the `deploy` job in `.github/workflows/ci.yml`, which
calls `.github/workflows/deploy.yml`; settings in `release.json`): it builds, snapshots every live file it
is about to change, uploads `dist/` and `server/*.php` over SSH without deleting anything, runs smoke
checks and rolls back by itself if they fail. Never sent: `config.php`, `.htaccess`, `schema.sql`,
Markdown and `*.example`. `.htaccess` changes and SQL migrations are still applied by hand, because there
is no migration runner. Details and rollback: `docs/DEPLOYMENT.md`.

## Documentation

Read `AGENTS.md` first if you are an agent. It is the shared contract, and its "Keeping
documents current" section says which document a change must update. Each file below is listed
once.

| File | What it holds |
|---|---|
| `AGENTS.md` | The contract every agent works to, including the document-sync rule |
| `CLAUDE.md` | The Claude Code pointer into it; points to the workbook for current state |
| `CODEX.md` | The Codex pointer into it |
| `.agent/PROJECT.yml` | The GEE OS project contract: route, risk and sources |
| `.agent/CURRENT-TASK.md` | The task in hand, its scope, authority and evidence |
| `.agent/MCP-PROFILE.yml` | Which integrations an agent may read or change |
| `server/README.md` | The server folder: install steps and what each file is for |
| `docs/ROADMAP.md` | What is done, what is left and what is parked: the V1, V1.1 and V1.2 finish lines, the planned V2, the parking lot by theme, what was cut and what waits for the owner |
| `docs/superpowers/` | The planning: `specs/` (what and why, with the constraints) and `plans/` (the tasks agents build from), one pair per piece of work |
| `docs/CHANGELOG.md` | What changed in the product, newest first |
| `docs/VERIFICATION.md` | What was actually run for the finish line, and the owner's own walk through it |
| `docs/WORKBOOK.md` | The one page to work from: state, what is left, standing rules and order of work. Start here |
| `docs/STATUS.md` | Current state and every measured count, delivery phases, open work, owner inputs. The file that changes most |
| `docs/KNOWN-ISSUES.md` | Open and fixed problems, with evidence and status |
| `docs/DECISIONS.md` | Dated decision records, including superseded ones |
| `docs/PRODUCT-SPEC.md` | The approved scope: services, public pages, CMS journeys, customer access, planned features, exclusions, and the original brief's 175-feature register |
| `docs/ARCHITECTURE.md` | Shape, client, server, request lifecycle and the release path |
| `docs/DATA-MODEL.md` | The tables, ownership, share tokens, and the migration situation |
| `docs/API-SPEC.md` | The endpoints, their actions and their role gates |
| `docs/SECURITY.md` | Authentication, roles, client isolation, payments, secrets, open gaps |
| `docs/PRIVACY-READINESS.md` | Data inventory, vendors, cookies and storage, proposed retention, rights pathways and a draft privacy notice for the owner and an adviser (2026-10-17) |
| `docs/DEPLOYMENT.md` | The release script, rollback, and the SQL and `.htaccess` steps still done by hand |
| `docs/OPERATIONS.md` | Local development, cron jobs, monitoring, mail, test environment rules, launch gates, recovery targets |
| `docs/DESIGN-SYSTEM.md` | The design system as implemented, with measured tokens (D-046 and D-053) |
| `.claude/skills/gakinz-design/` | The project design skill: layout rules, findings register and the verification routine |
| `docs/CONTENT-AND-GROWTH.md` | Resources standard, affiliate and AdSense pilots, measurement and the social profile kit |
| `docs/GEE-OS.md` | How this repository uses the GEE OS agent contract, and its documentation profile |
| `docs/TEST-PLAN.md` | What is tested, what is not, the order to close the gaps, and the J01 to J12 acceptance scenarios |
| `docs/AUDIT.md` | Every audit and review, newest first: security, accessibility, performance, design and release checks |

Superseded and completed documents remain in git history (`docs/DECISIONS.md` D-044): the original
`GAkinzOS.html` brief and the root `DESIGN-SYSTEM.md` (retired 2026-10-10), and the 2026 plan folder, the
Mastercard design reference and the D-037 design record (retired 2026-11-01, readable at `ee1281f`).

## Ground rules

1. No credential in any tracked file. `config.php` lives on the server and is gitignored.
2. The browser never connects to MySQL. New data means a PHP endpoint.
3. `src/lib/access.ts` hides navigation. `require_auth()` on the server is the security
   boundary.
4. A release sends `dist/` and `server/*.php`, never `config.php`, `.htaccess` or SQL.
5. There is no migration runner.
6. DNS, TLS, hosting and mail-server facts are **not** documented here and must not be acted
   on from here.
7. **Nothing invented ships on the public site.** Where a real value does not exist, the
   field is `null`. No stock photograph of a stranger, no invented client, no unsourced
   figure, and no claim the project cannot stand behind. Absent material is left unpublished
   rather than shown as a gap. See `docs/DECISIONS.md` D-027 and D-039.
8. **Public styles live in `src/marketing/site.css`**, scoped to `.gk-site`, since D-046. The
   nine-value Tailwind type scale (now in the `@theme` block of `src/index.css`) of D-024 governed the D-037 surface and still applies to
   anything styled with Tailwind outside the CMS, such as the shared proposal page.

## State

Current state lives in one place, `docs/STATUS.md`: the measured counts, the 2026-10-10 audit
and readiness verdict, the delivery phases, the open work in priority order and the owner
inputs still outstanding. In short: everything on `main` is live (release `983606c`, 2026-11-08), the
public pages pass the release checks (`pnpm run check:live`, 16 of 16), and signed-in journeys on real data are still
largely NOT TESTED (2026-11-08: sign-in works and 24 CMS screens load with no CSP violations; no data flows were exercised). The
production gates in `docs/OPERATIONS.md` decide what may be switched on.
