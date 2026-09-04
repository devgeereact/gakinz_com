# Decision records

One entry per decision that still constrains the work. Each carries a date, the decision, why
it was taken, and the evidence that it holds today. Superseded decisions are kept, marked, and
point at what replaced them.

Dates come from the commit history of this repository. Content comes from the previous
`CLAUDE.md` section 13, which was a running session log; it has been converted into decisions
here and into current state in `docs/STATUS.md`. The original narrative remains readable in
git history and in `docs/adoption/AUDIT.md`.

---

## D-001 · Build on the Pulse UI kit
**Date:** 2026-06-10 (`7ffd45c`) · **Status:** active

The admin kit `pulse-ui-react` (React, Vite, Tailwind, shadcn and Radix) is the repository
base, and its marketing kit informed the public site.

**Why:** one Vite toolchain producing one `dist/` fits the existing FTP deploy, and the kit
already ships the libraries the CMS needs: FullCalendar, Tiptap, ApexCharts, Recharts,
TanStack Table, jsPDF, file-saver and zustand.

**Consequence:** rewriting away from the kit is explicitly out of scope. Residue from the kit
still exists in `src/index.css` and is documented in `docs/DESIGN-SYSTEM.md` section 8.

---

## D-002 · TypeScript, not JavaScript
**Date:** 2026-06-10 · **Status:** active

The kit is TypeScript and stays TypeScript.

**Why:** rewriting to JavaScript would discard the kit's value for no deployment benefit. The
output is the same static `dist/`.

**Evidence:** `package.json` build script is `tsc -b && vite build`, so a type error blocks
both the local build and the deploy. This overrides the "JavaScript" line that older project
documentation carried.

---

## D-003 · One application, two surfaces, one build
**Date:** 2026-06-10 · **Status:** active

The public marketing site at `/` and the GAkinzOS CMS at `/app/*` are one Vite application on
one domain, sharing one token set and one deploy.

**Why:** one toolchain, one build artefact, one FTP upload. Two codebases would double the
deploy surface for a studio of this size.

**Evidence:** `src/routes/index.tsx`.

---

## D-004 · Plain PHP and MySQL, no framework and no Composer
**Date:** 2026-06-10 · **Status:** active

The API is one PHP file per resource over `mysqli`, with a shared `_bootstrap.php`. There is
no framework, no ORM and no Composer dependency, including for SMTP and TOTP, which are
implemented by hand.

**Why:** the host provides PHP and MySQL and no Node. Keeping the server dependency-free means
a file can be uploaded and work, with nothing to install or build on the host.

**Cost:** accepted knowingly. There is no shared middleware, so every endpoint must remember
its own `require_auth` call, and there is no migration runner. See D-008.

---

## D-005 · Code-split the CMS off the public critical path
**Date:** 2026-06-10 (`ab5886f`), extended 2026-06-11 (`55f3ab1`) · **Status:** active

The public site is eager. The whole `/app` tree, the auth pages and the shared proposal view
are lazy.

**Why:** a marketing visitor should not download charts, a calendar, a rich-text editor, a PDF
generator and a spreadsheet writer.

**Evidence:** every CMS route uses `lz()` in `src/routes/index.tsx`, and the build output shows
the heavy libraries in separate chunks.

---

## D-006 · Brand: mono and duo, replacing Forest Editorial
**Date:** 2026-06-14 (`d9b27a2`) · **Status:** active. **Supersedes the root `DESIGN-SYSTEM.md`.**

Near-black `#0A0A0A` primary on white, with lavender `#7F77DD` and rose `#D4537E` accents.
Space Grotesk for headings, Manrope for body, JetBrains Mono for data.

**History, in order.** Three brand directions have shipped:

1. **Violet, Inter and Georgia** (2026-06-10, `5a0babc`), refined in the public remodel
   (2026-06-11, `97928b7`) to violet `#8b5cf6` with Roboto, Playfair Display and Fira Code.
2. **"Forest Editorial"**, green and cream with a Caudex display face. This is what the root
   `DESIGN-SYSTEM.md` specifies. **It was implemented**, in the five rollout steps that
   document lists, across 2026-06-14: tokens and fonts (`57c5134`), premium details
   (`3f55cdd`), signature CTA band and hero grain (`9700984`), Caudex titles (`965cf9a`),
   numeric alignment (`ea52132`) and themed empty states (`3c28a74`).
3. **Mono and duo** (`d9b27a2`, same day), whose commit body reads "Full palette + typography
   swap, replaces Forest Editorial".

**Why this correction matters.** The adoption audit recorded Forest Editorial as "never
implemented". The commit history shows otherwise: it was built and then replaced within the
same day. The practical difference is what survived. The **palette and the Caudex face were
swapped out**; the **system work stayed in**, and is still live today: the custom focus ring,
branded selection, themed scrollbars, branded placeholders, the 200ms interactive baseline,
the radius ladder, the grain, the empty states and the numeric table alignment.

**How to treat the root document now:** as a superseded proposal, useful for understanding why
those global details exist. Do not restyle from its colour or type tables. `docs/DESIGN-SYSTEM.md`
is the implemented system.

---

## D-007 · The deploy ships `dist/` only
**Date:** inherited from the original project setup · **Status:** active

GitHub Actions builds and FTP-uploads `dist/`. Everything under `server/` is uploaded by hand.

**Why:** `config.php` holds live credentials and must never be overwritten by an automated
deploy, and the server has no Node so nothing can be built there.

**Consequence:** a server change is committed but not live. This is the most common way work
here looks finished and is not. Outstanding uploads are tracked in `docs/DEPLOYMENT.md`.

---

## D-008 · No migration runner
**Date:** inherited · **Status:** active, and a known weakness

Schema changes are appended to `server/schema.sql` as commented `ALTER TABLE` statements and
run by hand through phpMyAdmin.

**Why:** it follows from D-004. There is nothing on the host to run a migration tool.

**Mitigation in the code:** several endpoints prepare a statement against the newer columns
and fall back to a narrower query when the prepare fails, so an un-migrated database keeps
working with the older feature set instead of returning a 500.

**Consequence:** the applied state of the live schema cannot be known from this repository.
See `docs/DATA-MODEL.md` section 4.

---

## D-009 · `access.ts` mirrors the server and is not a boundary
**Date:** 2026-06-10 (`974579f`), client mirror 2026-06-12 (`c2a5987`) · **Status:** active

Seven roles are enforced server-side by `require_auth()`. `src/lib/access.ts` duplicates the
per-endpoint role lists to hide navigation and redirect disallowed routes.

**Why:** an interface that offers tools a user cannot use is a bug, but hiding is not
security. Both statements are true at once, so both mechanisms exist.

**Consequence:** the two lists can drift. `src/lib/access.test.ts` covers the client side with
11 tests. Nothing automatically checks the mirror against the server.

---

## D-010 · Client isolation is derived from the token, never from a parameter
**Date:** 2026-06-12 (`4571280`, `ae2b968`) · **Status:** active, and load-bearing

`portal.php` derives `client_id` from the authenticated user when the role is `client`, and
ignores any `?client_id` in the request. Staff may pass it to preview a portal.

**Why:** a client changing a URL parameter must never read another client's projects,
invoices or tickets.

**Consequence:** every other resource endpoint is staff only, so the whole multi-tenant
guarantee rests on this one file. Treat any change to it as security-critical.

---

## D-011 · `ai.php` is authenticated and capped per role
**Date:** 2026-06-12 (`205d93a`) · **Status:** active

The OpenRouter proxy requires a valid token and enforces a per-role daily call limit, counted
from `audit_log`.

**Why:** it was previously a public unauthenticated proxy to a paid key, so anyone could burn
the credit.

**Consequence:** the AI quota lives in `audit_log`. Truncating that table resets every quota
and the login throttle with it.

---

## D-012 · Integrations degrade until keyed, and expose booleans only
**Date:** 2026-06-14 (`1d76f70`, `2d72fe8`) · **Status:** active

Every optional integration returns 503 when unconfigured, and the interface hides or disables
the feature. `integrations.php` reports connection state as booleans and never returns a value.

**Why:** the project has to be developable and deployable without a full set of live keys, and
an admin needs to see what is connected without the secret being readable.

---

## D-013 · Manual "mark as paid" is retained alongside Stripe and PayPal
**Date:** 2026-06-12 (`205d93a`), PayPal 2026-06-14 (`799dc0d`) · **Status:** active

**Why:** payments arrive by bank transfer as well as by card, and the studio must be able to
record one without a provider being configured.

---

## D-014 · Comms records conversations; only some channels really send
**Date:** 2026-06-12 (`d0af772`), send added `205d93a` · **Status:** active

The Communication Hub is an internal log. Most messages are recorded, not sent. Email, SMS and
WhatsApp can genuinely send to a linked client.

**Why:** the studio's value from the hub is the history tied to a project, not another mail
client. Real sending was added only where it removed a context switch.

---

## D-015 · The Pulse demo surface was removed, not hidden
**Date:** 2026-06-12 (`7b652f1`) · **Status:** done

All demo routes, demo pages, the demo auth pages, `src/auth/`, the file-manager component and
the dead header widgets were deleted, and `GlobalSearch` was rewritten to point at real
role-gated modules.

**Why:** a demo route that still resolves is a real route, and the previous documentation
contradicted itself about whether these were rebranded or deleted.

**Evidence:** `src/pages/` holds only `ErrorPage.tsx` and `NotFound.tsx`; there is no
`src/auth/` and no `file-manager`.

---

## D-016 · Tests cover access control only
**Date:** 2026-06-12 (`b43abc1`) · **Status:** active, deliberately narrow

Vitest runs `src/lib/access.test.ts`: 11 tests over `canAccess`, `moduleKeyForPath` and
`defaultPathForRole`, with the client-isolation rules asserted explicitly.

**Why:** role gating is the logic where a mistake is silent and expensive. Everything else
was left to the type checker and the build.

**Consequence:** there is no component test, no endpoint test and no end-to-end test. See
`qa/TEST-PLAN.md`.

---

## D-017 · The dev port is pinned to 5102 with `strictPort`
**Date:** 2026-08-22 (`d0d82b6`) · **Status:** active

**Why:** development calls the live API, and the live `ALLOWED_ORIGINS` names one localhost
port. A drifted port fails as an opaque CORS error rather than as a port clash, which is far
harder to diagnose.

---

## D-018 · Hosting, DNS, TLS and mail-server facts live outside this repository
**Date:** 2026-09-04 · **Status:** active, decided during the GEE OS adoption

This repository states no DNS record type, no proxy state, no certificate policy and no mail
host. Those have one authoritative home in the operator's global notes.

**Why:** the previous `CLAUDE.md` carried DNS instructions in four places that were the exact
inverse of the operating reality, and acting on them had already caused three outages. A second
copy of an operational fact drifts, and the stale copy is the one that gets trusted.

**Consequence:** an agent asked to change DNS, certificates or mail hosting from inside this
repository should decline and read the global notes instead.

---

## D-019 · The root `DESIGN-SYSTEM.md` is superseded, not deleted
**Date:** 2026-09-04 · **Status:** active

It stays in the tree as history, with a superseded banner added at its head, and its meaning
is recorded in D-006.

**Why:** it explains why several global interface details exist, so deleting it loses context.
Leaving it unmarked was the hazard: it opens by calling itself "the rebrand contract" and "the
single source of truth", and instructs the reader to read it before touching any styling.

---

## D-020 · The accessibility claim is withdrawn to NOT TESTED
**Date:** 2026-09-04 · **Status:** active

A previous session recorded an axe run with zero violations on the home, contact and pricing
pages, and a contrast fix to the `.gk-pill` eyebrow (`b43abc1`, 2026-06-12).

**Why withdrawn:** no report was kept, the run is not reproducible from this tree, no
accessibility tooling is in `package.json`, and the brand palette has been replaced twice
since. The `.gk-pill` colour recorded in the old notes is not the colour in the code today.

**Consequence:** `qa/ACCESSIBILITY-AUDIT.md` records the whole area as NOT TESTED until a
fresh audit is run.

---

## D-021 · The lint backlog is recorded, not fixed
**Date:** 2026-09-04 · **Status:** active

`npm run lint` fails with 60 errors and 7 warnings across 42 files. This documentation
migration does not change application code, so the backlog is written into
`docs/KNOWN-ISSUES.md` with its measured breakdown.

**Why:** 39 of the 60 errors are one rule, `react-hooks/set-state-in-effect`, which points at a
repeated pattern rather than 39 separate mistakes. Whether to fix, ratchet or accept it is a
scope decision for the owner, and mixing it into a documentation change would hide it.

**Rule going forward:** the backlog must not grow. A change that adds a new lint error is not
complete.

---

## D-022 · The configuration template holds placeholders, never real values
**Date:** 2026-09-04 · **Status:** active

`server/config.php.example` now carries `REPLACE_` placeholders for `DB_NAME`, `DB_USER`,
`$SEED_ADMIN_EMAIL`, `$SMTP_HOST` and `$IMAP_HOST`, alongside the placeholders it already had
for every secret.

**Why:** three of those fields held real production identifiers in a tracked file, and the two
mail hosts named a server retired in the July 2026 migration. That last one is the dangerous
kind of stale: a retired host of that type still resolves and still answers on port 465, so a
configuration copied from the template appears to send mail and never delivers it. A
placeholder fails loudly on connection, which is what a template should do.

**Why a placeholder rather than the correct hostname:** the real mail server is a hosting fact,
and D-018 keeps hosting facts out of this repository. The comment points at the operator's
notes instead.

**Rule going forward:** the template documents the *shape* of a value and never the value.
A convention, such as cPanel's `<cpanel_user>_<database>` prefix, goes in a comment.

**Not covered by this:** `server/auth.php` still defaults the seed admin address to a literal.
That is application code and was left alone. See `docs/KNOWN-ISSUES.md` K-014.
