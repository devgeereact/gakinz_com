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

## Known state

The current state, what is left and the order of work are in **`docs/WORKBOOK.md`**. Measured
counts are in `docs/STATUS.md` section 0. This file does not repeat them, so it cannot drift
(consolidated 2026-10-21; the earlier text is in git history at `5d5f95b`).

- The whole branch stack was merged to `main` (`3fc6a31`), uploaded and deployed on
  2026-10-21 and 2026-10-22. GitHub Actions did not run for it, so `dist/` went up by `rsync`.
  The record is in the workbook, section 1.
- `npm run lint` still fails (K-002). `npm run lint:ratchet` holds the ceiling in
  `scripts/lint-ratchet.mjs`, and the count must not grow.
- Anything checked only against mocked API responses is NOT TESTED on real data (K-044).
- Gated features ship switched off (D-050). Do not switch one on without the named gates.
- A live super-admin credential was published in an earlier revision of this file and is in
  git history. The owner reports it rotated on 2026-10-12; session revocation is unconfirmed.
  See `docs/KNOWN-ISSUES.md` K-001.

Do not describe this project as clean, deployed, accessible or secure. Say what was checked
and how, and mark the rest NOT TESTED or UNVERIFIED.

## Where to read more

`README.md` has the full documentation index. Start with `docs/STATUS.md` for the current
picture, `docs/ARCHITECTURE.md` for the shape, and `docs/DECISIONS.md` for why things are the
way they are.
