# GAkinz

The website and private workspace for **GAkinz**, websites and everyday IT support for small
businesses, run by Gideon Akinlotan. One Vite application serves two surfaces from one domain
and one build:

- **Public site** at `/`. The live site is the 2026-09-22 relaunch; a rebuild on the D-037
  design system is on the branches stacked into PR #8 and not yet deployed. The approved
  direction (D-038, D-039) is six services under the GAkinz name with Gideon named as the
  owner; the copy still describes four services in the first person. The copy rule is in the
  header of `src/marketing/data/site.ts` and is worth reading before changing a word of it.
- **GAkinzOS** at `/app/*`, the CMS that runs enquiries, clients, projects, quotes,
  invoicing, support, time, content, the work ledger and a client portal.

Behind them sits a PHP and MySQL API on cPanel shared hosting.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5102
```

Port 5102 is pinned with `strictPort`, so a clash fails loudly. This matters: in development
the app calls the **live** API at `https://gakinz.com`, and the live CORS allowlist names one
localhost port. A drifted port shows up as an opaque CORS failure, not as a port error.

The dev server has no local PHP or MySQL behind it. **Development runs against production
data.** Treat every write as a write to the real business. Server behaviour is tested only
through `npm run test:server`, against a throwaway local database (`docs/OPERATIONS.md`
section 8).

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 5102 |
| `npm run build` | `tsc -b` then `vite build`, output to `dist/` |
| `npm run preview` | Serve the built output on port 5102 |
| `npm test` | Vitest unit tests, single run |
| `npm run test:server` | PHP endpoints against a throwaway local `*_test` database |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint. **Currently fails**; the count is in `docs/STATUS.md` section 0 and the backlog in `docs/KNOWN-ISSUES.md` K-002 |
| `npm run lint:ratchet` | Fails if that count grows. CI runs it |
| `npm run docs:check` | Fails on a broken document link, or (with `-- --base <ref>`) a server or schema change without its documents. CI runs it |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | PHP syntax gate |

## Stack

React 19 and TypeScript on Vite 7, Tailwind v3 with shadcn and Radix primitives, React Router
7, Zustand. The API is plain PHP 8 over `mysqli`, one file per resource, with no framework and
no Composer dependency. Tests are Vitest. Deploys run on GitHub Actions.

## Layout

```
src/
  marketing/     public site: layout, pages, copy in data/site.ts, work ledger in data/work.ts
    components/  site-ui.tsx (shared public parts, styles in ../site.css), Seo.tsx
  app/           GAkinzOS CMS: modules, My account, login, route guard
  components/    shared UI, shadcn primitives under ui/
  layouts/       CMS shell
  lib/           api.ts (the client API boundary), access.ts (role map)
  routes/        the single route table
  store/         auth state
  index.css      design tokens for both surfaces, and the utility layer
server/          PHP endpoints and shared includes, schema.sql, .htaccess, config template
tests/server/    server integration tests, run against a local *_test database
scripts/         lint ratchet and documentation check
docs/            project documentation, flat, see below
qa/              test plan, audits and release checklist
```

## Deployment, in one paragraph

**Two tracks, and only one is automatic.** Pushing to `main` runs CI, and only when CI passes
does GitHub Actions build and FTP-upload `dist/`, and nothing else. Everything under `server/`
is uploaded by hand, and schema changes are run by hand, because there is no migration runner
and the host has no Node. A change under `server/` is committed but not live. What is waiting
is listed in `docs/DEPLOYMENT.md` section 5.

## Documentation

Read `AGENTS.md` first if you are an agent. It is the shared contract, and its "Keeping
documents current" section says which document a change must update. Each file below is listed
once.

| File | What it holds |
|---|---|
| `AGENTS.md` | The contract every agent works to, including the document-sync rule |
| `CLAUDE.md` | The Claude Code pointer into it, and the known state |
| `CODEX.md` | The Codex pointer into it |
| `.agent/PROJECT.yml` | The GEE OS project contract: route, risk and sources |
| `.agent/CURRENT-TASK.md` | The task in hand, its scope, authority and evidence |
| `.agent/MCP-PROFILE.yml` | Which integrations an agent may read or change |
| `server/README.md` | The server folder: install steps and what each file is for |
| `docs/STATUS.md` | Current state and every measured count, delivery phases, open work, owner inputs. The file that changes most |
| `docs/KNOWN-ISSUES.md` | Open and fixed problems, with evidence and status |
| `docs/DECISIONS.md` | Dated decision records, including superseded ones |
| `docs/PRODUCT-SPEC.md` | The approved scope: services, public pages, CMS journeys, customer access, planned features, exclusions, and the original brief's 175-feature register |
| `docs/ARCHITECTURE.md` | Shape, client, server, request lifecycle, the two deploy tracks, and what was built on 2026-10-10 |
| `docs/DATA-MODEL.md` | The tables, ownership, share tokens, and the migration situation |
| `docs/API-SPEC.md` | The endpoints, their actions and their role gates |
| `docs/SECURITY.md` | Authentication, roles, client isolation, payments, secrets, open gaps |
| `docs/DEPLOYMENT.md` | Both tracks, release policy, and the one list of server files and SQL not yet uploaded |
| `docs/OPERATIONS.md` | Local development, cron jobs, monitoring, mail, test environment rules, launch gates, recovery targets |
| `docs/DESIGN-SYSTEM.md` | The design system as implemented (public surface on D-037) and the status of the D-037 target |
| `docs/DESIGN-REFERENCE-MASTERCARD.md` | The preserved, unedited third-party design reference behind the target system. Do not edit |
| `docs/CONTENT-AND-GROWTH.md` | Resources standard, affiliate and AdSense pilots, measurement and the social profile kit |
| `docs/GEE-OS.md` | How this repository uses the GEE OS agent contract, and its documentation profile |
| `qa/TEST-PLAN.md` | What is tested, what is not, the order to close the gaps, and the J01 to J12 acceptance scenarios |
| `qa/SECURITY-AUDIT.md` | The 2026-09-04 source-inspection audit, with later status |
| `qa/ACCESSIBILITY-AUDIT.md` | The 2026-09-22 measured run on the public surface, and what is still NOT TESTED |
| `qa/PERFORMANCE-AUDIT.md` | The 2026-09-22 bundle and page measurements, and what is unmeasured |
| `qa/RELEASE-CHECKLIST.md` | Run this before shipping |

Superseded and completed documents, including the original `GAkinzOS.html` brief and the root
`DESIGN-SYSTEM.md`, were retired on 2026-10-10 and remain in git history (`docs/DECISIONS.md`
D-044).

## Ground rules

1. No credential in any tracked file. `config.php` lives on the server and is gitignored.
2. The browser never connects to MySQL. New data means a PHP endpoint.
3. `src/lib/access.ts` hides navigation. `require_auth()` on the server is the security
   boundary.
4. The deploy ships `dist/` only.
5. There is no migration runner.
6. DNS, TLS, hosting and mail-server facts are **not** documented here and must not be acted
   on from here.
7. **Nothing invented ships on the public site.** Where a real value does not exist, the
   field is `null`. No stock photograph of a stranger, no invented client, no unsourced
   figure, and no claim the project cannot stand behind. Absent material is left unpublished
   rather than shown as a gap. See `docs/DECISIONS.md` D-027 and D-039.
8. **Every size on a public page comes from the nine-value type scale** in
   `tailwind.config.js`. No arbitrary size ships. See `docs/DECISIONS.md` D-024.

## State

Current state lives in one place, `docs/STATUS.md`: the measured counts, the 2026-10-10 audit
and readiness verdict, the delivery phases, the open work in priority order and the owner
inputs still outstanding. In short, a substantial system builds and its local tests pass, **the deployed
state of the server is unverified**, and production readiness is **BLOCKED** until the
credential, deployment, recovery, money and isolation gates in `docs/OPERATIONS.md` pass.
