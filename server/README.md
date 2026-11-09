# GAkinz server files

These PHP files live in the document root on cPanel. Each release (`scripts/release.mjs`, run on a
push to `main`) uploads `server/*.php` over SSH. It never sends `config.php`, `.htaccess`,
`schema.sql`, Markdown or `*.example`: `.htaccess` changes and SQL migrations are applied by hand.

Full deploy detail is in `docs/DEPLOYMENT.md`. The endpoint contract is in `docs/API-SPEC.md`.

## One-time server setup

1. Upload everything in this folder to the document root (`/home/<cpanel_user>/gakinz.com/`),
   **except** the `*.example` templates and this README.
2. Copy `config.php.example` to `~/private-config/gakinz_com/config.php` on the server (mode 600) and fill in
   the real values; save `config.stub.php.example` in the document root as `config.php` (docs/DEPLOYMENT.md section 3).
   **Never commit `config.php`.** Every field in the template is empty or a `REPLACE_`
   placeholder, including the database name and user, the seed admin address and both mail
   hosts. Fill them on the server only. The mail server hostname is a hosting fact and is not
   recorded in this repository; read it from the operator's hosting notes.
3. In cPanel, phpMyAdmin, run `schema.sql` against the project database. Then run the
   migration statements at the foot of that file that apply to your database. **There is no
   migration runner**, so nothing is applied until you run it.
4. Create `uploads/` in the document root and make it writable. `files.php` creates it and
   drops a deny-all `.htaccess` on first use, but pre-creating it avoids a permissions
   surprise.
5. Confirm `https://gakinz.com/api.php` returns `{"ok":true,"php":"...","db":true}`. That single
   GET proves PHP is running and `config.php` reaches the database. It is read-only and writes
   nothing, so it is safe to call at any time. A `db` of anything other than `true`, or a 500,
   means the credentials in `config.php` are wrong or the database is unreachable.

> The old step 6, "visit `https://gakinz.com/smoke`", has been removed. That route and its
> page no longer exist; they were deleted with the rest of the demo surface.

## Files

One PHP file per resource, plus shared includes with a leading underscore that have no route
of their own and are denied to direct requests by `.htaccess`. The file count is in
`docs/STATUS.md` section 0.

| File | Purpose |
|---|---|
| `config.php.example` | Template for the private `config.php` outside the web root. Placeholders only, never real values. Copy it; never commit the filled copy |
| `config.stub.php.example` | The document-root `config.php`: no secrets, it only `require`s the private file (added 2026-11-01) |
| `_bootstrap.php` | Shared CORS, JSON helpers, `require_auth()`, `audit()`. Provides `$conn` |
| `_smtp.php` | Built-in SMTP client, SSL on 465 or STARTTLS on 587, `mail()` fallback |
| `_sms.php` | Twilio transport for SMS and WhatsApp |
| `_slack.php` | Slack incoming webhook, best effort |
| `_monitor.php` | HTTP status and TLS expiry check for the care plan |
| `_money.php` | The single VAT-inclusive payable-total calculation used by `payments.php` and, since 2026-10-18, by `invoices.php` to check a manual payment |
| `_ics.php` | Builds the RFC 5545 calendar file for a confirmed call (escaping, 75-octet folding, UTC times). Required by `bookings.php` on its calendar routes, so upload the two together (2026-10-18) |
| `_like.php` | Literal substring matching for `LIKE`, with `!` as the escape so it reads the same under any `sql_mode`. Required by `search.php`; upload the two together (2026-10-19) |
| `_ai.php` | The AI providers for `ai.php`: Anthropic first, OpenRouter when Anthropic has no key or fails (D-054). Required by `ai.php` and `integrations.php`; a release uploads all three together (2026-11-01) |
| `_retention.php` | The read-only retention dry run: counts what each proposed rule would affect, never deletes. Used by `privacy.php` and `cron.php job=retention_report`, and required by `_erasure.php`; upload them together (2026-10-19). Without it the report answers 503 (web) or exits 1 (command line) |
| `_uploads.php` | `UPLOAD_DIR` and `stored_path()`, the one rule for where an uploaded file lives. Required by `files.php` on every route, the public Work image links included, and by `_erasure.php`: upload it **before** `files.php` (2026-10-19) |
| `_reference.php` | Work references `GK-E-YYYY-NNNN` and `GK-P-YYYY-NNNN` from `reference_counters` (SQL 19). Loaded only if present by `contact.php`, `leads.php`, `projects.php`, `proposals.php`, `invoices.php`, `contracts.php` and `search.php`, and by `support.php` when it creates the IT support project; without it every reference is `null` and records are created as before. Never reads a reference from a request (2026-10-19). The only endpoint that takes one as input is `client_access.php`, and only while switched on, to decide whether to email a sign-in link |
| `_erasure.php` | Erasing one prospect's enquiry (`privacy.php?action=erase_enquiry`, super admin, typed confirmation) and the gated retention executor (`cron.php job=retention_apply`). The only code that hard-deletes personal data. Requires `_retention.php`, `_uploads.php` and `_like.php`; without any of the four, the erase routes answer 503 (2026-10-19) |
| `_time.php` | The shared time entry rules and the SQL 17 check, loaded on first use by `time.php` and `support.php`. Upload it with or before them, or time logging answers 503 (2026-10-19) |
| `_templates.php` | The five project templates, pure data, loaded on first use by `projects.php`; without it only the template routes answer 503 (2026-10-19) |
| `api.php` | Unauthenticated read-only health check: confirms PHP runs and the database answers. No writes, no application tables |
| `contact.php` | Public enquiry form, writes to `enquiries` |
| `verify.php` | Public certificate check (Phase 6, D-058): one uniform 404 for a revoked, unknown or malformed reference, `no-store`, and 429 after 20 misses in 10 minutes from one connection |
| `certificates.php` | Issue, list and revoke certificates (super admin and admin, 2026-11-09). References are `GK-XXXX-XXXX-XXXX`, random, 60 bits |
| `book.php` | Public. Returns the configured Calendly URL, or empty |
| `auth.php` | `me` only: the signed-in user and their own app two-factor flag. Sign-in itself is Clerk (`_clerk.php`); every former action answers 404 (retired 2026-11-09, D-057) |
| `oauth.php`, `client_access.php` | Retired 2026-11-09 (D-057): 404 JSON stubs, kept because a release never deletes server files |
| `users.php`, `audit.php`, `integrations.php` | Platform administration. Admins only |
| `leads.php`, `clients.php`, `bookings.php`, `proposals.php`, `contracts.php` | Sales. `bookings.php` also has a client branch for portal call requests and the client's own calendar file (2026-10-18), security-critical |
| `projects.php`, `tasks.php`, `design.php`, `dev.php`, `resourcing.php`, `time.php`, `careplan.php`, `files.php`, `assets.php`, `briefs.php` | Delivery. `assets.php` (2026-10-18) is the project asset checklist, with a client branch to list and supply items, security-critical. `briefs.php` (2026-10-19, SQL 16) is the project brief, measurements and the sanitised GEE OS handoff, staff only. Since 2026-10-19 `files.php` also has a client branch (`mine`, `mine_download`, SQL 18), security-critical, and `projects.php` creates projects from templates |
| `today.php`, `search.php` | Daily work (2026-10-19), read only, staff only: the Today attention list and record search. Each gates every section or record type by the role constant of the endpoint that owns the data |
| `privacy.php` | Subject access export (super_admin, admin) and the retention report (super_admin), 2026-10-19, and the prospect erase with its read-only preview (super_admin, 2026-10-19, through `_erasure.php`) |
| `invoices.php`, `payments.php`, `reports.php` | Money |
| `portal.php`, `support.php`, `feedback.php`, `comms.php`, `mail.php` | Client-facing. `portal.php` and the client branches of `support.php` and `feedback.php` serve `client`-role callers and are security-critical |
| `blog.php`, `testimonials.php`, `content.php`, `knowledge.php`, `announcements.php`, `work.php`, `site.php` | Content. `work.php` also serves the public work ledger and the homepage hero; `site.php` serves published site copy publicly and drafts to editors |
| `ai.php` | AI proxy: Anthropic first, OpenRouter as backup (`_ai.php`, D-054). Staff roles only, capped per role per day. Keys stay server-side |
| `weather.php` | Retired 2026-11-01: a stub that answers 404, kept so a release replaces the old live copy |
| `github.php`, `figma.php`, `slack.php` | External connectors |
| `cron.php` | Scheduled jobs. Gated by `$CRON_KEY`, not by a user session. `job=retention_report` and `job=retention_apply` run from the command line only (2026-10-19). `retention_apply` is a dry run unless `--apply` is passed **and** `$RETENTION_APPLY = true` **and** the rule's period is set; it is not part of `job=all` |
| `schema.sql` | Every table, plus the migration statements as comments in the `MIGRATIONS` block and dated blocks at the foot |
| `.htaccess` | SPA routing, the `Authorization` header pass-through, and hardening: denies `config.php`, every `_*.php` include, and `.md`, `.sql`, `.log` and `.txt` files other than `robots.txt` and `llms.txt`; since 2026-11-01 also dotfiles, backup copies, `*.example` and `config.php.*`, and a one-year cache for the hashed `/assets/` files. Since 2026-10-19 a request for a `.php` file that does not exist answers 404 instead of the SPA shell |

## Adding endpoints

One PHP file per resource. Each starts with `require __DIR__ . '/_bootstrap.php';`, calls
`require_auth($conn, ROLES)` in **every** branch including reads, uses prepared statements,
returns JSON through `ok()` and `fail()`, calls `audit()` on every mutation, and handles
`OPTIONS` (which `_bootstrap.php` answers with 204 before your code runs).

Before uploading anything:

```bash
find server -name '*.php' -print0 | xargs -0 -n1 php -l
```

Then record the file in `docs/DEPLOYMENT.md` section 5 and describe it in `docs/API-SPEC.md`.
The deploy pipeline will not ship it, and `npm run docs:check` fails a pull request that
changes server code without touching `docs/DEPLOYMENT.md`.
