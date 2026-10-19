# Architecture

**Status:** current for `feat/redesign-2026` (stacked on PR #8) as at 2026-10-14, verified by
source inspection and a local build. Section 8 summarises what was built on 2026-10-10 and in
the D-046 redesign. Counts live in
`docs/STATUS.md` section 0. Runtime behaviour of the deployed system is **UNVERIFIED** from
this repository.

---

## 1. Shape

One Vite application and one PHP API, deployed into a single cPanel document root.

```
Browser (React 19 + TypeScript)
   |  fetch JSON, Bearer token in Authorization
   v
server/<resource>.php
   |  require __DIR__ . '/_bootstrap.php'
   v
_bootstrap.php   CORS, JSON helpers, require_auth(), audit()
   |  require config.php  (server only, never committed)
   v
mysqli prepared statements
   v
MySQL on the same host
```

The browser never opens a database connection. `package.json` carries no database driver.
Every data need becomes a PHP endpoint plus a call through `src/lib/api.ts`.

## 2. Client

| Concern | Where |
|---|---|
| Entry | `src/main.tsx`: hydrates a prerendered public page, renders everything else from scratch |
| Providers shared by browser and prerender | `src/AppRoot.tsx` |
| Routing | `src/routes/index.tsx`, `createBrowserRouter`; the public branch is `src/routes/public.tsx` |
| Prerender and sitemap | `src/entry-server.tsx`, `scripts/prerender.mjs`, `src/marketing/prerender-paths.ts`, `src/prerender/html.ts`, `src/prerender/head.ts`, `src/prerender/sitemap.ts` |
| API boundary | `src/lib/api.ts`, one exported group per resource over one `request()` helper |
| Auth state | `src/store/auth.store.ts` |
| Route guard | `src/app/RequireAuth.tsx` |
| Role map | `src/lib/access.ts` |
| CMS navigation | `src/components/app-sidebar.tsx`, seven groups (D-040) |
| Public surface | `src/marketing/` |
| Public design system (D-046) | `src/marketing/site.css`, `src/marketing/components/site-ui.tsx` |
| Public per-route metadata | `src/marketing/components/Seo.tsx` |
| CMS surface | `src/app/`, lazy modules in `src/app/modules/`, plus My account |
| CMS shell | `src/layouts/AppLayout.tsx` |
| Shared UI | `src/components/`, shadcn and Radix primitives under `src/components/ui/` |
| Tokens | `src/index.css`, `tailwind.config.js` |

### Code splitting

The public site is eager. The whole CMS tree, the auth pages and the shared proposal view are
lazy, loaded through the `lz()` helper in `src/routes/index.tsx`. A marketing visitor never
downloads the charts, calendar, editor, PDF or spreadsheet code.

`vite.config.ts` adds a `manualChunks` function on top of Rollup's default splitting. It cuts
exactly two chunks by hand and leaves everything else alone:

- **`vendor`**, holding React, React DOM, the router and the scheduler. Every route needs
  them anyway, so they become one long-cached request instead of several.
- **`icons`**, holding `lucide-react`. The package ships one module per glyph, which Rollup
  otherwise emitted as roughly thirty chunks of a few hundred bytes each, one HTTP request
  apiece.

Measured on the local build of 2026-09-22:

| Chunk | Raw | Note |
|---|---|---|
| `jspdf.es.min` | 386.06 kB | Lazy, CMS only |
| `card` | 384.85 kB | Lazy, CMS only |
| `vendor` | 284.16 kB | Hand-cut. Framework runtime |
| `csv` (xlsx) | 283.25 kB | Lazy, CMS only |
| `html2canvas.esm` | 201.04 kB | Lazy, CMS only |
| `index` (marketing entry) | 181.76 kB | Was 556.94 kB |
| `AppLayout` | 87.68 kB | Lazy |

`dist/` is 2.6 MB in total, down from 43 MB, and `public/` is 96 KB, down from 36.1 MB, after
35.92 MiB of unreferenced assets were removed. See `qa/PERFORMANCE-AUDIT.md` and
`docs/DECISIONS.md` D-032.

### Build-time prerender (K-043, K-052, K-053)

`npm run build` runs four steps: `tsc -b`, `vite build` (the browser bundle, `dist/`),
`vite build --ssr src/entry-server.tsx --outDir dist-ssr` (a Node renderer), then
`node scripts/prerender.mjs`. The last step:

1. reads `dist/index.html` as the template and adds a preload for the three Latin font files
   the first screen is set in;
2. writes `dist/app-shell.html`, the SPA shell: the default head, an empty `#root`, and the
   `<noscript>` notice;
3. renders every path in `prerenderPaths()` with `react-dom/server` `renderToString`, through a
   memory router over the same public route branch and the same providers as the browser, and
   writes `dist/<path>/index.html` (`/` overwrites `dist/index.html`);
4. moves the `<title>`, `<meta>` and `<link>` tags React writes at the start of the output into
   the head, in place of the defaults between `<!--seo:start-->` and `<!--seo:end-->` in
   `index.html`, so each page carries exactly one title and one canonical. JSON-LD stays where
   React rendered it, inside the page;
5. checks every page's head (`src/prerender/head.ts`): the canonical and `og:url` are the
   page's own URL, the Open Graph and Twitter titles and descriptions match the page's, and no
   two indexable pages share a title, a description or a canonical. Any problem fails the build;
6. writes `dist/sitemap.xml` (K-019): one `<url>` per indexable page, at the canonical URL read
   from its head, so the sitemap follows the canonicals' slash policy (none, except `/`).
   `<lastmod>` is a post's own date, and the build date (UTC) for every other page. There is
   no `public/sitemap.xml` any more, so nothing hand-written can drift;
7. deletes `dist-ssr/`.

The paths are `/`, `/work`, `/services`, `/pricing`, `/about`, `/resources`, `/contact`,
`/sectors`, `/privacy`, `/terms`, `/cookies`, and a detail page for every built-in project,
service and post: 30 pages on 2026-10-16. The CMS (`/app/*`), `/login`, `/set-password`,
`/p/:token` and `/verify/:id` are never prerendered.

**The build makes no network request.** Data hooks fetch only inside effects, which
`renderToString` never runs, and the script replaces `fetch` and `XMLHttpRequest` with
functions that throw, so a render-time fetch fails the build. A page is rendered from the
built-in content: `src/marketing/data/seed.ts` makes the blog and work hooks start from their
fallbacks during the prerender, and during the browser's first render over that markup, so
the two match.

In the browser, `#root` carries `data-prerendered="<path>"`. When that matches the address,
`main.tsx` calls `hydrateRoot` and React adopts the markup and the head tags; otherwise (the
shell, or a server that sent the wrong page) it calls `createRoot` and React replaces whatever
is there. After hydration the hooks fetch as before, and a CMS answer replaces the built-in
content. Anything that differs between the build and the visitor's first render has to wait
for hydration: the London clock renders empty and fills in (`useSyncExternalStore` with a
server snapshot, and an invisible `00:00` holds its width), the hero's reduced-motion pause is
read the same way, dates format in UTC, and the footer year is the build's until the next
render.

**Consequence: the HTML shows built-in content, not CMS content.** A crawler that does not run
JavaScript, and every visitor until the bundle has loaded and the CMS has answered, sees the
built-in projects, services, copy and posts. A record published, edited or withdrawn in the CMS
reaches the prerendered HTML only on the next build, and a record that exists only in the CMS
has no prerendered page: it is served the shell and renders in the browser, as every page did
before. Nor is it in the sitemap, which lists exactly the
prerendered pages. A built-in record withdrawn in the CMS stays in both until it is removed from
`src/marketing/data/`.

### Two visual surfaces, two token sets

Since D-046 (2026-10-14, not deployed) public pages render inside a `.gk-site` wrapper
(`PublicLayout.tsx`, which also marks `<html>` with `gk-site-root`). Its hex variables and
styles live in `src/marketing/site.css` and reach nothing outside the wrapper. The CMS keeps
the `:root` and `.dark` token sets (HSL, with `--os-` extras), is theme aware through
`next-themes`, and offers light and dark only; the sign-in pages follow the same theme. The
older `.gk-public` wrapper and `gk-force-light` remain only for the shared proposal page
(`ProposalView.tsx`). Neither surface's tokens reach the other. See `docs/DESIGN-SYSTEM.md`
sections 10 and 11.

## 3. Server

PHP files in `server/`, one per resource. Eleven are shared includes with no route of their own,
all denied to direct requests by `.htaccess` (K-013). `work.php` was added on 2026-09-22,
`_money.php` on 2026-10-10, `site.php` on 2026-10-14, `assets.php` and `_ics.php` on
2026-10-18, and `today.php`, `search.php`, `briefs.php`, `privacy.php`, `_like.php`,
`_retention.php`, `_time.php` and `_templates.php` on 2026-10-19.

| Include | Role |
|---|---|
| `_bootstrap.php` | CORS, `body()`, `ok()`, `fail()`, `str_field()`, `require_auth()`, `audit()`, opens `$conn` |
| `_smtp.php` | Built-in SMTP client, implicit SSL on 465 or STARTTLS on 587, AUTH LOGIN, `mail()` fallback |
| `_sms.php` | Twilio REST for SMS and WhatsApp |
| `_slack.php` | Slack incoming webhook, best effort, never throws |
| `_monitor.php` | HTTP status and TLS expiry check for the care plan |
| `_money.php` | The single VAT-inclusive payable-total calculation, used for payment providers (D-034) and for the manual payment check in `invoices.php` |
| `_ics.php` | RFC 5545 calendar file for a confirmed call, used by `bookings.php` |
| `_like.php` | Literal substring matching for `LIKE` with `!` as the escape, used by `search.php` |
| `_retention.php` | The read-only retention dry run, used by `privacy.php` and `cron.php job=retention_report` |
| `_time.php` | The time entry rules (minutes, description, billable, date) and the SQL 17 probe, loaded on first use by `time.php` and `support.php` |
| `_templates.php` | The five project templates as pure data, loaded on first use by the two template routes of `projects.php` |

Every routed endpoint follows the same shape: require the bootstrap, read
`$_SERVER['REQUEST_METHOD']` and `$_GET['action']`, call `require_auth($conn, ROLES)`, use
prepared statements, return JSON through `ok()` or `fail()`. Preflight `OPTIONS` returns 204
from the bootstrap before any endpoint code runs.

Per-endpoint role lists are local constants (`STAFF`, `ADMINS`, `EDITORS`, `MAIL_ROLES`,
`PAY_STAFF`, `ALL_STAFF`, `AUTHORS`). They are the security boundary. `src/lib/access.ts`
mirrors them for navigation only.

## 4. Request lifecycle

1. Apache or LiteSpeed serves the request. `server/.htaccess` serves a prerendered public
   page from its own `index.html` (`/work` and `/work/` both get `work/index.html`, with no
   redirect), lets real files and PHP through, and sends everything else to `app-shell.html`
   so React Router handles the path in the browser.
2. The `.htaccess` re-exposes the `Authorization` header into `HTTP_AUTHORIZATION`, because
   the CGI and FastCGI setup strips it. Without this every bearer check would fail with 401.
3. `_bootstrap.php` reflects the request origin only if it appears in `ALLOWED_ORIGINS`, sets
   the JSON content type, sends `X-Content-Type-Options: nosniff`, `Referrer-Policy:
   strict-origin-when-cross-origin` and `X-Frame-Options: DENY`, and short-circuits `OPTIONS`
   with 204.
4. `require_auth()` reads the bearer token, joins `auth_tokens` to `users`, rejects an expired
   token, a soft-deleted user or a non-active account, then enforces the role list.
5. The endpoint runs, and mutations call `audit()` to write to `audit_log`.

## 5. Two deployment tracks

This is the single most consequential fact about the architecture.

| Track | What moves | How | Trigger |
|---|---|---|---|
| Client | `dist/` only | GitHub Actions, FTP | CI passing on a push to `main` |
| Server | `server/*.php`, `.htaccess`, `schema.sql` | Manual upload | A person decides |

A change under `server/` is committed but not live. A schema change is written but not
applied. See `docs/DEPLOYMENT.md`.

## 6. External dependencies at runtime

| Dependency | Used by | Degrades to |
|---|---|---|
| OpenRouter | `ai.php`, every AI feature | 503, feature hidden |
| OpenWeather | `weather.php` | Widget hidden |
| SMTP mailbox | `_smtp.php`, `mail.php`, `comms.php`, `invoices.php`, `cron.php`, `auth.php` | PHP `mail()`, then a clear error |
| IMAP mailbox | `mail.php` | Inbox banner, compose still works |
| Twilio | `_sms.php`, `comms.php` | Button reports not configured |
| Stripe | `payments.php` | Manual mark as paid |
| PayPal | `payments.php` | Manual mark as paid |
| Google OAuth | `oauth.php` | SSO button hidden |
| GitHub | `github.php` | Dev Pipeline panel empty |
| Figma | `figma.php` | Preview button reports not configured |
| Slack | `_slack.php`, `slack.php` | Announcement still posts locally |
| Calendly | `book.php` | Booking call to action hidden |

**The two icon webfonts are gone.** `index.html` used to pull Bootstrap Icons from jsDelivr
and Boxicons from `cdn.boxicons.com` as render-blocking stylesheets, with no integrity
attribute and no local fallback, and between them they had zero usages. They were removed on
2026-09-22.

There is no third-party font request. Since D-046 both surfaces use Bricolage Grotesque,
Hanken Grotesk and JetBrains Mono, self-hosted from `@fontsource-variable` and imported in
`src/main.tsx`; the Google Fonts `@import` and its `preconnect` links are gone (K-042). Layout
shift after the change is not measured (K-045).

Everything else fails soft. Whether each really degrades as described at runtime is **NOT
TESTED**; the claim rests on source inspection of the 503 and empty-value paths.

## 7. What is deliberately not here

- No server-side rendering at request time. The site is a static build plus PHP endpoints;
  the public pages are prerendered once, at build time (section 2). Until 2026-10-16 there was
  no prerender at all, and a crawler that did not run JavaScript saw an empty document. It now
  sees each public page's content and metadata, as built. The CMS and the client-only routes
  (`/verify/:id`, a CMS-only record) still send an empty shell to such a crawler.
  `public/llms.txt` remains a hand-written summary.
- No service worker, no manifest. Not a Progressive Web App.
- No migration runner, no ORM, no Composer dependency. The PHP is dependency free by choice,
  including the SMTP and TOTP implementations.
- No staging environment. There is one production host.

## 8. As built, 2026-10-10

On the branches stacked into PR #8; none of it is deployed, and server parts need the upload in
`docs/DEPLOYMENT.md` section 5. Scope and acceptance are in `docs/PRODUCT-SPEC.md`.

| Area | Shape | Where |
|---|---|---|
| Navigation | Seven groups (Today, Enquiries, Clients, Projects, Money, Website, Settings), filtered per role by `canAccess`; an empty group is hidden; URLs unchanged | `app-sidebar.tsx`, `nav-main.tsx`, `global-search.tsx` |
| My account | `/app/account` for every role, client included: profile, two-factor, own sessions. Reuses the panels moved out of Platform | `src/app/modules/Account.tsx`, `src/app/components/AccountSecurity.tsx`, `auth.php` |
| Portal messages | The portal's Messages area calls `clientMessages` in `api.ts`, which hits the client branch of `support.php`; the client id comes from the token | `Portal.tsx`, `server/support.php` |
| Enquiry follow-ups | Next-action date, note and priority on `enquiries`; due and overdue marks on the board and a card on Today; degrades on an un-migrated database | `Leads.tsx`, `Dashboard.tsx`, `src/lib/format.ts`, `server/leads.php` |
| Payments | One payable-total calculation in `_money.php`; the webhook checks amount and currency and records events in `payment_events` | `server/payments.php`, `server/_money.php` |
| Public data | A successful CMS answer, empty included, decides what shows; the static fallback is used only on failure | `src/marketing/data/cmsResult.ts`, `blog.ts`, `work.ts` |
| Article format | A small parser for headings, lists, bold and safe links, rendered as React elements without raw HTML | `src/marketing/lib/articleFormat.ts`, `ResourceDetail.tsx` |
| Lock screen | Unlock revokes the previous token; a 401 from the login call no longer clears the session | `LockScreen.tsx`, `src/lib/session-revoke.ts`, `api.ts` |
| Public design | The public surface on D-037 (superseded by D-046, below) | `docs/DESIGN-SYSTEM.md` |
| Documentation check | `npm run docs:check` in CI: links, and the document-sync rule | `scripts/docs-check.mjs`, `.github/workflows/ci.yml` |

### The D-046 redesign, 2026-10-14

On `feat/redesign-2026`, stacked on PR #8; not merged or deployed, and the two server files
need SQL 7 and 8 and the upload in `docs/DEPLOYMENT.md` section 5.

| Area | Shape | Where |
|---|---|---|
| Public site | `.gk-site` styles; shared parts; projects and hero from Work with a built-in fallback; copy from Site content over built-in defaults | `src/marketing/site.css`, `components/site-ui.tsx`, `components/site-helpers.ts`, `data/showcase.ts`, `data/content.ts` |
| Homepage hero | Up to five published Work records in CMS order, each in its brand colour | `work.php?action=hero`, `showcase.ts` |
| Site content | One `site_content` row per section with a draft and a published copy; the public read returns published copy only | `server/site.php`, `src/app/modules/Site.tsx`, `siteContentModel.ts`, `siteContent` in `api.ts` |
| CMS shell and screens | Graphite sidebar in both themes, new header, `AuthFrame` sign-in pages, a page kit shared by every screen | `src/layouts/AppLayout.tsx`, `src/components/app-sidebar.tsx`, `src/app/components/AuthFrame.tsx`, `src/app/components/page-kit.tsx` |
| Enquiries | Drag and drop between stages, through the existing `move()` | `src/app/modules/Leads.tsx` |

### Client journeys, third batch, 2026-10-19

On the same branch (`029f867..bdca4aa`); not merged, deployed or uploaded. The server files
need SQL 17 and 18 and the upload in `docs/DEPLOYMENT.md` section 5.

| Area | Shape | Where |
|---|---|---|
| IT support time | Ticket time goes onto one standing project per client, found or made under row locks in one transaction; no new module | `server/support.php`, `server/_time.php`, `server/time.php`, `Support.tsx`, `Time.tsx`, `supportLink` in `deepLink.ts` |
| Portal shared files | A visibility flag on `files` and a client branch in `files.php`; one download path for every caller | `server/files.php`, `Files.tsx`, `src/app/components/PortalFiles.tsx`, `portalFiles` in `api.ts` |
| Project templates | Templates live only in PHP and reach the CMS through a route, so the two cannot drift | `server/projects.php`, `server/_templates.php`, `Projects.tsx`, `projectTemplateModel.ts` |
| Draft protection | One hook per page: `beforeunload`, the router's `useBlocker`, and a request-to-leave for dialogs, over a structural dirty check | `src/hooks/use-unsaved-guard.ts`, `src/lib/dirty-model.ts`, `src/lib/unsaved-guard-model.ts`, `src/components/unsaved-guard-dialog.tsx` |

### Client journeys, second batch, 2026-10-19

On the same branch (PR #21); not merged, deployed or uploaded. The server files need SQL 16
and the upload in `docs/DEPLOYMENT.md` section 5.

| Area | Shape | Where |
|---|---|---|
| Today | One read across six sources, each section run on its own and gated by the role constant of the endpoint that owns its data; items carry deep-link routes | `server/today.php`, `Dashboard.tsx`, `todayModel.ts`, `today` in `api.ts` |
| Record search | One read across five tables, gated per type the same way; debounced and aborted on the client, merged in type order | `server/search.php`, `server/_like.php`, `src/components/global-search.tsx`, `src/lib/recordSearchModel.ts`, `recordSearch` in `api.ts` |
| Brief and handoff | Two tables under the project in one staff endpoint; the handoff is a Markdown download built and redacted on the server | `server/briefs.php`, `src/app/components/ProjectBrief.tsx`, `projectBriefModel.ts`, `projectBriefs` in `api.ts` |
| Privacy tools | A JSON download and a read-only report; the report logic is a shared include so the command line can run it too | `server/privacy.php`, `server/_retention.php`, `server/cron.php`, `Platform.tsx`, `Clients.tsx`, `privacyToolsModel.ts`, `privacy` in `api.ts` |
| Deep links | Pure parsing and a nonce in the history state, so a link applies when it changes or is picked again, never on a re-render | `src/lib/deepLink.ts`, `src/hooks/use-reveal.ts`, Projects, Invoicing, Leads and Clients |
| Not on the server yet | One rule for telling a missing or un-migrated route from a real failure; `.htaccess` answers 404 for a missing `.php` | `src/lib/notAvailable.ts`, `server/.htaccess` |
| Recommendation blocks | Parsed in the article format and rendered as cards with no raw HTML | `src/marketing/lib/articleFormat.ts`, `src/marketing/components/ArticleBody.tsx` |

### Client journeys, 2026-10-18

On `feat/journeys-2026-10-18`, stacked on PR #20; pushed to origin, not merged, deployed or uploaded. The server
files need SQL 13 to 15 and the upload in `docs/DEPLOYMENT.md` section 5.

| Area | Shape | Where |
|---|---|---|
| Manual payment | A staff action that marks a sent invoice paid only when the amount equals the `_money.php` payable total | `server/invoices.php`, `Invoicing.tsx`, `paymentModel.ts` |
| Acceptance evidence | Evidence and a SHA-256 terms fingerprint stored in the same atomic accept; money in integer pence | `server/proposals.php`, `Proposals.tsx`, `acceptanceModel.ts`, `ProposalView.tsx` |
| Portal requests | Update requests are tickets and call requests are `requested` bookings, both from the token's client; no new table | `server/support.php`, `server/bookings.php`, `src/app/components/PortalRequests.tsx`, `portalRequestsModel.ts`, `portalRequests` in `api.ts` |
| Asset checklist | One `project_assets` row per item, staff and client routes in one file | `server/assets.php`, `src/app/components/AssetChecklist.tsx`, `assetChecklistModel.ts`, `projectAssets` in `api.ts` |
| Calendar file | A non-JSON response built by a shared include and downloaded through `api.download`, which checks the content type | `server/_ics.php`, `server/bookings.php`, `CallBookings.tsx`, `PortalRequests.tsx` |
| Component exports | Variants, the sidebar context and SEO constants live in their own modules so component files export components only | `src/components/ui/badge-variants.ts`, `button-variants.ts`, `sidebar-context.ts`, `src/marketing/components/seo-schema.ts` |
