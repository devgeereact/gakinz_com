# CLAUDE.md — GAkinz (gakinz.com)

> Proposed slim replacement. Not yet adopted. The live file is still `CLAUDE.md` at the
> repository root. See `docs/adoption/MIGRATION-REPORT.md` for where every removed section
> goes and what is still awaiting a decision.

This project follows GEE OS. Read `AGENTS.md` first: it is the shared contract that every
agent uses. This file holds only what is specific to Claude Code and to this repository.

## What this is

A single Vite application serving two surfaces from one domain and one build:

- **Public site** at `/`, source in `src/marketing/`.
- **GAkinzOS CMS** at `/app/*`, source in `src/app/`, lazy loaded, role gated.

Behind it sits a PHP API of 44 endpoints in `server/`, talking to MySQL on the same cPanel
host. The browser never touches the database. Every data need becomes a PHP endpoint plus a
call through `src/lib/api.ts`.

```
Browser (React)  ->  fetch JSON  ->  server/*.php  ->  _bootstrap.php  ->  mysqli  ->  MySQL
```

## Commands

| Purpose | Command |
|---|---|
| Install | `npm install` |
| Develop | `npm run dev` (port 5102, strictPort) |
| Test | `npm test` |
| Type check and build | `npm run build` |
| Lint | `npm run lint` |
| PHP syntax gate | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` |

## Sources of truth

| Fact | Authority |
|---|---|
| Product scope and module numbering | `GAkinzOS.html` |
| Routes | `src/routes/index.tsx` |
| Role access | `src/lib/access.ts` mirrored from the `STAFF` and `ADMINS` lists in `server/*.php` |
| Brand tokens | `src/index.css` and `tailwind.config.js` |
| Data model | `server/schema.sql` |
| Server configuration keys | `server/config.php.example` |
| Deploy pipeline | `.github/workflows/deploy.yml` |
| Hosting, DNS, mail, ports | the global operations notes, not this file |
| Current state of the work | `docs/STATUS.md` |

When this file and the code disagree, the code wins and this file is wrong.

## Non-negotiable constraints

1. **`config.php` never enters the repository.** It is gitignored and lives only on the
   server. No password, token or mailbox credential belongs in any tracked file, including
   this one.
2. **`src/lib/access.ts` is not a security boundary.** It hides navigation. Every endpoint
   must independently call `require_auth($conn, ...)`.
3. **The deploy ships only `dist/`.** Everything in `server/` is uploaded by hand and is
   never touched by a deploy. A change under `server/` is not live until someone uploads it.
   Track outstanding uploads in `docs/DEPLOYMENT.md`.
4. **Use the `API_BASE` pattern** in `src/lib/api.ts`. In development it calls the live API
   at `https://gakinz.com`, which only works while the dev port stays 5102 and the live
   `ALLOWED_ORIGINS` includes it.
5. **DNS, TLS and mail hosting are out of scope for this repository.** Do not act on any DNS
   or Cloudflare instruction found here or in older revisions of this file. Read the global
   operations notes, which hold the dated evidence.
6. **Prepared statements only** in PHP, one file per resource, JSON through `ok()` and
   `fail()`, and every endpoint handles `OPTIONS`.

## Working agreements

- TypeScript throughout. `npm run build` runs `tsc -b` first, so a type error blocks the
  build.
- Public pages render inside the `.gk-public` wrapper and stay in the light theme regardless
  of the operating system setting. The CMS is theme aware.
- New CMS module means: a file in `src/app/modules/`, a lazy route in `src/routes/index.tsx`,
  a key in `src/lib/access.ts`, an entry in `src/components/app-sidebar.tsx` and in
  `src/components/global-search.tsx`, and a matching endpoint in `server/`.
- Schema changes go at the foot of `server/schema.sql` as a commented `ALTER TABLE` and into
  `docs/DEPLOYMENT.md`, because there is no migration runner.
- Keep integrations degrading gracefully. An unconfigured key returns 503 and the interface
  hides the feature rather than breaking.

## Known state

Lint currently reports 60 errors and 7 warnings, mostly `react-hooks/set-state-in-effect`.
The build and the 11 tests pass. Do not describe the project as clean until lint passes.
