# Verification

What was actually run, with the result, and what only the owner can show. Results by date are also in
[AUDIT.md](AUDIT.md); the finish line they serve is [ROADMAP.md](ROADMAP.md). Status words: DONE (seen), PARTIAL,
NOT TESTED, BLOCKED.

## Local ladder, 2026-11-10, branch `goal/finish`

Run in the worktree `.local-state/wt-finish`, Node 24.22.1, PHP 8.5.12, local MariaDB 11.4.13 on its own port
(throwaway `gakinz_finish_test`; nothing on the live host or live data).

| Rung | Command | Result |
|---|---|---|
| Types | `npx tsc -b --noEmit` | DONE, clean |
| Unit | `npm test` | DONE, 674 tests in 61 files |
| Server | `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_finish_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 npm run test:server` | DONE, 661 tests in 52 files |
| Build | `npm run build` | DONE, 32 public pages and `app-shell.html` prerendered, 32 sitemap URLs |
| Browser | `npm run test:browser` (after the build) | DONE, 6 tests: the contact form at 375 and 1280 px |
| Lint | `npm run lint:ratchet` | DONE, 5 errors, ceiling 5 (`npm run lint` still fails, K-002) |
| PHP syntax | `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | DONE, 68 files clean |
| Docs | `npm run docs:check -- --base main` | DONE, PASS (27 documents; the sync rule applied against main) |
| Release dry run | `npm run verify` | DONE, checks and build pass, every file uploadable, nothing sent |
| Placeholders | `npm run check:facts` / `-- --strict` | DONE as a report (9 open owner facts); `--strict` fails as it should |
| Restore | `npm run drill:restore` | DONE on the Mac copy of the 2026-10-30 dump (`docs/OPERATIONS.md` 10.1) |
| Slop | `node ~/Developer/build-kit/App-Kit/starter/scripts/slop-check.mjs --all .` | 1 "error" that unmodified `main` also reports with none listed; 13 giant-file warnings, all existing |

No `pnpm` in this project: the equivalents are `npm`. There is no `npm run check`; the rungs above are the gate.

## Release and live checks, 2026-11-10 (owner said "Go ahead and Push" and "do these")

| Step | Result |
|---|---|
| PR #32 CI | DONE, all green: typecheck, lint, docs, unit, build; PHP syntax and server tests on MySQL 8; gitleaks and Semgrep |
| `main` fast-forwarded to `4bdaed7`; release job | DONE, succeeded (the release script's own smoke checks passed) |
| `npm run check:live` on production | DONE, 16 of 16, read-only |
| Phone on the live site | DONE, `tel:+442080598757` on `/contact`; `telephone` in the home page structured data |
| SMTP on the host | DONE, connect + login accepted (235); no mail sent by the check |
| `$OWNER_ALERTS` | DONE, set on the host (config backed up, linted, mode 600) |
| Live owner alert | DONE as far as the server can show: one TEST enquiry (GK-E-2026-0002) gave a 201, an `enquiry_notified` audit row and no failure row; the TEST row was then deleted. **NOT SEEN:** the email in the mailbox; please look for "New enquiry from TEST Finish Run (ignore)" in hello@gakinz.com |
| Daily backup on the host | DONE: `~/gakinz-backup.sh` ran twice by hand (dump 9.1 KB, uploads tarball 125 bytes, folder empty); cron line `30 3 * * *` added; first scheduled run is 03:30 tomorrow, NOT YET SEEN |
| Restore of the host's own dump | DONE locally: 42 of 42 tables, 60 rows, 0 orphans |
| Cron entry | DONE: `15 6 * * *` `job=all` added after counting 0 clients, 0 invoices, 0 retainers; one hand run gave all-zero results and wrote the `cron_run` heartbeat. First scheduled run is 06:15 tomorrow, NOT YET SEEN |
| Walk steps 2 to 7 | NOT TESTED: they need a signed-in session (Clerk email code) that an agent cannot hold |

## Live-ready gate (`~/Developer/build-kit/App-Kit/LAUNCH-PROMPTS.md`)

| # | Gate line | Status |
|---|---|---|
| 1 | Every V1 finish-line item ticked with evidence | **PARTIAL.** 7 of 10 ticked; items 4 (business facts), 8 (the targets) and 10 (retention periods) wait for the owner (`docs/ROADMAP.md`) |
| 2 | Local ladder green on the release commit | **DONE** on the branch tip (table above); CI (MySQL 8) has not run it |
| 3 | `slop-check` 0 errors; `slop-audit` recorded | **PARTIAL.** `slop-audit` recorded in `docs/AUDIT.md` 2026-11-10; the scan prints 1 (the baseline quirk) |
| 4 | Sign-in or personal data: `security-audit` run, high and critical fixed; refusals tested | **PARTIAL.** Refusals tested (`portal-isolation.test.ts`, 24 tests). A full `security-audit` was not re-run this session; the last is 2026-11-01 to 02 |
| 5 | Real data: verified backup and tested restore, and a rollback exercised | **PARTIAL.** Daily host backup installed and the host's own dump restored (DONE); a release rollback was not exercised (NOT TESTED); recovery targets await the owner's yes |
| 6 | Main journey checked on a real phone and a real browser by the owner | **NOT TESTED.** The "Owner walk" below |
| 7 | Facts, photos and legal items in; no placeholder | **BLOCKED**, owner (`npm run check:facts`) |
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
