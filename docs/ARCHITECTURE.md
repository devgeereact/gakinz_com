# Architecture

**Status:** current, verified by source inspection and a local build on 2026-09-04 against
`chore/gee-os-adoption` at `065a234`. Runtime behaviour of the deployed system is
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
| API boundary | `src/lib/api.ts`, 34 exported groups over one `request()` helper |
| Auth state | `src/store/auth.store.ts` |
| Route guard | `src/app/RequireAuth.tsx` |
| Role map | `src/lib/access.ts` |
| Public surface | `src/marketing/` |
| CMS surface | `src/app/` |
| CMS shell | `src/layouts/AppLayout.tsx` |
| Shared UI | `src/components/`, shadcn and Radix primitives under `src/components/ui/` |
| Tokens | `src/index.css`, `tailwind.config.js` |

### Code splitting

The public site is eager. The whole CMS tree, the auth pages and the shared proposal view are
lazy, loaded through the `lz()` helper in `src/routes/index.tsx`. A marketing visitor never
downloads the charts, calendar, editor, PDF or spreadsheet code.

Measured on the local build of 2026-09-04:

| Chunk | Raw | Gzip |
|---|---|---|
| `index` (marketing entry) | 556.94 kB | 173.79 kB |
| `jspdf.es.min` | 386.00 kB | 124.94 kB |
| `card` | 384.82 kB | 105.84 kB |
| `csv` (xlsx) | 283.25 kB | 94.21 kB |
| `html2canvas.esm` | 201.04 kB | 47.07 kB |
| `AppLayout` | 92.46 kB | 26.93 kB |

Vite warns that chunks exceed 500 kB. The heavy libraries are already lazy. The entry chunk is
the one over the line. See `qa/PERFORMANCE-AUDIT.md`.

### Two visual surfaces, one token set

Public pages render inside a `.gk-public` wrapper that redeclares the light palette, and
`PublicLayout` and `Login` add `gk-force-light` to `<html>`. The CMS is theme aware and honours
`next-themes`. See `docs/DESIGN-SYSTEM.md`.

## 3. Server

44 PHP files in `server/`. Five are shared includes with no route of their own.

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
   the JSON content type, and short-circuits `OPTIONS` with 204.
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
| jsDelivr and Boxicons CDN | `index.html` icon fonts | No fallback. Render depends on two third-party hosts |

The last row is the only hard external dependency of the public site. Everything else fails
soft. Whether each really degrades as described at runtime is **NOT TESTED**; the claim rests
on source inspection of the 503 and empty-value paths.

## 7. What is deliberately not here

- No server-side rendering. The site is a static build plus PHP endpoints.
- No service worker, no manifest. Not a Progressive Web App.
- No migration runner, no ORM, no Composer dependency. The PHP is dependency free by choice,
  including the SMTP and TOTP implementations.
- No staging environment. There is one production host.
