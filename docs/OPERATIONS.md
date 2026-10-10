# Operations

**Status:** sections 1 to 7 describe what the code provides; sections 8 to 11 set the rules
for testing, launch readiness, recovery and production change (approved 2026-10-10). **No
operational claim here has been verified against a running system.** Whether the cron entry
exists, whether the jobs run, and whether mail is delivered are all UNVERIFIED.

Scope note: hosting, DNS, TLS, mail-server configuration and the dev-server port registry are
deliberately **not** documented in this repository. They have one authoritative home in the
operator's global notes, and a second copy has drifted and caused outages before.

---

## 1. Local development

```bash
npm install          # first time
npm run dev          # http://localhost:5102
```

Port 5102 is pinned with `strictPort: true` on both `server` and `preview` in
`vite.config.ts`, so a clash fails loudly instead of drifting. This matters more than it
looks: in development `src/lib/api.ts` calls the **live** API at `https://gakinz.com`, and the
live `ALLOWED_ORIGINS` list contains exactly one localhost entry. A drifted port appears as an
opaque CORS failure, not as a port error.

The dev server has no local PHP or MySQL behind it. Development runs against production
data. Treat every write in development as a write to the real business. The only safe place
to exercise the server is the synthetic test path in section 8.

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server, port 5102 |
| `npm run build` | `tsc -b` then `vite build`, output to `dist/` |
| `npm run preview` | Serve the built output, port 5102 |
| `npm test` | Vitest unit tests, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run test:server` | PHP endpoints against a throwaway local `*_test` database (section 8) |
| `npm run lint` | ESLint. Currently fails, see `docs/KNOWN-ISSUES.md` K-002 |
| `npm run lint:ratchet` | Fails if the lint backlog grows |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | PHP syntax gate |

## 2. Scheduled jobs

`server/cron.php` is the runner. It is **not** user-authenticated. It is gated by a shared
secret compared with `hash_equals`, so it can be triggered by a cPanel cron entry:

```
wget -qO- "https://gakinz.com/cron.php?key=<CRON_KEY>&job=all"
```

| Job | What it does | Skips when |
|---|---|---|
| `chase` | Emails a reminder for every overdue invoice | No SMTP configured |
| `billing` | Raises this month's invoice for each client with `retainer_amount > 0`. Idempotent per month | Column missing |
| `uptime` | Pings every `project_dev.prod_url`, records HTTP status and TLS days remaining | No rows with a production URL |
| `digest` | Emails a KPI digest to `$REPORT_RECIPIENTS` | No SMTP or no recipients |
| `all` | Runs all four. This is the default | |

The response is JSON: `{"ran": {...}}` with a per-job result, so the cron output is readable
in a mail log.

Whether the cPanel cron entry exists, and whether `$CRON_KEY` is set on the server, is
**UNVERIFIED**.

## 3. Monitoring

There is no external monitoring service. What exists is inside the application:

- **Care Plan module** (`/app/careplan`) lists projects with a production URL and shows the
  last HTTP status, TLS days remaining and check time, with an on-demand check button.
- **Uptime cron job** refreshes the same fields on a schedule.
- **`_monitor.php`** does the work: cURL for the status, the OpenSSL stream wrapper for the
  certificate expiry.
- **Notification bell** in the CMS header derives its content from overdue invoices and open
  tickets. There is no notifications table.
- **`integrations.php`** and Platform, Integrations show which integrations are configured, as
  booleans only.

There is no error tracking, no log aggregation and no alerting. PHP errors go to the host's
`error_log`, which the `.htaccess` blocks from being served.

## 4. Mail

Two paths, both through `server/_smtp.php`, which is a small built-in SMTP client with no
Composer dependency. It supports implicit SSL on 465 and STARTTLS on 587 with AUTH LOGIN, and
falls back to PHP `mail()` when no host is configured.

| Path | Trigger |
|---|---|
| Mailbox module | Staff read and reply to the studio mailbox in-app, over IMAP and SMTP |
| Automated sends | Invoice chasing, team invites, password resets, magic links, the weekly digest, and Comms email sends |

The inbox needs the PHP `imap` extension. `mail.php?action=status` reports `smtp`, `imap` and
`imap_ext` as booleans so the interface can show an accurate banner rather than failing.

## 5. Backups

**There is no backup procedure in this repository, and none is claimed.** The database and the
uploads directory both live on the host. `server/uploads/` is gitignored, so file uploads exist
in exactly one place. Backup arrangements, if any, belong to the hosting account and are
recorded in the operator's global notes.

This is worth stating plainly because it is the largest operational risk in the project:
uploaded client files have no second copy that this repository knows about (K-010). The
proposed recovery targets and the restoration test that closes this are in section 10.

## 6. Routine checks

Nothing here is automated. This is a suggested rhythm, not an implemented one.

| Cadence | Check |
|---|---|
| Each change | `npm run build`, `npm test`, and `php -l` on any touched PHP |
| Each server upload | Record the file in `docs/DEPLOYMENT.md` and confirm it responds |
| Weekly | Care Plan module for a site returning a non-2xx status or a certificate close to expiry |
| Weekly | Platform, Integrations, for a connector that has silently stopped being configured |
| Monthly | Active sessions under Platform, Security, and revoke anything unrecognised |
| Monthly | `audit.php` for unexpected actions |

## 7. Incident notes

- **A stale endpoint on the server is invisible from here.** If a feature works locally and
  fails live with a CORS error or a 404, suspect an un-uploaded or outdated PHP file before
  suspecting the code.
- **A 500 on one feature only** usually means a migration has not been run. Several endpoints
  fall back to a narrower query when a column is missing, so the failure can be partial.
- **Truncating `audit_log` resets the login throttle and every AI daily cap.** It is not a
  free cleanup.
- **`GK_DEBUG` must stay `false` in production.** With it on, PHP warnings print into the
  response body, which leaks paths and breaks JSON parsing on the client.

### Minimal incident procedure

1. Restrict the affected function.
2. Preserve the relevant logs without duplicating personal data.
3. Recover from known-good versions.
4. Investigate access or payment discrepancies.
5. Assess required notifications, with appropriate advice.
6. Verify before reopening the function.
7. Record the incident.

No secret value goes into a ticket, a log or this repository. The owner-lockout route (who
can help if the owner loses access, and where recovery information is kept outside the
repository) is an outstanding owner input, `docs/STATUS.md` section 5.

## 8. Test environment rules

Approved in D-042 and implemented for the server in D-036.

- **Nothing in a test reaches production.** UI tests use API fixtures and a network rule that
  fails any request outside local test origins. Server tests run the real PHP from a temporary
  copy of `server/` against a local database whose name must end in `_test`, and refuse any
  non-local host (`npm run test:server`, `tests/server/`).
- **Synthetic data only.** Two unrelated fake clients plus the owner and representative staff
  roles. Never an exported real client database, live mailbox credentials, copied sessions or
  live provider keys.
- **Transports off.** Email goes to a sink, payment tests use a fake provider or provider
  sandbox data, and SMS, WhatsApp and cron transports are disabled by default.
- **A permitted test environment declares its endpoints** and rejects production host names.
- Docker is optional, chosen only if it makes repeatable tests simpler. This is safety
  infrastructure, not a new hosting architecture.

## 9. Production acceptance gates

No release note may describe the system as ready to take orders until every gate below has
recorded evidence. Status on 2026-10-10: every gate is open, and production readiness is
**BLOCKED** (`docs/STATUS.md` section 1).

| Gate | Required proof before claiming readiness |
|---|---|
| Authentication | Every sign-in route honours the approved two-factor policy; one-time links expire, are consumed atomically and cannot enumerate customers; sessions revoke correctly |
| Credentials | Owner confirmation of the required rotation, active-session revocation, two-factor and recovery set-up, and seed artefact checks (K-001, K-015) |
| Deployment | Approved PHP file manifest with hashes and dates, schema version evidence, debug off, correct configuration and dependencies; client and server compatibility established (K-006) |
| Recovery | An automated or reliably scheduled backup to a protected destination, covering the database and files, with an actual restoration and checks (K-010) |
| Client isolation | Synthetic Client A and B attempts across the portal, ticket replies, files and downloads, invoices and payment links, and public tokens |
| Business integrity | Duplicate enquiry, conversion and acceptance handling; the legal quote version; accurate invoice tax and rounding; provider reconciliation |
| Publication | Edit round trip, draft privacy, consent, publish and unpublish, approved media, safe links, metadata and sitemap |
| UX and accessibility | No document overflow at the tested widths; form, keyboard and assistive-technology checks; owner and client task completion |
| Delivery | Build, tests and PHP syntax pass in CI; deploy waits for CI; the lint ratchet is enforced and then the backlog reduced; dependency advisory exposure decisions recorded (K-041) |
| Operations | Response expectations, error observation, renewal review, retention decisions, incident and owner-lockout procedure |

Each gate's scenarios are in `qa/TEST-PLAN.md` section 7. Launch does not need every optional
historical module, AdSense approval or social posting. It does need safe enquiry intake, owner
follow-up, simple booking requests, accurate quotes and invoices, scoped customer access and
messages, recoverable records and honest public content. Customer reference access cannot ship
until the authentication and ownership gates pass.

## 10. Recovery targets

**Proposed, awaiting the owner's agreement** (`docs/STATUS.md` section 5). These are targets,
not achieved service levels.

| Measure | Proposal |
|---|---|
| Recovery time (RTO) | Back within one working day |
| Recovery point (RPO) | Lose no more than 24 hours of ordinary changes. If that is too much for invoices or bookings, tighten the backup cadence |
| Retention | Rotating daily copies plus a modest weekly history, constrained by actual retention and contract requirements |

Backups are encrypted or otherwise protected, their credentials are kept separately, access is
limited, and restoration is tested periodically, not just the backup. A first restoration into
an isolated environment must check the database and uploaded files together, their
relationships and their permissions (K-010). Financial records are never deleted on an
arbitrary data-protection timer.

## 11. Production change discipline

Before any future production change, record its rollback: the previous client build, the
previous PHP files, a schema and data backup, the compatibility impact and the exact checks to
run afterwards. Additive SQL may not need reversing, but a data transformation needs a specific
restoration path. Owner approval covers a named release and its checks, not unrestricted
hosting changes. The release mechanics are in `docs/DEPLOYMENT.md`.
