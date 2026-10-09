# GAkinz

The website and internal operations platform for **GAkinz**, a web design and development
studio. One Vite application serves two surfaces from one domain and one build:

- **Public site** at `/`, rebuilt on 2026-09-22. Its voice is first person singular, as
  Gideon Akinlotan, designer and developer in London; GAkinz is named where a team genuinely
  does the work. The copy rule is in the header of `src/marketing/data/site.ts` and is worth
  reading before changing a word of it.
- **GAkinzOS** at `/app/*`, the internal CMS that runs leads, clients, projects, proposals,
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

There is no local PHP or MySQL. **Development runs against production data.** Treat every
write as a write to the real business.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 5102 |
| `npm run build` | `tsc -b` then `vite build`, output to `dist/` |
| `npm run preview` | Serve the built output on port 5102 |
| `npm test` | Vitest, single run |
| `npm run lint` | ESLint. **Currently fails** with 47 errors and 2 warnings, down from 60 and 7. The count is a ratchet and must not grow. See `docs/KNOWN-ISSUES.md` |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | PHP syntax gate |

## Stack

React 19 and TypeScript on Vite 7, Tailwind v3 with shadcn and Radix primitives, React Router
7, Zustand. The API is plain PHP 8 over `mysqli`, one file per resource, with no framework and
no Composer dependency. Tests are Vitest. Deploys run on GitHub Actions.

## Layout

```
src/
  marketing/     public site: layout, pages, copy in data/site.ts, work ledger in data/work.ts
    components/  primitives.tsx (the public design system), Seo.tsx, Ledger.tsx
  app/           GAkinzOS CMS: 24 modules, login, route guard
  components/    shared UI, shadcn primitives under ui/
  layouts/       CMS shell
  lib/           api.ts (the client API boundary), access.ts (role map)
  routes/        the single route table
  store/         auth state
  index.css      design tokens for both surfaces, and the utility layer
server/          45 PHP endpoints, schema.sql, .htaccess, config template
docs/            project documentation, see below
  design/        design directions and the approved one, 2026-09-22
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
| `docs/DATA-MODEL.md` | 33 tables, ownership, share tokens, and the migration situation |
| `docs/API-SPEC.md` | The 45 endpoints, their actions and their role gates |
| `docs/DESIGN-SYSTEM.md` | The public design system **as implemented**, rebuilt 2026-09-22. GAkinzOS is unchanged and is covered there too |
| `docs/design/2026-09-22-directions/direction-approved.md` | The three directions shown, which one was chosen, and what the choice settled |
| `docs/SECURITY.md` | Authentication, roles, client isolation, secrets, known gaps |
| `docs/DEPLOYMENT.md` | Both tracks, outstanding uploads, outstanding SQL |
| `docs/OPERATIONS.md` | Local development, cron jobs, monitoring, mail, routine checks |
| `docs/STATUS.md` | What is built, what is unverified. The file that changes most |
| `docs/DECISIONS.md` | Dated decision records, including superseded ones |
| `docs/KNOWN-ISSUES.md` | Open problems with evidence |
| `docs/GEE-OS.md` | How this repository uses the GEE OS agent contract |
| `qa/TEST-PLAN.md` | What is tested, what is not, and in what order to close the gaps |
| `qa/SECURITY-AUDIT.md` | Source-inspection audit |
| `qa/ACCESSIBILITY-AUDIT.md` | The 2026-09-22 measured run on the public surface, and what is still NOT TESTED |
| `qa/PERFORMANCE-AUDIT.md` | Bundle and page measurements, and what is unmeasured |
| `qa/RELEASE-CHECKLIST.md` | Run this before shipping |

Two documents at the root are **history, not instructions**:

- `GAkinzOS.html`, the original product brief. Still the authority on intended scope.
- `DESIGN-SYSTEM.md`, a **superseded** design proposal, now two rebrands behind the site. See
  `docs/DECISIONS.md` D-006 and D-023.

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
   field is `null` and the interface renders a labelled gap. No stock photograph of a
   stranger, no invented client, no unsourced figure, and no claim the project cannot stand
   behind. See `docs/DECISIONS.md` D-027.
8. **Every size on a public page comes from the nine-value type scale** in
   `tailwind.config.js`. No arbitrary size ships. See `docs/DECISIONS.md` D-024.

## State

As at 2026-09-22, on branch `feat/public-relaunch`.

`npm test` passes with 21 tests, `npm run build` is clean, `php -l` is clean across 45 files,
and **lint fails with 47 errors and 2 warnings**, down from 60 and 7.

On the public surface, measured on 2026-09-22 against the production build served locally:
axe-core 4.10.2 reported 0 violations across 16 routes, contrast measured 0 failures across
28 combinations with a lowest of 4.91:1, and focus indicators measured 0 failures across 353
elements. **A screen-reader pass with real assistive technology has not been run**, and the
Lighthouse and Core Web Vitals figures come from a local preview with no throttling, so they
describe the build rather than a real visitor's experience. GAkinzOS at `/app/*` was not
audited.

**The deployed state of the server is unverified**, and the gap is now wider than usual:
fifteen server files and two new tables are committed to this branch and none of it is
uploaded or applied. The current picture, including what each number means and what it does
not, is in `docs/STATUS.md`.
