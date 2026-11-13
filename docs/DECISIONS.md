# Decision records

One entry per decision that still constrains the work. Each carries a date, the decision, why
it was taken, and the evidence that it holds today. Superseded decisions are kept, marked, and
point at what replaced them.

Dates come from the commit history of this repository. The earliest content comes from the
previous `CLAUDE.md` section 13, which was a running session log; it has been converted into
decisions here and into current state in `docs/STATUS.md`. The original narrative remains
readable in git history, including the retired adoption audit
(`git show c57eb4a:docs/adoption/AUDIT.md`). D-038 onward record the owner's approval of the
2026 plan on 2026-10-10.

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
21 tests as at 2026-09-22, up from 11. Nothing automatically checks the mirror against the
server. See D-028 for the 2026-09-22 narrowing and the fail-closed correction.

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

Vitest runs `src/lib/access.test.ts`: 21 tests as at 2026-09-22, up from 11, over
`canAccess`, `moduleKeyForPath` and `defaultPathForRole`, with the client-isolation rules
asserted explicitly.

**Why:** role gating is the logic where a mistake is silent and expensive. Everything else
was left to the type checker and the build.

**Consequence:** there is no component test, no endpoint test and no end-to-end test. This
now includes `server/work.php`, which has never been executed. See `docs/TEST-PLAN.md`.

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
**Date:** 2026-09-04 · **Status:** **superseded by D-044 on 2026-10-10.** The file has left
the tree; D-006 carries its meaning and git history carries its text.

It stays in the tree as history, with a superseded banner added at its head, and its meaning
is recorded in D-006.

**Why:** it explains why several global interface details exist, so deleting it loses context.
Leaving it unmarked was the hazard: it opens by calling itself "the rebrand contract" and "the
single source of truth", and instructs the reader to read it before touching any styling.

---

## D-020 · The accessibility claim is withdrawn to NOT TESTED
**Date:** 2026-09-04 · **Status:** **superseded by D-030 on 2026-09-22.** The body below is
unchanged and was correct when written. A measured run now exists for the public surface;
D-030 states what it covers and what it does not.

A previous session recorded an axe run with zero violations on the home, contact and pricing
pages, and a contrast fix to the `.gk-pill` eyebrow (`b43abc1`, 2026-06-12).

**Why withdrawn:** no report was kept, the run is not reproducible from this tree, no
accessibility tooling is in `package.json`, and the brand palette has been replaced twice
since. The `.gk-pill` colour recorded in the old notes is not the colour in the code today.

**Consequence:** `docs/AUDIT.md` records the whole area as NOT TESTED until a
fresh audit is run.

---

## D-021 · The lint backlog is recorded, not fixed
**Date:** 2026-09-04 · **Status:** active

`pnpm run lint` fails with 60 errors and 7 warnings across 42 files. This documentation
migration does not change application code, so the backlog is written into
`docs/KNOWN-ISSUES.md` with its measured breakdown.

**Why:** 39 of the 60 errors are one rule, `react-hooks/set-state-in-effect`, which points at a
repeated pattern rather than 39 separate mistakes. Whether to fix, ratchet or accept it is a
scope decision for the owner, and mixing it into a documentation change would hide it.

**Rule going forward:** the backlog must not grow. A change that adds a new lint error is not
complete.

**Where it stands, 2026-09-22:** 47 errors and 2 warnings across 33 files. The ratchet held
through the relaunch and the count came down by twelve without anyone setting out to fix the
backlog. 48 and 2 are the new ceiling. The breakdown is in `docs/STATUS.md` section 6.2.

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

---

## D-023 · A new design system for the public surface, and only the public surface
**Date:** 2026-09-22 · **Status:** active. **Narrows D-006.**
**Status note:** superseded on the public surface by D-037, 2026-10-10.

The public site at `/` is rebuilt on a new palette, type scale and component set, scoped to
the `.gk-public` wrapper in `src/index.css`. GAkinzOS at `/app/*` keeps the mono and duo
tokens D-006 describes, unchanged.

The direction is "direction C with direction A's colour", chosen by the owner from three
directions produced independently against one shared specification.

**The decision trail.** The three directions were A, a Neo-Brutalist information flow; B, a
migration from a real-world London benchmark studio; and C, the London typographic and
information-design tradition. The owner chose a hybrid, recommended over taking A, B or C
unchanged: C's structure (the page as a document, a contents list instead of a horizontal
nav bar, a ruled ledger of work whose row labels change with the record kind, Newsreader over
Instrument Sans with IBM Plex Mono confined to data, a nine-value scale, warm paper and ink),
with A's colour confidence carried into the navy and vermilion spines on each work record. B
and C converged further than intended, so A was the genuine alternative. Every image slot in
all three was an empty labelled frame, so what was judged was structure and typography, not
composition with real photography. The direction note and the shared brief were retired on
2026-10-10 (D-044) and remain in git history
(`git show c57eb4a:docs/design/2026-09-22-directions/direction-approved.md` and
`git show c57eb4a:docs/design/CONTENT-BRIEF.md`). D-037 replaces this direction once
implemented.

**What the palette is.** Warm paper `#F6F3ED` and a sunk half-step `#EFEBE2`; warm ink
`#1C1A16` with `#514C42` and `#6B6459` beneath it; two chromatics, navy `#2A3160` named
`set` and red oxide `#933C2F` named `come`; and two rules, `#D8D2C6` for decoration and
`#8E8577` for structure and form borders.

**What was retired, and why.** Lavender `#7F77DD` and rose `#D4537E` are gone from the public
surface, and with them the animated gradient, the aurora hero backdrop, the ghost numerals
and the card idiom. The reason is measurable rather than a matter of taste: neither accent
can hold a flat block or carry white text, which is precisely why the old site could only
ever wash them into a gradient. All three independent directions derived new inks from them
rather than using them.

**What survives at `:root`, and why.** The `--gk-violet`, `--gk-indigo` and `--gk-sky`
definitions remain, but the `.gk-public` override of them is gone. They survive only because
`src/app/Login.tsx` and `src/app/SetPassword.tsx` still use `.gk-grad-text`, `.gk-aurora` and
`.gk-grid`. The names contradicted their values, which the audit named as a standing source
of error: `--gk-indigo` held black and `--gk-sky` held rose.

**Evidence.** Contrast on the new palette was computed and then measured again on rendered
pixels: 28 distinct foreground, background and size combinations across the public routes,
0 failures, lowest 4.91:1. See `docs/AUDIT.md`.

**Rule going forward.** None of `.gk-aurora`, `.gk-grid`, `.gk-shine`, `.gk-grad-text`,
`.gk-ring` or `.gk-grain` may appear on a public page. If one turns up in `src/marketing/`
again, that is a regression, not a choice.

---

## D-024 · The public type scale is closed at nine values
**Date:** 2026-09-22 · **Status:** active
**Status note:** on 2026-10-10 the nine values were retuned to the D-037 reference (14 to
80px) and the families below were replaced by Sofia Sans; the names and the closed rule are
kept. `tailwind.config.js` holds the current values.

`tailwind.config.js` defines a nine-value perfect-fourth scale under semantic names: `label`,
`body`, `lede`, `t4`, `t3`, `t2`, `t1`, `display`, `hero`. **No size outside the scale may
ship on a public page.** Three families carry it: Newsreader as `font-display`, Instrument
Sans as `font-ui`, IBM Plex Mono as `font-data`.

**Why a closed scale rather than a recommended one.** The site it replaced used eight
arbitrary heading sizes. That was the clearest single signal that it had been assembled
rather than designed. Semantic names remove the thing that caused it: there is no
`text-[2.6rem]` to reach for, and a reviewer can see at a glance whether a page has invented
a size.

**Why Newsreader.** Its optical-size axis carries a 120px masthead and a 21px standfirst from
one family, so the page needs no second display voice.

**Consequence for the CMS.** These are additions. GAkinzOS keeps Tailwind's default sizes,
Manrope and JetBrains Mono. Space Grotesk is gone from both surfaces; it had been mapped to
`font-serif`, a slot with no serif fallback, so `font-serif` silently rendered a sans.

---

## D-025 · One work record type with four kinds, not four tables
**Date:** 2026-09-22 · **Status:** active

The work ledger is one table, `work`, with a `kind` column taking `case_study`, `product`,
`experiment` or `writing`, and one child table `work_images`. There is no separate table, no
separate endpoint and no separate CMS module per kind.

**Why one table.** The four kinds share every field that matters: a slug, a title, a summary,
three body sections, dates, links and an ordered image set. Four tables would have meant four
copies of the same create, update, publish, reorder and image-attachment code, and four
places for the client-consent rule to be forgotten.

**How one table still expresses four kinds.** The three ledger row labels change with the
kind. A case study reads Problem, Built, Outcome. An experiment reads Question, Made,
Learned. Writing reads Argument, Written, Status. This is the mechanism that replaces a
badge: an experiment never has to pretend it had a client, because its rows ask a different
question. The mapping lives in `KIND_LABELS` in `src/marketing/data/work.ts` and comes from
the approved direction.

**Evidence.** `server/schema.sql`, the `work` and `work_images` blocks at the foot;
`server/work.php`; `src/marketing/components/Ledger.tsx`.

**Not yet true of the live system.** Neither table exists on any database, and `work.php` has
never been executed. See `docs/STATUS.md` section 6.5.

---

## D-026 · Per-route metadata through React 19's native hoisting, not a metadata library
**Date:** 2026-09-22 · **Status:** active

`src/marketing/components/Seo.tsx` renders `<title>`, `<meta>` and `<link rel="canonical">`
inside the page component. React 19 hoists all three into the document head from anywhere in
the tree, so no library sits between the page and its metadata.

**Why not react-helmet or a similar package.** It would buy nothing that the runtime already
does, and it would add a dependency to a tree this branch was otherwise cutting down. The
dependency count went from 56 to 29; adding one back to reimplement a built-in would be a
poor trade.

**The one exception.** JSON-LD is rendered in place rather than hoisted, because React has no
special handling for an inline `<script>`. That is valid: structured data may sit anywhere in
the document.

**The limitation, stated plainly.** This is a client-rendered single-page application with no
prerender step. A crawler that does not execute JavaScript sees none of this metadata.
Googlebot renders; most social scrapers and LLM crawlers do not. `public/llms.txt` is a
hand-written mitigation for that, not a fix. Recorded in `docs/KNOWN-ISSUES.md`.

**Evidence.** Every public page renders a `<Seo>` with its own title, description and
canonical. `/verify/:id`, `/p/:token`, the `ServiceDetail` not-found branch and the 404 are
`noindex`. Lighthouse SEO scored 100 on the local production build, which checks that the
tags are present in the rendered document; it does not check what a non-rendering crawler
sees.

---

## D-027 · A labelled gap ships in preference to an invented value
**Date:** 2026-09-22 · **Status:** active, **narrowed by D-039 on 2026-10-10.** Never
inventing a value still holds in full. What changes is the remedy: absent material is left
unpublished and the page is written around what can be stated honestly, rather than shown to
buyers as a visible "to supply" gap.

Where the site has no real material for a slot, it ships a designed, visible, labelled
placeholder carrying the red oxide that means "awaiting material". It does not ship a stock
photograph, an invented client, a rounded-up figure or a plausible-sounding outcome.

Two primitives implement it: `Placeholder` for a block, `Gap` for a missing value inside a
line of text. Both are in `src/marketing/components/primitives.tsx`.

**Why this is a decision and not a stopgap.** The convention has a cost, which is that the
site looks unfinished in the places where it is unfinished. That is the point. A portfolio
that invents a client, or a personal site that uses a photograph of a stranger, has made a
false statement to the exact audience it is trying to persuade. A labelled gap has not.

**Where it binds beyond the interface.** `src/marketing/data/work.ts` holds a static fallback
whose every record is true and describes the owner's own work; a field with no true value is
`null` and renders as a gap. `server/work.php` refuses to publish a record that names a
client without stored consent. `personSchema()` (now in `seo-schema.ts`, beside `Seo.tsx`) omits `sameAs` entirely rather
than pointing it at `https://github.com/`, because structured data is read by machines that
cannot tell a placeholder from an identity claim.

**Consequence.** Filling a gap means obtaining the real material, never relaxing the rule.

---

## D-028 · `canAccess` fails closed
**Date:** 2026-09-22 · **Status:** active. **Corrects a defect in D-009's implementation.**

`canAccess(role, moduleKey)` in `src/lib/access.ts` now returns `false` for a module key that
has no `MODULE_ROLES` entry. It previously returned `true`.

**Why it mattered.** A CMS route added without an `access.ts` entry was reachable by every
signed-in user, the `client` role included. The failure was silent: adding a module and
forgetting one of the five wirings produced a working, visible, ungated page rather than an
error. D-009 already says `access.ts` is not a security boundary, and that remains true, but
a navigation guard that opens by default is not doing the job it exists for either.

**Why it does not break ungated pages.** `moduleKeyForPath` returns `null`, never an unmapped
key, for a genuinely ungated path such as account settings, and `RequireAuth` skips the gate
on `null`.

**Also narrowed in the same change.** `work` was added to match `work.php`; `files` lost
`trainer`, which the server list never held; `portal` was narrowed to match the server after
`portal.php` restricted its staff branch; and `dashboard` was narrowed, with
`defaultPathForRole` updated so `trainer` and `employee` land on a module they can actually
open instead of being bounced off the index they had just been sent to.

**Evidence.** `src/lib/access.test.ts`, now 21 tests, passing.

---

## D-029 · A work image gets a permanent public share token, and that widens the exposure
**Date:** 2026-09-22 · **Status:** active, and it is a deliberate trade

`work.php?action=addImage` issues the underlying file a `share_token` with **no expiry**, and
clears any existing expiry, before writing the `work_images` row. `files.php?token=...` then
streams the binary to anyone who has the URL.

**Why.** A public portfolio image has to stay reachable for as long as the record is
published. The alternative was a second manual step per picture, in which the owner issues
and re-issues a share link by hand, and the visible failure of forgetting is a broken image
on the public site. The token is written before the row so that a failure cannot leave an
attached image that silently never renders.

**What this widens, stated plainly.** Before this change every `files` share token expired.
Now some do not. A permanent token is an unguessable but unexpiring public URL to a file in
the same table that holds client deliverables. It is not revoked by unpublishing the work
record, and it is not revoked by removing the image from the record; only deleting the file
or clearing its token revokes it. Anyone who has ever held the URL keeps it.

**The second hazard, and its guard.** `files.share_token` has **no unique constraint**,
unlike `proposals.share_token`, and the public lookup in `files.php` uses `LIMIT 1`. A
duplicate token would therefore serve the wrong file to the public. `work.php` checks a token
is unused before writing it, which turns the common case into a safe one, but a race between
two requests would still slip through. The second guard is
`ALTER TABLE files ADD UNIQUE KEY uk_file_share (share_token)`, written at the foot of
`server/schema.sql` and **not applied**. It must be run after checking for existing
duplicates, because it fails if any exist.

**Consequence.** Until that index is applied, the collision guard is one application-level
check with a race in it. Treat attaching a work image as a publishing action with a
permanent consequence, not as an upload.

---

## D-030 · D-020 is superseded: the public surface is measured, the rest is not
**Date:** 2026-09-22 · **Status:** active. **Supersedes D-020.**

D-020 withdrew an unevidenced accessibility claim to NOT TESTED. That withdrawal did its job
and is not edited. It is superseded here rather than amended, because the situation has
changed rather than the history.

**What was measured, on 2026-09-22, against the production build served locally by
`pnpm run preview` and driven through the Chrome DevTools protocol:**

| Measurement | Result |
|---|---|
| axe-core 4.10.2, 16 public routes | 0 violations |
| Lighthouse mobile, Accessibility category | 100. 54 audits passed, 0 failed |
| Contrast on rendered pixels | 28 combinations, 0 failures, lowest 4.91:1 |
| Focus indicators | 353 focusable elements across 13 routes, 0 failures, lowest ring contrast 14.46:1 |
| Reflow at 640x512, equivalent to 1280x1024 at 200 per cent | No horizontal scrolling on 8 routes |
| 390px viewport | No overflow, no target under 24x24 |

The report is `docs/AUDIT.md`, which states for each line what was run, against
what, and on what date.

**What is still NOT TESTED, and it is not a footnote.** No screen-reader pass with real
assistive technology has been run. Automated tooling catches a specific and limited class of
problem; it cannot tell you whether a page makes sense read aloud. GAkinzOS at `/app/*` was
not audited at all and is out of scope of this run.

**The rule that D-020 established and this decision keeps.** The measurement lives in the
audit file, not in marketing copy. The public site now makes no accessibility claim anywhere
in its own text. The previous site animated the figure "100% Accessible, WCAG 2.1 AA" on its
home page while the project's own documentation retracted it, and that must not recur. The
correct sentence is "axe-core reported zero violations across 16 routes on 2026-09-22", never
"the site is accessible".

---

## D-031 · `api.php` is a read-only health check
**Date:** 2026-09-22 · **Status:** active

`server/api.php` now answers `GET` only, with `{ ok, php, db }`, proving that PHP runs and
the database connection works. It touches no application table and mutates nothing. Any other
method returns 405.

**Why.** It previously listed and inserted rows in `items` with no authentication, so anyone
on the internet could write to the production database. It was a build-order artefact from
step one of the project that nothing had ever removed. This closes `docs/KNOWN-ISSUES.md`
K-004 in source.

**Not yet true of the live server.** The file is committed and **not uploaded**. The
unauthenticated POST is presumed still live until someone with server access confirms
otherwise. See `docs/DEPLOYMENT.md`.

---

## D-032 · Dead weight is removed, and the counts become a ratchet
**Date:** 2026-09-22 · **Status:** active

35.92 MiB of unreferenced assets were deleted from `public/`, along with 27 orphaned source
files and 27 npm packages. Direct dependencies went from 56 to 29. `index.html` stopped
loading two render-blocking icon webfonts from two CDNs that had zero usages between them.
The empty `tailwind.config.ts` stub was deleted and `components.json` repointed at
`tailwind.config.js`. `vite.config.ts` gained a `manualChunks` function cutting a `vendor`
chunk and one `icons` chunk in place of roughly thirty lucide micro-chunks.

**Measured effect.** Entry chunk 556.94 kB to 181.76 kB. `dist/` 43 MB to 2.6 MB. `public/`
36.1 MB to 96 KB. `npm audit` findings 33 to 7, of which only `xlsx` is a direct dependency
and it has no fix available.

**Why record this as a decision rather than as a changelog entry.** Because the numbers are
now a ratchet, in the same way D-021 made the lint count one. A change that re-adds an
unreferenced asset, an unused dependency or a CDN webfont is not complete. The 43 MB `dist/`
did not arrive in one commit; it accumulated because nothing was counting.

**What was deliberately kept.** The CDN-free rule applies to the public surface. The Google
Fonts stylesheet in `src/index.css` remains, because the three public families and the two
CMS families are loaded from it and there is no self-hosted alternative in this tree. That is
still a third-party render dependency and is recorded as such in `docs/ARCHITECTURE.md`.

## D-033 · Alternative sign-in never stands in for two-factor; magic links are for clients
**Date:** 2026-10-10 · **Status:** active

Magic links sign in `client` accounts only, and not a client with two-factor on. Staff, and
anyone with two-factor on, sign in with password and code. Google sign-in refuses accounts with
two-factor on. A link is claimed with a guarded UPDATE so it works once under concurrency.
**Why:** `magic_consume` gave `super_admin` a full session from an email alone (K-027), and the
approved scope (`docs/PRODUCT-SPEC.md` section 6.1) requires that customer access never
becomes owner access.

## D-034 · A provider payment must match the invoice's payable total
**Date:** 2026-10-10 · **Status:** active

Every amount sent to, or accepted from, a payment provider is the VAT-inclusive payable total
from `server/_money.php`, the same rounding as `invoices.php` and `portal.php`. The Stripe
webhook marks an invoice paid only when amount and currency match, and records each event in
`payment_events`. PayPal checkout stays off (`$PAYPAL_ENABLED`) until it has a webhook or a
manual reconciliation step. **Why:** K-025 and K-026. Stripe is the one launch provider
because it already has a signed webhook.

## D-035 · Only a sent, unexpired quote is accepted, once, and its terms are then fixed
**Date:** 2026-10-10 · **Status:** active

Acceptance requires `status = 'sent'` and `valid_until` not passed, claims the quote inside the
transaction, and creates exactly one project and one 40/30/30 schedule. An accepted quote
cannot be moved back to draft; changed terms need a new quote. The CMS previews the three
VAT-inclusive instalments before confirming. The 40/30/30 split itself is unchanged and awaits
the owner's review (`docs/STATUS.md` section 5). **Why:** K-028.

## D-036 · Server behaviour is tested against a synthetic database, and deploy waits for CI
**Date:** 2026-10-10 · **Status:** active

`pnpm run test:server` runs the real PHP endpoints from a temporary copy of `server/` with a
synthetic `config.php`, against a local database whose name must end in `_test`, with a fake
payment provider and `mail()` pointed at `/usr/bin/true`. It refuses any non-local host. CI
runs it with unit tests, `php -l` and the lint ratchet, and `deploy.yml` runs only after CI
succeeds on a push to `main`. **Why:** development calls the live API (constraint 8), so
without this nothing server-side could be tested safely; and a parallel deploy could ship a
failing build (K-035).

## D-037 · The design direction becomes the full Mastercard-inspired GetDesign system
**Date:** 2026-10-10 · **Status:** decided by the owner, not yet implemented

The owner chose `npx getdesign@latest add mastercard` as the full design system for the website
and the CMS, followed as closely as possible. This withdraws the 2026-09-22 rule that the
public site must not borrow another company's design language, and replaces direction C
(D-023) once implemented. The evidence rule from the same date stands: no claim on the public
site without a source. Only the substitutions in `docs/DESIGN-SYSTEM.md` section 10.2 are made:
a licensed font in place of MarkForMC, never the Mastercard mark colours or interlocking
circles, and contrast fixes. The imported reference is preserved unedited as
`docs/DESIGN-REFERENCE-MASTERCARD.md` (getdesign 0.6.25). `docs/DESIGN-SYSTEM.md` sections 1 to
9 describe the built system until the rebuild lands.

## D-038 · Six services; no networking installation or hardware repair
**Date:** 2026-10-10 · **Status:** decided by the owner. Public pages not yet updated

GAkinz advertises six services: web design, web development, ecommerce, website care, general
IT support and IT consultancy. Networking installation and hardware repair are not offered and
must not be advertised; articles about such equipment are buying advice only. Neither IT
service needs a new CMS module: IT support is tickets plus billable time on a standing project
per client, and consultancy is a small project ending in a written recommendation
(`docs/PRODUCT-SPEC.md` section 5.5). **Why:** the owner added the two IT services to the four
in `site.ts`. **Not yet true:** `site.ts` holds four services and no IT prices.

## D-039 · GAkinz is the public name, with Gideon named as the owner
**Date:** 2026-10-10 · **Status:** approved with the 2026 plan. Public copy not yet updated

The company-facing name is GAkinz, with Gideon Akinlotan clearly named as the owner doing the
work. "I" is used where Gideon delivers personally; the company name in business terms and
profile headings; no team is claimed unless a job genuinely involves one. This replaces the
2026-09-22 relaunch rule that the site leads with the person and names the studio only where a
team does the work. It also narrows D-027: public pages show no "to supply" panels,
engineering counts or internal paths, and absent material stays unpublished (K-038).
**Why:** the business sells to companies and wants a company social identity, while staying
honest that one person does the work.

## D-040 · The CMS centres on seven destinations, and optional modules stay quiet
**Date:** 2026-10-10 · **Status:** approved with the 2026 plan. Sidebar grouping built 2026-10-10,
not deployed (K-032); tools inside records still to do

The owner's navigation is Today, Enquiries, Clients, Projects, Money, Website and Settings.
Supporting tools live inside the relevant record rather than in a flat 24-item sidebar. This
is grouping and relabelling, not removal: existing URLs stay until the migration is verified,
optional modules stay available but quiet, and hiding navigation removes neither endpoint
access nor stored data. The seven server roles stay; the interface defaults to the owner and
the client. Clients get their own small menu. Detail: `docs/PRODUCT-SPEC.md` section 5.2.
**Why:** one owner runs the business alone, and the next action should not need cross-checking
across 24 screens.

## D-041 · Editorial resources first; affiliate links and AdSense only as measured pilots
**Date:** 2026-10-10 · **Status:** approved with the 2026 plan. Nothing set up

Resources stay an editorial section on practical small-business technology tied to the six
services. Amazon affiliate recommendations are added selectively, with the required disclosure.
AdSense is piloted on suitable articles only, after content, consent (a certified CMP),
performance and approval checks; service, pricing, work, contact, legal and every private page
stay free of ads, and no monetisation script runs in an authenticated layout. Service enquiries
come first and ad revenue is never a launch dependency. Policy: `docs/CONTENT-AND-GROWTH.md`.
**Why:** secondary income must not cost buyer trust, page speed or compliance.

## D-042 · Synthetic-data testing and a tested recovery come before sensitive workflows grow
**Date:** 2026-10-10 · **Status:** approved with the 2026 plan. Server test path built (D-036)

No sensitive workflow (sign-in, money, client isolation, customer messaging) expands until it
can be exercised against synthetic data that cannot reach the live API, mail or payment
providers, and until a backup restoration has been demonstrated. Rules:
`docs/OPERATIONS.md` sections 8 to 10. **Why:** development calls the live API and there is no
staging (constraint 8), and no backup procedure is known to exist (K-010).

## D-043 · The 2026 plan is approved, and `docs/PRODUCT-SPEC.md` is the scope authority
**Date:** 2026-10-10 · **Status:** active

The owner approved the 2026 production plan. Its durable content now lives in the canonical
documents: scope in `docs/PRODUCT-SPEC.md`, design in `docs/DESIGN-SYSTEM.md` section 10,
content and monetisation in `docs/CONTENT-AND-GROWTH.md`, gates and recovery in
`docs/OPERATIONS.md`, release policy in `docs/DEPLOYMENT.md`, findings in
`docs/KNOWN-ISSUES.md`, and phases, open work and owner inputs in `docs/STATUS.md`. The
temporary plan folder is no longer referenced by anything.

What the approval settles, beyond D-038 to D-042: the current stack and records are kept, with
no framework migration; the client portal stays small, with its useful functions finished and
isolation proved; client access in phase 1 is the existing client password sign-in only, with
a reference and email link only after scenario J03 passes; fewer functions are finished well;
and the "deliberately not doing" list in `docs/PRODUCT-SPEC.md` section 8 holds until a dated
decision names a repeated need and its maintenance cost. The original `GAkinzOS.html` brief
stops being the scope authority; its 175 features keep their dispositions in Appendix B of the
product specification. **Why:** one source of truth per fact, and a scope a sole owner can
finish.

## D-044 · Superseded and completed documents leave the tree; git history keeps them
**Date:** 2026-10-10 · **Status:** active. **Supersedes D-019.**

Retired with `git rm`, after their still-valid content was moved: the root `DESIGN-SYSTEM.md`
(meaning in D-006), `GAkinzOS.html` (the register in `docs/PRODUCT-SPEC.md` Appendix B), the
three `docs/adoption/` records (decisions D-006 and D-019 to D-022, issues K-001 to K-003), the
September content brief and direction note (D-023, D-039, `docs/PRODUCT-SPEC.md` section 3) and
the completed relaunch specification (D-023 to D-032, `docs/STATUS.md`). Every one remains
readable at `c57eb4a`, for example `git show c57eb4a:GAkinzOS.html`. **Why:** D-019 kept the
superseded design file to explain global details, but D-006 already does that, and an
out-of-date file in the tree is read as current by people and agents alike. The documentation
now follows the GEE OS standard-application layout (`docs/GEE-OS.md`).

## D-045 · Documents change in the same pull request as the code, and CI checks it
**Date:** 2026-10-10 · **Status:** active

A change is not complete until the documents it affects are updated in the same pull request.
The change-to-document map is in `AGENTS.md`, "Keeping documents current". Measured counts
live only in `docs/STATUS.md` section 0, and server work not yet uploaded lives only in
`docs/DEPLOYMENT.md` section 5. `pnpm run docs:check` (`scripts/docs-check.mjs`) runs in CI on
every pull request: relative links must resolve, the owner's temporary planning folder must not
be referenced, a server PHP or `.htaccess` change must touch `docs/DEPLOYMENT.md`, and a schema
change must touch `docs/DATA-MODEL.md` and `docs/DEPLOYMENT.md`.
**Why:** by 2026-10-10 counts had drifted between documents, three partial upload lists
competed in `docs/DEPLOYMENT.md`, and several fixed defects were still listed as open. A check
that a document changed cannot prove it changed correctly; review still has to.
**Evidence:** `pnpm run docs:check --base refs/remotes/origin/chore/codebase-hygiene` passes
on the branch, and fails, naming `docs/DEPLOYMENT.md`, when a server file is touched alone.

## D-046 · The public site and GAkinzOS move to the approved 2026 redesign
**Date:** 2026-10-14 · **Status:** active. **Supersedes D-037** for visual direction; D-023's
honesty rules (no invented figures, clients or outcomes, labelled gaps) still hold.

The owner reviewed three directions as working prototypes and approved direction A, "Live
Wall" (slate-blue graphite, one sky accent, Bricolage Grotesque, Hanken Grotesk and JetBrains
Mono, all self-hosted), with the brand-colour hero from direction C. The public site is built
from the approved landing prototype, scoped to `.gk-site` in `src/marketing/site.css`; the CMS
takes the same type and palette with a sidebar that stays dark in both themes, from the
approved CMS prototype. The hero shows up to five published Work records chosen in the CMS,
each in the client's own brand colour, and the site's key copy (hero, services, process,
pricing, FAQs, contact and footer) is edited in the new Site content module and published
through `server/site.php`. No public copy states a fixed count of projects or services.
**Why:** the owner judged the D-037 build generic, wanted a full-screen animated hero, an
informative portfolio of real projects and a CMS of the same standard, and wanted the hero
and key sections editable without a developer. **Evidence:** prototypes reviewed and approved
by the owner on 2026-10-14; screenshots of the owner's projects captured from their local
builds on 2026-10-13. Client sites are named with the owner's confirmation.

## D-048 · The six service pages use the approved copy only, and an incomplete service is never published
**Numbering:** D-047 is reserved by the open pull request #19 (`design/hero-nav-footer-demo`), so this decision is D-048.
**Date:** 2026-10-19 · **Status:** active. Builds on D-038; D-039's rule against visible gaps
still holds.

Three rules govern the service pages built in journeys batch 4.
1. **Spec 4.3 copy only.** Each page is made from the hooks, typical needs, deliverables,
   exclusions and price basis approved in `docs/PRODUCT-SPEC.md` sections 4.1 to 4.3, and from
   figures already in `site.ts`. Where the owner has not answered (IT coverage, area, response
   time, IT prices) the page leaves the fact out and says "Priced per job, ask for a quote."
   It shows no gap marker and invents nothing (K-090). Three website exclusions were priced
   from `site.ts` and are recorded for the owner to confirm (K-092).
2. **A service is published whole or not at all.** A services row carries `slug`, `group`,
   `hook`, `needs`, `deliverables`, `exclusions` and `price_basis` together or none of them.
   `site.php` refuses a half page on save, and the public site shows a custom row only when it
   has every field, so a half page cannot appear on a buyer page.
3. **A legacy list falls back to the built-in six.** A published list of title-and-summary rows
   shows the built-in six in their default order, with matching titles and summaries, until the
   owner saves once. The editor upgrades such a list on opening and adds the missing built-ins
   at the end (K-093). The Website care slug stays `care-and-support`.

**Why:** the owner approved the services and their content on 2026-10-10 (D-038) but not the
missing facts; building from the approved text unblocks the pages without inventing a claim,
and an all-or-none page avoids a published service that looks unfinished. **Evidence:**
`src/marketing/data/content.test.ts`, `src/app/modules/siteContentModel.test.ts`,
`tests/server/site.test.ts`, and a mocked-API browser check recorded in `docs/STATUS.md`
section 0.5. Live behaviour is NOT TESTED.

---

## D-049 · Work references are shown but never used for access; code deletes only a prospect's data, and only behind explicit gates
**Numbering:** D-047 is reserved by the open pull request #19, so the next free number after
D-048 is D-049.
**Date:** 2026-10-19 · **Status:** active, rule 1 amended by D-050 (phase 2 sign-in is built
switched off). Narrows `docs/PRODUCT-SPEC.md` section 6.1 for now; builds on the retention
proposals in `docs/PRIVACY-READINESS.md` section 6.

Two rules from journeys batch 5.
1. **A work reference identifies work and is never a key.** Every new enquiry gets
   `GK-E-YYYY-NNNN` and every new project `GK-P-YYYY-NNNN`, numbered per kind and per year from
   `reference_counters` and never reused (SQL 19). Quotes, invoices and contracts show their
   project's reference only while that project is live and belongs to the same client. The
   reference is shown to the visitor on the contact thank-you, to staff on their screens and
   in search, and to a client on their own portal cards and documents. **No endpoint reads a
   reference from a request**: nothing is looked up by it without staff sign-in, and nobody
   signs in with it. Spec 6.1 phase 2 (reference plus an email link) stays unbuilt until
   journey J03 passes and the owner sets the policy. No acknowledgement email is sent (K-097).
2. **Code deletes personal data only for prospects, and only behind explicit gates.** A super
   admin may erase one enquiry that never became a client, after a preview and typing its
   email address; a won enquiry, or one linked to a client, a user or a contract signer, is
   refused and nothing changes. The retention executor (`cron.php job=retention_apply`) acts
   on old prospect enquiries and soft-deleted files only, from the command line only, and
   deletes only when `--apply`, `$RETENTION_APPLY = true` and that rule's period all agree;
   the template ships `false` and `null`. A client's request opens a ticket and deletes
   nothing. Clients, users, projects, invoices, contracts, tickets and messages have no
   delete until the owner and an adviser agree the periods and procedure (K-062).

**Why:** a reference that unlocks anything would be a guessable password, so it is kept as a
label until a proper verified sign-in exists; per-year sequences are short to read out on the
phone, at the cost of revealing yearly volume (K-094). Deleting a prospect who never became a
client touches no record the business must keep, so it can be built now; anything else
needs periods that are legal decisions, and an accidental run must not be able to delete.
**Evidence:** `tests/server/references.test.ts` (sequence, concurrency, backfill, no lookup
by reference, a static check on request reads), `tests/server/erase-enquiry.test.ts`,
`tests/server/retention-apply.test.ts`, `tests/server/deletion-request.test.ts`, and a
mocked-API browser check recorded in `docs/STATUS.md` section 0.6. Live behaviour is NOT
TESTED.

---

## D-050 · Gated features ship switched off, and the owner switches them on after the named decisions; ad and consent settings live in tracked code
**Date:** 2026-10-19 · **Status:** active. Amends D-049 rule 1 and `docs/PRODUCT-SPEC.md`
section 6.1 (the policy now gates switching on, not the build).

Three rules from journeys batch 6.
1. **A feature that waits on an owner, legal or hosting decision may be built, but it ships
   switched off**, with tests proving that nothing changes while it is off, and the owner
   switches it on only after the named decisions and gates are recorded. Client sign-in by
   reference and email (`server/client_access.php`) is off unless the live `config.php` sets
   `$REFERENCE_SIGNIN_ENABLED = true`, only the boolean `true` counts, and every route
   answers 404 while off. Its gates are the owner's sign-in policy and the three technical
   gates in `docs/DEPLOYMENT.md` section 5.4 (K-100 to K-102).
2. **Advertising and consent settings live in a tracked file**, `src/marketing/lib/
   monetisation.ts`, not in Site content or the CMS. All are off. Switching the pilot on or
   off is a reviewed code change and a deploy. Ads never load without a certified CMP, and only
   after Purpose 1 consent; nothing third-party loads on a private route, and the build fails
   if a prerendered page or the app shell carries third-party markup.
3. **A feature the session could not build safely is recorded, not worked around.** Client
   anonymisation (Task 26) was refused by the session's safety check on 2026-10-19 and left to
   an owner and adviser decision (K-108).
   *Amended 2026-10-20:* the owner then approved building it ("go on"), and the client
   anonymisation tool also ships switched off (`$CLIENT_ANONYMISE_ENABLED`, off unless the
   boolean `true`), with an adviser's confirmation of its rules as the gate.

**Why:** building ahead of a decision keeps the work moving while the decision stays with the
owner, and an off switch that is proven by tests costs nothing in production. The CMS
sign-in token sits in browser storage on the same origin (K-033), so turning on a third-party
script is a security change: the editor role, which can publish site content, must not be able
to do it, and keeping it in code makes "off" provable at build time and adds no request.
**Evidence:** `tests/server/client-access.test.ts` (404 on every route for absent, `false`,
`1`, `"true"` and `"1"`, with no mail, audit row or session), `src/lib/clientAccess.test.ts`,
`src/marketing/lib/consent.test.ts`, `src/marketing/components/AdSlot.test.tsx`,
`src/prerender/third-party.test.ts`, and the build gate in `scripts/prerender.mjs`. Live
behaviour, a browser run of the sign-in form and the ad slots, and a real CMP or AdSense
script are NOT TESTED.


## D-051 · Public-site scroll motion uses GSAP and Lenis, loaded at idle and only for visitors who allow motion
**Date:** 2026-10-21 · **Status:** active. Extends D-046 and the `.rise` rule in `CLAUDE.md`.

1. **Lenis smooths wheel scrolling and GSAP ScrollTrigger lifts sections in** on the public
   site only (`src/marketing/lib/motion.ts`, started and stopped by `PublicLayout`). GAkinzOS
   never loads either library.
2. **Enhancement only.** Neither library is in the prerendered markup or the first paint: they
   load in their own chunks once the browser is idle. Under `prefers-reduced-motion: reduce`
   they are never fetched, and switching the preference on mid-visit stops them and shows
   every element.
3. **Nothing on the first screen is hidden.** Only elements that start below the viewport are
   set up for an entrance, so a failed load leaves every element visible and the prerendered
   page never flashes. Route changes jump to the top through Lenis, and the mobile drawer
   pauses it.

**Why:** the owner asked for the landing to be polished with GSAP and Lenis on 2026-10-21. The
cost (about 51 kB gzipped across three chunks) is kept off the critical path.
**Evidence:** `src/marketing/lib/motion.test.ts`; a browser run on 2026-10-21 against the built
preview (`vite preview`, 1440 and 390px): libraries load after idle, 27 elements set up on the
home page and 0 still hidden at the page foot, `/services` reached at the top with focus on its
`h1`, drawer stops and restarts Lenis, no horizontal overflow, and under reduced motion no
library request and nothing hidden. Real devices, Safari, trackpads, real assistive technology
and a Lighthouse run are NOT TESTED.

## D-052 · Staff and portal users sign in with Clerk (email code only)
**Date:** 2026-10-30 · **Status:** built on `move/cpanel-clerk`, released to the live server on 2026-10-30, owner sign-in confirmed working (`docs/STATUS.md` section 0.8); merged to `main` (`a034e40`, 2026-10-30, fast-forward). Owner instruction, 30 October 2026: move every project to the standard Clerk sign-in, as done for EGO LIMITED.

1. **Clerk proves who is calling; roles stay in `users`.** `server/_clerk.php` verifies a Clerk
   session token (RS256, signing keys cached, issuer, expiry, not-before and authorised-party
   checks). `require_auth()` accepts it beside the existing 64-hex session tokens.
2. **Linking.** `users.clerk_user_id` (SQL 20, additive, unique) equals the token's `sub`; on the
   first sign-in an active user whose email equals the token's verified `email` claim is linked.
   A row linked to a different Clerk user is never re-linked, an unknown email gets 401, and
   sign-up never creates a user. Suspended users still get 403.
3. **Email code, plus Google** (amended 2026-10-31, owner decision, K-117: Google stays on; it was already showing on the live sign-in). Passwords are off in the Clerk instance. `VITE_CLERK_PUBLISHABLE_KEY`
   switches the app to Clerk; unset keeps the existing sign-in, so a build without the key still works.
4. **Not removed yet.** Password, 2FA, Google SSO, reset and the lock screen stay in the code
   until the new path is proven live and the owner confirms. The lock screen is off under Clerk.
   The magic-link and reference sign-ins for portal clients are separate flows and are unchanged.
5. **Public site unchanged.** Clerk loads only on `/login` and under `/app` (the guard is a lazy
   route), so visitors to the marketing site download no extra script (entry bundle 198 KB, was 200 KB).

Evidence: `pnpm run test:server` 527 passed on a throwaway database (`tests/server/clerk.test.ts`:
linking by email and id, no takeover, unknown email, suspended, client role limits, bad tokens,
existing sessions still work); `pnpm test` 545 passed; lint ratchet at its 5-error ceiling; build
with the live key has no secret keys. NOT TESTED: a real sign-in, the live server.

6. **Exception to the kit's Never list, 2026-10-30.** The owner instructed the deletion of the merged branch `move/cpanel-clerk` on origin ("Fix this now", naming the branch note). It was fully contained in `main` (`a034e40`); deleted on origin and locally. This is a one-off, not a change to the rule.

## D-053 · The approved prototype is the design reference, and the GAkinz design skill holds the system
**Date:** 2026-10-31 · **Status:** decided by the owner; built and verified 2026-10-31 (`docs/AUDIT.md`), released to gakinz.com 2026-10-31 as `a907824` with the owner's approval.

1. **Reference.** The live prototype (https://claude.ai/artifact/UDLsqyrLE6smsEP96Pr7be) and the design board
   (https://claude.ai/artifact/PzKiwCvhsVeNw6C3gGGNqD) are the approved design for the next build of the public
   site, the sign-in and GAkinzOS. Owner: "this is good" on 31 Oct 2026. They keep D-046's palette, type and
   structure and fix the gaps in K-112 to K-115. Building them into the site is a separate approval.
2. **Evidence before approval.** On the prototype: 185 captures at 390, 834, 1440, 1920 and 2560px with zero
   overflow, page errors and axe violations; 47 state audits (dark theme, open dialogs, drawers, popovers);
   38 workflow checks; every hero slide audited. NOT TESTED: Safari, real phones, a screen reader, file
   uploads.
3. **Selected work on the home page:** RitaGreen and EGO LIMITED as feature cards, then RotaFlow, Harni and
   Herit Clothing, with fresh first-screen captures of each live site. Volume leaves the home page (its first
   screen is an empty editor) and stays on /work. EGO LIMITED gains screenshots.
4. **Vitalcare** stays Live with its existing screenshot while vitalcare.uk shows a rebuild page.
5. **Project design skill.** `.claude/skills/gakinz-design/` records the tokens with measured ratios, the
   layout rules, the findings register and the verification routine, and points to the house
   product-design skill for method. `docs/DESIGN-SYSTEM.md` remains the written record; when the two disagree
   with the code, the code wins and both are corrected.

Rejected: rebuilding the site on a new visual direction (the owner asked to finish D-046, not replace it);
invented AI features for the board (model picker, memory, prompt library), because GAkinzOS has none.

## D-054 · AI runs on Anthropic first, with OpenRouter as the backup
**Date:** 2026-11-01 · **Status:** decided by the owner ("anthropic as default ... openrouter as backup ... so ai
is never out"); built 2026-11-01 on `chore/cleanup-2026-11-01`, not released.

1. `server/_ai.php` tries Anthropic's Messages API first (raw HTTP, API version `2026-10-21`, model
   `ANTHROPIC_MODEL`, default `claude-opus-5-5`, effort `ANTHROPIC_EFFORT`, default `low`), with Anthropic's
   server-side refusal fallback (`fallbacks: "default"`). If Anthropic has no key, answers with an error,
   times out, declines or returns no text, OpenRouter answers instead (`OR_MODEL`, default `openrouter/auto`).
   With neither key, `ai.php` answers 503 and the interface hides AI, as before.
2. Timeouts are 50 s for Anthropic and 40 s for OpenRouter, so both attempts fit inside Cloudflare's
   100-second proxy limit. Low effort is chosen for the same reason: the drafts are short.
3. Keys are set with `scripts/set-server-key.sh`, which reads them from a hidden prompt and writes them over
   SSH into `~/private-config/gakinz_com/config.php`. No key enters the repository, a chat or a log.
4. The audit row of each call names the provider that answered (`ai_call`, "task via anthropic").

**Why:** a free OpenRouter model was the only provider (`openai/gpt-oss-120b:free` in the template); free
models are rate-limited and withdrawn without notice, so one outage stopped every AI feature.
Rejected: the Anthropic PHP SDK (the host has no Composer and every other provider call is raw curl);
OpenRouter first (the owner chose Anthropic as the default); retrying the same provider (a second provider
covers outages that a retry does not).

## D-055 · Go-live security choices
**Date:** 2026-11-01 · **Status:** decided by the agent on the owner's instruction ("make the best call for
me"); built on `golive/2026-11`, not released. Each can be reversed by a later decision.

1. **Clerk and app two-factor (K-121).** An account with `totp_enabled = 1` is accepted through Clerk only when
   Clerk's token shows a verified second factor (`fva[1] >= 0`); a `pending` Clerk session is refused.
   Rejected: retiring app TOTP (it removes a control someone chose); refusing every such account outright (an
   owner who turns on Clerk MFA would still be locked out).
2. **The AI cap counts attempts (K-122).** A failed provider call may be billed, so it uses a slot; the slot is
   taken under a per-user database lock before the call. D-054 point 4 still holds: once the call ends, the row
   names the provider ("task via anthropic") or reads "task failed".
3. **Content-Security-Policy (K-033).** Enforced on the prerendered public pages, where it was proved locally;
   Report-Only on the CMS and sign-in shell until Clerk's needs are seen in a real browser. The inline script is
   allowed by hash, and the build fails if they drift. Switching on ads or a consent platform (D-050) now also
   needs their hosts added to the policy first.
4. **The contact form takes JSON only**, which stops other sites posting through visitors' browsers.
   Rejected: a honeypot field (a browser that autofills it would silently lose a real enquiry) and a site-wide
   hourly cap (it turns spam into a way to block real enquiries). **Superseded for the honeypot by D-067
   (2026-11-11, with mitigations); the site-wide hourly cap stays rejected.**
5. **Mail certificate checks are a switch, off by default (K-126):** turning them on blind could stop all mail.
6. **`xlsx` comes from the SheetJS CDN, pinned by integrity (K-017):** SheetJS stopped publishing to npm, and
   the export feature stays. Rejected: a CSV-only export (removes a feature the owner has not given up).
7. **No major dependency upgrades here** (ESLint 10, Vite 8, Tailwind 4, React Router majors): each is a planned
   task. In-range updates were taken.
8. **HSTS without `includeSubDomains` or preload:** a subdomain this repository does not know of may still need
   plain HTTP, and preload is hard to undo.

**Evidence:** `docs/AUDIT.md`, 2026-11-01 (second section).

## D-056 · AI runs on OpenRouter only: Sonnet 5.5 by default, a cheap paid model as backup
**Date:** 2026-11-08 · **Status:** decided by the owner ("use the openrouter key ... the cheapest model as backup and Sonnet 5.5 as default"). Both models are **live**: the default was set in the private config on 2026-11-08; the backup code was released as `983606c` (PR #25, CI green) and `OR_FALLBACK_MODEL` was set the same day. A test on the server showed the default answering in 1.2 s, the backup in 0.5 s, and an invalid model refused.

1. **No Anthropic key.** `ANTHROPIC_KEY` stays undefined, so `ai_providers()` returns OpenRouter alone. D-054's Anthropic-first code stays for a future key. The OpenRouter key was already in the private config; no key was entered or shown.
2. **Default `OR_MODEL = anthropic/claude-sonnet-5.5`** (OpenRouter list price on 2026-11-08: $2 in, $10 out per million tokens). A test call answered in 1.5 s, which also showed the account has credit.
3. **Backup `OR_FALLBACK_MODEL = openai/gpt-oss-120b`** ($0.018 in, $0.067 out per million): the cheapest paid text model at the 100-billion-parameter class. Cheaper 3 to 8 billion models exist (for example `meta-llama/llama-3.1-8b-instruct`, $0.02/$0.04), but the Content Hub and daily brief ask for structured JSON, which tiny models do unreliably, and the saving is under a tenth of a cent per call. Change it with `scripts/set-server-key.sh OR_FALLBACK_MODEL`.
4. **The backup runs only when the default fails**, inside a 90-second total budget so it cannot push a request past Cloudflare's 100-second limit (`AI_TOTAL_BUDGET` in `_ai.php`). A failed attempt still counts against the daily cap (K-122).
5. **Spend control:** the per-role daily caps in `ai.php` stay; the key itself has no spending limit today, so set a monthly limit on it in the OpenRouter dashboard.

**Why:** the key's model was `openai/gpt-oss-120b:free`, which OpenRouter rate-limits and withdraws without notice (D-054 already warned of this). **Supersedes** D-054 point 1 for this site.

## D-057 · Clerk is the only sign-in; the legacy sign-in is retired
**Date:** 2026-11-09 · **Status:** decided by the owner ("Clerk works fine", roadmap approval 2026-11-08; "Go ahead" for Phase 5). Code on branch `phase-5/clerk-only` (`48a6f3a`, `10f8418`). **Released 2026-11-09 as `ed58064`** (PR #29, CI green including MySQL 8).

1. **What goes.** Password sign-in, forgot and reset, magic links, app two-factor (setup, enable, disable, recovery codes), the session list and revoke, server logout, Google OAuth (`oauth.php`), sign-in by work reference (`client_access.php`), the lock screen, the set-password page and the Settings Security and My sessions tabs. `auth.php` keeps one action, `me`; the others answer 404 "Unknown auth action.". `oauth.php` and `client_access.php` become 404 JSON stubs because a release never deletes server files (the `weather.php` pattern).
2. **Nobody has a password.** `users` create ignores any password and stores the unusable hash `!`; `invite` creates the same row and emails "sign in with this email address". A person is added by email and signs in with the Clerk email code (D-052). The first super admin still comes from `$SEED_ADMIN_EMAIL` on an empty `users` table, with hash `!`.
3. **Sessions already stored keep working until they expire.** `require_auth` still accepts a stored token (hashed or raw) so a signed-in person is not cut off mid-session. Phase 9 drops `auth_tokens`, `magic_links`, `password_resets` and `users.totp_*` after about 30 days with no sign-in through them.
4. **`_clerk.php` still refuses a Clerk session for an account with `users.totp_enabled = 1`** unless Clerk shows a second factor (K-121). Nobody can set the flag any more and 0 accounts had it on (2026-11-08), so the check stays harmlessly until Phase 9 removes the columns.
5. **Sign-in security is Clerk's.** My account shows a "Sign-in security" card that opens Clerk's account panel. The auth store persists only the user (version 2 discards the old token). Old `/set-password` links redirect to `/login`.
6. **Why.** Two sign-in systems meant two attack surfaces, a reset flow that never emailed (K-132) and handlers unreachable in the Clerk build (K-133). One owner is the only active user and already signs in through Clerk.

**Supersedes** D-052 point 3 (a build without the Clerk key keeps the old sign-in: it now shows "Sign-in is not set up") and point 4 ("Not removed yet"). Google sign-in through Clerk (K-117) is unaffected; only the app's own `oauth.php` went. The reference sign-in plan in `docs/PRODUCT-SPEC.md` 6.1 is withdrawn.

## D-058 · Certificates are issued in the CMS, and the public check is uniform and throttled
**Date:** 2026-11-09 · **Status:** decided by the owner ("build and fix certificate issuing", 2026-11-08); the design choices below were mine under that approval and the best-practice defaults the owner asked for. **Released 2026-11-09** (PR #30, CI green including MySQL 8; code `b05da25`, merged `01d2269`).

1. **Who.** Super admin and admin only (`CERT_ROLES`). A certificate says someone completed something; the owner roles are the only ones who should say it or take it back.
2. **Reference.** `GK-XXXX-XXXX-XXXX`, twelve characters from a 30-character alphabet without 0, 1, I, L, O or U, drawn with `random_int()` (60 bits). It carries no sequence, name or date, so one reference tells nobody another. A clash on the unique column retries up to five times.
3. **Revoke, never delete.** Revoking sets `revoked_at`; the row stays in the register and in the audit log. It cannot be undone from the screen; a mistake is fixed by issuing a new certificate. No reinstate action (out of scope).
4. **Public check shows only** the reference, recipient, programme and the issue date. A revoked, unknown, malformed or wildcard reference all get the same 404 "No matching certificate.", so the answer never says which. The answer is `no-store`, so a revoke takes effect at once.
5. **Throttle.** Each miss writes one `certificate_lookup_miss` audit row (IP, no detail, so the guess is not kept). Twenty misses in ten minutes from one connection gives 429 for every lookup, a real reference included, until the window passes. Hits write nothing. The limit is per connection and Cloudflare's edge address can be shared (K-102), so it is deliberately generous.
6. **No schema change.** The `certificates` table already had everything needed. There is no `created_by`; who issued or revoked is in `audit_log` (`certificate_issue`, `certificate_revoke`, detail = the reference, never the recipient's name).
7. **Out:** payments, bulk import, a printable certificate, email delivery and a reinstate action. The screen copies the public link for the owner to send.

**Why:** `/verify` read a table nothing could write (K-134), the old ids were short and unthrottled (K-061), and a verify page without data implied accreditation that did not exist.

## D-059 · The daily flow: reminders and the digest remember, and four dead ends are closed
**Date:** 2026-11-09 · **Status:** decided by the owner (roadmap Phase 7, approved 2026-11-08, "Next" 2026-11-09). **Released 2026-11-09** (PR #31, CI green including MySQL 8; merged `825600e`).

1. **One reminder per invoice per interval.** `cron.php job=chase` used to email every overdue invoice on every run, so a daily cron meant a daily nag to each client. It now sends at most one reminder per invoice per `$CHASE_INTERVAL_DAYS` (optional, 1 to 90, default 7). A reminder sent by hand counts, so the cron does not repeat what a person just sent.
2. **The memory is the audit log, not a new column.** A reminder is an `audit_log` row (`cron_chase` or `invoice_chase`) whose detail is `<number> → <email> (#<invoice id>)`, written by one function for both senders. This needs no SQL on the live database. The cost: a retention rule that deletes audit rows sooner than the interval would let a reminder repeat; none is set (K-062), and a `last_reminded_at` column is the clean fix if one ever is. A failed send writes no row, so the next run retries. The job runs under a named lock so an overlapping run cannot send twice.
3. **The weekly digest goes at most once every 6 days**, under its own lock (6, not 7, so a run a few minutes earlier than last week's still goes). It no longer rides on every `job=all`.
4. **Edit what you create.** Clients can be edited from the detail sheet; tasks can be edited, assigned (a free-text name) and dated on the board. Both send only the fields that changed. A task move to the status it already had no longer answers 404.
5. **Accepting a quote lands on the project it started**, not the project list.
6. **A quote can start from an enquiry.** "Draft a quote" on the enquiry opens a new quote with a title, the client the enquiry was converted into (if any) and one line for the kind of work. It copies nothing private: not the message, budget or email. Prices, VAT and notes stay the owner's, and nothing is sent.
7. **Out:** automatic sending of anything new, a reminder ladder (first, second, final), per-client intervals, a "last reminded" column in the invoice list.

**Why:** these were the places where the enquiry-to-paid-invoice flow stopped or repeated itself. Item 1 is the one that touches clients, so it comes with the strongest tests (a fake mail server; 13 tests).

## D-060 · The V1 finish line is frozen, and what "finished" means for GAkinz
**Date:** 2026-11-10 · **Status:** decided by the owner's `/finish-app` brief (the eight items and their order), recorded by the run that carried it out.

1. `docs/ROADMAP.md` holds the frozen list: ten items, two already true (public pages, Clerk-only sign-in), eight open in the owner's order: enquiry reaches the owner, true business facts, enquiry to invoice, invoice and payment with the right VAT, client portal isolation, restore drill and recovery targets, scheduled work running or visibly off, privacy basics.
2. **An item is ticked on local evidence** (tests on a throwaway database, a browser run on localhost, a scripted drill). What only the live system or the owner can show is gate item 6 of the live-ready gate and is listed as BLOCKED, not hidden.
3. **Everything else is parked, not deleted**: the parking lot and "Cut" in the roadmap name each thing and why. "Cut" means no V1 work, not removal of code.
4. **Owner-only items stay BLOCKED**: business facts, adviser sign-off, the host cron entry, the host restore and recovery targets, the OpenRouter limit, the Clerk dev user and the `TEST owner` row. Each has an exact action in the roadmap.
5. `docs/KNOWN-ISSUES.md` was compacted by merging closed issues into a table (2,397 to about 1,460 lines); the full earlier text stays in git (`git show d30e95b:docs/KNOWN-ISSUES.md`).

**Why:** the app was built far past what a one-owner services business needs to start; nothing defined done, so every session found more. A short frozen list with a check per item stops that.

## D-061 · Owner alerts: tell the owner when something would otherwise wait unseen
**Date:** 2026-11-10 · **Status:** decided by the finish-line run (item 3 would not otherwise be true).

1. `contact.php` saved an enquiry and sent no mail, and the weekly digest cannot run without a cron entry (K-145), so the owner only learned of an enquiry by opening Leads. `server/_notify.php` now emails `$OWNER_ALERTS` when an enquiry is saved and when a client files a data deletion request (K-095).
2. **Best effort, after the response.** The alert runs in a shutdown function after `fastcgi_finish_request()` / `litespeed_finish_request()`, so the visitor never waits for SMTP and a mail failure never turns a saved enquiry into an error. The outcome is an audit row (`enquiry_notified`, `enquiry_notify_failed`, `deletion_notified`, `deletion_notify_failed`).
3. **No queue and no retry**: the enquiry is in Leads and the ticket in Support either way. With no `$OWNER_ALERTS` or no `$SMTP_HOST`, nothing is sent and the behaviour is exactly as before. **No fallback to `$REPORT_RECIPIENTS`**: an alert carries personal details and the digest list was chosen for another purpose (a review finding). **At most 20 alerts of a kind an hour** (then an `alert_suppressed` audit row), so the public form cannot become an inbox flood; SMTP timeout 8 seconds.
4. **The alert carries the visitor's own words** in a plain-text body only; subject and audit detail are one line with control characters stripped (header injection test).
5. **Scheduled jobs get a heartbeat per job**: every `cron.php` run writes a `cron_run` audit row naming the job (at most one per job per 10 minutes); Today tells the owner roles which jobs have not been seen for 36 hours (`all` counts for every job, so a prune-only line cannot make billing look alive). That makes item 9 true whichever way the owner decides K-145.
6. Deletion requests open at `high` priority. A due-date column and a Today section for them are parked.

**Why:** the cheapest change that makes "a visitor sends an enquiry and the owner receives it" true without a cron entry, a queue, or a schema change.

## D-062 · Recovery targets agreed; OpenRouter left uncapped by the owner
**Date:** 2026-11-10 · **Status:** decided by the owner ("decide for me" on the targets; "unlimited" on the OpenRouter limit).

1. **Recovery targets:** back within one working day (RTO), lose at most 24 hours of ordinary changes (RPO). The daily 03:30 host backup (`gakinz-backup.sh`, 14 days kept) and the restore drill (`pnpm run drill:restore`) are what make them true; the first restore passed on the host's own dump on 2026-11-10.
2. **Why these:** one owner, a small database (about 60 rows) and no client files yet; a tighter point would need a more frequent dump for no stated need. Tighten the cadence if invoices or bookings start to matter hourly.
3. **Still open under K-010:** copy dumps off the host, and try a files restore once client uploads exist.
4. **OpenRouter:** the owner chose no monthly limit. The risk is spend with no ceiling if the AI module is used or its key is abused; the AI module stays switched as it is (Cut in the roadmap) and the exposed key is to be rotated by the owner. Revisit if the AI features are switched on.

## D-063 · V1.1 finish line: five items, chosen from the parking lot
**Date:** 2026-11-11 · **Status:** decided by the owner's "Phase 2: open V1.1 from the parking lot" (the owner named no items; the run chose them and the owner may overrule); released 2026-11-11 as `ed5a724`.

1. `docs/ROADMAP.md` holds the frozen list: public pages laid out cleanly at 375 and 1280 px; a data deletion request on Today with its reply-by date; a failed alert email visible on Today; every CMS screen laid out cleanly with realistic data; `pnpm run lint` passing and run by CI.
2. **Chosen by two tests:** it guards a flaw class the V1 run never looked for (layout on real pages and screens, never seen by an agent), or it closes a way the owner could miss something that matters (a legal deadline, a lost alert). Everything else stays in the parking lot.
3. **Left out on purpose:** anything that needs a schema change (a hand-applied SQL step), the owner's facts, the adviser, Stripe or the Tailwind and pnpm migration (PR #33 is its own piece of work and changes `package.json`, so this run adds no dependency).
4. **Unchanged from V1:** items are ticked on local evidence only; what needs the live system or the owner is BLOCKED; nothing is pushed or released by the run.

## D-064 · Tailwind CSS v4 through the Vite plugin, pnpm, and tw-animate-css
**Date:** 2026-11-10 · **Status:** decided by the owner (house standard, 10 Nov 2026), done on `chore/tailwind-v4` and **released 2026-11-11 as `ed5a724`** together with V1.1. **Mode A** (full `@import "tailwindcss";` with Preflight), because `src/index.css` is one 480-line file with the shadcn variables and the CMS is mostly utilities already.

1. **pnpm first.** `package-lock.json` became `pnpm-lock.yaml` (`pnpm import`, so every version carried over). Install scripts of `esbuild`, `core-js` and `@clerk/shared` stay blocked (`pnpm-workspace.yaml`, reviewed: none is needed). `ci.yml` and `deploy.yml` now run `pnpm install --frozen-lockfile`. `release.json` is untouched: its `pnpm run ...` commands only run package scripts and still work.
2. **Upgrade tool, then review.** `@tailwindcss/upgrade` moved the config into `@theme` and renamed v3 utilities. It also (a) rewrote the strings `"outline"` to `"outline-solid"` in Badge and Button variant props and in one line of public copy (reverted), and (b) silently dropped `tailwindcss-animate`.
3. **Vite plugin, no PostCSS.** `tailwindcss()` first in `plugins`; `postcss.config.js`, `@tailwindcss/postcss`, `postcss` and `autoprefixer` removed; `tailwind.config.js` deleted; `components.json` names no config.
4. **Tokens.** The shadcn variables remain the single source. Variable-backed tokens are in `@theme inline` (so `.dark` and the nested `.gk-public` palette still resolve where the element sits); literals (type scale, fonts, `gk-*` palette, two shadows) are in plain `@theme`. Map in `docs/DESIGN-SYSTEM.md`.
5. **Kept as under v3.** Border colour `gray-200` (generated compat block; the `* { border-border }` rule already covers elements), pointer cursor on buttons, textfield appearance on search inputs, fixed line heights for `text-xs` to `text-4xl` (v4 made them ratios, which shrank a 11.5px label row from 32px to 28px), `StatGrid` `mb-0` inside `space-y` changed to `last:mb-0` (v4 `space-y` puts the margin on the earlier child, so `mb-0` removed the gap), one stray `mb-1` removed, and the dialog and sheet `duration-*` classes removed (under `tailwindcss-animate` they never affected the animation; `tw-animate-css` would honour them and slow the overlays).
6. **Animations.** `tw-animate-css` (dev dependency, bundled into the CSS) replaces `tailwindcss-animate`; the same 27 utilities are generated and the `enter`/`exit` keyframes match.
7. **Browser floor:** Chrome 111, Safari 16.4, Firefox 128 (Tailwind v4). Vite's own default target was already Chrome 107 / Safari 16 / Firefox 104, so the floor rises slightly. ASSUMPTION: no visitor population depends on the older versions; no analytics were available to check.
8. **Out:** converting screens to new utilities, moving ESLint to Biome, a Playwright suite (the project has none; the harness used here lives in `.local-test/`, untracked).

**Why:** one styling system across every project, a smaller config surface (no PostCSS, one token file), and a toolchain Tailwind still maintains. **Evidence:** `docs/AUDIT.md`, 2026-11-10.

## D-065 · V1.2 finish line: six items on public-site trust
**Date:** 2026-11-11 · **Status:** decided by the owner's "Let's go with V1.2 /finish-app" and "Go ahead" after a short brainstorm (the run proposed the list; the owner approved it as written, including dropping the two built-in articles the CMS does not hold and changing the home headline).

1. `docs/ROADMAP.md` holds the frozen list: a true cookie policy; a sitemap that lists exactly the articles that exist (K-147); bot protection on the contact form; ~~the real visitor IP behind Cloudflare~~ (dropped, see 4); a real 404 status; the home headline read once.
2. **My calls, for the owner to overrule:** the built-in articles mirror the CMS by hand (the build stays offline and deterministic) instead of the build reading the live CMS; the honeypot silently drops a bot's post so it learns nothing; ~~the Cloudflare IP is off by default behind `$TRUST_CLOUDFLARE_IP`~~ (struck: item 4 was dropped, no code reads that key, `git grep TRUST_CLOUDFLARE_IP -- server` finds nothing); the 404 rule is prepared and tested locally but never applied by the run.
3. **Left out on purpose:** the legal placeholders (V1 item 4), automatic prerender of CMS posts and work, the phone tables (K-148).
4. **Amended the same day after the builder check (a fresh agent read the spec cold):** item 4 (the real visitor IP) is dropped because it is already true (`server/.htaccess`, K-123); the 404 page is served by `server/notfound.php`, not a global `ErrorDocument`, and `services` joins the paths the CMS can publish under; the cookie page keeps Google sign-in because it is enabled in Clerk. Details: `docs/superpowers/specs/2026-11-11-v1-2-public-trust-design.md`.
5. **Changed later the same day (review fix wave, D-067):** the contact form's timing field is `fillMs`, an elapsed time the browser measures, and no longer `openedAt`, a timestamp the server compared with its own clock; the 404 rule's exemption list no longer holds `blog` (the app has no `/blog` route; posts publish under `/resources`) and matches in any case; the live 404 check also requires the `Content-Security-Policy` and `X-Robots-Tag` headers; a honeypot hit now records the email the sender typed.

## D-066 · Spec-driven work with agents, planned in `docs/superpowers/`, built inside the project folder
**Date:** 2026-11-11 · **Status:** decided by the owner ("a superpower SDD ... in docs/superpowers where the planning takes place ... I don't want the code built outside this workspace ... I send agents to do the planning, the job, the review and the fix").

1. Each piece of work has a spec in `docs/superpowers/specs/` and a plan in `docs/superpowers/plans/` before any code. A fresh agent checks the spec cold; fresh agents build the plan task by task and review each task; one fresh reviewer reads the whole branch. This replaces the rule written earlier the same day in `AGENTS.md` (plans in the task file, no `docs/superpowers/`).
2. All work is done in `~/Developer/Projects/gakinz_com` on a branch. No worktree or clone outside the folder; `.local-state/` and `.local-test/` are the scratch places.
3. `.agent/CURRENT-TASK.md` remains the one task file (status and next steps) and links to the spec and plan; the roadmap still holds the frozen list and the parking lot.

**Why:** planning that lives in one visible folder, and work that happens where the owner can see it, cannot drift or be missed.

## D-067 · The contact form gets a honeypot after all, with mitigations (supersedes D-055 item 4 for the honeypot)
**Date:** 2026-11-11 · **Status:** decided as part of V1.2 item 3 (D-065, the owner's "Go ahead"), built on `goal/v1.2`, **not released**. Reversible: remove the `hp_site` check from `server/contact.php` and the field from `src/marketing/pages/Contact.tsx` and nothing else depends on it.

**What D-055 rejected and why.** D-055 item 4 rejected a honeypot field on the contact form because a browser or password manager that autofills the hidden field would make a real person's enquiry vanish: they would see a thank-you and the owner would never hear of it. The per-IP throttle stayed the only protection (K-136).

**What changed.**
1. The field is named `hp_site` (not `website`, which password managers fill), has `autocomplete="off"` and the ignore hints for 1Password, LastPass and Bitwarden, sits off screen (never `display:none`), and carries `aria-hidden="true"` and `tabindex="-1"`, so a keyboard, screen-reader or password-manager user does not meet it.
2. A post sent too fast is refused visibly, not silently: `429 "That was quick. Please check your details and send again."` with what the visitor typed kept. The measure is `fillMs`, an elapsed time the browser computes (minimum 2500 ms); a missing, negative, non-numeric or over-a-day value is no signal.
3. A honeypot hit still answers like success (so a bot learns nothing), but it now **records the sender's email** in the audit row (`enquiry_bot_dropped`, detail `honeypot <email>`, one line, at most 200 characters), so a real person caught by autofill can be found and written back to. A second audit cap (20 refusal rows per IP in 15 minutes, then the throttle's 429 with no row) bounds the log.
4. `docs/SECURITY.md` section 4 states the limit: this stops form-filling bots; a script that POSTs JSON directly is limited only by the IP throttle (5 enquiries in 15 minutes).

**Residual risk.** A real enquiry is silently dropped if a password manager still fills `hp_site` despite those measures; the owner can recover the sender's email from the audit row, but only if someone looks. The manual autofill pass (Chrome, Safari, Firefox and one password manager) is **NOT TESTED**; the owner watches `enquiry_bot_dropped` rows for a few weeks after release. A honeypot-only address is not found by the privacy export or erasure by email (those reach audit rows only for an address that also has an enquiry); that is handled by hand (`docs/SECURITY.md`).

**Evidence:** `tests/server/contact-bots.test.ts` (15 tests), `tests/browser/contact.test.ts` (12 tests), `docs/AUDIT.md` (V1.2 section). Not a CAPTCHA and no third-party code: the public pages still set no cookies or storage.
