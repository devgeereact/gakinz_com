# Status

**As at:** 2026-09-22, branch `feat/public-relaunch`, working tree on top of `539b704`. The
public relaunch, the work ledger and the server security work are all in the working tree and
are **not yet committed to `main`**.

**Method:** local test, build, lint and PHP syntax runs; axe-core, Lighthouse, contrast,
focus-indicator and reflow measurements taken in Chrome against the production build served
from `npm run preview`; source inspection for everything else. **No live server, database,
mailbox, payment provider or DNS record was contacted.**

This is the file that changes often. Anything about the deployed system is UNVERIFIED unless
someone with server access has checked it.

---

## 1. What changed on 2026-09-22

Three pieces of work landed together on this branch.

1. **The public surface was rebuilt** on a new design system, scoped to `.gk-public`. New
   palette, a nine-value type scale, three new families, a new set of primitives, per-route
   metadata, and the retirement of the lavender and rose accents along with the animated
   gradient, the aurora hero and the card idiom. GAkinzOS at `/app/*` keeps its own tokens
   and is untouched. See `docs/DESIGN-SYSTEM.md` and `docs/DECISIONS.md` D-023.
2. **The work ledger was added.** A new `work` table with a `work_images` child, a new
   `server/work.php`, a new public route `/work/:slug`, and a 24th CMS module. One record
   type carries four kinds of work. See section 5 below.
3. **Server security hardening and dead-weight removal.** Fourteen server files changed,
   35.92 MiB of unreferenced assets and 27 npm packages were removed. Every server change is
   committed to the branch and **none of it is uploaded**.

---

## 2. Verification baseline

Run locally on 2026-09-22 against this working tree.

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **PASS.** 1 file, 21 tests, 87 ms. Was 11 tests |
| Type check and build | `npm run build` | **PASS.** `tsc -b` clean |
| PHP syntax | `php -l` over 45 files in `server/` | **PASS.** No syntax errors. Was 44 files |
| Lint | `npm run lint` | **FAIL, but improved.** 47 errors, 2 warnings, 33 files. Baseline was 60 errors, 7 warnings, 42 files |

Lint breakdown, measured from the ESLint JSON report on 2026-09-22:

| Count | Severity | Rule |
|---|---|---|
| 37 | error | `react-hooks/set-state-in-effect` |
| 5 | error | `react-refresh/only-export-components` |
| 2 | error | `prefer-const` |
| 1 | error | `react-hooks/immutability` |
| 1 | error | `react-hooks/purity` |
| 1 | error | `@typescript-eslint/no-unused-expressions` |
| 1 | error | `react/no-danger`. "Definition for rule was not found" |
| 1 | warning | `react-hooks/exhaustive-deps` |
| 1 | warning | `unused-imports/no-unused-vars` |

Two errors are auto-fixable. The count fell by twelve and must not be allowed to rise again;
the backlog is a ratchet. See `docs/KNOWN-ISSUES.md`.

The `react/no-danger` entry is not a code problem in the usual sense. An
`eslint-disable-next-line react/no-danger` comment in `src/marketing/components/Seo.tsx`
names a rule that this project's ESLint configuration does not define, and ESLint reports
the unknown rule name as an error. Removing the comment removes the error.

## 3. Measured results, public surface only

Everything in this section was measured on 2026-09-22 against the production build
(`npm run build`) served locally by `npm run preview`, driven through the Chrome DevTools
protocol. None of it was measured against the deployed site, because no server was contacted.
The detail sits in `qa/ACCESSIBILITY-AUDIT.md` and `qa/PERFORMANCE-AUDIT.md`.

| Measurement | Result |
|---|---|
| axe-core 4.10.2 across 16 public routes | **PASS.** 0 violations |
| Lighthouse mobile, local production build | Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100. 54 audits passed, 0 failed |
| Contrast on rendered pixels | **PASS.** 28 distinct foreground, background and size combinations, 0 failures, lowest 4.91:1 |
| Focus indicators | **PASS.** 353 focusable elements across 13 routes, 0 failures, lowest ring contrast 14.46:1 |
| Reflow at 640x512, equivalent to 1280x1024 at 200 per cent | **PASS.** No horizontal scrolling on 8 routes |
| 390px viewport | **PASS.** No overflow, no target smaller than 24x24 |
| LCP and CLS on the home page | LCP 91 ms, CLS 0.00 |

**Two cautions on the numbers above, and they matter.**

The Lighthouse and Core Web Vitals figures come from a local preview with **no CPU throttling
and no network throttling**. They describe the build, not the experience of a real visitor on
a real connection. They are not a field measurement and must never be quoted as one.

The accessibility figures are automated. Automated tooling catches a specific and limited
class of problem. **A screen-reader pass with real assistive technology has not been run**, so
the area is PARTIAL, not PASS overall. `docs/DECISIONS.md` D-030 records this.

### Size, before and after

| Measure | Before | After |
|---|---|---|
| Entry chunk (`index`) | 556.94 kB | 181.76 kB |
| `dist/` total | 43 MB | 2.6 MB |
| `public/` total | 36.1 MB | 96 KB |
| Direct npm dependencies | 56 | 29 |

`vite.config.ts` now cuts two chunks by hand: a `vendor` chunk holding the React and router
runtime, and one `icons` chunk that replaces roughly thirty lucide micro-chunks of a few
hundred bytes each. `index.html` no longer loads two render-blocking icon webfonts from two
CDNs, which had zero usages between them.

### Dependency audit

`npm audit` reports 7 findings: 1 low, 3 moderate, 3 high. It was 33. Only `xlsx` is a direct
dependency, and it has no fix available.

## 4. Client, built and in the repository

| Area | State | Evidence |
|---|---|---|
| Public site, 16 routes under `PublicLayout` including the 404 | Built, rebuilt on the new design system | `src/routes/index.tsx`, `src/marketing/` |
| Public work detail, `/work/:slug` | Built. The one route this relaunch adds | `src/marketing/pages/WorkDetail.tsx` |
| Per-route metadata on every public page | Built | `src/marketing/components/Seo.tsx` |
| CMS, 24 module routes | Built | `src/app/modules/`, all wired into routes, sidebar, global search and `access.ts` |
| Work module, the 24th | Built | `src/app/modules/Work.tsx` |
| Authentication, 7 roles | Built | `src/app/Login.tsx`, `RequireAuth.tsx`, `src/lib/access.ts` |
| Two-factor, recovery codes | Built. Setup now requires a current code when 2FA is already on | `src/app/modules/Platform.tsx`, `server/auth.php` |
| Magic-link sign-in | Built | Login page |
| Invite and set-password | Built | `src/app/SetPassword.tsx` |
| Google SSO button | Built, shown only when the server reports it configured | `oauth.php?action=status` |
| Idle lock screen, 15 minutes | Built | `src/app/components/LockScreen.tsx` |
| Notification bell | Built, derived from overdue invoices and open tickets | `src/app/components/NotificationBell.tsx` |
| Code splitting | Built. Every CMS route is lazy, plus two hand-cut vendor chunks | `src/routes/index.tsx`, `vite.config.ts` |
| Public design system | Built | `src/index.css` `.gk-public` block, `tailwind.config.js` |
| CMS design system | Unchanged | `src/index.css` `:root` and `.dark` |

`src/lib/api.ts` now exports 36 groups over one `request()` helper.

### Access control

`src/lib/access.ts` changed in five ways, all of them narrowing:

- `work` added, matching `work.php`'s EDITORS list.
- `files` lost `trainer`, which the server list never held.
- `dashboard` narrowed, so `trainer` and `employee` now land on a module they can open
  instead of bouncing off the index.
- `portal` narrowed to match the server.
- **`canAccess` now fails closed.** An unmapped module key used to return `true`, which meant
  a route added without a `MODULE_ROLES` entry was reachable by every signed-in user, the
  `client` role included. A missing entry now hides the module. See D-028.

## 5. The work ledger

New, and the largest functional addition on this branch.

| Piece | Where | State |
|---|---|---|
| Tables `work` and `work_images` | `server/schema.sql`, at the foot | Written. **Not applied to any database** |
| Endpoint | `server/work.php` | Written, `php -l` clean. **Not uploaded.** Never exercised at runtime |
| Public route | `/work/:slug`, `src/marketing/pages/WorkDetail.tsx` | Built |
| Ledger component | `src/marketing/components/Ledger.tsx` | Built |
| Data layer | `src/marketing/data/work.ts` | Built. Reads the API with a typed static fallback |
| CMS module | `src/app/modules/Work.tsx` | Built, with all five client wirings |

One record type carries four kinds: `case_study`, `product`, `experiment` and `writing`. The
three ledger row labels change with the kind, so Problem, Built and Outcome become Question,
Made and Learned for an experiment. That is how one table expresses four kinds without a
badge doing the explaining.

Two rules are enforced on the server. A record that names a client **cannot be published**
unless consent is stored, and the public read omits `client_name` entirely, key and all,
unless `client_consent = 1`. An image cannot be attached without alt text.

Because the tables do not exist anywhere yet, the public pages render from the static
fallback in `src/marketing/data/work.ts`. Every fallback record is true and describes the
owner's own work. No client is named and no figure is quoted without a measurement behind it.

## 6. Server, in the repository

45 PHP files, all passing `php -l`. Full contract in `docs/API-SPEC.md`.

| Group | Files |
|---|---|
| Shared | `_bootstrap.php`, `_smtp.php`, `_sms.php`, `_slack.php`, `_monitor.php` |
| Public | `contact.php`, `verify.php`, `book.php`, `api.php`, `work.php` (public branch) |
| Auth and platform | `auth.php`, `oauth.php`, `users.php`, `audit.php`, `integrations.php` |
| Sales | `leads.php`, `clients.php`, `proposals.php`, `contracts.php` |
| Delivery | `projects.php`, `tasks.php`, `design.php`, `dev.php`, `resourcing.php`, `time.php`, `careplan.php`, `files.php` |
| Money | `invoices.php`, `payments.php`, `reports.php` |
| Client-facing | `portal.php`, `support.php`, `comms.php`, `mail.php` |
| Content | `blog.php`, `testimonials.php`, `content.php`, `knowledge.php`, `announcements.php`, `work.php` |
| Services | `ai.php`, `weather.php`, `github.php`, `figma.php`, `slack.php` |
| Automation | `cron.php` |

### Security changes made on this branch

All of these are in the repository and **none of them is on the live server**. Each is
verified by source inspection only; no endpoint was exercised.

| Change | File |
|---|---|
| The generated seed password no longer goes to a web-served `seed_admin_password.txt`; it goes to the error log. The hard-coded `dev@gakinz.com` fallback is gone | `auth.php` |
| `.txt` is denied at the document root, with `robots.txt` exempted by a negative lookahead inside the same pattern | `.htaccess` |
| Rewritten as a read-only health check. The unauthenticated POST insert is gone | `api.php` |
| The staff branch is restricted to super_admin, admin and manager. The client branch is unchanged | `portal.php` |
| Two-factor setup requires a current code when 2FA is already enabled, and is audited. Failed TOTP attempts count towards the login throttle | `auth.php` |
| A CSRF `state` parameter in a short-lived HttpOnly cookie, plus validation of the id_token's `aud` and `iss` | `oauth.php` |
| An extension allowlist plus a `finfo_file()` sniff. The browser-supplied Content-Type is no longer stored or replayed | `files.php` |
| An IP throttle on the public enquiry form | `contact.php` |
| `X-Content-Type-Options: nosniff`, `Referrer-Policy` and `X-Frame-Options: DENY` | `_bootstrap.php` |
| Private and link-local addresses blocked, redirects no longer followed, TLS verified | `_monitor.php` |
| `audit()` added to six previously unlogged mutations; seven concatenated SQL fragments now use bound parameters; five endpoints stopped leaking upstream error text | various |

**Do not read this table as "the server is secure".** It is a list of specific defects closed
in source, none of it uploaded, none of it exercised at runtime, and none of it reviewed
against the live configuration. `qa/SECURITY-AUDIT.md` holds the audit.

## 7. Deployed state

**UNVERIFIED, all of it.** No server was contacted, and the gap is now wider than it was,
because this branch changes fourteen server files, adds a fifteenth and adds two tables.

| Question | Status |
|---|---|
| Which `server/*.php` files on the host match the repository | UNVERIFIED, and now certainly out of date |
| Whether the `work` and `work_images` tables exist | **No.** They have not been applied to any database |
| Whether the `files.share_token` unique key has been applied | UNVERIFIED. The `ALTER TABLE` is written and not run |
| Which earlier schema migrations have been applied | UNVERIFIED |
| Whether the live `ALLOWED_ORIGINS` contains `http://localhost:5102` | UNVERIFIED |
| Whether `$SMTP_HOST` and `$IMAP_HOST` on the host point at the retired server | UNVERIFIED |
| Whether the cPanel cron entry for `cron.php` exists | UNVERIFIED |
| Whether the seeded super-admin password has been rotated | UNVERIFIED, and important. See `docs/KNOWN-ISSUES.md` K-001 |

Closing these needs someone with server access. Until then no release note should describe
this project as deployed. `docs/DEPLOYMENT.md` holds the upload list and the outstanding SQL.

## 8. Integrations

Configuration state on the server is UNVERIFIED for every row. The column below records only
whether the code path exists in the repository.

| Integration | Code | Notes |
|---|---|---|
| OpenRouter | Present | Authenticated, per-role daily caps |
| OpenWeather | Present | Cached 10 minutes |
| SMTP | Present | Built-in client, `mail()` fallback |
| IMAP | Present | Needs the PHP `imap` extension |
| Twilio SMS | Present | |
| Twilio WhatsApp | Present | Reuses the Twilio credentials |
| Stripe | Present | Verified webhook, replay guard |
| PayPal | Present | Orders v2, capture on return |
| Google SSO | Present | Matches existing users only. Now carries a CSRF state parameter |
| GitHub | Present | Works tokenless on public repositories |
| Figma | Present | Needs a token |
| Slack | Present | Incoming webhook, best effort |
| Calendly | Present | Link only |

## 9. Quality

| Area | State |
|---|---|
| Type safety | PASS. `tsc -b` clean, and it gates the build |
| Unit tests | PASS, but narrow. 21 tests, access control only |
| Endpoint tests | None. `work.php` has never been executed |
| Component tests | None |
| End-to-end tests | None |
| Lint | FAIL. 47 errors, 2 warnings, down from 60 and 7 |
| Accessibility, automated | PASS on the public surface, measured 2026-09-22. See section 3 and `qa/ACCESSIBILITY-AUDIT.md` |
| Accessibility, assistive technology | **NOT TESTED.** No screen-reader pass has been run |
| Accessibility, GAkinzOS at `/app/*` | **NOT TESTED.** Out of scope for the relaunch audit |
| Performance, lab | Measured on a local preview with no throttling. See section 3 |
| Performance, field | **NOT TESTED.** No real-user measurement exists |
| Security | Source inspection only, and the changes are not deployed. See `qa/SECURITY-AUDIT.md` |

## 10. Not built, and why

| Item | Reason |
|---|---|
| Server-side rendering or a prerender step | None. The site is a client-rendered SPA, so a crawler that does not execute JavaScript sees an empty document. `public/llms.txt` exists as a hand-written mitigation, not a fix |
| Generated sitemap entries for `/work/:slug` and `/resources/:slug` | `public/sitemap.xml` is hand-maintained and lists static routes only. Database-backed URLs would need a generator or a server-rendered sitemap |
| Xero and QuickBooks accounting sync | Needs a full OAuth application and a sandbox account |
| Google Drive, Box, Dropbox storage | Same. Local file storage exists instead |
| Zoom and Google Meet meeting creation | Same |
| A staging environment | One production host, by choice |
| Automated database backups | None in this repository. The largest operational risk. See `docs/OPERATIONS.md` section 5 |
| A migration runner | See `docs/DECISIONS.md` D-008 |

## 11. Open work, in priority order

1. Confirm whether the credential published in an earlier `CLAUDE.md` has been rotated
   (K-001). Nothing else in this list matters as much.
2. Upload the server set and run the outstanding SQL. Until that happens the work ledger has
   no database behind it and every security fix in section 6 is repository-only. The order
   matters and is set out in `docs/DEPLOYMENT.md`.
3. Resolve the `llms.txt` conflict. `public/llms.txt` ships to the document root, and the
   hardened `.htaccess` denies every `.txt` except `robots.txt` by name, so the file would be
   refused in production. One of the two has to give. **UNVERIFIED against the live server**,
   since nothing was fetched; this is read from the two files.
4. Establish the real server state: which files are uploaded, which migrations have run.
5. Run a screen-reader pass with real assistive technology and replace the NOT TESTED row in
   section 9.
6. Exercise `work.php` at least once against a real database before relying on it. It has
   never run.
7. Hold the lint ratchet at 47 errors and bring it down. The unknown rule name in
   `Seo.tsx`, which is a one-line removal.
8. Measure performance in the field rather than on a local preview.
