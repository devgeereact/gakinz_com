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
- Lifecycle stage: maintenance, with an unfinished deployment backlog.
- Risk level: production. The site is live, the database holds real client and enquiry data,
  and the API sends real email and can take real payments.

## Sources of truth

One fact, one home. Where two documents disagree, the code is the authority.

| Fact | Authority |
|---|---|
| Product scope, journeys, planned features and exclusions | `docs/PRODUCT-SPEC.md` |
| Content, social and monetisation policy | `docs/CONTENT-AND-GROWTH.md` |
| Public copy | `src/marketing/data/site.ts` |
| Routes | `src/routes/index.tsx` |
| Client API boundary | `src/lib/api.ts` |
| Server boundary, auth and audit | `server/_bootstrap.php` |
| Role access | the per-endpoint constants in `server/*.php`. `src/lib/access.ts` mirrors them for the interface only |
| Data model | `server/schema.sql`, 34 tables, migrations as comments from line 291 and dated blocks at the foot |
| Design tokens and utilities | `src/index.css` and `tailwind.config.js` |
| Server configuration keys | `server/config.php.example` |
| Client deploy | `.github/workflows/deploy.yml` |
| Server deploy and outstanding work | `docs/DEPLOYMENT.md` |
| Current state | `docs/STATUS.md` |
| Why things are as they are | `docs/DECISIONS.md` |
| Open problems | `docs/KNOWN-ISSUES.md` |
| Hosting, DNS, TLS, mail and dev-server ports | the operator's global notes. **This repository states none of these** |

`docs/DESIGN-SYSTEM.md` sections 1 to 9 describe what is in the code. Its section 10 is the
target system the owner chose (D-037), decided and not yet built. Do not restyle from section
10 outside an approved rebuild task.

## Commands

| Purpose | Command |
|---|---|
| Install | `npm install` |
| Develop | `npm run dev` (port 5102, `strictPort`, fails loudly on a clash) |
| Test | `npm test` (unit), `npm run test:server` (needs local MySQL or MariaDB) |
| Lint ratchet | `npm run lint:ratchet` |
| Type check and build | `npm run build` (runs `tsc -b` first) |
| Lint | `npm run lint` |
| PHP syntax gate | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` |

## Non-negotiable constraints

- No credential, token, mailbox password or database password in any tracked file, including
  a document or a commit message. The only home for those is `config.php` on the server.
- The browser never connects to MySQL. New data needs a PHP endpoint.
- Client-side role checks are a convenience. Server-side `require_auth` is the boundary, and
  every endpoint enforces it independently, on reads as well as writes.
- A `client`-role login must never see another client's data. `portal.php` derives the client
  identifier from the token and ignores any supplied parameter for client callers.
- The deploy pipeline uploads `dist/` only. Nothing under `server/` reaches production
  without a deliberate manual upload, so a server change is not done when it is committed.
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

## Completion standard

A change is complete when all of the following hold and are stated with evidence. The full
list is `qa/RELEASE-CHECKLIST.md`.

1. `npm run build` succeeds, which includes `tsc -b`.
2. `npm test` passes, and any new behaviour that can be unit tested has a test. A server
   change passes `npm run test:server`, and a money, auth or ownership change adds a case there.
3. `npm run lint:ratchet` passes. The existing backlog of 47 errors and 2 warnings is recorded
   in `docs/KNOWN-ISSUES.md` K-002; it may shrink, never grow.
4. Any touched PHP passes `php -l`.
5. Anything server side that must be uploaded by hand, or any SQL that must be run, is
   written into `docs/DEPLOYMENT.md` in the same change.
6. A decision that constrains future work is recorded in `docs/DECISIONS.md` with its date and
   its evidence. A problem left unfixed is recorded in `docs/KNOWN-ISSUES.md`.
7. The report states what was not verified, in particular anything depending on live server,
   database, mail, payment or DNS state.

## Reporting

Use the evidence vocabulary: PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED, BLOCKED. Source
inspection does not prove runtime behaviour. Never claim fixed, secure, accessible, optimised
or production-ready without evidence of that specific kind.

Every completion report states: outcome, changes made, evidence gathered, what was not
verified, remaining risks, recommended next action.
