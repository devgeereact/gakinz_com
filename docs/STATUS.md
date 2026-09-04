# Status

**As at:** 2026-09-04, branch `chore/gee-os-adoption`, `065a234`.
**Method:** source inspection plus a local test, build, PHP syntax and lint run. No live
server, database, mailbox, payment provider or DNS record was contacted.

This is the file that changes often. Anything about the deployed system is UNVERIFIED unless
someone with server access has checked it.

---

## 1. Verification baseline

Run locally on 2026-09-04.

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **PASS.** 1 file, 11 tests, 87 ms |
| Type check and build | `npm run build` | **PASS.** `tsc -b` clean, Vite built in 2.83 s |
| PHP syntax | `php -l` over 44 files in `server/` | **PASS.** No syntax errors |
| Lint | `npm run lint` | **FAIL.** 60 errors, 7 warnings, 42 files |

Lint breakdown, measured from the ESLint JSON report:

| Count | Severity | Rule |
|---|---|---|
| 39 | error | `react-hooks/set-state-in-effect` |
| 7 | error | `react-refresh/only-export-components` |
| 4 | error | `react-hooks/refs` |
| 4 | error | `unused-imports/no-unused-imports` |
| 2 | error | `prefer-const` |
| 1 | error | `react-hooks/immutability` |
| 1 | error | `react-hooks/purity` |
| 1 | error | `@typescript-eslint/no-unused-expressions` |
| 1 | error | `@typescript-eslint/no-explicit-any` |
| 5 | warning | `unused-imports/no-unused-vars` |
| 1 | warning | `react-hooks/exhaustive-deps` |
| 1 | warning | `react-hooks/incompatible-library` |

Six errors are auto-fixable. See `docs/KNOWN-ISSUES.md` K-002.

## 2. Client, built and in the repository

| Area | State | Evidence |
|---|---|---|
| Public site, 14 routes | Built | `src/routes/index.tsx`, `src/marketing/` |
| CMS, 23 module routes | Built | `src/app/modules/`, all wired into routes, sidebar, global search and `access.ts` |
| Authentication, 7 roles | Built | `src/app/Login.tsx`, `RequireAuth.tsx`, `src/lib/access.ts` |
| Two-factor, recovery codes | Built | `src/app/modules/Platform.tsx`, Security tab |
| Magic-link sign-in | Built | Login page |
| Invite and set-password | Built | `src/app/SetPassword.tsx` |
| Google SSO button | Built, shown only when the server reports it configured | `oauth.php?action=status` |
| Idle lock screen, 15 minutes | Built | `src/app/components/LockScreen.tsx` |
| Live clock in the header | Built | `src/app/components/ClockPill.tsx` |
| Weather widget | Built, hidden until the server key is set | `src/app/components/WeatherPill.tsx` |
| Notification bell | Built, derived from overdue invoices and open tickets | `src/app/components/NotificationBell.tsx` |
| Code splitting | Built | Every CMS route is lazy |
| Design system | Built | `src/index.css`, `tailwind.config.js` |
| Pulse demo surface | Removed | `src/pages/` holds two files; no `src/auth/` |

## 3. Server, in the repository

44 PHP files, all passing `php -l`. Full contract in `docs/API-SPEC.md`.

| Group | Files |
|---|---|
| Shared | `_bootstrap.php`, `_smtp.php`, `_sms.php`, `_slack.php`, `_monitor.php` |
| Public | `contact.php`, `verify.php`, `book.php`, `api.php` |
| Auth and platform | `auth.php`, `oauth.php`, `users.php`, `audit.php`, `integrations.php` |
| Sales | `leads.php`, `clients.php`, `proposals.php`, `contracts.php` |
| Delivery | `projects.php`, `tasks.php`, `design.php`, `dev.php`, `resourcing.php`, `time.php`, `careplan.php`, `files.php` |
| Money | `invoices.php`, `payments.php`, `reports.php` |
| Client-facing | `portal.php`, `support.php`, `comms.php`, `mail.php` |
| Content | `blog.php`, `testimonials.php`, `content.php`, `knowledge.php`, `announcements.php` |
| Services | `ai.php`, `weather.php`, `github.php`, `figma.php`, `slack.php` |
| Automation | `cron.php` |

## 4. Deployed state

**UNVERIFIED, all of it.** No server was contacted. The previous documentation accumulated
roughly 25 "deployed and live" and "needs re-deploy" markers across sessions and never
reconciled them into one list.

| Question | Status |
|---|---|
| Which `server/*.php` files on the host match the repository | UNVERIFIED |
| Which schema migrations have been applied | UNVERIFIED |
| Whether `weather.php` on the host is the stale pre-bootstrap copy | UNVERIFIED |
| Whether the live `ALLOWED_ORIGINS` contains `http://localhost:5102` | UNVERIFIED |
| Whether `$SMTP_HOST` and `$IMAP_HOST` on the host point at the retired server | UNVERIFIED |
| Whether the cPanel cron entry for `cron.php` exists | UNVERIFIED |
| Whether the seeded super-admin password has been rotated | UNVERIFIED, and important. See `docs/KNOWN-ISSUES.md` K-001 |
| Whether any FTP deploy has succeeded since the July 2026 host migration | UNVERIFIED |

Closing these needs someone with server access. Until then no release note should describe
this project as deployed.

## 5. Integrations

Configuration state on the server is UNVERIFIED for every row. The column below records
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
| Google SSO | Present | Matches existing users only |
| GitHub | Present | Works tokenless on public repositories |
| Figma | Present | Needs a token |
| Slack | Present | Incoming webhook, best effort |
| Calendly | Present | Link only |

## 6. Quality

| Area | State |
|---|---|
| Type safety | PASS. `tsc -b` clean and it gates the build |
| Unit tests | PASS, but narrow. Access control only |
| Endpoint tests | None |
| Component tests | None |
| End-to-end tests | None |
| Lint | FAIL. 60 errors, 7 warnings |
| Accessibility | **NOT TESTED.** The earlier zero-violations claim is withdrawn. See `docs/DECISIONS.md` D-020 |
| Performance | Measured at build only. No field or lab measurement. See `qa/PERFORMANCE-AUDIT.md` |
| Security | Reviewed by source inspection only. See `qa/SECURITY-AUDIT.md` |

## 7. Not built, and why

| Item | Reason |
|---|---|
| Xero and QuickBooks accounting sync | Needs a full OAuth application and a sandbox account |
| Google Drive, Box, Dropbox storage | Same. Local file storage exists instead |
| Zoom and Google Meet meeting creation | Same |
| A staging environment | One production host, by choice |
| Automated database backups | None in this repository. The largest operational risk. See `docs/OPERATIONS.md` section 5 |
| A migration runner | See `docs/DECISIONS.md` D-008 |

## 8. Open work, in priority order

1. Confirm whether the credential published in the previous `CLAUDE.md` has been rotated
   (K-001). Nothing else in this list matters as much.
2. Establish the real server state: which files are uploaded, which migrations have run.
3. Fix `api.php`'s unauthenticated POST (K-004).
4. Decide the lint backlog: fix, ratchet or accept (K-002).
5. Confirm the live `config.php` mail host is not the retired server. The tracked template
   was corrected on 2026-09-04; the live value is UNVERIFIED (K-003).
6. Run a fresh accessibility audit and replace the NOT TESTED entries.
7. Add spam protection to `contact.php` (K-005).
