# Verification

What was actually run, with the result, and what only the owner can show. Results by date are also in
[AUDIT.md](AUDIT.md); the finish line they serve is [ROADMAP.md](ROADMAP.md). Status words: DONE (seen), PARTIAL,
NOT TESTED, BLOCKED.

## Release and live checks, 2026-11-13 (V1.2, `ea6164c`)

V1.2 (D-065, D-066, D-067) was released on the owner's approval. The checks below are read-only; the agent wrote nothing to the live site except the early `.htaccess` upload the owner asked for.

| Step | Result |
|---|---|
| `server/.htaccess` uploaded by hand, 2026-11-13 07:41 UTC (owner's request) | Backup `~/backups/gakinz_com/htaccess.before-v1.2-404.20261113T074141Z`; probes right after as expected (`docs/DEPLOYMENT.md` section 5); `check:live` 17 of 20 until the release (the unknown-URL headers and the two retired sitemap articles) |
| Re-check before the merge (owner approved) | The live `.htaccess` was still byte-identical (md5 `d8fd06d9...`) to the repo file; nothing uploaded again |
| Merge | PR #34 merged by fast-forward of `main` from `ed5a724` to `ea6164c` (22 commits) |
| CI on `main`, run 43389323251 | Green on every job: "does this push need a release", typecheck, lint, docs, unit, build, PHP and server tests on MySQL 8, gitleaks, Semgrep |
| Release job, 2026-11-13 08:06 UTC | Snapshot `~/backups/gakinz_com/releases/20261113T080551Z`, smoke checks passed, "Released ea6164c" |
| `pnpm run check:live` (`node scripts/live-check.mjs`, read-only GETs) | DONE, **20 of 20** (17 of 20 before the release) |
| Unknown URL | DONE: 404 with the branded "Page not found" page, `X-Robots-Tag: noindex`, `Cache-Control: no-store` and the same Content-Security-Policy as the other pages; `/blog/old` 404 |
| Pages | `/`, `/work`, `/services/web-design`, `/resources`, the three CMS articles (`fixed-price-how-we-scope`, `what-makes-a-website-fast`, `why-one-team-design-and-build`), `/services/a-service-only-in-the-cms`, `/Work/x`, `/cookies`, `/contact`, `/sitemap.xml` all 200 |
| Sitemap | DONE: lists exactly the three CMS articles |
| `/cookies/` | DONE: names `gk-auth` and `__session`; no longer contains `gk_oauth_state` or `gk-locked` |
| Home headline | DONE: the `<h1>` carries the `aria-label` sentence |

**NOT TESTED:** the contact form on the live site (no real enquiry was sent), the branded 404 and the honeypot in a real browser, Safari, Firefox, a real phone, a real password manager or screen reader, Clerk's real cookie names in devtools. **Owner steps unchanged:** a manual autofill pass on the contact form, a look at Clerk's cookie names on `/app`, the adviser's review of the cookie wording, the decision on redirecting the two retired article URLs, V1 items 4 and 10. Undo: `npm run release -- --rollback --go` (as the release prints it; the project's own commands are pnpm).

## Final ladder, 2026-11-11, branch `goal/v1.2` (V1.2, after the review fix wave)

Head `e4774e3` (the fifteen V1.2 commits over `d355c49`, fix wave included; the records commit follows). Node 24.22.1, PHP 8.5.12, local MariaDB 11.4.13 on port 3329, throwaway databases only (`gakinz_t6c_test` for the server suite, `gakinz_t6d_test` for the browser suite); nothing touched the live host or live data. Every rung below was run fresh in this session, after the whole-branch review and the fix wave; the first run, before the fix wave, is the next section.

| Rung | Result |
|---|---|
| `pnpm exec tsc -b --noEmit` | DONE, clean (exit 0) |
| `pnpm run lint` | DONE, 0 errors, 0 warnings (exit 0) |
| `pnpm test` | DONE, 701 tests in 66 files |
| `pnpm run test:server` (about 5 minutes) | DONE, 687 tests in 55 files |
| `pnpm run build` | DONE, 32 public pages, `404.html` and `app-shell.html` written, 32 sitemap URLs |
| `pnpm run test:browser` with `GK_AXE` (axe-core, WCAG 2.0 to 2.2 A and AA), three runs in a row | DONE, 148 of 148 each time (3 files: contact 12, public pages 68 including the not-found view, CMS screens 68), axe 0 violations (a violation fails its test), no intermittent failure |
| `pnpm run check:htaccess` (the real `server/.htaccess` under local Apache, `notfound.php` under PHP-FPM) | DONE, 67 of 67 (the first run had 60; the fix wave added the `[NC]` exemption, `blog` as an unknown path and `/404.html` by name with the CSP) |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | DONE, 69 of 69 files clean (51 endpoints and 18 `_` includes) |
| `pnpm run verify` (release dry run) | DONE, PASS, nothing sent (typecheck, lint, unit, build, upload guard) |
| `pnpm run docs:check --base main` | DONE, PASS (29 documents, 31 relative links, 481 files scanned, 48 changed files against `main`; run on the finished records) |

The browser runs were started while the server suite was still running (different databases and ports), and `pnpm run verify` ran after them because it rebuilds `dist/`. `check:live` was NOT run: it asks the live site, which still lacks this branch (and the `.htaccess` upload), so its `unknown URL answers 404` check would fail by design.

**NOT TESTED** (unchanged by the fix wave): a real phone, Safari, Firefox, a real password manager filling the honeypot, a real screen reader, LiteSpeed (the `.htaccess` rule is proved under Apache only), `server/.htaccess` and `server/notfound.php` on the live host (not uploaded), Clerk's real cookie names in a signed-in browser, anything on the live site, the first CI run of this branch.

## First ladder, 2026-11-11, branch `goal/v1.2` (V1.2, before the review fix wave)

Head `d4ddac3` (five V1.2 commits over `d355c49`). Node 24.22.1, PHP 8.5.12, local MariaDB 11.4.13 on port 3329, throwaway databases only (`gakinz_t6_test`, `gakinz_t6b_test`); nothing touched the live host or live data. Every rung was run fresh in this session.

| Rung | Result |
|---|---|
| `pnpm exec tsc -b --noEmit` | DONE, clean |
| `pnpm run lint` | DONE, 0 errors, 0 warnings |
| `pnpm test` | DONE, 698 tests in 66 files |
| `pnpm run test:server` | DONE, 684 tests in 55 files |
| `pnpm run build` | DONE, 32 public pages, `404.html` and `app-shell.html` written, 32 sitemap URLs |
| `pnpm run test:browser` with axe (WCAG 2.0 to 2.2 A and AA), three runs in a row | DONE, 146 of 146 each time (3 files: contact, public pages 66, CMS screens), axe 0 violations, no intermittent failure |
| `pnpm run check:htaccess` (the real `server/.htaccess` under local Apache, `notfound.php` under PHP-FPM) | DONE, 60 of 60: unknown URLs answer 404 with the built not-found page, the same Content-Security-Policy as `/`, `noindex` and `no-store`; known pages, the app shell and client-only records still answer 200; a request without `CF-RAY` is refused |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | DONE, 69 of 69 files clean |
| `pnpm run verify` (release dry run) | DONE, PASS, nothing sent |
| `pnpm run docs:check --base main` | DONE, PASS (29 documents, 29 relative links, 481 files, 45 changed files against `main`) |

### Visual review (V1.2 pages), same day

Full-page screenshots at 375 and 1280 px, 13 contact sheets, every one looked at: `/` (headline), `/contact` empty, filled, after a too-fast send and after success (viewport shots at both sizes as well), `/cookies`, `/privacy`, `/resources`, the three articles, and the 404 page (an unknown URL through local Apache, so the page is the one the rule serves, with its 404 status). Public pages came from `public-layout.test.ts` with `GK_SHOTS`; the contact states and the 404 from throwaway Playwright scripts in `.local-test/`. Screenshots are in `.local-test/shots/v12/` (gitignored).

| Check | Seen |
|---|---|
| Home headline | "I design and build websites for shift teams." reads once at both sizes; the underlined last words are the synced word |
| Contact, both sizes | Fields aligned and full width on a phone, two columns on desktop; no sideways scroll |
| Honeypot | Not visible anywhere: its box sits at x = -10000 px (measured), no stray label or gap in the layout |
| Too-fast send | "That was quick. Please check your details and send again." in the error colour above the button; name, email and message kept |
| Success | "Thanks, Ada." card with the reference, at both sizes |
| 404 page | Headline "That page is not here.", two buttons, header and footer intact at both sizes; page width equals viewport width (375/375, 1280/1280) |
| `/cookies`, `/privacy` | Lay out cleanly; the "to supply" boxes are visible (see findings) |
| `/resources` and the three articles | Lay out cleanly; the "Test post." text and the date come from the throwaway database, not from the build |

Defects in V1.2 found by the review: none, so no code change and no new guard was needed (the existing public-layout test already fails on sideways scroll, clipped text, console errors and failed requests for all 32 pages at both sizes). The whole-branch review then found that this test never covered the not-found view (its sitemap loop rejects that view), so the fix wave added a separate test that loads an unknown address at both sizes with the same checks and axe.

**Findings, not V1.2 defects, not fixed:**
- The home hero eyebrow reads "Designer and developer · London" and, beside it, "London 21:11": London twice, and on a phone the clock wraps to its own line. It dates from the public rebuild (`9859760`), not from V1.2.
- `/cookies` and `/privacy` show the bracketed "[... to supply]" boxes (K-137, owner inputs, ROADMAP Phase 8). On `/cookies` the `gk-auth` line read "Lasts: Your name, email and role are removed when you sign out (an empty entry stays)."; the fix wave (2026-11-11) changed it to "Lasts: Until you sign out. Your name, email and role are then removed (an empty entry stays)". The adviser's review of the wording is still open.
- The local Apache document root holds only `dist/`, `.htaccess` and `notfound.php`, so the 404 page's own `site.php` and `work.php` calls return 404 there. That is the test harness, not the site; on the host those endpoints exist.

**NOT TESTED:** a real phone, Safari, Firefox, a real password manager (the honeypot's `autocomplete`/ignore attributes are checked by unit and browser tests, not against 1Password, Bitwarden or Chrome autofill), a real screen reader, LiteSpeed (the `.htaccess` rule is proved under Apache only), `server/.htaccess` and `server/notfound.php` on the live host (not uploaded; the owner applies them), anything on the live site, the first CI run of this branch. Full-page captures taken after a scroll show the sticky header and the (hidden) skip link at the scroll position; that is a capture artefact (skip link measured at top -80 px, focus on `body`), not a page fault.

## Release and live checks, 2026-11-11 (owner said "Push and Deploy now")

Two pushes to `main`. The checks are read-only; nothing was written to the live site by the agent.

| Step | Result |
|---|---|
| Push `e73748f` (V1.1 and Tailwind v4 merged, 23 commits) | CI: typecheck, lint, docs, unit tests and build PASS; PHP and server tests on MySQL 8 PASS; gitleaks and Semgrep PASS; **"does this push need a release" FAILED** (`Unable to locate executable file: pnpm`, K-149); release skipped, nothing deployed |
| Fix and push `ed5a724` | CI green on every job; release to gakinz.com ran at 08:34 UTC: snapshot `~/backups/gakinz_com/releases/20261111T083401Z`, smoke checks passed, "Released ed5a724" |
| `node scripts/live-check.mjs` (read-only GETs) | DONE, 16 of 16: headers, no directory listings, `config.php` 403, anonymous `auth.php?action=me` 401, hashed bundle cached |
| Pages | `/`, `/work/`, `/services/web-design/`, `/pricing/`, `/contact/`, `/login`, `/app`, `/sitemap.xml` all 200; `today.php` anonymous 401 |
| Bundle | Live `index-DbqHNpCb.js` and `index-DzeMEWpu.css` (143,872 bytes) equal the local verify build, so the Tailwind v4 output is what is served |

**NOT TESTED:** the site in a browser after the release (no screenshot of the live pages), the Today deletion and alert sections signed in (they were seen only against seeded test data), Safari, Firefox, a real phone. Rollback: `npm run release -- --rollback --go`.

## Merge of V1.1 and Tailwind v4 with pnpm, 2026-11-11, branch `chore/tailwind-v4`

`main` (V1.1) merged into `chore/tailwind-v4`; 17 files conflicted (docs, CI, `stack.ts`), resolved by keeping the V1.1 text, converting its commands to pnpm and renumbering the Tailwind decision from D-062 to D-064. The CMS test build (`vite.cms-test.config.ts`) gained the Tailwind plugin, or it would have built unstyled. Same worktree and MariaDB 11.4.13 on port 3329, throwaway databases only.

| Rung | Result |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm exec tsc -b --noEmit` | DONE, clean |
| `pnpm run lint` | DONE, 0 errors, 0 warnings |
| `pnpm test` | DONE, 678 tests in 61 files |
| `pnpm run test:server` | DONE, 669 tests in 53 files |
| `pnpm run build` | DONE, 32 public pages, 32 sitemap URLs |
| `pnpm run test:browser` with axe | DONE, 140 of 140 (contact 6, public pages 66, CMS screens 68), axe 0 violations |
| CMS tables that scroll on a phone | Same eight tables, same widths as before the merge (K-148): no layout drift from Tailwind v4 in those screens |
| `pnpm run verify`, `php -l`, `pnpm run docs:check --base main` | DONE, PASS (68 PHP files clean) |

Still NOT TESTED: the first CI run with `pnpm install --frozen-lockfile` in `deploy.yml` (runs only on a merge to `main`), Safari, Firefox, a real phone.

## Local ladder, 2026-11-11, branch `goal/finish` (V1.1)

Same worktree, Node 24.22.1, PHP 8.5.12, local MariaDB 11.4.13 on port 3329 (throwaway databases `gakinz_v11_test`, `gakinz_v11_srv_test`; nothing on the live host or live data). Commands as in the 2026-11-10 table, with `pnpm run lint` in place of the ratchet.

| Rung | Result |
|---|---|
| `npx tsc -b --noEmit` | DONE, clean |
| `pnpm run lint` | DONE, 0 errors, 0 warnings (the gate caught a lint error in the new test stub; fixed) |
| `pnpm test` | DONE, 678 tests in 61 files |
| `pnpm run test:server` | DONE, 669 tests in 53 files (283 s) |
| `pnpm run build` | DONE, 32 public pages, `app-shell.html`, 32 sitemap URLs |
| `pnpm run test:browser`, three runs in a row, with `GK_AXE` | DONE, 140 of 140 each time: contact form 6, public pages 66, CMS screens 68; axe 0 violations on 132 page loads |
| PHP syntax | DONE, 68 files clean |
| `pnpm run verify` | DONE, checks and build pass, every file uploadable, nothing sent |
| `pnpm run docs:check --base main` | DONE, PASS (27 documents; the sync rule applied against `main`, 74 changed files) |

**Visual review:** public pages 11 of 32 viewed side by side at 375 and 1280 px (home, services, one service page, pricing, work, one work page, about, contact, privacy, an article, the 404; every template class is among them, the other pages share their templates and pass the automated checks). CMS: 8 screens viewed side by side at both sizes (Enquiries, Clients, Invoicing, Contracts and four more); the other screens rest on the automated checks and axe. Defects found by looking: blank cards in a screenshot (lazy images, a capture artefact, not a defect), an article page showing the not-found view (K-147), tables that scroll in their box on a phone (K-148), invoice actions cut off at 1280 px (fixed).

**NOT TESTED:** real phones, Safari, Firefox, signed-in use of the live system, real data, a real Clerk sign-in, a screen reader. The CMS test build replaces Clerk with a stub, so the Clerk sign-in screen itself is not exercised.

## Local ladder, 2026-11-10, branch `goal/finish`

Run in the worktree `.local-state/wt-finish`, Node 24.22.1, PHP 8.5.12, local MariaDB 11.4.13 on its own port
(throwaway `gakinz_finish_test`; nothing on the live host or live data).

| Rung | Command | Result |
|---|---|---|
| Types | `npx tsc -b --noEmit` | DONE, clean |
| Unit | `pnpm test` | DONE, 674 tests in 61 files |
| Server | `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_finish_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 pnpm run test:server` | DONE, 661 tests in 52 files |
| Build | `pnpm run build` | DONE, 32 public pages and `app-shell.html` prerendered, 32 sitemap URLs |
| Browser | `pnpm run test:browser` (after the build) | DONE, 6 tests: the contact form at 375 and 1280 px |
| Lint | `pnpm run lint:ratchet` | DONE, 5 errors, ceiling 5 (`pnpm run lint` still fails, K-002) |
| PHP syntax | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | DONE, 68 files clean |
| Docs | `pnpm run docs:check --base main` | DONE, PASS (27 documents; the sync rule applied against main) |
| Release dry run | `pnpm run verify` | DONE, checks and build pass, every file uploadable, nothing sent |
| Placeholders | `pnpm run check:facts` / `-- --strict` | DONE as a report (9 open owner facts); `--strict` fails as it should |
| Restore | `pnpm run drill:restore` | DONE on the Mac copy of the 2026-10-30 dump (`docs/OPERATIONS.md` 10.1) |
| Slop | `node ~/Developer/build-kit/App-Kit/starter/scripts/slop-check.mjs --all .` | 1 "error" that unmodified `main` also reports with none listed; 13 giant-file warnings, all existing |

No `pnpm` in this project: the equivalents are `npm`. There is no `pnpm run check`; the rungs above are the gate.

## Release and live checks, 2026-11-10 (owner said "Go ahead and Push" and "do these")

| Step | Result |
|---|---|
| PR #32 CI | DONE, all green: typecheck, lint, docs, unit, build; PHP syntax and server tests on MySQL 8; gitleaks and Semgrep |
| `main` fast-forwarded to `4bdaed7`; release job | DONE, succeeded (the release script's own smoke checks passed) |
| `pnpm run check:live` on production | DONE, 16 of 16, read-only |
| Phone on the live site | DONE, `tel:+442080598757` on `/contact`; `telephone` in the home page structured data |
| SMTP on the host | DONE, connect + login accepted (235); no mail sent by the check |
| `$OWNER_ALERTS` | DONE, set on the host (config backed up, linted, mode 600) |
| Live owner alert | DONE as far as the server can show: one TEST enquiry (GK-E-2026-0002) gave a 201, an `enquiry_notified` audit row and no failure row; the TEST row was then deleted. The owner confirmed the email arrived in hello@gakinz.com (2026-11-10) |
| Daily backup on the host | DONE: `~/gakinz-backup.sh` ran twice by hand (dump 9.1 KB, uploads tarball 125 bytes, folder empty); cron line `30 3 * * *` added. **The first scheduled run (03:30 server time, which is EST, so 08:30 UTC on 2026-11-10) FAILED**: `could not read the database user`, because cron's minimal PATH finds `/usr/bin/php`, the CGI build, which cannot run `php -r`. Fixed the same day (the script names `/usr/local/bin/php`), reinstalled on the host, and re-run under `env -i PATH=/usr/bin:/bin`: ok (dump 9.5 KB). The next scheduled run is the proof: NOT YET SEEN |
| Restore of the host's own dump | DONE locally: 42 of 42 tables, 60 rows, 0 orphans |
| Cron entry | DONE: `15 6 * * *` `job=all` added after counting 0 clients, 0 invoices, 0 retainers; one hand run gave all-zero results and wrote the `cron_run` heartbeat. **The first scheduled run happened: 06:15 server time (EST) on 2026-11-10 wrote the `cron_run` heartbeat (audit row 52)**. The host's clock is EST, five hours behind UTC and behind London |
| Owner walk, steps 1 to 7 | DONE on the live site (table below): 1, 2, 3, 5, 7 as the owner in Chrome, then 4 and 6 as a signed-in test client. Not tested: the invoice PDF, a real phone |

### Live owner walk, 2026-11-10 (owner signed in; run through Chrome on gakinz.com)

| Step | Result |
|---|---|
| 1 Contact form | The real form on `/contact` gave the thank-you with reference `GK-E-2026-0003`; the enquiry was in Leads, New, with its budget and message |
| 2 Convert, quote, accept | Convert to client moved the enquiry to Won and created the client. "Draft a quote" opened a quote already titled and linked to that client. Send and Accept worked (Send changes the status only and mails nobody). Accept asked how and when the client agreed, then created project `GK-P-2026-0001` and three invoices, and landed on the project |
| 3 Invoice and payment | Quote £1,234.57 + VAT 20% £246.91 = £1,481.48; the three invoices were £592.60, £444.44, £444.44 (sum £1,481.48). "Record payment" defaulted to bank transfer and the exact total (£444.44), took a reference, and the row then read "Bank transfer, ref TEST WALK BACS, 10 Nov 2026". "Paid this month" read £1,037.04 = £592.60 + £444.44 after a reload. **NOT TESTED:** the invoice PDF (the document icon showed nothing in the automated browser) |
| 5 Today | After the scheduled 06:15 run, no "scheduled jobs are not running" notice after the 06:15 `job=all` run; Today loaded normally |
| 7 Certificates | Issued `GK-FZMM-3CYJ-6C7K`; `/verify/<ref>` said "Valid certificate" with recipient, programme and date only; revoked; `/verify` then said "No matching certificate" |
| 4 Client portal and isolation | The first sign-in attempt failed twice for reasons that are now documented (`docs/OPERATIONS.md` 10.2): a client needs a CMS client account **and** a Clerk user, because production Clerk has `sign_up_mode: restricted` ("Couldn't find your account"). Then, signed in as `TEST Client A` (role Client, new TEST records: Client A £1,000 + VAT, Client B £2,000 + VAT, three invoices each): the portal showed only A's project `GK-P-2026-0001` and A's invoices £480, £360, £360 (outstanding £1,200). No £960, £720, £2,000 or Client B anywhere on the page. `/app/invoicing`, `/app/clients` and `/app/projects?project=2` (B's project) all returned the client to their own portal. **NOT TESTED:** reading B's data by calling the API with A's token |
| 6 Deletion request | "Ask to delete my data" (My account) said nothing is deleted yet and sent the request. Server: ticket #1 "Data deletion request", **priority high**, open; audit `deletion_notified`. The owner confirmed the alert email arrived |

Observation: the portal lists all three invoices of the 40/30/30 schedule, drafts included, each with a Pay button. That is by design (a draft can be paid; `_money.php`), but a client can pay the 30 and 60 day instalments early; the owner may want drafts hidden until sent.

Small things seen (parked, ROADMAP): the Quotes list column "Total" shows the amount before VAT (the quote's own total, £1,481.48, is only in the form); the Invoicing tiles do not update after "Mark paid" until the page is reloaded; "Mark paid" on a draft stores the method as "other" by design (K-131; "Record payment" asks for the method).

**TEST records: removed later the same day** at the owner's request (`docs/DEPLOYMENT.md` section 5, 2026-11-10): the database now holds 0 enquiries, clients, projects, quotes, invoices and certificates, and one user (`TEST owner`). The `dev@gakinz.com` row was removed too. Numbering restarts: the next enquiry is `GK-E-2026-0001`, the next invoice `GK-INV-0001`.

## Live-ready gate (`~/Developer/build-kit/App-Kit/LAUNCH-PROMPTS.md`)

| # | Gate line | Status |
|---|---|---|
| 1 | Every V1 finish-line item ticked with evidence | **PARTIAL.** 7 of 10 ticked; items 4 (business facts), 8 (the targets) and 10 (retention periods) wait for the owner (`docs/ROADMAP.md`) |
| 2 | Local ladder green on the release commit | **DONE** on the branch tip (table above); CI (MySQL 8) has not run it |
| 3 | `slop-check` 0 errors; `slop-audit` recorded | **PARTIAL.** `slop-audit` recorded in `docs/AUDIT.md` 2026-11-10; the scan prints 1 (the baseline quirk) |
| 4 | Sign-in or personal data: `security-audit` run, high and critical fixed; refusals tested | **PARTIAL.** Refusals tested (`portal-isolation.test.ts`, 24 tests). A full `security-audit` was not re-run this session; the last is 2026-11-01 to 02 |
| 5 | Real data: verified backup and tested restore, and a rollback exercised | **PARTIAL.** Daily host backup installed and the host's own dump restored (DONE); a release rollback was not exercised (NOT TESTED); recovery targets await the owner's yes |
| 6 | Main journey checked on a real phone and a real browser by the owner | **NOT TESTED.** The "Owner walk" below |
| 7 | Facts, photos and legal items in; no placeholder | **BLOCKED**, owner (`pnpm run check:facts`) |
| 8 | Docs current; `.agent/CURRENT-TASK.md` says FINISHED | **PARTIAL.** Docs are current; it does not say FINISHED because items 4, 8 and 10 are open |

## Owner walk (about 20 minutes, after the release, on gakinz.com)

Do these once, signed in as yourself, on your phone and on a laptop. Tick, and tell me what looked wrong.

1. In `config.php` set `$OWNER_ALERTS` and check `$SMTP_*`; then open `/contact`, send an enquiry with an obvious TEST name. Expect: the thank-you with a `GK-E-` reference; an email within a minute; the enquiry in Leads. Delete it afterwards.
2. In Leads: Convert to client, Draft a quote, send, Accept (give the evidence), and check you land on the new project with three invoices (40/30/30).
3. In Invoicing: record a bank-transfer payment for the deposit at the exact total; check the method and amount show. Look at one VAT-inclusive total on the invoice PDF against the portal.
4. Sign in as a test client (Clerk email code): check the portal shows that client's project, invoices and shared files and nothing else.
5. Today: if no cron entry exists, the "Scheduled jobs are not running" panel appears. After you add the entry (`docs/OPERATIONS.md` 2.1), it clears as each job is seen.
6. As a test client, use "Ask to delete my data": expect an email to you with a reply-by date and a high-priority ticket in Support.
7. Open Certificates, issue one, check `/verify`, revoke it.

## Tailwind v4 and pnpm (branch `chore/tailwind-v4`, 2026-11-11)

What ran: `pnpm run typecheck`, `pnpm run lint:ratchet` (5 of 5), `pnpm test`, `pnpm run build` (32 pages), `pnpm run docs:check --base origin/main`, `pnpm verify` (nothing sent), and an offline before/after harness (128 captures per browser, Chromium and WebKit: 0 element boxes moved). Counts and the NOT TESTED list: `docs/AUDIT.md`, 2026-11-10.

# Test plan

(Moved here from `docs/TEST-PLAN.md` on 2026-11-14; section numbers are the old ones, so "Test plan section 7" is the release acceptance scenarios.)

**Status of the suite on 2026-10-10:** unit tests and server integration tests pass, the
latter against a throwaway local database. The counts are in `docs/STATUS.md` section 0. This document records what exists, what does not,
the order in which the gaps are worth closing, and the acceptance scenarios a release must
pass (section 7).

---

## Test plan 1. What runs today

| Layer | Tool | Coverage | Result |
|---|---|---|---|
| Types | `tsc -b`, inside `pnpm run build` | Whole client | **PASS**, 2026-10-10 |
| Unit | Vitest, `pnpm test` | `src/lib/access.ts`, `csv.ts`, `format.ts`, `session-revoke.ts`, `src/marketing/lib/articleFormat.ts`, `src/marketing/data/cmsResult.ts` | **PASS**, 2026-10-10 |
| Server integration | Vitest, `pnpm run test:server` | Sign-in, My account, payments, quote acceptance, blog editing, create ids, enquiry follow-ups, the work ledger (`work.php`), the enquiry-to-paid-deposit journey and the `support.php` client branch, against a local `*_test` database (D-036) | **PASS**, 2026-10-10 |
| PHP syntax | `php -l` | Every server file | **PASS**, 2026-10-10 |
| Lint | ESLint, `pnpm run lint` | Whole client | **PASS**, 0 errors and 0 warnings (K-002 closed 2026-11-11) |
| Documentation | `pnpm run docs:check` | Links and the document-sync rule (`AGENTS.md`) | **PASS**, 2026-10-10 |
| Accessibility | axe-core 4.10.2 in Chrome, plus computed contrast, focus, reflow and target-size sweeps | All 16 public routes | **PASS**, 0 violations, 2026-09-22. `docs/AUDIT.md` |
| Performance | Chrome DevTools trace and Lighthouse, production build served locally | Public surface | **PARTIAL.** Lab only, no field data, 2026-09-22. `docs/AUDIT.md` |
| Component | none | n/a | **NOT TESTED** |
| Other endpoints | none | Everything outside the server suite | **NOT TESTED** |
| End-to-end | none | n/a | **NOT TESTED** |
| Screen reader | none | n/a | **NOT TESTED**. The largest remaining accessibility gap |

`src/lib/access.test.ts` covers `canAccess`, `moduleKeyForPath` and `defaultPathForRole`,
with the client-isolation rules asserted explicitly. It is deliberately narrow: role gating is
where a mistake is silent and expensive. See `docs/DECISIONS.md` D-016.

## Test plan 2. Gates before any change is complete

Run them all. Report the real output, including a failure. CI runs the same set and the deploy
waits for it (`docs/DEPLOYMENT.md` section 2).

```bash
pnpm run build                                              # tsc -b then vite build
pnpm test                                                   # unit tests
pnpm run test:server                                        # PHP endpoints, local *_test database
pnpm run lint                                               # 0 errors, 0 warnings
pnpm run docs:check                                         # documents current, links resolve
find server -name '*.php' -print0 | xargs -0 -n1 php -l     # any touched PHP
```

The lint backlog does not block, but it **must not grow**. See `docs/KNOWN-ISSUES.md` K-002.

## Test plan 3. What cannot be tested from this repository

Stated plainly so nobody claims otherwise.

- Any PHP behaviour outside the server suite. `php -l` proves syntax and nothing more. The
  rules for the synthetic test path are in `docs/OPERATIONS.md` section 8.
- Anything depending on the live server, database, mailbox, DNS or configuration.
- Every external integration: OpenRouter, OpenWeather, SMTP, IMAP, Twilio, Stripe, PayPal,
  Google, GitHub, Figma, Slack, Calendly. None is configured locally, and none should be
  exercised without approval, because several of them send real messages or move real money.
  The server suite uses a fake payment provider and a mail stub instead.

The dev server calls the **live** API, so no write-path test runs through it.

## Test plan 4. Risk-ranked gaps

Ordered by what a defect would cost.

### Priority 1 · Server-side authorisation

The highest-value untested logic in the project. Every endpoint calls `require_auth` on its
own, with no shared middleware, so a missing call is a silent hole.

What a test would assert, per endpoint and per branch, including read branches:

- An anonymous request returns 401.
- A valid token with a disallowed role returns 403.
- A `client`-role token reaches `portal.php`, the client branch of `support.php` and its own
  account actions in `auth.php`, and nothing else.
- `portal.php` ignores `?client_id` for a `client` caller and returns only that client's rows.
  `support.php` already has this coverage (`tests/server/support-client.test.ts`).
- An expired token, a soft-deleted user and a non-active account are all rejected.

A static check is a cheap partial substitute: assert that every routed file in `server/`
contains `require_auth` in every request branch.

### Priority 2 · The `access.ts` mirror against the server

`src/lib/access.ts` duplicates the server role constants by hand and nothing checks the two.
A script that parses the `STAFF`, `ADMINS`, `EDITORS`, `MAIL_ROLES` and `PAY_STAFF` constants
out of `server/*.php` and compares them with `MODULE_ROLES` would close K-011 and could run in
the same command as the tests.

### Priority 3 · Money paths

Errors here are visible to clients and hard to reverse.

- VAT: subtotal from items, `vat_rate` applied at read, total inclusive. Asserted the same way
  in `invoices.php`, `portal.php`, `clients.php` and `cron.php`, so a change to one must not
  drift from the others.
- Proposal acceptance producing the 40, 30, 30 invoice schedule.
- Overdue-invoice reminders and the weekly digest (2026-11-09, Phase 7): `tests/server/cron-reminders.test.ts`, 13 tests against a fake SMTP server on 127.0.0.1 (one reminder per invoice per interval, a hand-sent reminder counts, a configurable interval, a failed send is retried, the named lock, the digest at most once in 6 days, `job=all` mails nobody twice). `tests/server/tasks.test.ts`, 12 tests: task update, date validation, staff-only, and a move to the same status.
- The Stripe webhook: a valid signature, a bad signature, a replayed timestamp, a
  `checkout.session.completed` that is not `payment_status = paid`, and a repeat of an event
  for an already-paid invoice.

Since 2026-10-10 the server suite covers the VAT-inclusive Stripe amount, amount and currency
mismatch, event de-duplication and the PayPal switch (`tests/server/payments.test.ts`), and
sent-only, single-use quote acceptance (`tests/server/proposals.test.ts`). The cross-endpoint
VAT agreement and the remaining webhook cases are still open.

### Priority 4 · Public entry points

`contact.php`, `verify.php`, `blog.php`, `testimonials.php`, and the two token endpoints. `verify.php` and `certificates.php` are covered since 2026-11-09 by `tests/server/certificates.test.ts` (21 tests: issue, roles, validation, revoke, uniform 404, throttle and its window, no guess in the audit log) and `src/app/modules/certificatesModel.test.ts` (6). For
each: the happy path, a malformed input, and for the token endpoints an invalid, an expired and
a deleted target.

### Priority 5 · Accessibility

See `docs/AUDIT.md`. The public surface was measured on 2026-09-22; the CMS and
real assistive technology are not measured at all.

### Priority 6 · Component behaviour

Lowest value per unit of effort here, because the type checker already catches a large class
of these and the modules are thin over the API.

## Test plan 5. Manual smoke test

Until endpoint tests exist, this is the check to run by hand after a server upload. It
requires production access, so it is a deliberate act, not a routine one.

1. Load the public home page. Confirm it renders and the blog section populates.
2. Submit the contact form with a real message. Confirm it appears in Leads.
3. Sign in. Confirm the role lands on the right default route.
4. Open one module per role group and confirm no error banner.
5. Sign in as a `client`-role account. Confirm only the portal and My account are reachable,
   and that editing the URL to another client's identifier changes nothing. Do not send a
   portal message unless a real client conversation calls for one.
6. Check Platform, Integrations, and confirm the booleans match what was configured.
7. Check the Care Plan module for a site returning a non-2xx status.

Record what was checked and what was not. A partial smoke test reported as a full one is worse
than no smoke test.

## Test plan 6. Adding a test

`vitest.config.ts` picks up any `src/**/*.test.{ts,tsx}` file beside the unit under test; it is
not bundled into `dist/`. Server tests live in `tests/server/` and run under
`vitest.server.config.ts`. A money, sign-in or ownership change adds a server case.

Keep tests free of network calls. Nothing in either suite should be able to reach the live API.

## Test plan 7. Release acceptance scenarios

These supplement the module acceptance criteria in `docs/PRODUCT-SPEC.md` section 5.5 and the
production gates in `docs/OPERATIONS.md` section 9. They are checks, not twelve new modules,
and none has passed at runtime unless its status says so. Phases are the delivery phases in
`docs/STATUS.md` section 2. Before coding, each approved batch names its endpoints and screens,
its acceptance cases, its rollback and its remaining owner inputs.

| ID | Scenario | Phase and proof | Status on 2026-10-10 |
|---|---|---|---|
| J01 | The owner handles a new enquiry, follow-up, confirmed call and one conversion without duplicate records | Phase 2; a synthetic journey plus retry | PARTIAL. Enquiry to client conversion, including a repeated conversion that creates no duplicate, passes locally in `tests/server/journey.test.ts`; follow-up and confirmed call NOT TESTED |
| J02 | A reference alone, or with the wrong email, discloses no customer record or account existence | Phases 1 and 2; response and throttling checks | RETIRED 2026-11-09 (D-057). It passed locally on 2026-10-19 for the switched-off reference sign-in; that flow and `tests/server/client-access.test.ts` were deleted. Now `client_access.php` answers 404 for every action (`tests/server/legacy-retired.test.ts`), and `tests/server/references.test.ts` still shows no endpoint reads a reference as input |
| J03 | A link expires, re-use fails, concurrent consumption allows at most one redemption, and privileged two-factor cannot be skipped | Phase 1; isolated authentication tests | RETIRED 2026-11-09 (D-057). It passed locally on 2026-10-19 for the magic and reference links; those flows and `tests/server/auth.test.ts` were deleted. Now `magic_request`, `magic_consume`, `reset` and the other former `auth.php` actions answer 404 (`tests/server/legacy-retired.test.ts`) and no link table is written |
| J04 | Client A cannot read or write Client B's projects, tickets, messages, files, invoices or feedback by changing identifiers | Phase 2; endpoint tests with two fake clients | PARTIAL. Tickets and messages pass locally, `tests/server/support-client.test.ts` (K-039); the portal ignores another client's id for projects and invoices, `tests/server/journey.test.ts`; files and feedback NOT TESTED |
| J05 | A customer message survives a failed send; a retry creates no duplicate, and the owner sees the notification failure | Phase 2; transport fixtures | NOT TESTED |
| J06 | Permitted customer updates work; financial and internal fields and unverified email changes are rejected | Phase 2; positive and negative endpoint cases | NOT TESTED |
| J07 | Private feedback stays private; publication needs recorded permission and approval | Phases 2 to 4; publish, unpublish and response inspection | NOT TESTED |
| J08 | The project brief stays client-linked, shared milestones exclude owner notes, and the export omits restricted information | Phases 2 and 3; record and sanitised export checks | NOT TESTED |
| J09 | The enquiry-to-handover task works on phone and desktop with keyboard, zoom and reduced motion | Phases 3 and 4; observable owner and client usability checks | NOT TESTED |
| J10 | Accurate quote, invoice and payment evidence, backup restoration, and publish and edit checks pass | Phases 1 to 4; the production gates | PARTIAL. Quote to invoice to paid deposit passes locally against a fake provider, `tests/server/journey.test.ts`; backup restoration and the live checks NOT TESTED |
| J11 | A draft or declined quote cannot be accepted or converted; a sent quote converts exactly once under double-click and concurrent requests | Phase 1; endpoint tests | PASS locally, `tests/server/proposals.test.ts` (K-028). Not on the live server |
| J12 | The Stripe charge equals the invoice's payable total including VAT; a mismatched amount or currency is rejected and not marked paid | Phase 1; sandbox fixtures | PASS locally against a fake provider, `tests/server/payments.test.ts` (K-025). Not on the live server |

No credible schedule exists until the deployed state and recovery have been established.

