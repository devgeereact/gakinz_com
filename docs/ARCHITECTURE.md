# Architecture

**Status:** current, verified by source inspection and a local build on 2026-09-22 against
`feat/public-relaunch`, on top of `539b704`. Runtime behaviour of the deployed system is
**UNVERIFIED** from this repository.

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
| Entry | `src/main.tsx` |
| Routing | `src/routes/index.tsx`, `createBrowserRouter` |
| API boundary | `src/lib/api.ts`, 36 exported groups over one `request()` helper |
| Auth state | `src/store/auth.store.ts` |
| Route guard | `src/app/RequireAuth.tsx` |
| Role map | `src/lib/access.ts` |
| Public surface | `src/marketing/` |
| Public design primitives | `src/marketing/components/primitives.tsx` |
| Public per-route metadata | `src/marketing/components/Seo.tsx` |
| CMS surface | `src/app/`, 24 lazy modules |
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

### Two visual surfaces, two token sets

This changed on 2026-09-22 and the old one-token-set statement no longer holds.

Public pages render inside a `.gk-public` wrapper, which now declares **its own palette** and
remaps the shadcn tokens to it, so a shared component rendered inside the wrapper inherits
the public colours. `PublicLayout` and `Login` add `gk-force-light` to `<html>` so the public
surface never washes out when the CMS has left `html.dark` on. The CMS keeps the `:root` and
`.dark` token sets, is theme aware, and honours `next-themes`. Neither surface's tokens reach
the other. See `docs/DESIGN-SYSTEM.md`.

## 3. Server

45 PHP files in `server/`. Five are shared includes with no route of their own. The
forty-fifth routed file is `work.php`, added on 2026-09-22.

| Include | Role |
|---|---|
| `_bootstrap.php` | CORS, `body()`, `ok()`, `fail()`, `str_field()`, `require_auth()`, `audit()`, opens `$conn` |
| `_smtp.php` | Built-in SMTP client, implicit SSL on 465 or STARTTLS on 587, AUTH LOGIN, `mail()` fallback |
| `_sms.php` | Twilio REST for SMS and WhatsApp |
| `_slack.php` | Slack incoming webhook, best effort, never throws |
| `_monitor.php` | HTTP status and TLS expiry check for the care plan |

Every routed endpoint follows the same shape: require the bootstrap, read
`$_SERVER['REQUEST_METHOD']` and `$_GET['action']`, call `require_auth($conn, ROLES)`, use
prepared statements, return JSON through `ok()` or `fail()`. Preflight `OPTIONS` returns 204
from the bootstrap before any endpoint code runs.

Per-endpoint role lists are local constants (`STAFF`, `ADMINS`, `EDITORS`, `MAIL_ROLES`,
`PAY_STAFF`, `ALL_STAFF`, `AUTHORS`). They are the security boundary. `src/lib/access.ts`
mirrors them for navigation only.

## 4. Request lifecycle

1. Apache or LiteSpeed serves the request. `server/.htaccess` lets real files and PHP through
   and sends everything else to `index.html` so React Router handles the path.
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
| Client | `dist/` only | GitHub Actions, FTP | Push to `main` |
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
| Google Fonts | `src/index.css` `@import` | Falls back to the declared local stacks. Text still renders |

**The two icon webfonts are gone.** `index.html` used to pull Bootstrap Icons from jsDelivr
and Boxicons from `cdn.boxicons.com` as render-blocking stylesheets, with no integrity
attribute and no local fallback, and between them they had zero usages. They were removed on
2026-09-22.

The Google Fonts stylesheet is now the public site's only third-party render dependency, and
unlike the icon fonts it degrades: each family names a local fallback stack, so a blocked or
slow Google Fonts request costs the typography, not the content.

Everything else fails soft. Whether each really degrades as described at runtime is **NOT
TESTED**; the claim rests on source inspection of the 503 and empty-value paths.

## 7. What is deliberately not here

- No server-side rendering and no prerender step. The site is a static build plus PHP
  endpoints. This has a consequence worth stating in the architecture rather than only in the
  SEO notes: **a crawler that does not execute JavaScript sees an empty document.** Per-route
  metadata is declared in React and hoisted into the head at runtime by React 19
  (`src/marketing/components/Seo.tsx`, and `docs/DECISIONS.md` D-026), which works for
  Googlebot and not for most social scrapers or LLM crawlers. `public/llms.txt` is a
  hand-written mitigation, not a fix.
- No service worker, no manifest. Not a Progressive Web App.
- No migration runner, no ORM, no Composer dependency. The PHP is dependency free by choice,
  including the SMTP and TOTP implementations.
- No staging environment. There is one production host.
