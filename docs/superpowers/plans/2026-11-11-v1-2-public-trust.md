# V1.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** the public site says only true things and does not invite abuse: a true cookie policy, a sitemap that matches the CMS, a bot-resistant contact form, a real 404 status, a headline crawlers read once. (The real visitor IP behind Cloudflare was dropped after the builder check: it is already true.)

**Architecture:** small, independent changes to the marketing data and pages, `contact.php`, a small `server/notfound.php`, the build (`scripts/prerender.mjs`) and `server/.htaccess`. Nothing needs a schema change or a new dependency. The host-side part (the `.htaccess` upload) is prepared and tested locally and left for the owner.

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
- A genuine CMS-only article, work page or service (`/resources/new-post`, `/services/new-service`) must still be served the app shell with status 200, not 404 (Task 4).
- The honeypot must not be filled by password managers or reachable by keyboard and screen readers, so a real person never trips it (Task 3).
- `404.html` must be `noindex`, absent from the sitemap, carry the same Content-Security-Policy as the other pages, and render the not-found page after the bundle loads; the JSON 404s of `blog.php` and `work.php` must stay JSON (Task 4).
- Someone adding a new cookie or local-storage use must be forced to update the cookie policy; the page must not deny that Google sign-in exists, because it is enabled in Clerk (Task 2).

---

### Task 1: The built-in articles match the CMS (item 2, K-147)

**Files:**
- Modify: `src/marketing/data/site.ts` (the `insights` array, about lines 460-510)
- Create: `src/marketing/data/insights.test.ts`
- Modify: `scripts/live-check.mjs`, `scripts/live-check.test.mjs`, `tests/browser/public-layout.test.ts` (the three seeded slugs)

**Interfaces:**
- Produces: `insights: Insight[]` with exactly these slugs in this order: `fixed-price-how-we-scope`, `what-makes-a-website-fast`, `why-one-team-design-and-build` (a snapshot of `GET https://gakinz.com/blog.php` on 2026-11-11). Every field of every entry is replaced (the slug `why-one-team-design-and-build` stays but its title, excerpt and body are the CMS's). Each has `date: "2026-06-20"` and `body` of 4 paragraphs copied verbatim from `GET /blog.php?slug=<slug>` (split on a blank line); `title` and `excerpt` verbatim.
- Produces: `articleSlugsFromSitemap(xml: string): string[]` exported from `scripts/live-check.mjs` (the slugs of every `https://gakinz.com/resources/<slug>` `<loc>`).

- [x] **Step 1: Write the failing tests.** In `insights.test.ts`, with `CMS_SLUGS` the three slugs above: "the built-in articles are exactly the posts the live CMS holds" (`insights.map(i => i.slug)` equals `CMS_SLUGS`); "each article carries the CMS date and four paragraphs"; "the prerender lists exactly those article pages" (`prerenderPaths()` entries starting `/resources/` equal `CMS_SLUGS.map(s => "/resources/" + s)`). In `live-check.test.mjs`: "reads the article slugs out of a sitemap" and "ignores URLs that are not articles".
- [x] **Step 2: Run** `pnpm exec vitest run src/marketing/data/insights.test.ts scripts/live-check.test.mjs`. Expected: FAIL (old slugs; function missing).
- [x] **Step 3: Replace the `insights` array** with the three CMS posts (fetch the text again with `curl -s "https://gakinz.com/blog.php?slug=<slug>"` at implementation time and copy it unchanged; update the comment above the array to say it mirrors the CMS and when). Add `articleSlugsFromSitemap` and, after the fixed `CHECKS` run, one GET per slug of `/blog.php?slug=<slug>` that must answer 200, named `sitemap article exists in the CMS: <slug>`, reported like the existing checks.
- [x] **Step 4: Update the seed** in `public-layout.test.ts` to the three new slugs. Run the Step 2 command plus `pnpm run build` (the page total stays 32: three articles become three) and `pnpm exec vitest run -c vitest.browser.config.ts tests/browser/public-layout.test.ts`. Expected: PASS.
- [x] **Step 5: Commit** `fix: the built-in articles mirror the live CMS posts; check:live checks every sitemap article (K-147)`.

### Task 2: The cookie policy tells the truth (item 1)

**Files:**
- Create: `src/marketing/data/storage-items.ts`, `src/marketing/data/storage-items.test.ts`, `src/marketing/pages/cookies.test.tsx`
- Modify: `src/marketing/pages/Legal.tsx` (the `Cookies` page, about lines 250-290, and the privacy "Cookies" paragraph at about line 203)

**Interfaces:**
- Produces: `type StoredItem = { name: string; kind: "cookie" | "local storage"; setBy: "this site" | "Clerk"; purpose: string; lasts: string }` and `STORED_ITEMS: StoredItem[]` with: `sidebar_state` (cookie, 7 days), `gkos-groups` and `theme` (local storage; theme only if changed), `gk-auth` (local storage; the signed-in person's name, email and role, for a faster first screen; cleared on sign-out), and Clerk's `__client` (cookie, HttpOnly, set by Clerk's sign-in service at `clerk.gakinz.com`, a subdomain of this site; lasts up to the session limit of 7 days), `__client_uat` (cookie, notes when the session last changed) and `__session` (cookie, a short-lived token of about a minute). Source: Clerk documentation "Cookies > Production instance cookies" and the live production settings read on 2026-11-11 (session lifetime 60 s, maximum 7 days, Google and email code enabled, CAPTCHA off). Clerk loads only on the sign-in page and under `/app`. The page also states that choosing Google hands the sign-in to Google and Clerk, which set their own cookies under their own policies.

- [x] **Step 1: Write the failing tests.** `storage-items.test.ts`: "lists every item the signed-in area stores" (names equal the seven above); "does not list the retired gk_oauth_state cookie or the gk-locked item"; "every use of cookies or local storage in src/ is in a known file" (scan `src/**/*.ts(x)`, excluding tests, for `localStorage.`, `sessionStorage.`, `document.cookie =` and zustand `persist(`; the files found must equal `src/components/nav-main.tsx`, `src/components/ui/sidebar.tsx`, `src/providers/ui-theme-provider.tsx`, `src/store/auth.store.ts`, and the failure message says "add the new item to STORED_ITEMS and to this list"). `cookies.test.tsx`: "the cookie page names Clerk and gk-auth and handles Google truthfully" (render `Cookies` to a string inside a router; contains `Clerk`, `gk-auth`, `__session`, and a sentence that Google sign-in is handled by Clerk and Google; does not contain `gk_oauth_state` or `gk-locked`).
- [x] **Step 2: Run** `pnpm exec vitest run src/marketing`. Expected: FAIL.
- [x] **Step 3: Create `storage-items.ts` and render `STORED_ITEMS` as the policy's list in `Legal.tsx`;** replace the Google-cookie paragraph with the true sentence about Google sign-in; reword the privacy paragraph so it points to the cookie policy and says what is stored in one sentence; state that the public pages set nothing (already true: `public-layout.test.ts` loads them with no storage use).
- [x] **Step 4: Run** the Step 2 command, `pnpm run build`, and `public-layout.test.ts` (axe on `/cookies`). Expected: PASS, axe 0.
- [x] **Step 5: Commit** `fix: the cookie policy lists what is really stored and names Clerk; the retired Google cookie is gone`.

### Task 3: The contact form turns bots away (item 3)

**Files:**
- Modify: `server/contact.php`, `src/lib/api.ts` (`EnquiryPayload`), `src/marketing/pages/Contact.tsx`, `src/marketing/site.css` (a `.hp` class that moves the field off screen), `tests/browser/contact.test.ts`
- Create: `tests/server/contact-bots.test.ts`

**Interfaces:**
- Produces: payload fields `hp_site?: string` (the honeypot, always sent empty by the real form) and `fillMs?: number` (milliseconds from the form mounting to the send, `Date.now() - mountedAt` computed at submit; it replaced `openedAt`, a mount timestamp, in the fix wave so the server never compares a browser clock with its own). PHP constant `CONTACT_MIN_FILL_MS = 2500`. Audit actions `enquiry_bot_dropped` (detail `honeypot <email>` since the fix wave: the email the sender typed, one line, at most 200 characters, or `honeypot` alone without one) and `enquiry_too_fast`.
- Behaviour: a non-empty `hp_site` answers `201 {id: 0, reference: null}` and saves nothing, mails nothing; a `fillMs` under 2500 answers `429 "That was quick. Please check your details and send again."` and saves nothing; a missing, negative, non-numeric or over-a-day `fillMs` is no signal (older clients and the other tests post without it).

- [x] **Step 1: Write the failing server tests** in `contact-bots.test.ts` (same fake-SMTP set-up as `enquiry-notify.test.ts`): "a filled honeypot saves nothing, sends no alert and looks like success"; "a post filled in 500 ms is asked to try again and saves nothing"; "a post filled in over 5 seconds is accepted"; "a post with neither field is accepted"; "a fillMs that is negative or over a day is ignored"; "a fast post is refused whatever the browser's clock says"; "the sixth post in 15 minutes is still throttled". Browser (in `contact.test.ts`): "sending at once shows the friendly retry and keeps what was typed"; "a bot that fills the hidden field sees a thank-you and nothing is stored"; "the hidden field has `tabindex=-1`, `aria-hidden=true` and `autocomplete=off`"; the existing happy-path tests wait 2600 ms after opening the page before sending.
- [x] **Step 2: Run** `pnpm exec vitest run -c vitest.server.config.ts tests/server/contact-bots.test.ts`. Expected: FAIL.
- [x] **Step 3: Implement** the two checks in `contact.php` after `$in = body()` and before validation; add the field and the mount timestamp in `Contact.tsx` (field name `hp_site`, not `website`, which password managers fill); map a 429 with that message to the form's existing error display.
- [x] **Step 4: Run** the server file, `contact-hardening`, `enquiry-notify`, `enquiry-services` tests, then `pnpm run build` and `pnpm run test:browser`. Expected: PASS.
- [x] **Step 5: Commit** `feat: honeypot and minimum fill time on the contact form`. Document the limit honestly in `docs/SECURITY.md` and `docs/API-SPEC.md`: this stops form-filling bots; a script that posts JSON directly is limited only by the per-IP throttle.

### Task 4: An unknown URL gets a real 404 (item 5)

**Files:**
- Create: `server/notfound.php`, `tests/server/notfound.test.ts`, `scripts/htaccess-check.mjs` (script `check:htaccess` in `package.json`), a build-output test next to the other `src/prerender/*.test.ts`
- Modify: `scripts/prerender.mjs` (build `404.html` outside the loop at line ~75 that throws on "Page not found"; keep it out of `indexable` and the sitemap; run the CSP-hash check on it), `server/.htaccess`, `scripts/live-check.mjs` (and its `fetchFallback` comment), `docs/DEPLOYMENT.md`

**Interfaces:**
- Produces: `dist/404.html` (the prerendered not-found page: `<title>Page not found`, `noindex`, the same bundle and inline script as the other pages). `server/notfound.php`: sends status 404, `Content-Type: text/html; charset=utf-8`, `X-Robots-Tag: noindex`, `Cache-Control: no-store`, then `readfile` of `404.html` in the document root (a short inline "Page not found" HTML if the file is missing). In `server/.htaccess`: the existing CSP `FilesMatch` for `index.html` is extended to `^(index\.html|404\.html|notfound\.php)$`, and a rule before the final app-shell rules sends a path to `notfound.php` when its first segment is not one of `app`, `login`, `set-password`, `p`, `verify`, `work`, `services`, `resources` (matched without regard to case; `blog` dropped in the fix wave, 2026-11-11, because the app has no `/blog` route) and it is not a file or directory. No `ErrorDocument`. A new `CHECKS` entry `unknown URL answers 404` for `/this-page-does-not-exist`.

- [x] **Step 1: Write the failing tests.** Build test: "the build writes 404.html, noindex, titled Page not found, with a CSP-covered inline script, and it is not in the sitemap". Server test `notfound.test.ts` (PHP built-in server over a temp document root holding a `404.html`): "answers 404 with the page, noindex and no-store"; "falls back to a short page when 404.html is missing"; "the JSON 404 of blog.php for an unknown slug is still JSON". `htaccess-check.mjs` is its own test: it starts `/usr/sbin/httpd` on port 5491 with a temporary config (`AllowOverride All`, `mod_rewrite`, `mod_headers`, `mod_php`-less: a stub that serves `notfound.php` through `php -S` behind `ProxyPass`, or a CGI shim; the implementer picks the simplest that runs the real `notfound.php`) over a copy of `dist/` and `server/.htaccess`, sending `CF-RAY: local`, and asserts: `/` 200; `/work` 200; `/services/web-design` 200; `/services/a-service-only-in-the-cms` 200; `/login` 200; `/app/leads` 200; `/p/abc` 200; `/resources/a-post-only-in-the-cms` 200; `/definitely-not-a-page` 404 with "Page not found" in the body and the CSP header; `/missing.php` 404; `/assets/` 404. It prints BLOCKED (exit 2) if `httpd` is missing, and stops its server by port.
- [x] **Step 2: Run** `pnpm exec vitest run src/prerender`, `pnpm exec vitest run -c vitest.server.config.ts tests/server/notfound.test.ts` and `pnpm run check:htaccess`. Expected: FAIL.
- [x] **Step 3: Implement** `404.html` in `prerender.mjs`, `notfound.php`, the two `.htaccess` changes and the `live-check.mjs` entry. In `docs/DEPLOYMENT.md` section 5: the new `.htaccess` is the host step (`server/notfound.php` ships with the release), how to confirm it (`pnpm run check:live`), and how to undo it (the previous file is in `~/backups/gakinz_com/`).
- [x] **Step 4: Run** the Step 2 commands, then `pnpm run build`, `pnpm test`. Expected: PASS. Live status stays NOT TESTED until the owner uploads `.htaccess`.
- [x] **Step 5: Commit** `feat: a real 404 for unknown URLs (404.html, notfound.php and an .htaccess rule the owner applies)`.

### Task 5: The home headline is read once (item 6)

**Files:**
- Modify: `src/marketing/pages/Home.tsx` (the `<h1>`, about lines 132-148)
- Create: `src/marketing/pages/home-heading.test.tsx`

**Interfaces:** the `<h1>` gets `aria-label` equal to the sentence the hidden span carries today (`{copy.lead} small businesses: {who list}.`); the `.sr` span inside it is removed; the animated words stay in the markup.

- [x] **Step 1: Write the failing test** "the headline text carries the lead once and the label carries the sentence": render `Home` to a string; the `<h1>` inner text contains `copy.lead` exactly once, contains each `who` once, and the tag has `aria-label` equal to the sentence.
- [x] **Step 2: Run** `pnpm exec vitest run src/marketing/pages/home-heading.test.tsx`. Expected: FAIL (the lead appears twice).
- [x] **Step 3: Implement** the change. 
- [x] **Step 4: Run** the test, `pnpm run build`, and `public-layout.test.ts` with axe (heading name still computed). Expected: PASS.
- [x] **Step 5: Commit** `fix: the home headline is read once by crawlers`; mark the audit row in `docs/AUDIT.md` ("Home H1") as fixed.

### Task 6: Delivery gate and records

**Files:** `docs/ROADMAP.md` (tick items with evidence, progress), `docs/CHANGELOG.md`, `docs/VERIFICATION.md`, `docs/AUDIT.md`, `docs/STATUS.md` (counts), `docs/KNOWN-ISSUES.md` (K-147 fixed; K-139 partly), `.agent/CURRENT-TASK.md`, `.agent/HANDOFF.md`, `.agent/PROJECT.yml` (`finished-v1.2`).

- [x] **Step 1: The ladder, fresh:** `pnpm exec tsc -b --noEmit`, `pnpm run lint`, `pnpm test`, `pnpm run test:server`, `pnpm run build`, `pnpm run test:browser` three times in a row with `GK_AXE=<axe.min.js>`, `pnpm run check:htaccess`, `pnpm run verify`, `pnpm run docs:check --base main`. Paste counts; anything not run is NOT TESTED.
- [x] **Step 2: Visual review** of the pages this plan changed, at 1280 and 375 px, with `GK_SHOTS`: `/` (headline), `/contact` (form, retry message, hidden field not visible), `/cookies`, `/privacy`, `/resources` and the three articles, and the 404 page. Look at every image; fix and re-shoot.
- [x] **Step 3: One fresh reviewer** (`superpowers:requesting-code-review`) over the whole branch, because `contact.php`, `_bootstrap.php` and `.htaccess` are production-sensitive.
- [x] **Step 4: Write the records,** tick the roadmap items with their evidence, and list what is BLOCKED on the owner: upload `server/.htaccess` (item 5 live) and the adviser's review of the cookie wording (item 1).
- [x] **Step 5: Commit** `docs: V1.2 closing records`; stop the throwaway database (the controller does); do not push.

**Self-review:** items 1, 2, 3, 5 and 6 map to Tasks 2, 1, 3, 4 and 5; item 4 is dropped (already true); Task 6 is the gate. The names `articleSlugsFromSitemap`, `STORED_ITEMS`, `CONTACT_MIN_FILL_MS` and `notfound.php` are used consistently; each Review Focus line has a test in its task.
