# Verification

What was actually run, with the result, and what only the owner can show. Results by date are also in
[AUDIT.md](AUDIT.md); the finish line they serve is [ROADMAP.md](ROADMAP.md). Status words: DONE (seen), PARTIAL,
NOT TESTED, BLOCKED.

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
