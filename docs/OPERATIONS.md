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
| `npm run typecheck` | Type check only |
| `npm run docs:check` | Fails on a broken document link, or with `-- --base <ref>` on a server or schema change without its documents |
| `find server -name '*.php' -print0 \| xargs -0 -n1 php -l` | PHP syntax gate |

## 2. Scheduled jobs

`server/cron.php` is the runner. It is **not** user-authenticated. Run it from the cPanel
cron entry on the command line (2026-10-17), which needs no key and keeps the key out of the
web access logs (K-061). The path is the account's document root:

```
php /home/<account>/public_html/cron.php job=all
```

Over the web it still works, gated by a shared secret compared with `hash_equals`. Prefer the
command line; a key in a URL ends up in Cloudflare and host logs:

```
wget -qO- "https://gakinz.com/cron.php?key=<CRON_KEY>&job=all"
```

| Job | What it does | Skips when |
|---|---|---|
| `chase` | Emails a reminder for every overdue invoice | No SMTP configured |
| `billing` | Raises this month's invoice for each client with `retainer_amount > 0`. Idempotent per month | Column missing |
| `uptime` | Pings every `project_dev.prod_url`, records HTTP status and TLS days remaining | No rows with a production URL |
| `digest` | Emails a KPI digest to `$REPORT_RECIPIENTS` | No SMTP or no recipients |
| `prune` | Deletes sessions, magic links and reset links more than a day past expiry (2026-10-17, K-062). No business record is touched | Never |
| `all` | Runs all five. This is the default | |
| `retention_report` | Prints, as plain text, how many rows each proposed retention rule would affect (2026-10-19, `_retention.php`, K-062). Counts only: it never changes a row. Not part of `all` | Command line only: over the web it answers 400, even with the key |
| `retention_apply` | The retention executor (2026-10-19, `_erasure.php`). Acts on two rules only: enquiries that never became a client, older than `$RETENTION_ENQUIRY_MONTHS`, and soft-deleted files older than `$RETENTION_DELETED_FILE_DAYS`. A dry run by default: it lists the ids that would go and why others are kept. It deletes only with `--apply` AND `$RETENTION_APPLY = true` in `config.php` AND that rule's period set, then writes one `retention_apply` audit row with counts. Not part of `all` | Command line only: over the web it answers 400, even with the key. Unknown flags, or `--apply` with `--dry-run`, exit 2 |

The response is JSON: `{"ran": {...}}` with a per-job result, so the cron output is readable
in a mail log. The retention report is the exception: run it by hand when the owner wants the
figures, not from the cron entry, and it exits 1 with "Retention report failed: SQL error
<code>" if a query fails:

```
php /home/<account>/public_html/cron.php job=retention_report
```

Each rule prints "period not set (...). Nothing happens." while its `$RETENTION_*` key is
`null` or absent (`docs/PRIVACY-READINESS.md` section 6). Uploaded or run on the host:
UNVERIFIED.

The executor is also run by hand, never from the cron entry until the owner has agreed the
periods. Always read a dry run first; the output names ids only, never a name, email or file
name:

```
php /home/<account>/public_html/cron.php job=retention_apply            # dry run
php /home/<account>/public_html/cron.php job=retention_apply --apply    # deletes only if $RETENTION_APPLY = true
```

Kept items are listed by reason: `known_address` (the address is also a client's, a user's or
a contract signer's), `recent` (the enquiry or a call on it changed within the period),
`client_call`, `no_email`, `linked_asset` (a project asset checklist points at the file),
`unsafe_name`, `unsafe_path` (a directory or symlink at that name, left alone),
`shared_file` and `unlink_failed`. It exits 1 with "Retention apply stopped: SQL error
<code>" if a query fails; the item in progress is rolled back.

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

### Running the server tests on any computer

`npm run test:server` needs, on the computer itself:

- PHP 8 on the `PATH` with the `mysqli`, `curl` and `mbstring` extensions (`php -m`).
- A local MySQL 8 or MariaDB server and a database user that may create and drop databases
  whose names end in `_test`. Nothing else on that server is touched.
- The `mysql` command-line client on the `PATH`.

Defaults suit a Mac with Homebrew MariaDB and socket login as the current user. Anywhere else,
set these for the run (they are read by `tests/server/env.ts`; the host must be `localhost` or
`127.0.0.1`, and the database name must end in `_test`):

| Variable | Default | Example on Ubuntu with a password user |
|---|---|---|
| `GK_TEST_DB_HOST` | `localhost` (socket) | `127.0.0.1` |
| `GK_TEST_DB_PORT` | `3306` | `3306` |
| `GK_TEST_DB_USER` | the operating-system user | `gakinz_test` |
| `GK_TEST_DB_PASS` | empty | a local test-only password, never a production one |
| `GK_TEST_DB` | `gakinz_test` | `gakinz_test` |
| `GK_TEST_PHP_PORT`, `GK_TEST_PROVIDER_PORT` | `5191`, `5192` | set both when the defaults are taken, or to run two suites at once (for example `5395` and `5396`) |

One-time database user on Ubuntu (run as the MySQL root user; test-only credentials):

```sql
CREATE USER 'gakinz_test'@'localhost' IDENTIFIED BY '<local test password>';
GRANT ALL PRIVILEGES ON `%\_test`.* TO 'gakinz_test'@'localhost';
```

`server/config.php` and every `.env` file stay on the Mac (D-042, GEE OS two-computer rule).
The tests never read them: they write a synthetic `config.php` into a temporary folder.

**Ports and clean-up (2026-10-19, `tests/server/global-setup.ts`).** Before anything else the
setup checks that both the PHP port and the fake-provider port are free on `127.0.0.1`. If
either is busy it stops with "Port N (...) is already in use on 127.0.0.1. Stop whatever
listens there (lsof ...) or pick another port." Set `GK_TEST_PHP_PORT` and
`GK_TEST_PROVIDER_PORT` to two free ports and run again; on the Mac another project holds
5191 and 5192. `php -S` starts in its own process group (it runs with
`PHP_CLI_SERVER_WORKERS=6`), and teardown signals the whole group, waits up to 5 seconds for
the port to close, then kills it. The same clean-up runs if setup fails, and on Ctrl-C,
SIGTERM or the process exiting, so an interrupted run leaves no PHP worker on the port.
Before this change only the parent was stopped, and the orphaned workers kept answering on
the port, so a later run on the same port could silently use a stale copy of `server/`. That
is the most likely cause of the intermittent server-test failures seen during the 2026-10-19
batches (K-089). To check after a run: `lsof -nP -iTCP:<port> -sTCP:LISTEN` prints nothing.

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
| Delivery | Build, tests, PHP syntax and the documentation check pass in CI; deploy waits for CI; the lint ratchet is enforced and then the backlog reduced; dependency advisory exposure decisions recorded (K-041) |
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
