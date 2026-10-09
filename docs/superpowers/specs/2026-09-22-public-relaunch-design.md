# Design: gakinz.com public relaunch

**Date:** 2026-09-22
**Status:** design agreed, awaiting owner review of this document
**Applies to:** the public marketing surface at `/`, source in `src/marketing/`, plus the
server and CMS work needed to feed it
**Method:** written from four read-only audits of this repository on 2026-09-21, from the
three design directions in `docs/design/2026-09-22-directions/`, and from the decisions
recorded in `docs/design/2026-09-22-directions/direction-approved.md`

---

## 1. Outcome

gakinz.com relaunches as the personal site of Gideon Akinlotan, backed by the GAkinz
studio, with a work section that holds real projects and is editable from the existing
CMS rather than from source code.

The site is judged against three claims, each of which must be evidenced rather than
asserted:

1. It does not read as templated.
2. Everything it states is true.
3. It meets WCAG 2.2 AA, measured at runtime rather than declared.

When this is complete, the previous position is gone. That position was a studio site
whose entire portfolio was three invented projects in a TypeScript literal. In its place,
the owner can add a real project without a developer, a commit or a deploy.

## 2. Why this work is needed

Four audits ran against the repository on 2026-09-21. The findings that drive this
design are these.

The public site is roughly ninety per cent static TypeScript. Only five files in
`src/marketing/` import `@/lib/api` at all. Services, sectors, pricing, process, company
details and the entire portfolio are literals in `src/marketing/data/site.ts`.

`src/marketing/pages/Work.tsx:2` imports `work` from `src/marketing/data/site.ts:199-227`,
which holds three invented entries ("Clinic group website", "Independent ecommerce
brand", "Professional services firm") with no client name, URL, date, metric or
screenshot. Their imagery is generated SVG wireframes from
`src/marketing/components/SiteMockup.tsx`. There is no `/work/:slug` route, no `work`
table in `server/schema.sql`, and no CMS module behind any of it.

`src/marketing/pages/Home.tsx:228` animates the claim `100% Accessible, WCAG 2.1 AA`.
`docs/STATUS.md` section 6 records accessibility as NOT TESTED and `docs/DECISIONS.md`
D-020 records the earlier zero-violations claim as withdrawn. The site currently makes,
on its front page, a claim its own documentation retracts.

The visual language reads as templated for reasons that are specific and fixable: one
aurora-and-grid hero composition on all eight pages
(`src/marketing/components/primitives.tsx:236-240`); an animated
indigo-to-lavender-to-rose gradient as the only brand gesture
(`src/index.css:677-693`); eight arbitrary heading sizes with no type scale; ornamental
ghost numerals standing in for hierarchy on five pages; and token names that lie, with
`--gk-violet` holding lavender, `--gk-sky` holding rose and `--gk-indigo` holding black
(`src/index.css:49-53, 656-658`).

`server/api.php` calls `require_auth` on neither of its branches, at lines 12 and 23.
Anyone who can reach the domain can insert rows into the production database.

## 3. Decisions already taken

These were settled before this document and are inputs, not open questions.

| Decision | Value |
|---|---|
| Identity | Personal site, studio-backed. First person singular. GAkinz named where a team genuinely does the work |
| Evidence | Real projects with client permission |
| Content source | New CMS module and database table |
| UI scope | New design system, existing pages and routes retained |
| Visual direction | Direction C with direction A's colour, per `direction-approved.md` |

## 4. Scope

### In scope

- A `work` record type: schema, endpoint, CMS module, public pages.
- One new public route, `/work/:slug`. No others.
- A design-system replacement for the public surface only.
- Removal of every unevidenced claim from public copy.
- The accessibility fixes named in section 9, followed by runtime measurement.
- The server security fixes named in section 10.

### Out of scope

- GAkinzOS at `/app/*` keeps its current design tokens. The public rebrand does not
  propagate into the workspace. That is a separate decision and is not taken here.
- No framework migration, no Pulse UI kit rewrite (`.agent/PROJECT.yml` exclusion).
- No DNS, TLS, Cloudflare or mail-host change (`CLAUDE.md` constraint 7).
- No change to the 23 existing CMS modules beyond adding the 24th and its wirings.
- The lint backlog is not fixed here. It must not grow (`docs/KNOWN-ISSUES.md` K-002).
- Rotating the credential in K-001. That is an owner action on the live system.

## 5. Architecture

Nothing in this design introduces a new pattern. The data path is the one the project
already uses, stated in `CLAUDE.md`:

```
Browser (React 19 + TS) → fetch JSON → server/work.php → _bootstrap.php → mysqli → MySQL
```

The public page reads the API and falls back to typed static data when the endpoint is
unavailable. That is the exact shape of `src/marketing/data/blog.ts:65-72`, which already
works in production, and it is copied rather than reinvented.

### 5.1 One record type, four kinds

The owner asked for a surface that presents everything he does, not only client work.
Rather than four tables and four modules, there is one record with a `kind` column:

| Kind | Holds | Row labels in the ledger |
|---|---|---|
| `case_study` | Client work | Problem / Built / Outcome |
| `product` | Things he built and owns, chiefly GAkinzOS | Problem / Built / Outcome |
| `experiment` | Self-directed work | Question / Made / Learned |
| `writing` | A pointer to a piece in the existing `posts` table | Argument only |

The changing row labels come from direction C and are the reason one table is enough:
the kind is legible from the record's own structure without a badge, so an experiment
does not have to pretend it had a client.

### 5.2 Schema

Added at the foot of `server/schema.sql` as commented `ALTER`/`CREATE` statements, per
`docs/DECISIONS.md` D-008. There is no migration runner; nothing is applied until someone
runs it, and it is recorded in `docs/DEPLOYMENT.md` in the same change.

```sql
CREATE TABLE IF NOT EXISTS work (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug           VARCHAR(160)  NOT NULL UNIQUE,
  kind           ENUM('case_study','product','experiment','writing')
                               NOT NULL DEFAULT 'case_study',
  title          VARCHAR(200)  NOT NULL,
  client_name    VARCHAR(160)  NULL,
  client_consent TINYINT(1)    NOT NULL DEFAULT 0,
  sector         VARCHAR(80)   NULL,
  summary        VARCHAR(400)  NULL,
  problem        TEXT          NULL,
  built          TEXT          NULL,
  outcome        TEXT          NULL,
  live_url       VARCHAR(500)  NULL,
  repo_url       VARCHAR(500)  NULL,
  post_id        INT UNSIGNED  NULL,
  started_on     DATE          NULL,
  completed_on   DATE          NULL,
  cover_file_id  INT UNSIGNED  NULL,
  featured       TINYINT(1)    NOT NULL DEFAULT 0,
  sort_order     INT           NOT NULL DEFAULT 0,
  status         ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_public (status, kind, sort_order)
);

CREATE TABLE IF NOT EXISTS work_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_id     INT UNSIGNED NOT NULL,
  file_id     INT UNSIGNED NOT NULL,
  caption     VARCHAR(300) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  KEY idx_work (work_id, sort_order)
);
```

Two notes on the shape. Images are a child table rather than a JSON column, because the
project already uses that convention (`proposal_items`, `invoice_items`) and because JSON
support cannot be assumed on the host, whose MySQL or MariaDB version is UNVERIFIED.

`client_consent` exists because the owner stated that the work is real and permitted. The
column makes that permission a stored fact rather than a memory, and section 5.3 makes it
enforceable.

### 5.3 Endpoint

`server/work.php`, one file per resource, prepared statements only, JSON through `ok()`
and `fail()`, `audit()` on every mutation. These are the rules in `CLAUDE.md` constraint 6.

| Action | Auth | Behaviour |
|---|---|---|
| `GET ?action=list` | Public | `status='published'` only. Returns `client_name` only where `client_consent=1`; otherwise the field is omitted, not blanked |
| `GET ?action=get&slug=` | Public | Same filter, single record plus its images |
| `GET ?action=listAll` | `require_auth($conn, EDITORS)` | Drafts included, consent field visible |
| `POST ?action=create` | `require_auth($conn, EDITORS)` | `audit()` |
| `POST ?action=update` | `require_auth($conn, EDITORS)` | `audit()` |
| `POST ?action=publish` | `require_auth($conn, EDITORS)` | Refuses where `client_name` is set and `client_consent=0`. `audit()` |
| `POST ?action=remove` | `require_auth($conn, EDITORS)` | `audit()` |

`EDITORS` matches the constant already used by `blog.php` and `testimonials.php`:
`super_admin`, `admin`, `manager`, `editor`.

The consent check on publish is the one piece of business logic in the endpoint. It exists
so that the failure mode of a forgotten permission is a refused publish rather than a
named client on a public page.

The two public read branches follow the precedent already set and audited in
`blog.php:44` and `testimonials.php:42`, which filter on `published` and `approved = 1`
respectively. The server audit confirmed those filter correctly.

### 5.4 Client wirings

`CLAUDE.md` states that a new CMS module needs five wirings plus the endpoint. All six:

| File | Change |
|---|---|
| `server/work.php` | New endpoint, as above |
| `src/lib/api.ts` | `work.list / get / listAll / create / update / publish / remove` |
| `src/routes/index.tsx` | `/app/work` lazy module; public `/work/:slug` |
| `src/lib/access.ts` | `work: EDITORS`, mirroring the server list exactly |
| `src/components/app-sidebar.tsx` | Entry, filtered by `canAccess` as the others are |
| `src/components/global-search.tsx` | Entry |

New client files:

| File | Purpose |
|---|---|
| `src/app/modules/Work.tsx` | CMS module: list, create, edit, reorder, publish, image upload |
| `src/marketing/data/work.ts` | API call with typed static fallback, modelled on `blog.ts` |
| `src/marketing/pages/WorkDetail.tsx` | Public record page at `/work/:slug` |

`src/marketing/pages/Work.tsx` changes from importing a literal to consuming
`src/marketing/data/work.ts`.

### 5.5 Images

Covers and gallery images upload through the existing `server/files.php`, which already
handles uploads, share tokens and revocation. No second upload mechanism is introduced.

This pulls one open issue into scope: `docs/KNOWN-ISSUES.md` K-007 records that there is
no MIME allowlist on upload. Since this design makes uploads a routine part of publishing
the public site, the allowlist is added here rather than left open.

## 6. Design system

The public surface only. `.gk-public` and `html.gk-force-light` are the scoping
mechanisms already in place and they continue to do that job.

### 6.1 Tokens

| Role | Value | Note |
|---|---|---|
| Paper | `#F6F3ED` | Warm, not pure white |
| Ink | `#1C1A16` | Warm black |
| Set | `#2A3160` | Blue-black. Marks settled content and interactive elements |
| To come | `#933C2F` | Red oxide. Marks a gap awaiting real material |
| Kind spines | `#2A3160` / `#933C2F` | From direction A, on the left edge of each work record |

The two chromatics keep the semantic job they were given in the mockups: one means
settled, one means outstanding. This is not decoration and should not be used as such.

The lavender `#7F77DD` and rose `#D4537E` are retired from the public surface. The
reasoning is recorded in `direction-approved.md`: both are too light to hold a flat block
or white text, which is why the previous site could only wash them into a gradient.

Legacy variable names are renamed rather than remapped. `--gk-violet`, `--gk-sky` and
`--gk-indigo` currently hold values their names contradict, which the UI audit identified
as a standing source of error. They go.

### 6.2 Type

Newsreader for display, exploiting its optical-size axis so one family holds both 96px
and 23px without a second display voice. Instrument Sans for interface text. IBM Plex
Mono confined to record data, where tabular figures matter.

A nine-value perfect-fourth scale is defined in `tailwind.config.js`. **No size outside
the scale.** The current eight arbitrary heading sizes are the single clearest signal
that the existing site was assembled rather than designed, and a direction that
reintroduces ad-hoc sizes has failed.

This replaces the current Space Grotesk and Manrope pairing, and the `font-serif` slot
stops holding a sans-serif face.

### 6.3 Composition

| Removed | Replaced by |
|---|---|
| Aurora hero on all eight pages (`primitives.tsx:236-240`) | Three hero archetypes; aurora retired entirely |
| Animated gradient text (`index.css:677-693`) | Nothing. The gradient does not survive |
| Ghost numerals as hierarchy | Real typographic hierarchy |
| `HAIR` literal inlined roughly forty times | One token |
| Horizontal nav bar on the public site | Contents list on the first screen, per direction C |
| `SiteMockup` SVG wireframes | Real screenshots |

The work section is a ruled ledger of records with kind spines, as agreed.

### 6.4 Housekeeping

`index.html:9-13` render-blocks two icon webfonts from two CDNs, bootstrap-icons and
boxicons, with zero `bi-` or `bx-` usages anywhere in `src`. Both go. Roughly fifty
unreferenced template images in `public/`, and `src/assets/react.svg`, go with them.
`public/favicon.svg` is a "G" on `#6e56cf`, a retired violet that is off-palette against
both the old brand and the new one; it is replaced.

## 7. Content and copy

All public copy is rewritten in the first person for the personal surface, retaining the
studio voice only where a team genuinely does the work.

`src/marketing/data/site.ts:5-8` currently ships a placeholder telephone number
`+44 20 0000 0000`, a placeholder company registration `00000000`, and four social URLs
pointing at bare domains rather than at profiles. Each is replaced with a real value or
removed. Shipping a placeholder registration number on a UK business site is the kind of
detail a cautious buyer notices.

## 8. Truth pass

`Home.tsx:228`: the animated `100% Accessible, WCAG 2.1 AA` claim is deleted. It
returns only if section 9's runtime measurement earns it, and then stated accurately.

`Work.tsx:7-12` is a statistics row containing no statistics, only the phrases
"One team" and "Real devices".
It goes.

The governing rule for the relaunch: **no number on the public site without a source.**
Where a real figure is not available, the copy says something true instead of animating
something unverifiable.

## 9. Accessibility

Fixed first, from the static audit:

| Severity | Issue | Location |
|---|---|---|
| Blocker | Error messages not linked to inputs via `aria-describedby` | `src/marketing/pages/Contact.tsx:141, 153, 204` |
| Serious | No skip link to main content | `src/marketing/PublicLayout.tsx` |
| Serious | Required fields carry no `required` attribute and no visual indicator | `src/marketing/pages/Contact.tsx:133-204` |
| Moderate | Project type and Budget selects have no stated required status | `src/marketing/pages/Contact.tsx:165, 180` |

The static audit found focus styles, reduced-motion handling, landmarks, heading order,
icon-button naming and image alt text already compliant in source. Those are preserved
through the redesign rather than rebuilt, and re-checked afterwards.

Then measured, because the project's history on this point requires it. `docs/DECISIONS.md`
D-020 records a withdrawn zero-violations claim, and the correct response to that is
evidence, not a quieter claim:

- axe-core via Playwright across all public routes, light and dark system settings
- Keyboard-only pass through every interactive element on every public page
- 200 per cent zoom reflow check
- Contrast measured on rendered pixels, not computed from token comments
- Touch targets checked at 390px

Results are written to `qa/ACCESSIBILITY-AUDIT.md`, replacing the NOT TESTED entries with
whatever is actually found, pass or fail.

## 10. Security, before launch

Each of these is independent of the redesign and small. All are from the server audit of
2026-09-21.

| Priority | Fix | Location |
|---|---|---|
| High | Add `require_auth` to both branches, or delete the file | `server/api.php:12, 23` (K-004) |
| Medium | Add `audit()` to four unlogged mutations | `support.php:111`, `support.php:137`, `time.php:62`, `comms.php:131` |
| Medium | Add a `state` parameter to the OAuth start and callback | `server/oauth.php:37-50` |
| Medium | Restrict to staff roles; both currently admit `client` | `server/ai.php:19`, `server/weather.php:14` |
| Medium | Rate-limit the public enquiry form, reusing the `audit_log` throttle from `auth.php:54-63` | `server/contact.php` (K-005) |
| Low | Remove the hard-coded seed-admin fallback address, the last production identifier in tracked source | `server/auth.php` (K-014) |
| Low | Bind the two concatenated `$where` fragments | `server/files.php:58-59` |
| Low | Add the MIME allowlist on upload | `server/files.php` (K-007) |
| Low | Reconcile `files` and `dashboard` entries with the server lists | `src/lib/access.ts:18, 51` (K-011) |

`server/api.php` is the original smoke test and `server/README.md` uses `GET /api.php`
as its post-install check. If the file is deleted rather than gated, that check is
replaced in the same change.

**Not fixable from this repository, and the owner's to close:** `docs/KNOWN-ISSUES.md`
K-001. A live super-admin credential is in git history and its rotation status is
UNVERIFIED. That account reaches the mailbox, client records, invoices and payment links.
Nothing in this design mitigates it. It is the highest-priority item on the project and
it needs someone with server access.

Every change under `server/` is committed but not live. `CLAUDE.md` constraint 4 requires
each one to be recorded in `docs/DEPLOYMENT.md` in the same change, and that applies to
all of the above plus `work.php` and the schema.

## 11. Verification

Four rounds. Each has a gate that must pass before the next begins.

| Round | Work | Gate |
|---|---|---|
| 1 · Build | Security fixes, schema, endpoint, CMS module, wirings | `npm run build` clean (`tsc -b` gates it), `npm test` passes, `php -l` over every file in `server/`, lint at or below the 60-error 7-warning baseline |
| 2 · Design | Public surface rebuilt to the direction | `design-review` skill pass; visual comparison against `docs/design/2026-09-22-directions/C-designer.html`; type scale audited by grep for arbitrary size values |
| 3 · Runtime | Accessibility and performance measured | axe-core clean or every finding recorded; keyboard pass; 200 per cent reflow; Lighthouse recorded with real numbers in `qa/PERFORMANCE-AUDIT.md` |
| 4 · Gate | Final review | `code-review`; security re-check of the eight items in section 10; `qa/RELEASE-CHECKLIST.md` walked |

The lint baseline is a ratchet, not a target. `docs/KNOWN-ISSUES.md` K-002 records 60
errors and 7 warnings across 42 files as at 2026-09-04. A change that adds a new lint
error is not complete.

## 12. Dependencies on the owner

The plan cannot finish without these. They are not blockers on starting, because sections
9, 10 and most of 5 are independent of them, but the work section cannot ship empty.

1. **Three to four real projects.** Per project: client name, live URL, sector, year, the
   problem in one line, what was built in one line, and one true outcome. Written
   permission to name each client, since publish is refused without it.
2. **Screenshots**, or the URLs and consent for them to be captured.
3. **A portrait.** The site leads with a person; the frame cannot stay empty.
4. **Real contact details** to replace the placeholders in `site.ts:5-8`.
5. **Confirmation on K-001.**

Nothing here will be invented to fill a gap. A labelled placeholder ships in preference to
a fabricated credential, and the site launches with three real projects rather than ten
thin ones.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Real content arrives late and the work section ships thin | Direction C's ledger reads correctly with three records. The static fallback keeps the page valid if the endpoint is unreachable |
| The rebrand leaks into `/app` | `.gk-public` and `html.gk-force-light` already scope the two surfaces. Round 2 checks the CMS visually before and after |
| A server change is committed but never uploaded | Every server change is recorded in `docs/DEPLOYMENT.md` in the same commit. The deployed state is UNVERIFIED today and this work does not by itself fix that |
| The schema is never applied | There is no migration runner by decision (D-008). The `ALTER`/`CREATE` statements go in `docs/DEPLOYMENT.md` as an explicit step, and the endpoint fails loudly rather than silently if the table is absent |
| Accessibility regresses during the redesign | The static audit found several areas already compliant. Round 3 measures rather than assumes, and the result is written down whether or not it is good |
| The lint backlog grows during a large UI change | Round 1's gate checks the count every time |

## 14. Deliverables

1. This document.
2. A rewritten task contract at `.agent/CURRENT-TASK.md`, replacing the completed GEE OS
   adoption contract with this work.
3. An implementation plan, written next, via the writing-plans skill.

---

## Open question for the owner

One thing was decided by inference rather than by you, and it is worth confirming: the
work section retires `SiteMockup`'s generated SVG wireframes in favour of real
screenshots. If any project cannot be screenshotted (an internal system, an expired
contract, a client who permits naming but not imagery), say so, because the ledger's
visual column then needs a designed answer for that case rather than an empty frame.
