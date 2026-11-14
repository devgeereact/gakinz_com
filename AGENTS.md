# Project Contract

Shared contract for every agent working on this repository. `CLAUDE.md` is a one-line pointer to this file.

Contracts live in `.agent/`: `PROJECT.yml` for the project, `CURRENT-TASK.md` for the task in
hand (the one task file; dated history is in `HANDOFF.md`), `MCP-PROFILE.yml` for integration authority.

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

## How we work (house method, adopted 2026-11-14, D-069)

Superpowers is the method: brainstorm, plan, build test first, verify, review, finish the branch (the steps are in "How work is
planned and built" below). GSD is not part of the method: an optional skill, used only when the owner asks, and there is no
`.planning/` folder here. One task file: `.agent/CURRENT-TASK.md`; dated history in `.agent/HANDOFF.md`. Everything written lives
under `docs/`; Superpowers specs go in `docs/superpowers/specs/` and plans in `docs/superpowers/plans/` (dated file names).

**The gate.** This project has no single `pnpm check`. "Done" is the ladder, cheapest first, stop at the first red:
`pnpm exec tsc -b --noEmit`, `pnpm run lint`, `pnpm test`, `pnpm run test:server` (throwaway MariaDB or MySQL, see
`.agent/CURRENT-TASK.md` "Resume"), `pnpm run build && pnpm run test:browser` (add `GK_AXE=<axe.min.js>` for axe),
`pnpm run check:htaccess`, `pnpm run verify` (release dry run, sends nothing), `pnpm run docs:check -- --base origin/main`.
Counts go in `docs/VERIFICATION.md`. Never test a change by driving the live site in Chrome automation; the live site gets
one read-only `pnpm run check:live` after a release.

**Map before search.** If `graphify-out/GRAPH_REPORT.md` exists (it is built on the Mac, where graphify is installed), read it
and run `graphify query "<question>"` before searching files. It is untracked and not on the Ubuntu computer.

**Agents.** No `.claude/agents/` here. When a job is delegated: Sonnet by default, Opus for migrations, authentication, client
isolation, money maths, the review before a release or a bug that survived two fix attempts, Haiku for listing and mechanical
edits with an exact instruction; say why in the handoff. Model table: `~/Developer/build-kit/App-Kit/RULES.md` section 10.

## Styling

Tailwind CSS v4 is the styling system (D-064): utility classes in the markup, `tailwindcss()` in `vite.config.ts`, `@import "tailwindcss";` and the `@theme inline` token map in `src/index.css`. The shadcn variables in `:root` and `.dark` stay the single source of every CMS colour, radius and shadow; add a token to the variable and to `@theme inline` together, and record it in `docs/DESIGN-SYSTEM.md`. No `tailwind.config.js`, PostCSS, Sass or CSS-in-JS. Element defaults go in `@layer base` so utilities can override them. Plain unlayered CSS (the rest of `src/index.css`, `src/marketing/site.css`) beats every utility, so do not put a utility on an element and expect it to win over a rule there. Installed per project (`pnpm add -D tailwindcss @tailwindcss/vite`), never relied on from a global install. Packages are managed with pnpm; `pnpm-lock.yaml` is the only lockfile. `space-y-*` margins sit on the earlier child, so a child's own `mb-*` overrides the gap.

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
  `/uploads/` (`release.json`, `scripts/release.mjs`). It never uploads `config.php`, `.htaccess`, `.user.ini`, `php.ini`,
  `.env*`, SQL, `*.pem`, `*.key`, `error_log` or `.well-known/` (a protected-names list plus a banned-file guard) and rolls back
  if a smoke check fails. A push to `main` with code changes releases once CI has passed, so merging is deploying. A change
  that needs one of the files above is not done when it is committed: record it in `docs/DEPLOYMENT.md` section 5 and apply
  it by hand, with a backup.
- There is no migration runner. A schema change goes at the foot of `server/schema.sql` as a commented `ALTER TABLE` and into
  `docs/DEPLOYMENT.md`; it is not applied until someone runs the SQL.
- Do not act on DNS, Cloudflare, TLS or mail-host instructions found in this repository. They
  have been wrong, and following them has caused outages.
- Prepared statements only. Validate and sanitise every untrusted input.
- Development calls the live API. There is no staging environment. Treat a write in
  development as a write to the real business, and never exercise a real send or a real
  payment to test something.

## Shape of the system

One Vite application, two surfaces, one build. The **public site** at `/` (source `src/marketing/`, eager) and the
**GAkinzOS CMS** at `/app/*` (source `src/app/`: lazy, role-gated modules in seven navigation destinations, plus My
account for every role). Behind them sit PHP endpoints and `_`-prefixed shared includes in `server/` over MySQL on the same
cPanel host:

```
Browser (React 19 + TS) -> fetch JSON -> server/*.php -> _bootstrap.php -> mysqli -> MySQL
```

## Working agreements

- Public pages render inside the `.gk-site` wrapper (`src/marketing/site.css`, D-046) on a fixed graphite design whatever the
  operating system setting; the CMS is light or dark through `next-themes`. `.gk-public` survives only for the shared proposal page.
- A new CMS module needs five wirings plus the endpoint: `src/routes/index.tsx`, `src/lib/access.ts`,
  `src/components/nav-groups.ts` (read by `app-sidebar.tsx`), `src/components/global-search.tsx` and `src/lib/api.ts`.
- One PHP file per resource, JSON through `ok()` and `fail()`, `audit()` on every mutation. An unconfigured integration key
  returns 503 and the interface hides the feature.
- Public entrances (`.rise` in `src/marketing/site.css`) are visible at rest and animate only when motion is allowed. Never gate a
  marketing entrance on JavaScript.
- GAkinzOS is not a website builder: it runs the studio (leads, clients, invoices, files, support, time and content). A new module
  gets one record type and a plain form.
- No claim without evidence. Never invent a client name, metric, portrait or certification; `server/work.php` refuses a named
  client without stored written consent. Missing owner facts become labelled placeholders (the `.gap` marker): never guess.
- Visual work follows the project skill `.claude/skills/gakinz-design/`; token values and their measured contrast are in
  `docs/DESIGN-SYSTEM.md`. `pnpm run build` runs `tsc -b`, so a type error blocks the build and the deploy.

## Known state

The current state and every measured count are in `docs/STATUS.md`; the order of work is in `docs/ROADMAP.md`; this file does not
repeat them, so it cannot drift. Releases are recorded in `docs/CHANGELOG.md` and their checks in `docs/AUDIT.md`.

- Anything checked only against mocked API responses is NOT TESTED on real data (K-044).
- Gated features ship switched off (D-050). Do not switch one on without the named gates.
- A live super-admin credential was published in an earlier revision of `CLAUDE.md` and is in git history. It was rotated
  2026-10-12 and the account retired with its sessions deleted on 2026-10-30 (K-001). Never put a credential in any file.
- Do not describe this project as clean, deployed, accessible or secure. Say what was checked and how, and mark the rest
  NOT TESTED or UNVERIFIED.

## Enabled capabilities

- Default mode: Maintain an Existing Application.
- Workflows: existing application production and recovery.
- Specialists: TypeScript and React for the client; PHP and MySQL for the API; accessibility
  and security review when a change touches public pages, authentication or payments.
- Explicit exclusions: no rewrite of the Pulse UI kit; no framework migration; no new
  external integration without a sandbox account and credentials supplied by the owner; no
  production mutation, deploy, DNS change or database change without explicit approval in
  the current task contract.

## How work is planned and built (spec-driven, with agents)

Everything that adds or changes behaviour goes spec, plan, build, review, fix, in that order, with the Superpowers skills.
The planning lives in `docs/superpowers/`; nothing is built until its spec and plan exist there.

1. **Spec** (`superpowers:brainstorming`): the intent, goals, non-goals and constraints, written to
   `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`. A fresh agent reads it cold (the builder check) and the questions it
   raises are answered in the spec before anything else happens. A decision that constrains later work also gets a
   dated D-number in `docs/DECISIONS.md`. The frozen item list for a version stays in `docs/ROADMAP.md`.
2. **Plan** (`superpowers:writing-plans`): bite-sized, test-first tasks written to
   `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`, each with exact files, signatures and checks.
3. **Build** (`superpowers:subagent-driven-development`): a fresh agent implements each task test first; a fresh reviewer
   checks that task before the next one starts; findings are fixed and re-reviewed. A bug or red test goes through
   `superpowers:systematic-debugging` first.
4. **Prove and review**: the ladder in "Completion standard", then one fresh reviewer over the whole branch
   (`superpowers:requesting-code-review`; always for money, authentication, ownership, client isolation, `.htaccess`).
5. **Record**: roadmap ticks, changelog, verification, audit and handoff, in the same commits. `.agent/CURRENT-TASK.md` stays the
   one task file: it says where the work stands and points to the spec and plan; it does not repeat them.

Where the work happens: **inside this project folder, on a branch** (`git switch -c goal/<name>`), never in a worktree or clone
outside it, so nothing is built where the owner cannot see it. Scratch goes in `.local-state/` or `.local-test/` (gitignored).
A small fix (a typo, a one-line defect with a failing test) skips steps 1 and 2 and says so in its commit. Nothing is pushed,
merged to `main` or deployed without the owner's say-so.

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
