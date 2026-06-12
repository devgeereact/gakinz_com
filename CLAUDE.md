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
   (out/in/note), AI reply draft via `ai.php`. No external provider — messages are RECORDED, not
   sent (a real email/SMS send is the only thing still deferred). ⚠️ NEEDS DEPLOY: upload
   `server/comms.php` and run the two new `CREATE TABLE` statements on the live DB; until then the
   module shows a graceful "comms.php not uploaded" banner. UI + graceful-degradation verified
   in-browser; `tsc -b` + `vite build` clean. `ModuleStub.tsx` is now unused (all modules live).
   Stray demo pages (Documentation, JobCards, LandingPage, SpinnerExamples) still say "Pulse" — low priority.
4. AI features via `ai.php` (wired in Dashboard brief + Leads/Proposals/Support AiAssist); payments manual;
   settings/admin/audit live in Platform module.
