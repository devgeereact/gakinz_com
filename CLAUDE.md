# CLAUDE.md — GAkinz (gakinz.com)

> **Project memory for Claude Code.** Read this fully before doing any work on this project.
> This is a reusable template: copy it into each new project's repo root and fill in §1.
> The full one-time setup steps live in the separate **PROJECT-SETUP-GUIDE**.

---

## 1. Project-specific values — FILL THESE IN

| Item | Value |
|---|---|
| Project / repo | `devgeereact/gakinz_com` |
| Domain | `gakinz.com` |
| Document root | `/home/<cpanel_user>/gakinz.com` |
| Database name | `devgeereact_gakinz_com` (cPanel-prefixed; password lives only in server `config.php`) |
| Database user | `devgeereact_gakinz_com` (same as DB name; password lives only in server `config.php`) |
| Database host | `localhost` |
| Deploy branch | `main` |
| FTP username | `gakinz_com@gakinz.com` (FTP account scoped to the gakinz folder; in GitHub repo Secrets) |

---

## 2. Shared hosting infrastructure (same for every project on this account)

| Item | Value |
|---|---|
| Hosting | Namecheap shared hosting (cPanel) |
| cPanel account | `<cpanel_user>` |
| Home directory | `/home/<cpanel_user>` |
| Server IP | `<server_ip>` |
| DNS provider | Cloudflare — records set to **DNS only (grey cloud)** |
| FTP server | `<server_ip>` |

> Credentials are NEVER stored in this repo. The DB password lives only in `config.php` on the server; FTP credentials live only in GitHub repo Secrets.

---

## 3. What this project is

A **React (Vite) single-page app** hosted on Namecheap shared hosting (cPanel), served at the domain above. It reads/writes a **MySQL database** on the same server through a small **PHP API** (`api.php`). Deployment is **automatic**: pushing to the deploy branch triggers a GitHub Actions workflow that builds the app and uploads it via FTP.

---

## 4. Architecture & data flow

```
Browser (React)
   │  fetch() → JSON
   ▼
api.php  (PHP, on the server)
   │  mysqli, host = localhost
   ▼
MySQL database (cPanel)
```

- **React runs in the browser and NEVER connects to MySQL directly.** It only calls `api.php` over HTTP and receives JSON.
- `api.php` is the only thing that touches the database, using credentials from `config.php`.
- The React build (static files) and the PHP files live together in the document root.

---

## 5. Tech stack

- **Frontend:** React 18 + Vite (JavaScript)
- **API:** PHP with `mysqli` + prepared statements, returns JSON
- **Database:** MySQL (cPanel → phpMyAdmin)
- **DNS:** Cloudflare (DNS only / grey cloud)
- **CI/CD:** GitHub Actions → FTP deploy (`SamKirkland/FTP-Deploy-Action`)

---

## 6. Key files & where they live

**In the repo (version-controlled, auto-deployed on push):**
- `src/` — React app source
- `index.html`, `vite.config.js`, `package.json`, `package-lock.json` — Vite project
- `.github/workflows/deploy.yml` — the auto-deploy workflow
- `.gitignore` — must exclude `node_modules/`, `dist/`, and `config.php`

**On the server only (placed by hand once, NOT in the repo, NOT touched by deploys):**
- `config.php` — DB credentials
- `api.php` — the API endpoints
- `.htaccess` — SPA routing (`RewriteBase /`)

Deploys upload **only the `dist/` build**, so the three server files are never disturbed.

---

## 7. Golden rules (do not break these)

1. **Never commit `config.php` or any password.** It's gitignored. DB creds live only in `config.php` on the server.
2. **React never connects to MySQL directly.** Any data need = add/extend a PHP endpoint, then `fetch` it.
3. **Always use the `API_BASE` pattern** so dev and production both work:
   ```js
   // dev → hit the live API (CORS enabled in api.php); production → relative (same domain)
   const API_BASE = import.meta.env.DEV ? "https://<domain.com>" : "";
   fetch(`${API_BASE}/api.php`)
   ```
4. **Deploys upload only `dist/`.** `config.php`/`api.php`/`.htaccess` are managed by hand on the server.
5. **Cloudflare records stay grey-cloud (DNS only)** so cPanel can issue SSL.
6. **Don't manually FTP files.** `git push` is the deploy.

---

## 8. Local development

```bash
npm install      # first time only
npm run dev      # http://localhost:5173, hot reload
```
`fetch` calls hit the live API at the project's domain (no PHP/MySQL on the laptop). Edit components in `src/`.

---

## 9. Build & deploy

- **Build:** `npm run build` → `dist/`.
- **Deploy:** `git push` to the deploy branch. GitHub Actions runs `npm ci` → `npm run build` → FTP-uploads `dist/`. Watch the repo's **Actions** tab; live in ~1–2 minutes.

Everyday loop:
```bash
git add . && git commit -m "..." && git push   # → live
```

---

## 10. Database & adding features

- Managed in cPanel → phpMyAdmin, on the database named in §1.
- To add a feature with data:
  1. Create the table(s) in phpMyAdmin.
  2. Add an endpoint in `api.php` — read `$_SERVER['REQUEST_METHOD']`, use **prepared statements**, `echo json_encode(...)`. For a separate resource, create another PHP file (e.g. `products.php`).
  3. `fetch` it from React using `API_BASE`.
- `api.php` begins with `require 'config.php';`, which provides `$conn` (a `mysqli` connection).

---

## 11. Troubleshooting

- **Site 404 / wrong content:** Cloudflare record may be orange-cloud (set grey) or wrong IP. Hard refresh / incognito for cache.
- **`api.php` "Database connection failed":** wrong creds in `config.php`, or user lacks privileges.
- **`api.php` errors on GET:** the queried table doesn't exist — create it in phpMyAdmin.
- **Deploy red X:** open the Actions run; `npm ci` fail → commit `package-lock.json`; FTP auth fail → check the three Secrets match the FTP account.
- **HTTPS warning:** SSL still issuing — use `http://` or run cPanel → SSL/TLS Status → Run AutoSSL.

---

## 12. What NOT to do

- Don't commit `config.php`, `node_modules/`, `dist/`, or any secret.
- Don't write database connection code in React.
- Don't manually FTP/upload the build — push instead.
- Don't switch Cloudflare to orange-cloud without proper SSL setup.
- Don't deploy into a subfolder — the site lives at the document root (`server-dir: ./`).

---

## 13. GAkinz build state & decisions

**What this is:** a corporate website + an internal management CMS (GAkinzOS), one Vite app,
one domain, one PHP API. Built per the developer kickoff brief; spec in `GAkinzOS.html`.

**Kit chosen:** Pulse UI (React 19 + Vite + Tailwind + shadcn/Radix). The admin kit
(`pulse-ui-react`) is the repo base; its marketing kit informed the public site. One Vite
toolchain → one `dist/` → existing FTP deploy. Ships the libs the CMS needs out of the box
(FullCalendar, Tiptap, ApexCharts/Recharts, TanStack Table, jsPDF, file-saver, zustand).

**Language:** TypeScript. The kit is TS; rewriting to JS would discard its value. Builds to
the same static `dist/` (`tsc -b && vite build`), so deploy is unaffected. (Overrides the
"JavaScript" note in §5 for this project.)

**App structure (single Vite app, React Router):**
- Public corporate site at `/` — `src/marketing/` (PublicLayout + pages + data in `data/site.ts`).
  Routes: `/ about services services/:slug sectors work resources resources/:slug contact
  privacy terms cookies verify/:id smoke`. Always rendered in the light brand theme via the
  `.gk-public` wrapper class (ignores OS dark mode); marketing entrance uses CSS `.gk-fadein`
  (visible by default — never JS-gated).
- `/login` → kit `LoginPage` (AuthLayout).
- CMS at `/app/*` → kit `AppLayout` + dashboards (still demo content; to become GAkinzOS modules).

**Brand theme:** violet `#6e56cf` / lavender-white `#f5f5ff` / navy ink `#2a2a4a` (dark: violet
`#a48fff` on `#0f0f1a`). Supplied as a hex palette; converted to shadcn HSL triplets in
`src/index.css` (`:root` + `.dark` + `.gk-public`) because the kit is Tailwind v3 and references
`hsl(var(--token))` — raw hex would break those. Fonts: Inter (sans) + Georgia (serif headings) +
JetBrains Mono, set in `tailwind.config.js`. NOTE: the active Tailwind config is
`tailwind.config.js` (Tailwind picks `.js` over the near-empty `.ts`).

**PHP API — `server/` (version-controlled, NOT auto-deployed; uploaded to the doc root by hand):**
`api.php` (items smoke test), `contact.php` (enquiry → `enquiries`), `ai.php` (OpenRouter proxy,
key server-side only), `verify.php` (public cert check), `_bootstrap.php` (CORS + JSON helpers),
`config.php.example` (copy → `config.php` on server; gitignored), `schema.sql`, `.htaccess`
(SPA routing). Deploy uploads only `dist/`, so these are never disturbed. See `server/README.md`.

**Integrations:** OpenRouter wired (`ai.php`). Stripe → manual "mark as paid". Resend → in-app
only. Add keys to server `config.php` to enable more later.

**Done (foundation):** kit merged + themed; full multi-page public site with real copy, dropdown
nav, full footer; `/login` + `/app` mounted; PHP API + smoke test; clean `tsc`+`vite` build;
verified in browser.

**Public site remodel (done):** rebuilt every public page from the official company docs
(Website Copy, Brand Guidelines, Services & Pricing, Capabilities Overview). New brand palette
scoped to `.gk-public` — violet `#8b5cf6` primary, indigo-ink `#312e81` text, white bg — with
Roboto (body) / Playfair Display (headings) / Fira Code (mono); the CMS keeps its own theme.
Added a full `/pricing` page (packages, add-ons, included, payment terms, FAQs); enriched
About, Services, Sectors, Work, Contact, Resources, ServiceDetail. Content lives in
`src/marketing/data/site.ts`.

**Next (CMS phase), in order:**
1. ~~**Code-split**~~ — DONE. The whole `/app` CMS tree is lazy (`lz()` in `src/routes/index.tsx`);
   the auth + error subtree is lazy too. Marketing entry chunk is ~539 kB (169 kB gzip); charts,
   calendar, tables, pdf each load on demand.
2. **Auth + 7 roles** — built. Server: `auth.php` (login/me/logout/forgot/reset, seed
   super-admin), `_bootstrap.php` `require_auth($conn, $roles)` (token + role, 401/403, audit),
   each endpoint defines its own `STAFF`/`ADMINS` list. Client: `src/lib/access.ts` mirrors
   those lists; `RequireAuth` role-gates routes; sidebar filters by role; logout wired.
   Matrix verified 13/13 vs server, `tsc -b` clean. ✅ DEPLOYED & LIVE — `server/*.php` + `schema.sql`
   are on the live DB; real login confirmed (`dev@gakinz.com` / `Testing123!` → super_admin token,
   `auth.me`/`leads.php`/etc. all 200). The DB is near-empty (1 lead, no clients/projects/invoices yet).
3. **GAkinzOS modules** — DONE. All 10 operational modules (Leads, Clients, Projects, Proposals,
   Invoicing, Portal, Time, Support, Analytics, Platform) are built in `src/app/modules/*` and wired
   to the live API via `src/lib/api.ts` (no mock data). Demo Pulse `AnalyticsDashboard` retired as the
   `/app` home: the index route + sidebar "Dashboard" now point at `src/app/modules/Dashboard.tsx` —
   a live GAkinzOS overview (KPI cards, lead pipeline, paid-revenue area chart, recent leads, studio
   snapshot, AI morning brief via `ai.php`). `analytics` route promoted from stub to
   `src/app/modules/Analytics.tsx` (revenue paid-vs-outstanding, win rate, avg invoice, project mix,
   billable utilisation by week). Both verified in-browser against the live API; `tsc -b` + `vite build` clean.
   `comms` (Communication Hub) — BUILT (`src/app/modules/Comms.tsx` + `server/comms.php` +
   `comm_threads`/`comm_messages` in `schema.sql`). Internal conversation log: threads tied to a
   client/project, messages tagged by channel (email/call/meeting/client/internal) and direction
   (out/in/note), AI reply draft via `ai.php`. Most messages are RECORDED, not sent (the studio
   conversation log). EXCEPTION — real send is now wired: `comms.php?action=send` delivers a real
   email to the linked client on an email thread (via shared `server/_smtp.php`) and records it as
   an `out` message; the UI shows a "Send email" button on email threads that have a client with an
   address (`comms.sendEmail` in `api.ts`). SMS is still the only deferred channel. ✅ DEPLOYED &
   LIVE — `comms.php` + `comm_threads`/`comm_messages` are on the live DB; module verified
   in-browser against the live API (loads, no banner). ⚠️ NEEDS RE-DEPLOY for the send feature:
   upload the new `server/_smtp.php` + updated `server/comms.php`. `tsc -b` + `vite build` clean.
   `ModuleStub.tsx` deleted (all modules live). Stray Pulse demo pages rebranded to GAkinz
   (Documentation, JobCards, LandingPage); they remain orphan URL-only routes (not in sidebar).
   `mailbox` (Mailbox) — BUILT (`src/app/modules/Mailbox.tsx` + `server/mail.php`). REAL email now:
   SMTP send (tiny built-in PHP SMTP client — no Composer; SSL 465 / STARTTLS 587, AUTH LOGIN) +
   IMAP inbox (PHP `imap` ext) so senior staff (super_admin/admin/manager — `MAIL_ROLES`, mirrored in
   `access.ts`) read and reply to hello@gakinz.com in-app. Two-pane: inbox list + reading/compose pane,
   AI reply draft via `ai.php`. Config in `config.php` as `$SMTP_*`/`$IMAP_*` (host
   premium152.web-hosting.com, port 465 ssl / 993 ssl; password server-only). Degrades gracefully:
   banners when SMTP/IMAP/imap-ext missing. ✅ DEPLOYED & LIVE — `mail.php` uploaded, mail vars set,
   PHP `imap` ext enabled; verified end-to-end in-browser against the live mailbox (real IMAP inbox
   lists, message read marks seen, reply composer works). The SMTP transport has been refactored out
   into shared `server/_smtp.php` (so Comms can reuse it) — `mail.php` now calls `gk_send_email()`;
   behaviour is byte-identical. ⚠️ NEEDS RE-DEPLOY: upload new `server/_smtp.php` + updated
   `server/mail.php`. `tsc -b` + `vite build` clean.

   **Premium UI redesign (DONE):** whole product re-skinned to one cohesive design language. Public site
   (`.gk-public` layer in `src/index.css`): aurora/grid backdrops, gradient text, `gk-card`/`gk-ring`/
   `gk-glass`/`gk-shine`, trust marquee, `CtaBand` — applied across all marketing pages + Login. CMS
   (theme-aware layer, light+dark): `gk-app-grad` titles, `gk-app-card` (lift), `gk-app-chip` (gradient
   icon), `gk-app-ring`, `gk-app-accent` — applied to Dashboard, Analytics, Mailbox + gradient page
   titles on every module.
4. AI features via `ai.php` (wired in Dashboard brief + Leads/Proposals/Support AiAssist + Mailbox draft);
   settings/admin/audit live in Platform module. SECURITY + LIMITS: `ai.php` is now `require_auth`-gated
   (was a public, unauthenticated OpenRouter proxy — anyone could burn the key) AND per-role daily-capped
   (super_admin/admin 1000, manager 400, editor 250, employee 150, else 50 — counted from `audit_log`
   `ai_call` rows since CURDATE(), 429 when exceeded). Every AI call already carries the Bearer token via
   the `api` wrapper, so gating is transparent.

**Phase-4 capabilities (DONE this session, gracefully degrade until keys/deploy):**
- **Comms real send** — `comms.php?action=send` delivers a real **email** (SMTP) or **SMS** (Twilio) to
  the linked client and records it as `out`. New `sms` channel added (client+server). UI: "Send email"/
  "Send SMS" button on email/sms threads with a client. Shared transports: `server/_smtp.php`,
  `server/_sms.php`. SMS needs `$TWILIO_*` in config.php.
- **Stripe payments** — `server/payments.php`: `action=link` (staff) creates a Checkout Session for an
  invoice total → hosted pay URL; `action=webhook` (public, HMAC-verified via `$STRIPE_WEBHOOK_SECRET`,
  5-min replay guard) marks the invoice paid on `checkout.session.completed`/`payment_intent.succeeded`
  (invoice id in session metadata — no schema change). UI: "Pay link" button in Invoicing + "Pay" button
  on outstanding portal invoices + outstanding-balance summary. Needs `$STRIPE_*` in config.php; point a
  Stripe webhook endpoint at `/payments.php?action=webhook`. Manual "mark paid" retained as fallback.
- No external integration is testable locally (no Twilio/Stripe keys); all degrade with clear 503s.

**Client-role portal auth (DONE this session):** a `client`-role login sees ONLY its own portal.
`users.client_id` binds the login to a client; `require_auth` (in `_bootstrap.php`) carries it;
`auth.php` login+me expose it; **`portal.php` derives the client_id from the token and ignores any
`?client_id` param for client-role callers** (the isolation guarantee — staff keep the preview param).
`users.php` provisions client accounts (create requires+validates `client_id`; role-change can't promote
into `client`). Client UI: Platform "Client" role reveals a required client picker; Portal auto-loads the
client's own data (no picker); `RequireAuth` bounces a client off staff modules to `/app/portal`.

**Tests (NEW):** Vitest added (`npm test` → `vitest run`). `src/lib/access.test.ts` covers the role-gating
logic (canAccess / moduleKeyForPath / defaultPathForRole) — 11 tests, the client-isolation rules asserted
explicitly. Build unaffected (`.test.ts` not bundled).

**A11y pass (DONE):** ran axe-core (wcag2a/2aa/21a/21aa) over the public site. Fixed: `.gk-pill` eyebrow
text contrast (was ~3.9:1 → darkened to `#6d28d9`, site-wide in `index.css`); Contact form select triggers
missing accessible names (added `aria-label`). 0 violations on home/contact/pricing. Perf: heavy chunks
(ApexCharts, calendar, pdf) already lazy-loaded — no critical perf issue.

**Server files awaiting (re)deploy from this session:** `_smtp.php` (NEW), `_sms.php` (NEW),
`payments.php` (NEW), `mail.php`, `comms.php`, `ai.php`, `auth.php`, `users.php`, `portal.php`,
`_bootstrap.php`. **ONE schema migration:** `ALTER TABLE users ADD COLUMN client_id INT NULL DEFAULT NULL
AFTER role;` (for client-role auth). New config keys (see `config.php.example`): `$TWILIO_SID/_TOKEN/_FROM`,
`$STRIPE_SECRET/_WEBHOOK_SECRET/_SUCCESS_URL/_CANCEL_URL`. Client changes ship via the normal `dist/`
deploy on push. Local checkpoints committed (not pushed) per [[commit-no-push]]: `205d93a` (Comms/Stripe/
AI), `4571280` (client auth), + tests/a11y.

**CEO cleanup + header fix (DONE this session):** stripped the entire leftover Pulse demo surface so only
the real product ships. Removed all demo routes from `src/routes/index.tsx` (eCommerce, components, icons,
charts, tables, forms, account, widgets, dashboard variants, docs, faq, calendar, chatbox, file-manager,
the auth/basic + auth/cover demo pages, error/* demo pages, and the public `/smoke` route). Deleted the
backing files: all `src/pages/*` demo subdirectories (kept only `ErrorPage.tsx` + `NotFound.tsx`), `src/auth/`,
`src/layouts/AuthLayout.tsx`, `src/marketing/pages/SmokeTest.tsx`, and unused demo components
(`appLauncher-dropdown`, `notification-dropdown`, `language-dropdown`, `theme-customizer`, `team-switcher`,
`nav-projects`). The CMS header (`AppLayout.tsx`) lost its dead quick-links (Pricing/Docs/Reports/Support),
the fake "5" notification badge, the demo app-launcher/notifications/language/theme-customizer. Sidebar nav
(`app-sidebar.tsx`) was already clean (13 role-gated GAkinzOS modules). `GlobalSearch` (Cmd/Ctrl+K) rewritten
to jump to the real role-gated modules (was navigating to dead `/crm`,`/billing`,… paths). `UserDropdown`
trimmed to Dashboard + Logout (Profile/Settings/Downloads/Earnings were dead). Removed demo routes now 404
correctly; build dropped ~40% (fewer chunks). Verified in-browser.

**Live weather + time (DONE):** added `ClockPill` (`src/app/components/ClockPill.tsx`) — a live ticking
local date/time in the header (client-side, always works). Weather: the live `weather.php` was a STALE
pre-`_bootstrap` version (its GET failed CORS — `net::ERR_FAILED`, OPTIONS 200 instead of 204 while every
other endpoint does 204). The repo `weather.php` is already correct (routes through `_bootstrap` → proper
CORS allowlist). FIX = re-upload `server/weather.php` AND set `OPENWEATHER_API_KEY` in live `config.php`
(WeatherPill stays hidden until both are done — by design).

**Partials closed + 5 MISSING-category modules built (this session):** All CEO-directed partials done
(VAT ex/inc on invoices+proposals, proposal accept → 40/30/30 invoice schedule, client LTV+history detail,
project 5-stage Discover/Design/Build/Launch/Support, timesheet draft/approved/rejected approval, XLSX
export everywhere via `src/lib/csv.ts` `downloadXlsx`, 3 named Analytics reports, Dashboard KPI sparklines,
session device tracking, full 400/403/404/500/503 ErrorPage). Demo `src/components/file-manager/` deleted.
Then the 5 MISSING categories shipped as real modules (no mock, graceful-degrade):
- **Design** (`Design.tsx` + `design.php` + `design_reviews`) — Figma review rounds, 2-round limit, sign-off.
- **Dev Pipeline** (`DevPipeline.tsx` + `dev.php` + `project_dev`/`deploys`) — repo/env URLs, build checklist, deploy log.
- **Resourcing** (`Resourcing.tsx` + `resourcing.php` + `leave_entries`) — live weekly capacity from time + leave tracking.
- **Contracts** (`Contracts.tsx` + `contracts.php` + `contracts`) — template merge, typed-name e-sign + audit (name/ip/at), NDA triage, PDF.
- **Knowledge** (`Knowledge.tsx` + `knowledge.php` + `kb_articles`) — SOP/wiki, search, categories, audience.
All wired in `routes/index.tsx`, `app-sidebar.tsx`, `global-search.tsx`, `access.ts` (new module keys
design/devpipeline/resourcing/contracts/knowledge) + `api.ts`. `tsc -b` + `vite build` + 11/11 tests + `php -l` clean.
⚠️ DEPLOY: client ships via `dist/` push; server NEEDS hand-upload of NEW `design.php dev.php resourcing.php
contracts.php knowledge.php` + updated `_bootstrap.php auth.php clients.php invoices.php proposals.php
projects.php time.php portal.php`, plus ALL migrations at foot of `schema.sql` (VAT, stage, time.status,
auth_tokens device cols, + 6 new tables). Every endpoint degrades gracefully pre-migration.

**Carry-forward areas built (Finance · Files · Collaboration · Auth) — this session:**
- **Finance:** `cost_rate` on users (Platform → Team inline edit, admins); `reports.php?report=profitability`
  (revenue from paid invoices inc VAT vs cost from time×cost_rate → margin) surfaced as a 4th Analytics report;
  `invoices.php?action=chase` emails an overdue reminder via `_smtp` + a "work-pause" banner listing clients
  with overdue invoices.
- **Files & Documents:** real per-project/client storage — `files.php` (multipart upload to `server/uploads/`
  [gitignored, auto-`.htaccess` deny], auth download stream, expiring public share token, soft delete) +
  `files` table + `Files.tsx` (drag-drop, list, download-as-blob, copy share link, delete). Module key `files`
  wired in routes/sidebar/search/access (ALL_STAFF).
- **Collaboration:** derived **NotificationBell** in the app header (overdue invoices + open tickets, links to
  module; no table); **announcements** (`announcements.php` + table) — managers+ post in Platform →
  Announcements, everyone sees top 3 on the Dashboard.
- **Auth hardening:** **TOTP 2FA** (no library) — `users.totp_secret/totp_enabled`; `auth.php` `twofa_setup`
  /`twofa_enable`/`twofa_disable` + login gate (`two_factor_required` flag → Login shows a code step);
  Platform → Security self-enroll (shows secret + otpauth link). **Google SSO** — `oauth.php` (status/start/
  callback, code→id_token→match existing active user→token in `#sso_token`); Login shows "Continue with
  Google" only when `oauth.php?action=status` reports configured. SSO needs `$GOOGLE_*`/`$APP_URL` in config.
⚠️ DEPLOY: client via `dist/` push; server hand-upload NEW `reports.php files.php announcements.php oauth.php`
+ updated `_bootstrap.php auth.php users.php invoices.php`; migrations at foot of `schema.sql` (users
cost_rate/totp_*, + `files`/`announcements` tables); create writable `server/uploads/`; optional `$GOOGLE_*`.
All degrade gracefully pre-migration / pre-config.

**Automation + monitoring + integrations hub (this session):**
- **Cron runner** `server/cron.php` (key-gated by `$CRON_KEY`, NOT user-auth) with jobs `chase` (email every
  overdue invoice), `billing` (raise this month's invoice for each `clients.retainer_amount>0` retainer client,
  idempotent per month), `uptime` (ping every `project_dev.prod_url`, store HTTP+SSL), `digest` (weekly KPI email
  to `$REPORT_RECIPIENTS`), `all`. cPanel cron: `wget -qO- "https://gakinz.com/cron.php?key=KEY&job=all"`.
- **Care-Plan module** (`CarePlan.tsx` + `careplan.php` + shared `_monitor.php` `gk_site_check` HTTP+SSL).
  Sites = projects with a prod URL; shows uptime, SSL days-left, care-plan MRR, on-demand "Check now". New
  module key `careplan` (manager+); `project_dev` gained `last_http_status/ssl_days_left/last_checked_at`.
- **Integrations hub** — `integrations.php` (admins) returns BOOLEANS only (smtp/imap/openrouter/stripe/twilio/
  google/openweather/cron/reports); Platform → Integrations tab renders connection status.
- `clients.retainer_amount` added (Clients form + detail; drives cron billing + Care-Plan MRR).
- New config keys: `$CRON_KEY`, `$REPORT_RECIPIENTS` (see config.php.example).
⚠️ DEPLOY: client via `dist/` push; server hand-upload NEW `cron.php careplan.php integrations.php _monitor.php`
+ updated `clients.php`; migrations at foot of `schema.sql` (clients.retainer_amount, project_dev monitor cols);
set `$CRON_KEY`/`$REPORT_RECIPIENTS` + add the cPanel cron entry. All degrade gracefully pre-config.

**External connectors (this session) — token/webhook/URL based, degrade-until-keyed:**
- **GitHub** (`github.php`, PAT optional via `$GITHUB_TOKEN` — public repos work tokenless) → Dev Pipeline shows
  recent commits, open PRs and the latest Actions/CI run for a project's repo URL (auto-loads when repo is a
  github.com URL).
- **Figma** (`figma.php`, needs `$FIGMA_TOKEN`) → Design module "Preview" button resolves a review's Figma URL
  to its name + thumbnail + last-modified.
- **Slack** (`_slack.php` + `slack.php`, `$SLACK_WEBHOOK_URL`) → announcements broadcast to a channel; Platform →
  Integrations has a "Test" button. Best-effort (never blocks the announcement).
- **Calendly** (`book.php` public GET, `$CALENDLY_URL`) → "Book a discovery call" CTA on the public Contact page
  (hidden until configured).
- Integrations hub + `integrations.php` extended with github/figma/slack/calendly booleans.
⚠️ DEPLOY: client via `dist/` push; server hand-upload NEW `github.php figma.php slack.php _slack.php book.php`
+ updated `integrations.php announcements.php`; add optional keys `$GITHUB_TOKEN $FIGMA_TOKEN $SLACK_WEBHOOK_URL
$CALENDLY_URL`. No schema change.

**Still NOT built (need full OAuth apps + sandbox testing, not doable headless):** Xero / QuickBooks two-way
accounting sync; Google Drive / Box / Dropbox storage backends (local file storage exists); Zoom/Meet meeting
creation. Each is a net-new OAuth integration — provide a sandbox app + credentials to build one.

**Backlog batch B1 — CRM + sales depth (no external keys):**
- **Leads depth:** `enquiries` gained `tags`/`score`/`lost_reason`. Kanban board already existed; added a
  score badge (Cold/Warm/Hot), tag chips, a per-card Tags&score editor (`leads.php?action=meta`), and a
  lost-reason capture dialog when moving a lead to "lost" (`leads.php?action=status` now stores `lost_reason`).
- **Proposal sharing + view tracking:** `proposals` gained `share_token`/`views`/`last_viewed_at`.
  `proposals.php?action=share` issues a token; public `proposals.php?token=` returns a read-only proposal and
  records a view. New standalone public route `/p/:token` → `src/marketing/pages/ProposalView.tsx` (light theme,
  no auth). Proposals module: "Share"/"Copy link" button + a view count with last-viewed tooltip.
⚠️ DEPLOY: client via `dist/` push; server hand-upload updated `leads.php proposals.php`; migrations at foot of
`schema.sql` (enquiries tags/score/lost_reason, proposals share_token/views/last_viewed_at). No new tables.

**Keyed/auth batch (this session) — PayPal · WhatsApp · magic-link · invite · lock · 2FA recovery:**
- **PayPal** (`payments.php` `paypal_link`/`paypal_return`, Orders v2) — Invoicing "PayPal" button beside Stripe;
  capture on return marks the invoice paid (custom_id verified). Config `$PAYPAL_CLIENT_ID/_SECRET/_MODE`.
- **WhatsApp** (`_sms.php` `gk_send_whatsapp`, Twilio) — new `whatsapp` Comms channel; "Send WhatsApp" on
  whatsapp threads with a client. Config `$TWILIO_WHATSAPP_FROM` (reuses Twilio SID/token).
- **Magic-link login** (`auth.php` `magic_request`/`magic_consume` + `magic_links` table) — Login "Email me a
  sign-in link"; consumes `/login#magic=token`. Needs SMTP.
- **Team invite** (`users.php` `invite`) — creates the account + emails a 7-day set-password link; new
  standalone `/set-password` page (`SetPassword.tsx`). Platform → Team "Send invite" button.
- **Lock screen** (`LockScreen.tsx` in AppLayout) — 15-min idle overlay; unlock re-runs login (password + 2FA).
- **2FA recovery codes** (`users.totp_recovery`) — 10 codes issued on enable (shown once), consumed at login if
  the authenticator is lost, regenerate via `twofa_recodes`. Platform → Security shows/regenerates them.
- Integrations hub + `integrations.php` extended with paypal/whatsapp booleans.
⚠️ DEPLOY: client via `dist/` push; server hand-upload `payments.php _sms.php comms.php auth.php users.php
integrations.php`; migrations at foot of `schema.sql` (users.totp_recovery + `magic_links` table); optional config
`$PAYPAL_*`, `$TWILIO_WHATSAPP_FROM`. All degrade until keyed.
