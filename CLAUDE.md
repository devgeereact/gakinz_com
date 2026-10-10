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
- **GAkinzOS CMS** at `/app/*`, source in `src/app/`, 24 modules, lazy and role gated.

Behind it, 46 PHP files in `server/` (endpoints plus `_`-prefixed shared includes) over MySQL
on the same cPanel host.

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
| Type check and build | `npm run build` (runs `tsc -b` first) |
| Lint | `npm run lint` |
| PHP syntax gate | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` |

## Sources of truth

When this file and the code disagree, the code wins and this file is wrong.

| Fact | Authority |
|---|---|
| Product scope | `GAkinzOS.html`, summarised in `docs/PRODUCT-SPEC.md` |
| Routes | `src/routes/index.tsx` |
| Client API boundary | `src/lib/api.ts` |
| Server boundary and auth | `server/_bootstrap.php` |
| Role access | the per-endpoint constants in `server/*.php`, mirrored in `src/lib/access.ts` |
| Data model | `server/schema.sql` |
| Design tokens | `src/index.css` and `tailwind.config.js` |
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
3. **A `client`-role caller must never see another client's data.** `portal.php` derives the
   client identifier from the token and ignores any parameter for that role. Treat any change
   to that file as security-critical.
4. **The deploy ships `dist/` only.** Everything under `server/` is uploaded by hand. A server
   change is committed but not live, so record it in `docs/DEPLOYMENT.md` in the same change.
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

- TypeScript throughout. `npm run build` runs `tsc -b`, so a type error blocks the build and
  the deploy.
- Public pages render inside the `.gk-public` wrapper and stay light regardless of the
  operating system setting. The CMS is theme aware.
- A new CMS module needs five wirings: `src/routes/index.tsx`, `src/lib/access.ts`,
  `src/components/app-sidebar.tsx`, `src/components/global-search.tsx` and `src/lib/api.ts`,
  plus the endpoint.
- Keep integrations degrading gracefully: an unconfigured key returns 503 and the interface
  hides the feature.
- `.gk-fadein` is visible by default and animates in only when motion is allowed. Never gate a
  marketing entrance on JavaScript.
- The active Tailwind config is `tailwind.config.js`. The `.ts` variant is inert; do not edit
  it.

## Known state, as at 2026-10-10

- `npm run build`, `npm test` (29 unit tests), `npm run test:server` (35 server integration
  tests against a throwaway local `*_test` database) and `php -l` all pass locally.
- **`npm run lint` fails: 47 errors, 2 warnings.** `npm run lint:ratchet` enforces that ceiling
  in CI, so the count must not grow. See `docs/KNOWN-ISSUES.md` K-002.
- Deploy waits for CI (`.github/workflows/deploy.yml`, `workflow_run`).
- **Accessibility is measured for the public site only** (`qa/ACCESSIBILITY-AUDIT.md`). The
  CMS and real assistive technology are NOT TESTED.
- **The deployed server state is UNVERIFIED.** Which PHP files are uploaded and which
  migrations have run cannot be known from here.
- A live super-admin credential was published in an earlier revision of this file and is in
  git history. See `docs/KNOWN-ISSUES.md` K-001.

Do not describe this project as clean, deployed, accessible or secure. Say what was checked
and how, and mark the rest NOT TESTED or UNVERIFIED.

## Where to read more

`README.md` has the full documentation index. Start with `docs/STATUS.md` for the current
picture, `docs/ARCHITECTURE.md` for the shape, and `docs/DECISIONS.md` for why things are the
way they are.
