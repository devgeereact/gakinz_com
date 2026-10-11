# Known issues

Open problems, each with evidence and a status. Fixed entries stay, marked, so their history
is not lost. "Fixed" means fixed in the repository: client changes made after `c57eb4a` reach
the live site only when PR #8 merges, and anything under `server/` is not live until it is
uploaded (`docs/DEPLOYMENT.md` section 5). Read this file before starting work, and update it
in the same pull request as a fix (`AGENTS.md`, "Keeping documents current").

Severity is judged on impact to the live business, not on how hard it is to fix. Entries
K-025 onward came from the 2026-10-10 audit summarised in `docs/STATUS.md` section 1.

| ID | Issue | Severity | Status |
|---|---|---|---|
| K-001 | A live super-admin credential is in git history | Critical | **Open. Rotation UNVERIFIED. Blocks launch** |
| K-002 | Lint fails | Medium | Open. 41 errors, 1 warning on 2026-10-11, down from 60 and 7; ratchet in CI |
| K-003 | `config.php.example` named a retired mail host | Medium | Fixed in the template. Server value UNVERIFIED |
| K-004 | `api.php` accepts an unauthenticated POST | Medium | **Fixed 2026-09-22.** Not uploaded |
| K-005 | `contact.php` has no spam protection | Medium | **Fixed 2026-09-22.** Not uploaded |
| K-006 | Deployed server state is unknown | Medium | Open. Needs server access |
| K-007 | No MIME allowlist on upload | Low to medium | **Fixed 2026-09-22.** Not uploaded |
| K-008 | Accessibility is unmeasured | Medium | **Closed 2026-09-22.** Measured. See `qa/ACCESSIBILITY-AUDIT.md` |
| K-009 | Marketing entry chunk is 556.94 kB | Low | **Closed 2026-09-22.** Now 181.76 kB |
| K-010 | No backup procedure is known to exist | High | Open. Outside this repository |
| K-011 | `access.ts` can drift from the server role lists | Low | **Mostly closed 2026-09-22.** Three mismatches fixed, tests added |
| K-012 | Stale design residue in `src/index.css` | Cosmetic | **Closed 2026-09-22** |
| K-013 | Four shared includes are outside the `.htaccess` deny rule | Informational | **Fixed 2026-10-10.** Not uploaded |
| K-014 | `auth.php` hard-codes a fallback seed-admin address | Low | **Fixed 2026-09-22.** Not uploaded |
| K-015 | A seed super-admin password was written to a web-served file | **Critical** | **Fixed in code 2026-09-22.** Operator must delete the live file |
| K-016 | Editing a draft blog post silently destroys its body | High | **Fixed 2026-10-10.** Not uploaded |
| K-017 | `xlsx` carries a HIGH advisory with no fix available | Medium | Open. Owner decision |
| K-018 | The public site is an empty shell to any client that does not run JavaScript | Medium | Open. Partly mitigated |
| K-019 | `sitemap.xml` is hand-maintained and omits database-driven URLs | Low | Open |
| K-020 | `tsc -b` does not use the strict project configs | Low | Open |
| K-021 | The legal pages have no review date and several compliance gaps | Medium | Open. Owner decision |
| K-022 | `SidebarMenuSub` drops its forwarded ref | Low | **Fixed 2026-10-11.** Not deployed |
| K-023 | Two CMS account links point at routes that do not exist | Low | **Fixed 2026-10-10.** Not deployed |
| K-024 | Non-admin roles cannot enable two-factor or revoke their own sessions | Medium | **Fixed 2026-10-10.** Not deployed or uploaded |
| K-025 | Stripe charged the ex-VAT amount and marked the invoice fully paid | **Critical** | **Fixed 2026-10-10.** Not uploaded. Past Stripe payments need checking |
| K-026 | PayPal payment is recorded only if the customer's browser returns | High | **Mitigated 2026-10-10:** PayPal checkout switched off |
| K-027 | Magic links and Google sign-in bypassed two-factor; one link could mint several sessions | **Critical** | **Fixed 2026-10-10.** Not uploaded |
| K-028 | Draft or declined quotes could be accepted; concurrent accepts duplicated projects and invoices | High | **Fixed 2026-10-10.** Not uploaded |
| K-029 | Create endpoints returned the audit-log id instead of the new record's id | High | **Fixed 2026-10-10.** Not uploaded |
| K-030 | CSV exports could run spreadsheet formulas from enquiry text | Medium | **Fixed 2026-10-10** |
| K-031 | Dashboard showed £0 and "All on time" when data failed; two CMS screens overflowed phones | Medium | **Fixed 2026-10-10** |
| K-032 | The CMS navigation is one flat list of 24 entries | Medium | **Fixed 2026-10-10.** Not deployed |
| K-033 | The bearer token lives in `localStorage`, and unlocking the lock screen issues a second token | Medium | **Partly fixed 2026-10-10:** unlock revokes the old token; not deployed. Storage, lifetime and CSP open |
| K-034 | A contract "signature" is a staff-typed name, not client signing | Medium | Open |
| K-035 | CI ran no tests and the deploy did not wait for CI | High | **Fixed 2026-10-10** |
| K-036 | Public pages bring back unpublished posts and work from the static fallback | Medium | **Fixed 2026-10-10.** Not deployed |
| K-037 | The article renderer has no links or lists | Medium | **Fixed 2026-10-10.** Not deployed |
| K-038 | Public fallback copy shows engineering counts and internal file paths | Medium | **Partly fixed 2026-10-10:** engineering copy removed, not deployed. "To supply" placeholders wait for owner material |
| K-039 | Clients cannot message the owner from the portal | High | **Fixed 2026-10-10.** Not deployed or uploaded. Private feedback still open |
| K-040 | `stored` is a MySQL 8 reserved word, so the schema failed on MySQL | High | **Fixed 2026-10-10.** Not uploaded |
| K-041 | `npm audit` reports 15 affected packages, ten of them high | Medium | Open. Owner decision |
| K-042 | The Google Fonts `@import` still blocks rendering on public pages that no longer use those fonts | Low | Open |
| K-043 | A static canonical in `index.html` conflicts with the per-route canonical | Low | Open |


---

## K-001 · A live super-admin credential is in git history
**Severity:** critical · **Status:** open, rotation UNVERIFIED

The previous `CLAUDE.md` recorded a working login for the production CMS, with a plaintext
password, in a tracked file. That file is in every clone and in the history.
The account holds `super_admin`, which reaches the mailbox, client records, invoices and
payment links.

The same account is named in `server/config.php.example` as the `$SEED_ADMIN_EMAIL` value.
Read it there rather than restating it here.

**What was done here:** the credential is not carried into any new document. The slim
`CLAUDE.md` does not contain it.

**What removing it from a file does not do:** it does not remove it from history. Rotation on
the live system is the only thing that closes this. Whether that has happened is UNVERIFIED.

**Action:** rotate the password on the live system. Then decide separately whether history
needs rewriting, which is a force push and was explicitly excluded from this migration.

---

## K-002 · Lint fails
**Severity:** medium · **Status:** open, recorded not fixed

`npm run lint` on 2026-09-04 reported **60 errors and 7 warnings across 42 files**. The
current figure is in `docs/STATUS.md` section 0 (41 errors and 1 warning on 2026-10-11), and
`npm run lint:ratchet` enforces the ceiling in `scripts/lint-ratchet.mjs` in CI. The table
below is the 2026-09-04 breakdown, kept for history.

| Count | Severity | Rule |
|---|---|---|
| 39 | error | `react-hooks/set-state-in-effect` |
| 7 | error | `react-refresh/only-export-components` |
| 4 | error | `react-hooks/refs` |
| 4 | error | `unused-imports/no-unused-imports` |
| 2 | error | `prefer-const` |
| 1 | error | `react-hooks/immutability` |
| 1 | error | `react-hooks/purity` |
| 1 | error | `@typescript-eslint/no-unused-expressions` |
| 1 | error | `@typescript-eslint/no-explicit-any` |
| 5 | warning | `unused-imports/no-unused-vars` |
| 1 | warning | `react-hooks/exhaustive-deps` |
| 1 | warning | `react-hooks/incompatible-library` |

Worst files: `src/app/modules/Platform.tsx` (7),
`src/components/calendar/shadcn-full-calendar.tsx` (5), then `Contracts.tsx`,
`DevPipeline.tsx`, `src/components/ui/sidebar.tsx` and `src/marketing/pages/Sectors.tsx` at 3
each.

**Reading of it:** 39 of the 60 are one rule, which usually means one repeated pattern
(setting state in an effect to react to a route change or a prop) rather than 39 separate
mistakes. The unused-import errors are trivial. The `react-hooks/refs`, `purity` and
`immutability` errors are the ones worth reading individually.

**Rule going forward:** the backlog must not grow. A change that adds a new lint error is not
complete. Whether to fix, ratchet with a baseline, or accept it is the owner's call.

---

## K-003 · `config.php.example` named a retired mail host
**Severity:** medium · **Status:** fixed in the template on 2026-09-04. The live server value
is **UNVERIFIED**

`server/config.php.example` set both `$SMTP_HOST` and `$IMAP_HOST` to a host that was retired
in the July 2026 migration.

**Why it was worse than a stale string:** a retired host of that kind still resolves and still
answers on port 465, so a `config.php` copied from the template connects to a machine where
the mailboxes no longer exist. It fails as an authentication error at best, and silently at
worst. It never fails as "host not found", which is the failure people watch for.

**What was done:** both values are now `REPLACE_smtp_host` and `REPLACE_imap_host`, with a
comment stating that the real hostname is a hosting fact held in the operator's notes and not
in this repository, and warning about the silent-failure mode. A placeholder fails loudly on
connection, which is the behaviour wanted from a template.

**What is still open:** whether the **live** `config.php` on the server points at the retired
host. That cannot be checked from here. See `docs/DEPLOYMENT.md` section 5.

**Related, same change:** `DB_NAME`, `DB_USER` and `$SEED_ADMIN_EMAIL` were also replaced with
placeholders. They were real production identifiers sitting in a tracked file. `DB_NAME` and
`DB_USER` now carry the cPanel `<cpanel_user>_<database>` convention as a comment instead of
the values.

---

## K-004 · `api.php` accepts an unauthenticated POST
**Severity:** medium · **Status:** **fixed in code on 2026-09-22. NOT UPLOADED.**

`server/api.php` was rewritten as a read-only health check: a `SELECT 1` and a JSON
reply. The `items` listing and the anonymous `INSERT` are both gone, and
`server/README.md`'s post-install step was updated to match. The endpoint is still
unauthenticated, which is intended for a health check, but it no longer writes.

The repository copy is fixed. Whether the live document root still serves the old file
is **UNVERIFIED**.

**The original finding, for the record.**


`server/api.php` is the original smoke test. `GET` lists rows from `items`; `POST {name}`
inserts one. Neither calls `require_auth`.

**Impact:** anyone who can reach the domain can insert rows into a production table
indefinitely. It is not a data-disclosure path, since `items` holds no business data, but it
is an unauthenticated write to the live database and an easy way to fill the disk.

**Options:** gate the POST behind `require_auth`, or remove `api.php` from the document root
now that it has served its purpose. Note that `server/README.md` still uses `GET /api.php`
returning `[]` as the post-install check, so removing it means replacing that step.

---

## K-005 · `contact.php` has no spam protection
**Severity:** medium · **Status:** **fixed in code on 2026-09-22. NOT UPLOADED.**

An IP throttle was added, modelled on the login counter already in `auth.php`: more than
five `enquiry_submit` rows from one address within fifteen minutes returns 429. Each
accepted enquiry also writes an `audit()` row, which it did not before.

No captcha and no new dependency. Note that the throttle counts rows in `audit_log`, so
purging that table resets it.

**The original finding, for the record.**


The public enquiry endpoint validates a name, an email format and a message of at least 10
characters, then inserts into `enquiries` with the caller IP. There is no rate limit, no
honeypot, no captcha and no duplicate check.

**Impact:** the leads pipeline is the studio's front door. Automated submissions land directly
in it as apparently real leads.

**Note:** the pattern to reuse already exists. `auth.php` throttles by counting recent
`audit_log` rows for the same email or IP.

---

## K-006 · Deployed server state is unknown
**Severity:** medium · **Status:** open, needs server access

Which of the PHP files on the host match the repository, and which of the schema migrations
have been applied, cannot be determined from here. See `docs/DEPLOYMENT.md` section 5.

**Impact:** a feature can be complete in the repository and absent in production, and nothing
in this repository will say so. It also means no release note can honestly claim the system is
up to date.

**What closes it:** compare the approved file versions, schema and configuration on the host
with the repository, and record each result and its rollback in `docs/DEPLOYMENT.md`.

---

## K-007 · No MIME allowlist on upload
**Severity:** low to medium · **Status:** **fixed in code on 2026-09-22. NOT UPLOADED.**

`server/files.php` now checks the extension against an allowlist and cross-checks the
real type with `finfo_file()` before the file is stored. The browser-supplied
`Content-Type` is no longer stored, and the download path sends only an allowlisted
type.

Two residuals, both recorded rather than fixed. Existing rows keep whatever MIME their
uploader's browser claimed, though the download filter now neutralises them. And nothing
scans `uploads/` for files already there whose extension the new allowlist would reject.
The host must have the PHP `fileinfo` extension enabled or uploads return 503.

**The original finding, for the record.**


`files.php` caps size at 20 MB, generates a random stored name and sanitises the extension to
alphanumerics, but accepts any file type.

**Mitigation in place:** the upload directory gets a generated `.htaccess` with
`Require all denied` and `Deny from all`, and everything is streamed back through PHP with
`X-Content-Type-Options: nosniff`.

**Residual risk:** the whole defence against an uploaded script being executed is that one
generated `.htaccess`. If it is missing, unreadable or not honoured by the web server, an
uploaded PHP file sits in a directory under the document root. That the deny works on the live
host is **NOT TESTED**.

---

## K-008 · Accessibility is unmeasured
**Severity:** medium · **Status:** **closed on 2026-09-22.** Measured.

The public surface was measured at runtime rather than declared. axe-core 4.10.2 across
16 routes returned 0 violations; Lighthouse's accessibility category scored 100; contrast
was computed on rendered pixels across 28 distinct combinations with 0 failures; 353
focusable elements were checked for a visible indicator with 0 failures; reflow at 200%
and target size at 390px both pass.

Two real defects were found by that measurement and fixed: the focus indicator painted
nothing on part of the masthead, and the ring colour was inverted on dark controls.
Neither was reported by axe.

Full method, figures and the list of what remains NOT TESTED are in
`qa/ACCESSIBILITY-AUDIT.md`. The largest remaining gap is that **no screen-reader pass
with real assistive technology has been done**, and GAkinzOS at `/app/*` is unaudited.

**The original finding, for the record.**

A previous session recorded an axe run with zero violations on three pages. That claim is
withdrawn: no report was kept, the run is not reproducible from this tree, there is no
accessibility tooling in `package.json`, and the palette has been replaced twice since.

See `qa/ACCESSIBILITY-AUDIT.md` and `docs/DECISIONS.md` D-020.

---

## K-009 · The marketing entry chunk is over the warning threshold
**Severity:** low · **Status:** **closed on 2026-09-22.**

The entry chunk is 181.76 kB, down from 556.94 kB, and Vite no longer emits the 500 kB
warning. `vite.config.ts` gained a `manualChunks` rule that splits the framework into a
long-cacheable `vendor` chunk and folds roughly 30 lucide micro-chunks into one.

`dist/` fell from 43 MB to 2.6 MB, almost all of it from removing 35.92 MiB of
unreferenced images in `public/`. Figures in `qa/PERFORMANCE-AUDIT.md`.

**The original finding, for the record.**


556.94 kB raw, 173.79 kB gzipped, against Vite's 500 kB warning. The heavy libraries are
already lazy; this is the eager public-site entry.

Previous documentation recorded 539 kB, so it has grown. See `qa/PERFORMANCE-AUDIT.md`.

---

## K-010 · No backup procedure is known to exist
**Severity:** high · **Status:** open, outside this repository

Nothing in the repository defines or performs a database or uploads backup.
`server/uploads/` is gitignored, so client file uploads exist in exactly one place.

Backup arrangements belong to the hosting account, not to this repository, so this entry is a
pointer rather than a task. It is recorded because the absence is easy to mistake for a
solved problem.

**What closes it:** restore the database and the uploaded files into an isolated environment
and check their relationships and permissions. The proposed recovery targets are in
`docs/OPERATIONS.md` section 10, and this is a production acceptance gate (section 9 there).

---

## K-011 · `access.ts` can drift from the server role lists
**Severity:** low · **Status:** **mostly closed on 2026-09-22.**

Three real mismatches were found and fixed. `files` granted `trainer` where
`server/files.php` does not. `dashboard` granted `trainer` and `employee` a page whose
panels mostly 403. `portal` granted every staff role, and the matching server branch had
no role list at all, so an `employee` could pass an arbitrary `?client_id` and read any
client's invoice data that `invoices.php` restricts to three roles. Both ends are now
narrowed and agree.

`canAccess` also **failed open**: a path with no entry in the module map returned `true`,
so a future route added without a map entry would have been reachable by every
authenticated user including `client`. It now fails closed.

The test suite grew from 11 to 21 cases and now asserts the role lists against the
server's, that every module key round-trips through `moduleKeyForPath`, that every role's
landing page is a module it can open, and the `portal` narrowing specifically.

**Still open:** there is no automated check that the TypeScript list and the PHP constant
agree. The tests encode the server's lists by hand, so a change to a PHP role constant
still has to be mirrored by a person.

**The original finding, for the record.**

`src/lib/access.ts` duplicates the per-endpoint role constants by hand. Nothing checks the two
against each other. Drift shows up as a module a user can open but every request inside it
returning 403, or as a hidden module the user could actually use.

`src/lib/access.test.ts` covers the client side only.

---

## K-012 · Stale design residue in `src/index.css`
**Severity:** cosmetic · **Status:** **closed on 2026-09-22.**

Both commented-out gradient blocks are gone, including the committed keyboard-mash
(`=-09876543567987654321`, `200014b0f2a,456895e//`, `#111a3,a,`) that was sitting inside
one of them, and the leftover URL pointing at a third-party template demo site. The
FullCalendar reset went with FullCalendar. The five unused custom properties and the
misnamed `--gk-violet` / `--gk-indigo` / `--gk-sky` override on `.gk-public` are gone.

The effect classes themselves (`.gk-aurora`, `.gk-grid`, `.gk-shine`, `.gk-grad-text`)
remain, because `src/app/Login.tsx` and `SetPassword.tsx` still use them. They must not
appear on a public page.

**The original finding, for the record.**

- A Pulse-kit block of `gradient-red` through `gradient-cyan` helpers and a `.dark-blue`,
  `.gaussian-black`, `.classic-light` scrollbar rule, none of which belongs to this brand.
- Two section comments still say "Forest Editorial", and one points at `DESIGN-SYSTEM.md §5`.
  The rules under them are current; only the labels are stale.

Those two items were part of the original finding. The gradient helpers and the
scrollbar rule remain, because the CMS themes still use them; the stale section labels
were corrected with the rest of the block.

---

## K-013 · Four shared includes are outside the `.htaccess` deny rule
**Severity:** informational · **Status:** **fixed 2026-10-10, not uploaded.** The deny pattern
is now `^(config|_[A-Za-z0-9_-]+)\.php$`. Regex checked locally; Apache/LiteSpeed behaviour
NOT TESTED. The original finding follows.

`server/.htaccess` denies `config.php` and `_bootstrap.php` by name. It does not deny
`_smtp.php`, `_sms.php`, `_slack.php` or `_monitor.php`.

All four contain function definitions only and produce no output when requested directly, so
the practical impact is nil today. It is recorded because the rule's intent was to cover
shared includes, and a future include that runs code at load would be exposed.

The same `FilesMatch` also still names only `(api|contact|ai|verify)\.php` in its
non-rewrite rule, which is a stale list. It is harmless, because an earlier rule already lets
every real file through.

---

## K-014 · `auth.php` hard-codes a fallback seed-admin address
**Severity:** low · **Status:** **fixed in code on 2026-09-22. NOT UPLOADED.**

The `'dev@gakinz.com'` fallback is gone. `ensure_seed()` now returns early when
`$GLOBALS['SEED_ADMIN_EMAIL']` is not set, rather than inventing an address.

**This changes first-run behaviour.** With the key unset, a first run against an empty
`users` table now creates no account at all and nobody can sign in. `$SEED_ADMIN_EMAIL`
must be set in the live `config.php`.

**The original finding, for the record.**


`server/auth.php` line 484:

```php
$email = $GLOBALS['SEED_ADMIN_EMAIL'] ?? 'dev@gakinz.com';
```

`ensure_seed()` runs only against an empty `users` table, so this fires once on a fresh
install and never again. It is the last remaining production identifier hard-coded in tracked
source, now that `config.php.example` uses a placeholder.

**Impact:** low. It names the seeded super-admin account in a public-readable file, and on a
fresh install with an unfilled config it would silently create an account under an address the
operator may not control.

**Not fixed here** because it is application code, and this documentation migration does not
change behaviour. The fix is one line: fail with a clear message when `$SEED_ADMIN_EMAIL` is
unset or still a placeholder, rather than defaulting.

---

## K-015 · A seed super-admin password was written to a web-served file
**Severity:** critical · **Status:** **fixed in code on 2026-09-22. An operator action is
still outstanding on the live server.**

`server/auth.php` generated a random super-admin password on first run and wrote it, in
plaintext, to `server/seed_admin_password.txt`. `__DIR__` there is the document root,
and the `.htaccess` deny list covered only `.md`, `.sql` and `.log`. A `.txt` file in the
document root was served to anyone who requested it by name.

The empty-password path was the documented default: `config.php.example` says
`$SEED_ADMIN_PASSWORD = '';   // '' → random, written to seed_admin_password.txt`. The
`chmod 0600` on the file did not help, because Apache runs as the same cPanel user.

**Fixed in code:** the file write is gone and the generated password goes to the PHP
error log instead. The `.htaccess` deny pattern now covers `.txt`, with `robots.txt`
exempted by a negative lookahead so the public site still works.

**Outstanding, and it is the operator's:** check whether
`https://gakinz.com/seed_admin_password.txt` exists on the live server and delete it. If
it was there, treat that password as public: change it and revoke that account's
sessions. Whether the file exists is **UNVERIFIED** from this repository.

This is related to K-001 but is a separate exposure with a separate fix.

---

## K-016 · Editing a draft blog post silently destroys its body
**Severity:** high · **Status:** **fixed 2026-10-10, not uploaded.** The editor now loads the
full post from a new editors-only `GET blog.php?id=` before Save is enabled, and an update that
omits `excerpt` or `body` keeps the stored values (`tests/server/blog.test.ts`). The original
finding follows.

In `server/blog.php` the staff list branch (`?all=1`) selects `id, slug, title, category,
cover, read_mins, status, published_at, updated_at`. It does not select `body` or
`excerpt`. The only branch that returns `body` is the public single-post read, which
filters on `status = "published"`.

So a **draft** post has no endpoint that returns its body, and `blog.php?action=update`
rewrites `excerpt` and `body` unconditionally. Opening a draft in the CMS and saving it
writes back the empty fields the form was given, wiping whatever was there. No error, no
trace, and it looks to the author like the text was never saved in the first place.

Published posts are safe, because the public read can supply the body. Drafts are the
posts nobody misses until they open them, which is why this has gone unnoticed.

**The same bug existed in `work.php` and was fixed there** on 2026-09-22: the narrative
columns were added to `listAll`, and an EDITORS-gated `getAdmin` returns a full record
whatever its status. The same shape of fix applies here.

**Not fixed** because `blog.php` was outside the scope of this work and a change to it
needs its own verification. Recorded so it is not lost.

---

## K-017 · `xlsx` carries a HIGH advisory with no fix available
**Severity:** medium · **Status:** open. Owner decision.

`npm audit` reports 7 findings, down from 33. Six have fixes upstream. One does not.

`xlsx` is a **direct** dependency with two HIGH advisories, Prototype Pollution
(GHSA-4r6h-8v6p-xvw6) and ReDoS (GHSA-5pgg-2g8v-p4x9), and `fixAvailable: false`. It is
genuinely used at `src/lib/csv.ts:5` for workbook export in the CMS.

It does not touch the public site, and the input it parses is generated by this
application rather than uploaded by a visitor, which lowers the practical risk. That is
a mitigation, not a fix.

**The options, none of which should be chosen by an agent:** accept the risk and record
that decision; pin to the vendor's own CDN build, which is where the maintained version
now lives; migrate the export to a maintained alternative such as `exceljs`; or drop XLSX
and keep CSV only, if nobody needs workbooks. The 7-finding count above is the 2026-09-22
figure; the 2026-10-10 audit is K-041.

---

## K-018 · The public site is an empty shell to any client that does not run JavaScript
**Severity:** medium · **Status:** open. Partly mitigated.

The site is a client-rendered single-page application with no prerender step. The served
body is `<div id="root"></div>` and nothing else, for every URL. There is no SSR, no
static fallback and no `<noscript>` content.

Googlebot renders JavaScript and will see the pages. Most social scrapers, Bing, and most
LLM crawlers do not, so a shared link or a training crawl sees one generic title and an
empty document.

**Mitigated, not fixed.** Three things reduce the damage:

- The served `index.html` now carries the correct title, description, canonical, Open
  Graph and Twitter Card tags, a `theme-color` and a real 1200x630 `og.png`. Until
  2026-09-22 it carried the **old studio title and description**, so every non-rendering
  client, including every social scraper, saw a stale description of a business that no
  longer describes the site.
- A `<noscript>` block gives a visitor without JavaScript the identity and an email
  address rather than a blank page.
- `public/llms.txt` states the site's content in Markdown for crawlers that read it.

**What remains broken:** the other fourteen routes still serve the home page's metadata
to anything that does not render, because the per-route tags are written by React at
runtime.

**The fix is prerendering the public routes at build time.** That changes the build and
the deploy, so it is recorded here rather than attempted.

Related: `server/.htaccess` rewrites every unknown URL to `index.html` with a 200, so
`/anything-at-all` is a soft 404. The SPA renders a 404 page client-side and that page is
now `noindex`, but the status code is still 200.

---

## K-019 · `sitemap.xml` is hand-maintained and omits database-driven URLs
**Severity:** low · **Status:** open.

`public/sitemap.xml` is a static file listing the 15 routes whose content is known at
build time. Work records at `/work/:slug` and articles at `/resources/:slug` come from
the database and are **not** listed, because there is no generator and guessing slugs
would be worse than omitting them.

Its `lastmod` dates are also hand-set and will drift.

**The fix** is either a build step that reads the endpoints, or a server-rendered
`sitemap.php`. The second fits this project better, since the data already lives behind
PHP. Either way it wants a decision rather than a quiet addition.

---

## K-020 · `tsc -b` does not use the strict project configs
**Severity:** low · **Status:** open.

`tsconfig.json` declares no `references` array, so `tsc -b` type-checks with the root
config alone and never applies `tsconfig.app.json`'s `noUnusedLocals`,
`noUnusedParameters` or `noFallthroughCasesInSwitch`. The two files also disagree on
`target` and `lib` while otherwise duplicating each other.

**This is the root cause of the dead code that accumulated unnoticed**: 27 orphaned
source files and 27 unused packages were removed on 2026-09-22, and none of them was ever
going to be caught by a build that does not look.

Enabling project references surfaced 41 errors when probed, which was past the threshold
set for that task, so it was not applied. Two trivial unused locals outside the marketing
tree were fixed. The remaining count should be far lower now that the marketing surface
has been rebuilt, and this is worth re-probing.

---

## K-021 · The legal pages have no review date and several compliance gaps
**Severity:** medium · **Status:** open. Owner decision, and arguably a solicitor's.

The hard-coded "Last updated 1 June 2026" was removed because nobody set it and nobody
reviewed on it. Each policy now declares `reviewed: null` and the page renders a visible
labelled gap until a real date is supplied. That is deliberate, and it is visible to
visitors: a fabricated review date on a legal page is worse than an admitted absence.

Gaps identified while rewriting the copy, none of which were changed, because the
substance of a legal notice is not an agent's to draft:

1. **No identified data controller and no company registration.** UK GDPR Article
   13(1)(a) requires the controller's identity. `site.studio.registration` is `null`, so
   the site names no legal entity.
2. **No lawful basis stated** (Article 13(1)(c)).
3. **Retention is not a period.** "A reasonable period after" does not satisfy Article
   13(2)(a).
4. **The rights list is incomplete.** It offers access, rectification and erasure, and
   omits restriction, objection, portability, and the right to complain to the ICO.
5. **"Without warranty" may be unenforceable as written.** UCTA 1977 and, for consumers,
   the Consumer Rights Act 2015 limit a blanket exclusion, and liability for death or
   personal injury from negligence cannot be excluded at all.
6. **No governing law or jurisdiction clause** in the terms.
7. **The cookie claim is unverified.** "Only the cookies needed to make it work" is
   probably true today, since no `document.cookie`, `localStorage` or `sessionStorage`
   use was found on the public surface, but PECR expects cookies to be named individually
   and the deployed site has not been audited.
8. **No processors are named**, which becomes a live gap the moment a mail relay or
   analytics is added.

---

## K-022 · `SidebarMenuSub` drops its forwarded ref
**Severity:** low · **Status:** fixed 2026-10-11 on `test/work-and-journey`; not deployed.

The ref is now attached to the `<ul>`. No caller passes one (`src/components/nav-main.tsx`),
so rendering is unchanged; the fix also clears the one `unused-imports/no-unused-vars` lint warning.

`src/components/ui/sidebar.tsx:698`. `SidebarMenuSub` is a `React.forwardRef` whose `ref`
is destructured but never attached to the `<ul>`, so any ref passed to it is silently
discarded.

Nothing currently passes one, so nothing is broken today. Attaching it is a behaviour
change rather than a pure fix, which is why it was reported rather than done during the
dead-code removal.

CMS only. The public surface does not use this component.

---

## K-023 · Two CMS account links point at routes that do not exist
**Severity:** low · **Status:** **fixed 2026-10-10, not deployed.** The user menu now links to
`/app/account` (My account), which every signed-in role can open (`186474c`). The original
finding follows.

`src/components/nav-user.tsx:122` and `:128` link to `/app/account/profile` and
`/app/account/notifications`. Neither route is declared in `src/routes/index.tsx`, so
both fall through to the catch-all and render the 404 page.

These are in the user dropdown, which every signed-in person sees. Either declare the
routes and build the two screens, or remove the menu entries. Removing them is the
smaller change and is honest about what exists.

CMS only. The public surface is unaffected.

---

## K-024 · Non-admin roles cannot enable two-factor or revoke their own sessions
**Severity:** medium · **Status:** **fixed 2026-10-10, not deployed or uploaded.** My account
(`src/app/modules/Account.tsx`, `AccountSecurity.tsx`) gives every role, client included, a
read-only profile, two-factor setup and its own sessions with revoke. `auth.php` `me` now
returns the caller's `totp_enabled`. `tests/server/account.test.ts` checks that each
self-service action touches only the caller. The `auth.php` change is in the upload list. The
original finding follows.

The two-factor setup, the recovery codes and the "my sessions" list all live in the
`Platform` module, which `src/lib/access.ts` gates to `super_admin` and `admin`.

The endpoints behind them do not have that restriction: `auth.php`'s `twofa_setup`,
`twofa_enable`, `twofa_disable`, `twofa_recodes`, `sessions` and `revoke` all call
`require_auth($conn)` with no role list, because they act on the caller's own account.

So a `manager`, `trainer`, `editor`, `employee` or `client` **cannot turn on two-factor
authentication at all**, and cannot see or revoke their own sessions, even though the
server would let them. On a system whose tokens last 30 days and live in `localStorage`,
that is the wrong group of people to deny.

The fix is a small self-service account screen reachable by every authenticated role,
rather than widening access to the whole Platform module. Note it pairs with **K-023**:
the dropdown already links to an account area that does not exist, and this is what
belongs in it.

CMS only, and not touched by this relaunch.

---

## K-025 · Stripe charged the ex-VAT amount and marked the invoice fully paid
**Severity:** critical · **Status:** **fixed 2026-10-10, not uploaded.**

`payments.php` built the Stripe Checkout amount from the line-item sum without `vat_rate`,
while invoices, the PDF and the portal show the VAT-inclusive total. The webhook then marked
the invoice paid, so the VAT was silently lost. Proposal acceptance stores VAT on every
instalment invoice, so any VAT-registered quote paid by Stripe was affected.

Fix: `server/_money.php` is the single payable-total calculation; the link charges it, the
webhook marks paid only when Stripe's amount and currency match, and each event is recorded
in the new `payment_events` table so redeliveries are ignored (`tests/server/payments.test.ts`,
7 of its first 8 cases failed against the old file). **Operator action:** check invoices already
paid through Stripe against their VAT-inclusive totals (`docs/DEPLOYMENT.md` section 5.1).

## K-026 · PayPal payment is recorded only if the customer's browser returns
**Severity:** high · **Status:** **mitigated 2026-10-10.**

There is no PayPal webhook; `paypal_return` is the only place a capture is recorded. A closed
tab leaves money captured against an unpaid invoice. PayPal checkout now returns 503 unless
`$PAYPAL_ENABLED = true`, and the CMS button is removed. A proper fix needs a verified PayPal
webhook or a manual reconciliation step.

## K-027 · Alternative sign-in paths bypassed two-factor
**Severity:** critical · **Status:** **fixed 2026-10-10, not uploaded.**

`magic_consume` issued a full session for any active user, including `super_admin`, without
checking two-factor, and burned the link with an unguarded UPDATE, so concurrent clicks minted
several sessions (reproduced locally). Google sign-in (`oauth.php`) also ignored two-factor.
The magic-link constants were declared after the request dispatch and so were never defined:
a configured `magic_request` would have failed with a fatal error.

Fix: magic links sign in `client` accounts without two-factor only, the link is claimed with a
guarded UPDATE, and Google sign-in refuses accounts with two-factor on
(`tests/server/auth.test.ts`).

## K-028 · Quote acceptance accepted the wrong quotes, and twice
**Severity:** high · **Status:** **fixed 2026-10-10, not uploaded.**

`proposals.php?action=accept` never checked `status`, so a draft or declined quote converted.
The `project_id` check ran outside the transaction, so concurrent accepts created duplicate
projects and invoice schedules (reproduced locally). Fix: accept only `sent`, unexpired quotes,
claimed by a guarded UPDATE inside the transaction; an accepted quote cannot be moved back to
draft (`tests/server/proposals.test.ts`).

## K-029 · Create endpoints returned the wrong id
**Severity:** high · **Status:** **fixed 2026-10-10, not uploaded.**

Seventeen create handlers read `$conn->insert_id` after `audit()` had inserted its own row, so
they returned the audit-log id. In three handlers an UPDATE ran in between, which would have
returned 0. Found while testing K-016. Fix: read the id straight after the INSERT
(`tests/server/create-ids.test.ts`).

## K-030 · CSV exports could run spreadsheet formulas
**Severity:** medium · **Status:** **fixed 2026-10-10.**

`toCsv` quoted fields but did not neutralise a leading `=`, `+`, `-`, `@`, tab or CR, and
enquiry text comes from the public form. Formula-like strings are now prefixed with an
apostrophe; real numbers are untouched. SheetJS already writes XLSX strings as text cells
(`src/lib/csv.test.ts`).

## K-031 · Dashboard zeros on failure and phone overflow
**Severity:** medium · **Status:** **fixed 2026-10-10.**

A failed source showed as £0 and "All on time"; it now shows "—" with a retry hint. Invoicing
and Platform widened a 390px screen to 448px and 642px; header actions now wrap and the shared
tab list scrolls inside itself. Checked in an isolated local preview with every API call
stubbed: all 24 CMS routes fit at 320px and 390px. Data-filled tables NOT TESTED.

## K-032 · The CMS navigation is one flat list of 24 entries
**Severity:** medium · **Status:** **fixed 2026-10-10, not deployed.** `app-sidebar.tsx` groups
the entries under the seven D-040 destinations, relabels Dashboard, Leads, Proposals and
Platform as Today, Enquiries, Quotes and Settings, and hides a group the role cannot use. URLs
are unchanged. Checked in an isolated preview: the owner sees seven groups, a client sees
Client Portal and My account. Moving supporting tools inside their records is later work
(`docs/PRODUCT-SPEC.md` section 5.2). The original finding follows.

`src/components/app-sidebar.tsx` renders one flat, ungrouped list of 24 entries, filtered per
role by `canAccess`. A sole owner has to choose between 24 destinations to find the next
action, and the supporting tools sit beside the core journeys rather than inside the records
they serve. Resolution: the seven destinations in D-040 (`docs/PRODUCT-SPEC.md` section 5.2),
with existing URLs kept until the migration is verified.

## K-033 · The bearer token lives in `localStorage`, and unlocking issues a second token
**Severity:** medium · **Status:** **partly fixed 2026-10-10, not deployed.** The second-token
half is fixed (below). Storage, lifetime and the CSP remain open.

`src/store/auth.store.ts` persists the bearer token in `localStorage` under `gk-auth`, where
any script running on the same origin can read it, and public and private pages share that
origin. The idle lock screen (`src/app/components/LockScreen.tsx`) is a `sessionStorage` flag.
Unlocking calls the real login, two-factor included, but issues a second token and leaves the
first one valid. Resolution: review token lifetime, revocation and the CSP; revoke or reuse
the existing token on unlock; never describe the lock as a sign-out. This must be settled
before any third-party script reaches a public page (`docs/CONTENT-AND-GROWTH.md` section 3).

**Progress 2026-10-10 (client only, not deployed):** a wrong password on the lock screen no
longer clears the session (`42f890b`). And after a successful unlock the lock
screen sends the previous token to `auth.php?action=logout` through `auth.revokeToken` in
`src/lib/api.ts`, so the server deletes it. `revokePreviousToken` in
`src/lib/session-revoke.ts` retries three times with a doubling delay and writes a console
warning on every failure; it never throws, so a failed revoke cannot lock the user out, and
the old session can still be ended from the active sessions list. Unit tests in
`src/lib/session-revoke.test.ts`. The `localStorage` exposure, token lifetime and CSP review
remain open.

## K-034 · A contract "signature" is a staff-typed name, not client signing
**Severity:** medium · **Status:** open.

`server/contracts.php` restricts signing to STAFF and stores the typed `signed_name` and the
caller's IP. The person typing is a member of staff, so the record cannot show that a client
agreed. Resolution: label it as an internal acknowledgement, and use an externally signed
document at first (`docs/PRODUCT-SPEC.md` section 5.5, "Contracts and agreements").

## K-035 · CI ran no tests and the deploy did not wait for CI
**Severity:** high · **Status:** **fixed 2026-10-10.**

`.github/workflows/ci.yml` ran the type check, an advisory lint (`continue-on-error: true`) and
the build only: no `npm test` and no `php -l`. `deploy.yml` deployed `dist/` on every push to
`main` with no dependency on CI, so a failing build could ship. Fix: CI runs unit tests, the
server tests, `php -l` and the lint ratchet, and `deploy.yml` runs only after CI succeeds on a
push to `main` (D-036, `docs/DEPLOYMENT.md` section 2). The new server-test job found K-040.

## K-036 · Public pages bring back unpublished posts and work from the static fallback
**Severity:** medium · **Status:** **fixed 2026-10-10, not deployed.** A successful CMS answer,
empty included, now decides what the public pages show; the static fallback is used only when
the request fails, and a JSON 404 is a real not-found (`src/marketing/data/cmsResult.ts`,
`cmsResult.test.ts`, `3eadfd3`). The private content-health warning is not built. The original
finding follows.

At the 2026-10-10 audit, `src/marketing/data/blog.ts` and `src/marketing/data/work.ts` started
with static content and kept it both on failure and on a **successful empty** response, and
`useMarketingPost` still served a static post by slug. So unpublishing a record in the CMS
does not remove it from the public site if a static copy exists. Resolution: treat
success-empty differently from failure, so unpublishing never brings fallback content back,
and give the owner a private content-health warning (`docs/PRODUCT-SPEC.md` section 4.4).

## K-037 · The article renderer has no links or lists
**Severity:** medium · **Status:** **fixed 2026-10-10, not deployed.**
`src/marketing/lib/articleFormat.ts` supports `##` and `###` headings, bullet and numbered
lists, bold and `[text](url)` links as React elements with no raw HTML. Only `https`, `http`
and `mailto` become anchors; `[text](url){sponsored}` adds `rel="sponsored"`
(`articleFormat.test.ts`, `d5276cb`). Recommendation blocks are not built. The original
finding follows.

`src/marketing/pages/ResourceDetail.tsx` renders only `h2`, `h3` and plain paragraphs: no
links, lists or emphasis. Articles cannot cite sources, and affiliate recommendations cannot
be published at all. Resolution: a small safe format for links, lists and recommendation
blocks, with no raw HTML, before any affiliate content (`docs/CONTENT-AND-GROWTH.md` section
4).

## K-038 · Public fallback copy shows engineering counts and internal file paths
**Severity:** medium · **Status:** **partly fixed 2026-10-10, not deployed.** The work fallback
no longer shows module and endpoint counts or repository paths (`3eadfd3`). The labelled
placeholders remain: "Portrait, to supply" (`Home.tsx`, `About.tsx`), "Biography, to supply"
(`About.tsx`), "Screenshot, to supply" (`WorkDetail.tsx`) and "review date to supply"
(`Legal.tsx`). They close when the owner supplies the material (`docs/STATUS.md` section 5)
or the entries are unpublished. The original finding follows.

At the 2026-10-10 audit the visible fallback text included "twenty-four modules … Forty
server endpoints" and a `qa/ACCESSIBILITY-AUDIT.md` path (`work.ts`), "Portrait, to supply"
(`Home.tsx`, `About.tsx`), "Biography, to supply" (`About.tsx`), "Screenshot, to supply"
(`WorkDetail.tsx`) and "review date to supply" (`Legal.tsx`). With the API unreachable, the
home page rendered project gaps, the portrait placeholder and technical build commentary. A
buyer reads that as an unfinished business. Resolution: replace it with buyer-relevant proof
and complete content, and unpublish incomplete entries rather than invent replacements (D-039
narrows D-027).

## K-039 · Clients cannot message the owner from the portal
**Severity:** high · **Status:** **fixed 2026-10-10, not deployed or uploaded.** `support.php`
has a client branch: a `client` user lists, reads, starts and replies to tickets of their own
client only. The client id comes from the token, another client's ticket answers 404, and
clients cannot set status, priority or assignee. The portal has a Messages area
(`tests/server/support-client.test.ts`, 22 isolation tests with two synthetic clients, 8 of
which failed on the old code; `cf534cf`). `support.php` is now security-critical like
`portal.php` (`docs/SECURITY.md` section 3). Private feedback with publication consent is
still open. The original finding follows.

The portal aggregates projects, invoices and tickets, but Comms is staff-only and
`server/support.php` requires STAFF for creating a ticket and replying, with no client branch.
`server/testimonials.php` requires editors, so a client cannot leave feedback either. Do not
promise client messaging, assets or approvals until they are delivered and isolation is shown.
Resolution: an ownership-checked client branch in `support.php`, and private feedback with a
separate publication consent (`docs/PRODUCT-SPEC.md` sections 6.2 and 6.3).

## K-040 · `stored` is a MySQL 8 reserved word, so the schema failed on MySQL
**Severity:** high · **Status:** **fixed 2026-10-10, not uploaded.**

The `files` table has a column named `stored`, which is a reserved word in MySQL 8 but not in
MariaDB. `server/schema.sql` therefore failed to install on MySQL, and `files.php` queries
would fail there. Found by the new CI server-test job (K-035). Fix: the column name is quoted
with backticks in `schema.sql` and `files.php`, which works on both engines (`9db80b2`).
`files.php` is in the upload set (`docs/DEPLOYMENT.md` section 5).

## K-041 · `npm audit` reports 15 affected packages, ten of them high
**Severity:** medium · **Status:** open. Owner decision.

`npm audit --json` on 2026-10-10 reported 15 affected packages: ten high, four moderate, one
low, none critical. The 2026-09-22 figure of seven findings is historical; advisory counts can
change without any code change. `xlsx` still has no automatic fix (K-017), and several
suggested fixes involve a Tailwind major upgrade, which must not be applied blindly.
Resolution: separate runtime exposure from development and build exposure, check each advisory
individually, and update compatible versions in small batches with a fresh build and test run
(`docs/DEPLOYMENT.md` section 2, "Release policy"). Never `npm audit fix --force`.

## K-042 · The Google Fonts `@import` still blocks rendering on public pages
**Severity:** low · **Status:** open.

Since the D-037 public rebuild (2026-10-10) the public surface sets Sofia Sans, self-hosted
from `@fontsource-variable/sofia-sans`. The `@import` at the top of `src/index.css` now loads
only Newsreader, Manrope and JetBrains Mono, which the public pages do not use (Manrope is only
Sofia Sans's fallback). It is still in the one shared stylesheet, so every public page waits
for it. Lighthouse 12.8.2, mobile, against the production build served by `vite preview` on
2026-10-10: render-blocking resources, estimated saving 450 ms, on both `/` and `/contact`;
first contentful paint 2.1 s, performance 96. Fix: load those three families only for the CMS
(for example from the CMS layout), then measure CLS again, because the comment above the
`@import` records that moving fonts once raised CLS.

## K-043 · A static canonical in `index.html` conflicts with the per-route canonical
**Severity:** low · **Status:** open.

`index.html` declares `<link rel="canonical" href="https://gakinz.com/" />` and `Seo.tsx`
renders a per-route canonical as well. On any route other than `/` the page then carries two
different canonical URLs. Lighthouse 12.8.2, mobile, 2026-10-10, against the production build:
`/contact` scored SEO 92 with `Multiple conflicting URLs (https://gakinz.com/,
https://gakinz.com/contact)`; `/` scored 100 because both values agree there. Fix: remove the
static canonical from `index.html` or have `Seo.tsx` replace it, then re-run the audit on
several routes. Not caused by the D-037 rebuild.

