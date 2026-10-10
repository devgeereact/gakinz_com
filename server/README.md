# GAkinz server files (placed by hand, NOT auto-deployed)

The GitHub Actions deploy uploads **only `dist/`**. These PHP and configuration files live in
the document root on cPanel and are uploaded by hand, then left alone by deploys.

Full deploy detail, including the outstanding-upload list and the outstanding SQL, is in
`docs/DEPLOYMENT.md`. The endpoint contract is in `docs/API-SPEC.md`.

## One-time server setup

1. Upload everything in this folder to the document root (`/home/<cpanel_user>/gakinz.com/`),
   **except** `config.php.example` and this README.
2. Copy `config.php.example` to `config.php` on the server and fill in the real values.
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

44 PHP files. The five with a leading underscore are shared includes with no route of their
own.

| File | Purpose |
|---|---|
| `config.php.example` | Template for `config.php`. Placeholders only, never real values. Copy it; never commit the filled copy |
| `_bootstrap.php` | Shared CORS, JSON helpers, `require_auth()`, `audit()`. Provides `$conn` |
| `_smtp.php` | Built-in SMTP client, SSL on 465 or STARTTLS on 587, `mail()` fallback |
| `_sms.php` | Twilio transport for SMS and WhatsApp |
| `_slack.php` | Slack incoming webhook, best effort |
| `_monitor.php` | HTTP status and TLS expiry check for the care plan |
| `api.php` | Unauthenticated read-only health check: confirms PHP runs and the database answers. No writes, no application tables |
| `contact.php` | Public enquiry form, writes to `enquiries` |
| `verify.php` | Public certificate verification |
| `book.php` | Public. Returns the configured Calendly URL, or empty |
| `auth.php` | Login, session, reset, two-factor, magic link, sessions and revoke |
| `oauth.php` | Google SSO. Matches existing active users only |
| `users.php`, `audit.php`, `integrations.php` | Platform administration. Admins only |
| `leads.php`, `clients.php`, `proposals.php`, `contracts.php` | Sales |
| `projects.php`, `tasks.php`, `design.php`, `dev.php`, `resourcing.php`, `time.php`, `careplan.php`, `files.php` | Delivery |
| `invoices.php`, `payments.php`, `reports.php` | Money |
| `portal.php`, `support.php`, `comms.php`, `mail.php` | Client-facing |
| `blog.php`, `testimonials.php`, `content.php`, `knowledge.php`, `announcements.php` | Content |
| `ai.php` | OpenRouter proxy. Staff roles only, capped per role per day. The key stays server-side |
| `weather.php` | OpenWeather proxy. Staff roles only, cached 10 minutes. The key stays server-side |
| `github.php`, `figma.php`, `slack.php` | External connectors |
| `cron.php` | Scheduled jobs. Gated by `$CRON_KEY`, not by a user session |
| `schema.sql` | All 34 tables, plus the migration statements as comments from line 291 and dated blocks at the foot |
| `.htaccess` | SPA routing, the `Authorization` header pass-through, and basic hardening |

## Adding endpoints

One PHP file per resource. Each starts with `require __DIR__ . '/_bootstrap.php';`, calls
`require_auth($conn, ROLES)` in **every** branch including reads, uses prepared statements,
returns JSON through `ok()` and `fail()`, calls `audit()` on every mutation, and handles
`OPTIONS` (which `_bootstrap.php` answers with 204 before your code runs).

Before uploading anything:

```bash
find server -name '*.php' -print0 | xargs -0 -n1 php -l
```

Then record the file in `docs/DEPLOYMENT.md`. The deploy pipeline will not ship it.
