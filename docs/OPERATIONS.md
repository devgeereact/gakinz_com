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
pnpm install          # first time
pnpm run dev          # http://localhost:5102
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
| `pnpm run dev` | Vite dev server, port 5102 |
| `pnpm run build` | `tsc -b` then `vite build`, output to `dist/` |
| `pnpm run preview` | Serve the built output, port 5102 |
| `pnpm test` | Vitest unit tests, single run |
| `pnpm run test:watch` | Vitest, watch mode |
| `pnpm run test:server` | PHP endpoints against a throwaway local `*_test` database (section 8) |
| `pnpm run lint` | Fails on any lint error or warning |
| `pnpm run typecheck` | Type check only |
| `pnpm run docs:check` | Fails on a broken document link, or with `-- --base <ref>` on a server or schema change without its documents |
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

### 2.1 Adding the cron entry (owner decision, K-145)

**Done 2026-11-10 (owner's "do these"):** the host's crontab now has `15 6 * * * php ~/gakinz.com/cron.php job=all` and the daily backup at 03:30 (server time is EST, UTC-5; the script names `/usr/local/bin/php` because cron's PATH finds the CGI build; the first scheduled run on 2026-11-10 failed for that reason and was fixed; crontab saved first as `~/backups/gakinz_com/crontab.before-gakinz-entries.*`). Before that (read-only `crontab -l`, 2026-11-09) there was no GAkinz entry, so none of the jobs below ran. The two-step plan below was collapsed into one because the database held 0 clients, 0 invoices and 0 retainers, so the first `job=all` could email and bill nobody (counts read first; it was run once by hand: `chase` 0 sent, `billing` 0 created, `uptime` 0 checked, `digest` skipped for want of `$REPORT_RECIPIENTS`). **Re-read the "before switching" checks the day a first client or invoice exists.** The digest stays off until `$REPORT_RECIPIENTS` is set.

For reference, the original reasoning: Since
2026-11-10 Today shows a notice naming what is off, and every run of `cron.php` leaves a `cron_run` audit row that
counts for the job it names, or for all five when it is `all` (a job returns to the notice if none is seen for 36 hours). Adding the entry is a server change and, with
`job=all`, switches on emails to clients and retainer billing, so do it in two steps. cPanel, Cron Jobs; the path is
the account's document root (not stated here):

1. **Prove the plumbing, touching nothing.** Daily at 02:00: `php /home/<account>/public_html/cron.php job=prune`.
   After one run the clean-up job leaves Today's notice and Settings, Audit shows a `cron_run` row with detail `prune`; the other four jobs stay listed as off, which is true.
2. **Before switching to `job=all`, check what its first run will do:**
   - Every overdue invoice whose client has an email address gets a payment reminder at the first run (then one per
     `$CHASE_INTERVAL_DAYS`). Open Invoicing, filter Overdue, and decide that each should be chased.
   - Every client with a monthly retainer amount above zero gets this month's invoice raised (once per month).
   - The weekly digest goes to `$REPORT_RECIPIENTS`; `$SMTP_*` must work (send a test from Mail).
3. **Then change the line to `job=all`** (same time); the notice clears once every job is seen. Keep `retention_apply` out of it. A line that runs more often than daily is fine: heartbeats are written at most once per job per 10 minutes.

To leave the jobs off on purpose, add nothing: the notice on Today stays, which is the honest state.

| Job | What it does | Skips when |
|---|---|---|
| `chase` | Emails one reminder per overdue invoice, at most once per `$CHASE_INTERVAL_DAYS` (optional config key, 1 to 90, default 7). A reminder sent by hand from Invoicing counts. The memory is the audit log (`cron_chase` and `invoice_chase` rows), so there is no schema change; a retention rule that deletes audit rows sooner than the interval would let a reminder repeat. Runs under the named lock `gk_cron_chase`; a failed send writes no row, so the next run retries. Result `{sent, skipped, already_reminded}` (2026-11-09, Phase 7, D-059) | No SMTP configured |
| `billing` | Raises this month's invoice for each client with `retainer_amount > 0`. Idempotent per month | Column missing |
| `uptime` | Pings every `project_dev.prod_url`, records HTTP status and TLS days remaining | No rows with a production URL |
| `digest` | Emails a KPI digest to `$REPORT_RECIPIENTS`, at most once every 6 days (a `cron_digest` audit row is the memory), under the lock `gk_cron_digest`. A daily `job=all` therefore mails it weekly (2026-11-09, D-059) | No SMTP or no recipients, or already sent this week |
| `prune` | Deletes legacy sessions, magic links and reset links more than a day past expiry (2026-10-17, K-062). Since 2026-11-09 (D-057) nothing writes those rows, so it only clears the soak backlog; it stays until the tables are dropped in Phase 9. No business record is touched | Never |
| `all` | Runs all five. This is the default | |
| `retention_report` | Prints, as plain text, how many rows each proposed retention rule would affect (2026-10-19, `_retention.php`, K-062). Counts only: it never changes a row. Not part of `all` | Command line only: over the web it answers 400, even with the key |
| `retention_apply` | The retention executor (2026-10-19, `_erasure.php`). Acts on two rules only: enquiries that never became a client, older than `$RETENTION_ENQUIRY_MONTHS`, and soft-deleted files older than `$RETENTION_DELETED_FILE_DAYS`. A dry run by default: it lists the ids that would go and why others are kept. It deletes only with `--apply` AND `$RETENTION_APPLY = true` in `config.php` AND that rule's period set, then writes one `retention_apply` audit row with counts. Not part of `all` | Command line only: over the web it answers 400, even with the key. Unknown flags, or `--apply` with `--dry-run`, exit 2 |

The response is JSON: `{"ran": {...}}` with a per-job result, so the cron output is readable
in a mail log. The retention report is the exception: run it by hand when the owner wants the
figures, not from the cron entry, and it exits 1 with "Retention report failed: SQL error
<code>" if a query fails, or with "retention_report is not available on this server yet:
_retention.php is missing." if that include is not uploaded (2026-10-19):

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
`linked_work` (a Work cover, hero image or gallery image uses it), `unsafe_name`,
`unsafe_path` (a symlink, even to another file in `uploads/`, a directory or anything but
that plain file at that name: left alone and never followed), `shared_file` and
`unlink_failed`. If `uploads/` is missing or cannot be read and written, the files rule
reports that and does nothing, so rows are never deleted as "missing". It exits 1 with
"Retention apply stopped: ..." if anything fails; the item in progress is rolled back, and
the `retention_apply` audit row still records what was already deleted, with
`"stopped": true`. If writing that audit row fails as well, the run's own error is still the
one reported, and the host error log gets "GAkinz retention apply: could not write the audit
row (SQL error N)." If `_erasure.php`, `_retention.php`, `_uploads.php` or `_like.php` is not
on the server, it exits 1 saying so and deletes nothing. A dry run writes no audit row, so
there is no record in the application of who ran one or when (`docs/KNOWN-ISSUES.md` K-098).
Leave `$RETENTION_APPLY = false` until the owner and an adviser agree the periods
(`docs/STATUS.md` section 5). How the cPanel cron's PHP binary reports `PHP_SAPI` and passes
the arguments, which the command-line-only check relies on, is NOT TESTED on the host.

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
| Automated sends | Invoice chasing, team invites (a plain "sign in with this email" message), the weekly digest, and Comms email sends |

The inbox needs the PHP `imap` extension. `mail.php?action=status` reports `smtp`, `imap` and
`imap_ext` as booleans so the interface can show an accurate banner rather than failing.

## 5. Backups

**Until 2026-11-10 no daily GAkinz backup existed on the host** (found by listing `~/backups/gakinz_com/`: only the two
manual dumps of 2026-10-30; the daily jobs in the crontab belong to other projects). Since then `scripts/gakinz-backup.sh`
is installed as `~/gakinz-backup.sh` and run daily by cron: a `mariadb-dump` of the one database (single transaction, so
the site is not locked), checked for the "Dump completed" marker and a sane size, plus a tarball of `~/gakinz.com/uploads`,
mode 600, into `~/backups/gakinz_com/` as `gakinz_auto_db_<UTC>.sql.gz` and `gakinz_auto_files_<UTC>.tar.gz`; the newest
14 days of its own files are kept, nothing else is deleted, and a failed run says why in `backup.log` and deletes nothing.
Its output on the first run: dump 9.1 KB, uploads tarball 125 bytes (the uploads folder is empty: no client file has been
uploaded yet).

**Not done by it:** a copy off the host. Pull the newest dump to the Mac and run the drill (below) when you want one:
`scp cpanel:backups/gakinz_com/gakinz_auto_db_*.sql.gz ~/Backups/projects/gakinz_com/local-state/` then
`pnpm run drill:restore`. A same-account backup does not survive loss of the account; the Mac copy is what does.

The **restore drill**, `pnpm run drill:restore` (`scripts/restore-drill.mjs`), loads a dump into a throwaway local
database, compares the tables with `schema.sql`, counts rows and checks for orphaned rows, then drops the database. It
refuses an empty or truncated dump. Run it after any change to the backup arrangement and at least quarterly. Its result
goes in section 10.1.

## 6. Routine checks

Nothing here is automated. This is a suggested rhythm, not an implemented one.

| Cadence | Check |
|---|---|
| Each change | `pnpm run build`, `pnpm test`, and `php -l` on any touched PHP |
| Each server upload | Record the file in `docs/DEPLOYMENT.md` and confirm it responds |
| Weekly | Care Plan module for a site returning a non-2xx status or a certificate close to expiry |
| Weekly | Platform, Integrations, for a connector that has silently stopped being configured |
| Monthly | Signed-in devices in Clerk's account panel (My account, Sign-in security), and revoke anything unrecognised. Sessions are Clerk's since 2026-11-09 (D-057) |
| Monthly | `audit.php` for unexpected actions. `certificate_issue` and `certificate_revoke` should each match something you did; a run of `certificate_lookup_miss` from one IP is someone guessing references (the throttle stops them at 20 in 10 minutes) |

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
  non-local host (`pnpm run test:server`, `tests/server/`).
- **Synthetic data only.** Two unrelated fake clients plus the owner and representative staff
  roles. Never an exported real client database, live mailbox credentials, copied sessions or
  live provider keys.
- **Transports off.** Email goes to a sink, payment tests use a fake provider or provider
  sandbox data, and SMS, WhatsApp and cron transports are disabled by default.
- **A permitted test environment declares its endpoints** and rejects production host names.
- Docker is optional, chosen only if it makes repeatable tests simpler. This is safety
  infrastructure, not a new hosting architecture.

### Running the server tests on any computer

`pnpm run test:server` needs, on the computer itself:

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
| `GK_TEST_DB_PORT` | `3306` | `3306` (read by both the `mysql` client and the PHP config) |
| `GK_TEST_DB_USER` | the operating-system user | `gakinz_test` |
| `GK_TEST_DB_PASS` | empty | a local test-only password, never a production one |
| `GK_TEST_DB` | `gakinz_test` | `gakinz_test` |
| `GK_TEST_PHP_PORT`, `GK_TEST_PROVIDER_PORT` | `5191`, `5192` | set both when the defaults are taken, or to run two suites at once (for example `5395` and `5396`) |

One-time database user on Ubuntu (run as the MySQL root user; test-only credentials):

```sql
CREATE USER 'gakinz_test'@'localhost' IDENTIFIED BY '<local test password>';
GRANT ALL PRIVILEGES ON `%\_test`.* TO 'gakinz_test'@'localhost';
```

**Running the suite against MySQL 8 in Docker (2026-10-20).** Since `6de6baa` the synthetic
`config.php` passes `GK_TEST_DB_PORT` to `mysqli` as the fifth argument, so the PHP side and the
`mysql` client agree on the port (before that the PHP side always used 3306 and every login
failed with "Test database connection failed"). On the Mac, Docker needs colima:

```sh
colima start
docker run -d --name gk-mysql8 -e MYSQL_ROOT_PASSWORD=<local test password> \
  -p 127.0.0.1:3308:3306 mysql:8.0 --default-authentication-plugin=mysql_native_password
GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3308 GK_TEST_DB_USER=root \
  GK_TEST_DB_PASS=<local test password> GK_TEST_DB=gakinz_mysql8_test \
  GK_TEST_PHP_PORT=5427 GK_TEST_PROVIDER_PORT=5428 pnpm run test:server
docker rm -f gk-mysql8 && colima stop
```

Use a host other than `localhost` (`127.0.0.1`), because a socket ignores the port. The
2026-10-20 run on MySQL 8.0.46 passed 519 of 519 tests in about nine minutes. Expect one
warning, the `VALUES()` deprecation (code 1287); a "reference probe failed: database error
1356" line in `php-error.log` comes from a deliberate probe-failure test. MySQL 5.7 has not
been run. Remove the container afterwards so nothing keeps listening.

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
| Authentication | Sign-in is Clerk only (D-057); the retired `auth.php` actions, `oauth.php` and `client_access.php` answer 404; an unknown email gets no access; sessions revoke in Clerk |
| Credentials | Owner confirmation of the required rotation, active-session revocation, Clerk two-factor and recovery set-up, and seed artefact checks (K-001, K-015) |
| Deployment | Approved PHP file manifest with hashes and dates, schema version evidence, debug off, correct configuration and dependencies; client and server compatibility established (K-006) |
| Recovery | An automated or reliably scheduled backup to a protected destination, covering the database and files, with an actual restoration and checks (K-010) |
| Client isolation | Synthetic Client A and B attempts across the portal, ticket replies, files and downloads, invoices and payment links, and public tokens |
| Business integrity | Duplicate enquiry, conversion and acceptance handling; the legal quote version; accurate invoice tax and rounding; provider reconciliation |
| Publication | Edit round trip, draft privacy, consent, publish and unpublish, approved media, safe links, metadata and sitemap |
| UX and accessibility | No document overflow at the tested widths; form, keyboard and assistive-technology checks; owner and client task completion |
| Delivery | Build, tests, PHP syntax and the documentation check pass in CI; deploy waits for CI; lint is a plain gate (the backlog is cleared, K-002); dependency advisory exposure decisions recorded (K-041) |
| Operations | Response expectations, error observation, renewal review, retention decisions, incident and owner-lockout procedure |

Each gate's scenarios are in `docs/VERIFICATION.md` (Test plan section 7). Launch does not need every optional
historical module, AdSense approval or social posting. It does need safe enquiry intake, owner
follow-up, simple booking requests, accurate quotes and invoices, scoped customer access and
messages, recoverable records and honest public content. Customer reference access cannot ship
until the authentication and ownership gates pass.

## 10. Recovery targets

**Agreed 2026-11-10** (the owner delegated the choice: "decide for me"; D-062). These are targets,
not achieved service levels.

| Measure | Target |
|---|---|
| Recovery time (RTO) | Back within one working day |
| Recovery point (RPO) | Lose no more than 24 hours of ordinary changes. If that is too much for invoices or bookings, tighten the backup cadence |
| Retention | Rotating daily copies plus a modest weekly history, constrained by actual retention and contract requirements |

Backups are encrypted or otherwise protected, their credentials are kept separately, access is
limited, and restoration is tested periodically, not just the backup. A first restoration into
an isolated environment must check the database and uploaded files together, their
relationships and their permissions (K-010). Financial records are never deleted on an
arbitrary data-protection timer.

## 10.2 Giving a client portal access

A client record alone cannot sign in. Three things must all exist, and the first live attempt (2026-11-10) stopped at the third:

1. **The client record** (Clients, or Convert on an enquiry).
2. **A CMS client account** (Settings, then add a user: role `Client`, linked to that client, same email). It carries no password. `portal.php` trusts its `client_id` for isolation.
3. **A Clerk user with the same email.** The production Clerk instance has `sign_up_mode: restricted`, so Clerk answers "Couldn't find your account" to anyone not created there, and the sign-in code is never sent. Create the user in the Clerk dashboard (Users, Create user, email only), or send a Clerk invitation. `server/_clerk.php` then links the Clerk user to the account by verified email on first sign-in.

Removing access is the reverse: delete the CMS client account, then the Clerk user. Nothing creates any of these automatically (parked: a "Grant portal access" button that does steps 2 and 3, and a clearer message than Clerk's for someone who is not set up).

## 11. Production change discipline

Before any future production change, record its rollback: the previous client build, the
previous PHP files, a schema and data backup, the compatibility impact and the exact checks to
run afterwards. Additive SQL may not need reversing, but a data transformation needs a specific
restoration path. Owner approval covers a named release and its checks, not unrestricted
hosting changes. The release mechanics are in `docs/DEPLOYMENT.md`.

### 10.1 Restore drill record

| Date | Dump | Result |
|---|---|---|
| 2026-11-10 | `gakinz_db_20261030_005611.sql.gz`, the Mac copy of the host's dump (10.6 KB, 10 days old) | **Database restored: PASS.** `pnpm run drill:restore` loaded it into a throwaway local MariaDB 11.4.13 in 2.1 s: 42 of 42 tables from `schema.sql`, none missing or extra, 88 rows (audit_log 45, auth_tokens 32, enquiries 1, posts 3, reference_counters 3, testimonials 3, users 1), 0 orphaned rows in seven relationship checks. **Not covered:** the uploaded files, file permissions, the host's own current copies (the Mac copy is 10 days old, so the host job may be newer), and whether the daily job is still running. Recovery targets above are still **proposed, not agreed**. |

| 2026-11-10 (later) | `gakinz_auto_db_20261110_074511.sql.gz`, taken on the host by the new `gakinz-backup.sh`, pulled to the Mac | **Database restored: PASS** on the host's own newest dump (0 days old): 42 of 42 tables, 60 rows (audit_log 48, enquiries 1, posts 3, reference_counters 3, testimonials 3, users 2), 0 orphans, 2.0 s. **Uploads:** the folder on the host is empty (the files tarball is 125 bytes), so there is nothing to restore yet. Recovery targets: the daily job makes RPO 24 hours true; they still need the owner's yes. |

The dump header names the server that produced it, `11.4.13-MariaDB-cll-lve` with source database
`devgeereact_gakinz_com`: that is the live engine as at 2026-10-30 (K-099), MariaDB and not MySQL.

K-010: the targets are agreed (back within one working day, lose at most 24 hours; the daily 03:30 job supports that). What is
left: once client files exist, try a restore of the files tarball too, and copy dumps off the host (they still sit only on it
and in the Mac copies pulled by hand).

