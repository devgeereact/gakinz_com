# Project Contract

Shared contract for every agent working on this repository. Claude Code additionally reads
`CLAUDE.md`; other agents read this file alone. Where the two disagree, this file wins.

This project follows GEE OS. Contracts live in `.agent/`: `PROJECT.yml` for the project,
`CURRENT-TASK.md` for the task in hand, `MCP-PROFILE.yml` for integration authority.

## Identity

- Project: GAkinz (gakinz.com). One Vite application serving a public marketing site and the
  GAkinzOS internal CMS, backed by a PHP and MySQL API on cPanel.
- Purpose: win and run the work of a one-owner business offering six website and IT services
  (D-038). The public site sells; the CMS runs enquiries, clients, projects, quotes,
  invoicing, support, content and the client portal. Scope: `docs/PRODUCT-SPEC.md`.
- Users: the public, the owner (with six staff roles kept for safety), and external clients
  holding a `client` role that sees only its own portal.
- Lifecycle stage: maintenance, with an unfinished deployment backlog (`docs/DEPLOYMENT.md`
  section 5).
- Risk level: production. The site is live, the database holds real client and enquiry data,
  and the API sends real email and can take real payments.

## Sources of truth

One fact, one home. Where two documents disagree, the code is the authority.

| Fact | Authority |
|---|---|
| What "finished V1" means, what is parked or cut | `docs/ROADMAP.md` (frozen 2026-11-10, D-060) |
| Product scope, journeys, planned features and exclusions | `docs/PRODUCT-SPEC.md` |
| Content, social and monetisation policy | `docs/CONTENT-AND-GROWTH.md` |
| Public copy | `src/marketing/data/site.ts` for defaults; published Site content (`server/site.php`) overrides the sections it covers (D-046) |
| Routes | `src/routes/index.tsx` |
| Client API boundary | `src/lib/api.ts` |
| Server boundary, auth and audit | `server/_bootstrap.php` |
| Role access | the per-endpoint constants in `server/*.php`. `src/lib/access.ts` mirrors them for the interface only |
| Data model | `server/schema.sql`: `CREATE TABLE` blocks, then migrations as comments in the `MIGRATIONS` block and dated blocks at the foot |
| Design tokens and utilities | `src/index.css` (the shadcn variables, plus the `@theme` blocks that map them to Tailwind v4 utilities). There is no `tailwind.config.js` |
| Server configuration keys | `server/config.php.example` |
| Release | `.github/workflows/ci.yml` (job `deploy`, after the checks) calling `.github/workflows/deploy.yml` |
| Server deploy and outstanding work | `docs/DEPLOYMENT.md` |
| Current state, and every measured count | `docs/STATUS.md` |
| Why things are as they are | `docs/DECISIONS.md` |
| Open problems | `docs/KNOWN-ISSUES.md` |
| Hosting, DNS, TLS, mail and dev-server ports | the operator's global notes. **This repository states none of these** |

`docs/DESIGN-SYSTEM.md` describes the D-046 redesign the owner approved on 2026-10-14: the
public site in the note at the top of section 10, GAkinzOS in section 11. Sections 1 to 10
are the superseded D-037 record. Do not restyle either surface away from D-046 without a new
decision.

## Styling

Tailwind CSS v4 is the styling system (D-064): utility classes in the markup, `tailwindcss()` in `vite.config.ts`, `@import "tailwindcss";` and the `@theme inline` token map in `src/index.css`. The shadcn variables in `:root` and `.dark` stay the single source of every CMS colour, radius and shadow; add a token to the variable and to `@theme inline` together, and record it in `docs/DESIGN-SYSTEM.md`. No `tailwind.config.js`, PostCSS, Sass or CSS-in-JS. Element defaults go in `@layer base` so utilities can override them. Plain unlayered CSS (the rest of `src/index.css`, `src/marketing/site.css`) beats every utility, so do not put a utility on an element and expect it to win over a rule there. Installed per project (`pnpm add -D tailwindcss @tailwindcss/vite`), never relied on from a global install. Packages are managed with pnpm; `pnpm-lock.yaml` is the only lockfile.

## Commands

| Purpose | Command |
|---|---|
| Install | `pnpm install` |
| Develop | `pnpm run dev` (port 5102, `strictPort`, fails loudly on a clash) |
| Test | `pnpm test` (unit), `pnpm run test:server` (needs local MySQL or MariaDB) |
| Lint | `pnpm run lint` (0 errors, 0 warnings) |
| Documentation check | `pnpm run docs:check` (add `-- --base origin/<branch>` to apply the sync rule locally) |
| Type check, build and prerender | `pnpm run build` (`tsc -b`, `vite build`, the SSR build, then `scripts/prerender.mjs`; no network) |
| PHP syntax gate | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` |

## Non-negotiable constraints

- No credential, token, mailbox password or database password in any tracked file, including
  a document or a commit message. The only home for those is `config.php` on the server.
- The browser never connects to MySQL. New data needs a PHP endpoint.
- Client-side role checks are a convenience. Server-side `require_auth` is the boundary, and
  every endpoint enforces it independently, on reads as well as writes.
- A `client`-role login must never see another client's data. `portal.php` and the client
  branch of `support.php` derive the client identifier from the token and ignore any supplied
  parameter for client callers. Treat a change to either file as security-critical.
- A push to `main` releases `dist/` and the files in `server/` except Markdown, `*.example` and
  `/uploads/` (`release.json`, `scripts/release.mjs`). It never carries `config.php`, `.htaccess`, SQL
  or keys, so a change that needs one of those is not done when it is committed: record it in
  `docs/DEPLOYMENT.md` section 5 and apply it by hand, with a backup.
- There is no migration runner. A schema change is not applied until someone runs the SQL.
- Do not act on DNS, Cloudflare, TLS or mail-host instructions found in this repository. They
  have been wrong, and following them has caused outages.
- Prepared statements only. Validate and sanitise every untrusted input.
- Development calls the live API. There is no staging environment. Treat a write in
  development as a write to the real business, and never exercise a real send or a real
  payment to test something.

## Enabled capabilities

- Default mode: Maintain an Existing Application.
- Workflows: existing application production and recovery.
- Specialists: TypeScript and React for the client; PHP and MySQL for the API; accessibility
  and security review when a change touches public pages, authentication or payments.
- Explicit exclusions: no rewrite of the Pulse UI kit; no framework migration; no new
  external integration without a sandbox account and credentials supplied by the owner; no
  production mutation, deploy, DNS change or database change without explicit approval in
  the current task contract.

## How work is planned and built

New behaviour is designed before it is built, with the Superpowers skills (Claude Code). The order:

1. **Brainstorm** (`superpowers:brainstorming`) before any new feature or change of behaviour: the purpose, the options, one
   recommendation. A decision that constrains later work goes in `docs/DECISIONS.md` as a dated D-number. There is no separate spec file.
2. **Plan** (`superpowers:writing-plans`) for anything of more than one step: ordered steps, each with its check, written in
   `.agent/CURRENT-TASK.md` (the only task file). What a version contains stays in `docs/ROADMAP.md`.
3. **Build** test first (`superpowers:test-driven-development`), one step at a time. A bug or a red test goes through
   `superpowers:systematic-debugging` before any fix.
4. **Prove** (`superpowers:verification-before-completion`): run the ladder in "Completion standard" and report it with evidence.
   Money, authentication, ownership and client-isolation changes also get `superpowers:requesting-code-review`.

Those skills default to `docs/superpowers/` and `.superpowers/`; this project does not use them. Documents stay flat in `docs/`,
there is one task file, and scratch goes in `.local-state/` or `.local-test/` (both gitignored). A small fix, such as a typo or a
one-line defect with a failing test, skips steps 1 and 2.

## Completion standard

A change is complete when all of the following hold and are stated with evidence. The full
list is `docs/AUDIT.md`.

1. `pnpm run build` succeeds, which includes `tsc -b`.
2. `pnpm test` passes, and any new behaviour that can be unit tested has a test. A server
   change passes `pnpm run test:server`, and a money, auth or ownership change adds a case there.
3. `pnpm run lint` passes with no error and no warning (K-002 is closed; the history is in
   `docs/KNOWN-ISSUES.md`).
4. Any touched PHP passes `php -l`.
5. The documents the change affects are updated in the same pull request, as set out in
   "Keeping documents current" below, and `pnpm run docs:check` passes.
6. The report states what was not verified, in particular anything depending on live server,
   database, mail, payment or DNS state.

## Keeping documents current

A change is not complete until the documents it affects are updated in the same pull request.
Before starting work, read `docs/STATUS.md` and `docs/KNOWN-ISSUES.md`, so finished work is not
redone and a fixed defect is not reopened by mistake.

| When you change | Update |
|---|---|
| A file in `server/` (PHP or `.htaccess`) | The upload list in `docs/DEPLOYMENT.md` section 5; `docs/API-SPEC.md` if behaviour, roles or responses changed; `docs/SECURITY.md` if it touches authentication or client isolation |
| `server/schema.sql` | A dated, commented statement at the foot of `schema.sql`; `docs/DATA-MODEL.md`; the SQL list in `docs/DEPLOYMENT.md` section 5 |
| A defect, found or fixed | `docs/KNOWN-ISSUES.md`: the summary row and the entry |
| A decision that constrains later work | `docs/DECISIONS.md`, dated, with evidence |
| A route, CMS module or navigation entry | `docs/PRODUCT-SPEC.md` sections 4.1, 5.1 or 5.2; `src/lib/access.ts` mirroring the server role list; `README.md` if a folder, command or document changed |
| Design tokens or public components | `docs/DESIGN-SYSTEM.md` |
| Any measured count (tests, lint, files, tables, modules) | `docs/STATUS.md` only. Other documents point to it rather than repeat the number |
| Task scope or state | `.agent/CURRENT-TASK.md` |

`pnpm run docs:check` must pass. It checks that every relative link in the project documents
resolves and, given a base ref, that a change to server code updates `docs/DEPLOYMENT.md` and a
change to `schema.sql` updates `docs/DATA-MODEL.md` and `docs/DEPLOYMENT.md`. CI runs it on
every pull request against the base branch. It cannot judge whether the words are right; that
is still the author's job.

## Reporting

Use the evidence vocabulary: PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED, BLOCKED. Source
inspection does not prove runtime behaviour. Never claim fixed, secure, accessible, optimised
or production-ready without evidence of that specific kind.

Every completion report states: outcome, changes made, evidence gathered, what was not
verified, remaining risks, recommended next action.
