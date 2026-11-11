# V1.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the public site says only true things and does not invite abuse: a true cookie policy, a sitemap that matches the CMS, a bot-resistant contact form, the real visitor IP behind Cloudflare, a real 404 status, a headline crawlers read once.

**Architecture:** small, independent changes to the marketing data and pages, `contact.php`, one new pure PHP include, the build (`scripts/prerender.mjs`) and `server/.htaccess`. Nothing needs a schema change or a new dependency. The host-side parts (the `.htaccess` upload, the Cloudflare key) are prepared and tested locally and left for the owner.

**Tech Stack:** React 19 and TypeScript, Vitest (unit, server on a throwaway MariaDB, browser through Playwright), PHP 8, Apache `.htaccess`, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-11-v1-2-public-trust-design.md` (the finish line itself is in `docs/ROADMAP.md`, the decision in `docs/DECISIONS.md` D-065).

## Global Constraints

- Test first: every behaviour change starts with a failing test that is run and seen to fail.
- All work happens in this project folder (`~/Developer/Projects/gakinz_com`) on branch `goal/v1.2`: no worktree or clone outside it, scratch only in `.local-state/` or `.local-test/`. Local only: nothing is pushed, merged to `main`, deployed or applied to the host. No credential in any file. `.htaccess` and `config.php` keys are applied by the owner.
- Commands are pnpm (`pnpm test`, `pnpm run test:server`, `pnpm run test:browser`, `pnpm run lint`). Server and browser tests need the local MariaDB: `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=<name>_test GK_TEST_PHP_PORT=<port> GK_TEST_PROVIDER_PORT=<port>` (start and stop it as in "Resume").
- UK English, no invented facts: legal text states what the code does and cites the supplier's documentation; the adviser still reviews it.
- PHP: prepared statements only, `ok()` and `fail()`, `audit()` on a mutation. Every document the change affects is updated in the same commit (`AGENTS.md`).
- Tailwind v4 and the public design system (`src/marketing/site.css`) stay as they are; no new dependency.

## Review Focus

- A real person whose browser autofills the form posts in under 2.5 s: they get a friendly retry, keep what they typed, and nothing is lost (Task 3).
- A genuine CMS-only article or work page (`/resources/new-post`) must still be served the app shell with status 200, not 404 (Task 4).
- A visitor who sends their own `CF-Connecting-IP` must never change the IP the server records, with the key on or off (Task 6).
- The honeypot must not be filled by password managers or reachable by keyboard and screen readers, so a real person never trips it (Task 3).
- `404.html` must be `noindex`, absent from the sitemap, and must render the not-found page after the bundle loads (Task 4).
- Someone adding a new cookie or local-storage use must be forced to update the cookie policy (Task 2).

---

### Task 1: The built-in articles match the CMS (item 2, K-147)

**Files:**
- Modify: `src/marketing/data/site.ts` (the `insights` array, about lines 460-510)
- Create: `src/marketing/data/insights.test.ts`
- Modify: `scripts/live-check.mjs`, `scripts/live-check.test.mjs`, `tests/browser/public-layout.test.ts` (the three seeded slugs)

**Interfaces:**
- Produces: `insights: Insight[]` with exactly these slugs in this order: `fixed-price-how-we-scope`, `what-makes-a-website-fast`, `why-one-team-design-and-build` (a snapshot of `GET https://gakinz.com/blog.php` on 2026-11-11). Each has `date: "2026-06-20"` and `body` of 4 paragraphs copied verbatim from `GET /blog.php?slug=<slug>` (split on a blank line); `title` and `excerpt` verbatim.
- Produces: `articleSlugsFromSitemap(xml: string): string[]` exported from `scripts/live-check.mjs` (the slugs of every `https://gakinz.com/resources/<slug>` `<loc>`).

- [ ] **Step 1: Write the failing tests.** In `insights.test.ts`, with `CMS_SLUGS` the three slugs above: "the built-in articles are exactly the posts the live CMS holds" (`insights.map(i => i.slug)` equals `CMS_SLUGS`); "each article carries the CMS date and four paragraphs"; "the prerender lists exactly those article pages" (`prerenderPaths()` entries starting `/resources/` equal `CMS_SLUGS.map(s => "/resources/" + s)`). In `live-check.test.mjs`: "reads the article slugs out of a sitemap" and "ignores URLs that are not articles".
- [ ] **Step 2: Run** `pnpm exec vitest run src/marketing/data/insights.test.ts scripts/live-check.test.mjs`. Expected: FAIL (old slugs; function missing).
- [ ] **Step 3: Replace the `insights` array** with the three CMS posts (fetch the text again with `curl -s "https://gakinz.com/blog.php?slug=<slug>"` at implementation time and copy it unchanged; update the comment above the array to say it mirrors the CMS and when). Add `articleSlugsFromSitemap` and, after the fixed `CHECKS` run, one GET per slug of `/blog.php?slug=<slug>` that must answer 200, named `sitemap article exists in the CMS: <slug>`, reported like the existing checks.
- [ ] **Step 4: Update the seed** in `public-layout.test.ts` to the three new slugs. Run the Step 2 command plus `pnpm run build` (32 pages becomes the new count if the total changes; update `docs/STATUS.md` counts later in Task 7) and `pnpm exec vitest run -c vitest.browser.config.ts tests/browser/public-layout.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `fix: the built-in articles mirror the live CMS posts; check:live checks every sitemap article (K-147)`.

### Task 2: The cookie policy tells the truth (item 1)

**Files:**
- Create: `src/marketing/data/storage-items.ts`, `src/marketing/data/storage-items.test.ts`, `src/marketing/pages/cookies.test.tsx`
- Modify: `src/marketing/pages/Legal.tsx` (the `Cookies` page, about lines 250-290, and the privacy "Cookies" paragraph at about line 203)

**Interfaces:**
- Produces: `type StoredItem = { name: string; kind: "cookie" | "local storage"; setBy: "this site" | "Clerk"; purpose: string; lasts: string }` and `STORED_ITEMS: StoredItem[]` with: `sidebar_state` (cookie, 7 days), `gkos-groups` and `theme` (local storage; theme only if changed), `gk-auth` (local storage; the signed-in person's name, email and role, for a faster first screen; cleared on sign-out), and Clerk's `__client` (cookie, HttpOnly, set on Clerk's own domain, long-lived and limited by the browser), `__client_uat` (cookie, notes when the session last changed) and `__session` (cookie, a short-lived token of about a minute). Source for Clerk's: Clerk documentation, "Cookies > Production instance cookies" (checked 2026-11-11). Clerk loads only on the sign-in page and under `/app`.

- [ ] **Step 1: Write the failing tests.** `storage-items.test.ts`: "lists every item the signed-in area stores" (names equal the seven above); "names no Google or retired sign-in cookie"; "every use of cookies or local storage in src/ is in a known file" (scan `src/**/*.ts(x)`, excluding tests, for `localStorage.`, `sessionStorage.`, `document.cookie =` and zustand `persist(`; the files found must equal `src/components/nav-main.tsx`, `src/components/ui/sidebar.tsx`, `src/providers/ui-theme-provider.tsx`, `src/store/auth.store.ts`, and the failure message says "add the new item to STORED_ITEMS and to this list"). `cookies.test.tsx`: "the cookie page names Clerk and gk-auth and not Google" (render `Cookies` to a string inside a router; contains `Clerk`, `gk-auth`, `__session`; does not contain `Google` or `gk_oauth_state`).
- [ ] **Step 2: Run** `pnpm exec vitest run src/marketing`. Expected: FAIL.
- [ ] **Step 3: Create `storage-items.ts` and render `STORED_ITEMS` as the policy's list in `Legal.tsx`;** delete the Google paragraph; reword the privacy paragraph so it points to the cookie policy and says what is stored in one sentence; state that the public pages set nothing (already true: `public-layout.test.ts` loads them with no storage use).
- [ ] **Step 4: Run** the Step 2 command, `pnpm run build`, and `public-layout.test.ts` (axe on `/cookies`). Expected: PASS, axe 0.
- [ ] **Step 5: Commit** `fix: the cookie policy lists what is really stored, names Clerk, drops the retired Google cookie`.

### Task 3: The contact form turns bots away (item 3)

**Files:**
- Modify: `server/contact.php`, `src/lib/api.ts` (`EnquiryPayload`), `src/marketing/pages/Contact.tsx`, `src/marketing/site.css` (a `.hp` class that moves the field off screen), `tests/browser/contact.test.ts`
- Create: `tests/server/contact-bots.test.ts`

**Interfaces:**
- Produces: payload fields `hp_site?: string` (the honeypot, always sent empty by the real form) and `openedAt?: number` (`Date.now()` when the form mounted). PHP constant `CONTACT_MIN_FILL_MS = 2500`. Audit actions `enquiry_bot_dropped` (detail `honeypot`) and `enquiry_too_fast`.
- Behaviour: a non-empty `hp_site` answers `201 {id: 0, reference: null}` and saves nothing, mails nothing; an `openedAt` less than 2500 ms old answers `429 "That was quick. Please check your details and send again."` and saves nothing; a missing, future, non-numeric or over-a-day-old `openedAt` is no signal (older clients and the other tests post without it).

- [ ] **Step 1: Write the failing server tests** in `contact-bots.test.ts` (same fake-SMTP set-up as `enquiry-notify.test.ts`): "a filled honeypot saves nothing, sends no alert and looks like success"; "a post opened 500 ms ago is asked to try again and saves nothing"; "a post opened 5 seconds ago is accepted"; "a post with neither field is accepted"; "an openedAt in the future or older than a day is ignored"; "the sixth post in 15 minutes is still throttled". Browser (in `contact.test.ts`): "sending at once shows the friendly retry and keeps what was typed"; "a bot that fills the hidden field sees a thank-you and nothing is stored"; "the hidden field has `tabindex=-1`, `aria-hidden=true` and `autocomplete=off`"; the existing happy-path tests wait 2600 ms after opening the page before sending.
- [ ] **Step 2: Run** `pnpm exec vitest run -c vitest.server.config.ts tests/server/contact-bots.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the two checks in `contact.php` after `$in = body()` and before validation; add the field and the mount timestamp in `Contact.tsx` (field name `hp_site`, not `website`, which password managers fill); map a 429 with that message to the form's existing error display.
- [ ] **Step 4: Run** the server file, `contact-hardening`, `enquiry-notify`, `enquiry-services` tests, then `pnpm run build` and `pnpm run test:browser`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: honeypot and minimum fill time on the contact form`. Document the limit honestly in `docs/SECURITY.md` and `docs/API-SPEC.md`: this stops form-filling bots; a script that posts JSON directly is limited only by the per-IP throttle.

### Task 4: An unknown URL gets a real 404 (item 5)

**Files:**
- Modify: `scripts/prerender.mjs`, `server/.htaccess`, `scripts/live-check.mjs`, `docs/DEPLOYMENT.md`
- Create: `scripts/htaccess-check.mjs` (script `check:htaccess` in `package.json`), a build-output test next to the other `src/prerender/*.test.ts`

**Interfaces:**
- Produces: `dist/404.html` (the prerendered not-found page: `<title>Page not found`, `noindex`, the same bundle, so React Router renders the not-found component), never in `sitemap.xml`. In `server/.htaccess`: `ErrorDocument 404 /404.html` and a rule before the final app-shell rules that answers `R=404` for a path whose first segment is not one of `app`, `login`, `set-password`, `p`, `verify`, `work`, `resources`, `blog` and is not a file or directory. A new `CHECKS` entry `unknown URL answers 404` for `/this-page-does-not-exist`.

- [ ] **Step 1: Write the failing tests.** Build test: "the build writes 404.html, noindex, titled Page not found, and it is not in the sitemap". `htaccess-check.mjs` is its own test: it starts `/usr/sbin/httpd` on a free port (port 5491 by default) with a temporary config (`AllowOverride All`, `mod_rewrite`) over a copy of `dist/` and `server/.htaccess`, sends `CF-RAY: local` (the file's origin lock), and asserts: `/` 200; `/work` 200; `/services/web-design` 200; `/login` 200; `/app/leads` 200; `/p/abc` 200; `/resources/a-post-only-in-the-cms` 200; `/definitely-not-a-page` 404 with "Page not found" in the body; `/missing.php` 404; `/assets/` 404. It prints BLOCKED (exit 2) if `httpd` is missing; it stops its server by port.
- [ ] **Step 2: Run** `pnpm exec vitest run src/prerender` and `pnpm run check:htaccess`. Expected: FAIL.
- [ ] **Step 3: Implement** `404.html` in `prerender.mjs` (render the unknown path, build with the same template, `noindex`), the two `.htaccess` changes, and the `live-check.mjs` entry. Document in `docs/DEPLOYMENT.md` section 5 that the new `.htaccess` and nothing else is the host step, how to confirm it (`pnpm run check:live`), and how to undo it (the previous file is in `~/backups/gakinz_com/`).
- [ ] **Step 4: Run** the Step 2 commands, then `pnpm run build`, `pnpm test`. Expected: PASS. Live status stays NOT TESTED until the owner uploads the file.
- [ ] **Step 5: Commit** `feat: a real 404 for unknown URLs (404.html and an .htaccess rule, applied by the owner)`.

### Task 5: The home headline is read once (item 6)

**Files:**
- Modify: `src/marketing/pages/Home.tsx` (the `<h1>`, about lines 132-148)
- Create: `src/marketing/pages/home-heading.test.tsx`

**Interfaces:** the `<h1>` gets `aria-label` equal to the sentence the hidden span carries today (`{copy.lead} small businesses: {who list}.`); the `.sr` span inside it is removed; the animated words stay in the markup.

- [ ] **Step 1: Write the failing test** "the headline text carries the lead once and the label carries the sentence": render `Home` to a string; the `<h1>` inner text contains `copy.lead` exactly once, contains each `who` once, and the tag has `aria-label` equal to the sentence.
- [ ] **Step 2: Run** `pnpm exec vitest run src/marketing/pages/home-heading.test.tsx`. Expected: FAIL (the lead appears twice).
- [ ] **Step 3: Implement** the change. 
- [ ] **Step 4: Run** the test, `pnpm run build`, and `public-layout.test.ts` with axe (heading name still computed). Expected: PASS.
- [ ] **Step 5: Commit** `fix: the home headline is read once by crawlers`; mark the audit row in `docs/AUDIT.md` ("Home H1") as fixed.

### Task 6: The real visitor IP behind Cloudflare (item 4)

**Files:**
- Create: `server/_clientip.php`, `tests/server/client-ip.test.ts`
- Modify: `server/_bootstrap.php` (require it; `audit()` uses it), `server/contact.php` (the throttle), `server/config.php.example`, `docs/DEPLOYMENT.md` section 5, `docs/SECURITY.md`, `docs/KNOWN-ISSUES.md` (K-102)

**Interfaces:**
- Produces: `client_ip(): string` in `server/_clientip.php` (no database, safe to `require` from `php -r`): returns `$_SERVER['REMOTE_ADDR']`, unless `$GLOBALS['TRUST_CLOUDFLARE_IP'] === true` and `REMOTE_ADDR` is inside a Cloudflare range (the published IPv4 and IPv6 lists from cloudflare.com/ips, copied in with the date) and `HTTP_CF_CONNECTING_IP` passes `filter_var(..., FILTER_VALIDATE_IP)`; then that header value. Config key `$TRUST_CLOUDFLARE_IP = false;` documented in `config.php.example`.

- [ ] **Step 1: Write the failing tests** (spawn `php -r` requiring the include, as `enquiry-notify.test.ts` does for `_notify.php`): "returns REMOTE_ADDR when the key is off even with CF-Connecting-IP set"; "returns the header IP when on and the peer is a Cloudflare IPv4 address"; "the same for an IPv6 address"; "ignores the header when on but the peer is not Cloudflare"; "ignores a header that is not an IP address"; "an unset key behaves as off".
- [ ] **Step 2: Run** `pnpm exec vitest run -c vitest.server.config.ts tests/server/client-ip.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `client_ip()`, use it in `audit()` and the contact throttle. Document the owner's steps (read one `audit_log` row's `ip` to see whether it is a Cloudflare address, then set the key) and keep K-102 open until then.
- [ ] **Step 4: Run** the new file, the full server suite (`pnpm run test:server`) and `php -l` over `server/`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: the contact throttle and the audit log can see the real visitor IP behind Cloudflare (off until the owner sets the key)`.

### Task 7: Delivery gate and records

**Files:** `docs/ROADMAP.md` (tick items with evidence, progress), `docs/CHANGELOG.md`, `docs/VERIFICATION.md`, `docs/AUDIT.md`, `docs/STATUS.md` (counts), `docs/KNOWN-ISSUES.md` (K-147 fixed; K-139 partly; K-102 note), `.agent/CURRENT-TASK.md`, `.agent/HANDOFF.md`, `.agent/PROJECT.yml` (`finished-v1.2`).

- [ ] **Step 1: The ladder, fresh:** `pnpm exec tsc -b --noEmit`, `pnpm run lint`, `pnpm test`, `pnpm run test:server`, `pnpm run build`, `pnpm run test:browser` three times in a row with `GK_AXE=<axe.min.js>`, `pnpm run check:htaccess`, `pnpm run verify`, `pnpm run docs:check --base main`. Paste counts; anything not run is NOT TESTED.
- [ ] **Step 2: Visual review** of the pages this plan changed, at 1280 and 375 px, with `GK_SHOTS`: `/` (headline), `/contact` (form, retry message, hidden field not visible), `/cookies`, `/privacy`, `/resources` and the three articles, and the 404 page. Look at every image; fix and re-shoot.
- [ ] **Step 3: One fresh reviewer** (`superpowers:requesting-code-review`) over the whole branch, because `contact.php`, `_bootstrap.php` and `.htaccess` are production-sensitive.
- [ ] **Step 4: Write the records,** tick the roadmap items with their evidence, and list what is BLOCKED on the owner: upload `server/.htaccess` (item 5 live), set `$TRUST_CLOUDFLARE_IP` after one read-only look (item 4 live), the adviser's review of the cookie wording (item 1).
- [ ] **Step 5: Commit** `docs: V1.2 closing records`; stop the throwaway database; do not push.

**Self-review:** every roadmap item maps to a task (1 to 5, 2 to 1, 3 to 3, 4 to 6, 5 to 4, 6 to 5); the names `articleSlugsFromSitemap`, `STORED_ITEMS`, `client_ip` and `CONTACT_MIN_FILL_MS` are used consistently; the six Review Focus lines each have a test in their task.
