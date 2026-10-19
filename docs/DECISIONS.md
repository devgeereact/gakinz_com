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
now includes `server/work.php`, which has never been executed. See `qa/TEST-PLAN.md`.

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
0 failures, lowest 4.91:1. See `qa/ACCESSIBILITY-AUDIT.md`.

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
`npm run preview` and driven through the Chrome DevTools protocol:**

| Measurement | Result |
|---|---|
| axe-core 4.10.2, 16 public routes | 0 violations |
| Lighthouse mobile, Accessibility category | 100. 54 audits passed, 0 failed |
| Contrast on rendered pixels | 28 combinations, 0 failures, lowest 4.91:1 |
| Focus indicators | 353 focusable elements across 13 routes, 0 failures, lowest ring contrast 14.46:1 |
| Reflow at 640x512, equivalent to 1280x1024 at 200 per cent | No horizontal scrolling on 8 routes |
| 390px viewport | No overflow, no target under 24x24 |

The report is `qa/ACCESSIBILITY-AUDIT.md`, which states for each line what was run, against
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

`npm run test:server` runs the real PHP endpoints from a temporary copy of `server/` with a
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
`docs/DEPLOYMENT.md` section 5. `npm run docs:check` (`scripts/docs-check.mjs`) runs in CI on
every pull request: relative links must resolve, the owner's temporary planning folder must not
be referenced, a server PHP or `.htaccess` change must touch `docs/DEPLOYMENT.md`, and a schema
change must touch `docs/DATA-MODEL.md` and `docs/DEPLOYMENT.md`.
**Why:** by 2026-10-10 counts had drifted between documents, three partial upload lists
competed in `docs/DEPLOYMENT.md`, and several fixed defects were still listed as open. A check
that a document changed cannot prove it changed correctly; review still has to.
**Evidence:** `npm run docs:check -- --base refs/remotes/origin/chore/codebase-hygiene` passes
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
   anonymisation (Task 26) was refused by the session's safety check and is left to an owner
   and adviser decision (K-108).

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

