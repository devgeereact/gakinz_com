# GAkinz

The website and internal operations platform for **GAkinz**, a web design and development
studio. One Vite application serves two surfaces from one domain and one build:

- **Public site** at `/`, the studio's corporate site.
- **GAkinzOS** at `/app/*`, the internal CMS that runs leads, clients, projects, proposals,
  invoicing, support, time, content and a client portal.

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

There is no local PHP or MySQL. **Development runs against production data.** Treat every
write as a write to the real business.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 5102 |
| `npm run build` | `tsc -b` then `vite build`, output to `dist/` |
| `npm run preview` | Serve the built output on port 5102 |
| `npm test` | Vitest, single run |
| `npm run lint` | ESLint. **Currently fails**, see `docs/KNOWN-ISSUES.md` |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | PHP syntax gate |

## Stack

React 19 and TypeScript on Vite 7, Tailwind v3 with shadcn and Radix primitives, React Router
7, Zustand. The API is plain PHP 8 over `mysqli`, one file per resource, with no framework and
no Composer dependency. Tests are Vitest. Deploys run on GitHub Actions.

## Layout

```
src/
  marketing/     public site: layout, pages, components, copy in data/site.ts
  app/           GAkinzOS CMS: 23 modules, login, route guard
  components/    shared UI, shadcn primitives under ui/
  layouts/       CMS shell
  lib/           api.ts (the client API boundary), access.ts (role map)
  routes/        the single route table
  store/         auth state
  index.css      design tokens and the utility layer
server/          44 PHP endpoints, schema.sql, .htaccess, config template
docs/            project documentation, see below
qa/              test plan and audits
```

## Deployment, in one paragraph

**Two tracks, and only one is automatic.** Pushing to `main` triggers GitHub Actions, which
builds and FTP-uploads `dist/` and nothing else. Everything under `server/` is uploaded by
hand, and schema changes are run by hand, because there is no migration runner and the host
has no Node. A change under `server/` is committed but not live. Full detail in
`docs/DEPLOYMENT.md`.

## Documentation

Read `AGENTS.md` first if you are an agent. It is the shared contract.

| File | What it holds |
|---|---|
| `AGENTS.md` | The contract every agent works to |
| `CLAUDE.md` | The Claude Code pointer into it |
| `docs/PRODUCT-SPEC.md` | What the product is, and how the built modules compare with the brief |
| `docs/ARCHITECTURE.md` | Shape, client, server, request lifecycle, the two deploy tracks |
| `docs/DATA-MODEL.md` | 31 tables, ownership, and the migration situation |
| `docs/API-SPEC.md` | The 44 endpoints, their actions and their role gates |
| `docs/DESIGN-SYSTEM.md` | The design system **as implemented** |
| `docs/SECURITY.md` | Authentication, roles, client isolation, secrets, known gaps |
| `docs/DEPLOYMENT.md` | Both tracks, outstanding uploads, outstanding SQL |
| `docs/OPERATIONS.md` | Local development, cron jobs, monitoring, mail, routine checks |
| `docs/STATUS.md` | What is built, what is unverified. The file that changes most |
| `docs/DECISIONS.md` | Dated decision records, including superseded ones |
| `docs/KNOWN-ISSUES.md` | Open problems with evidence |
| `qa/TEST-PLAN.md` | What is tested, what is not, and in what order to close the gaps |
| `qa/SECURITY-AUDIT.md` | Source-inspection audit, 2026-09-04 |
| `qa/ACCESSIBILITY-AUDIT.md` | NOT TESTED, with the reason and the scope of a real audit |
| `qa/PERFORMANCE-AUDIT.md` | Bundle measurements, and what is unmeasured |
| `qa/RELEASE-CHECKLIST.md` | Run this before shipping |

Two documents at the root are **history, not instructions**:

- `GAkinzOS.html`, the original product brief. Still the authority on intended scope.
- `DESIGN-SYSTEM.md`, a **superseded** design proposal. See `docs/DECISIONS.md` D-006.

## Ground rules

1. No credential in any tracked file. `config.php` lives on the server and is gitignored.
2. The browser never connects to MySQL. New data means a PHP endpoint.
3. `src/lib/access.ts` hides navigation. `require_auth()` on the server is the security
   boundary.
4. The deploy ships `dist/` only.
5. There is no migration runner.
6. DNS, TLS, hosting and mail-server facts are **not** documented here and must not be acted
   on from here.

## State

Tests pass, the build is clean, `php -l` is clean, and **lint fails with 60 errors and 7
warnings**. Accessibility is unmeasured. The deployed state of the server is unverified. The
current picture is in `docs/STATUS.md`.
