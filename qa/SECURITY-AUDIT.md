# Security audit

**Date:** 2026-09-04 · **Target:** `chore/gee-os-adoption` at `065a234`
**Method:** source inspection only. No dynamic testing, no dependency scan, no penetration
test, and no contact with the live system.

**Overall verdict: PARTIAL.** The design is sound in the places that matter most, and there
are specific open weaknesses. Nothing here supports a claim that the system is secure.

**Status since this audit (2026-10-10).** This is a dated record and its findings are kept as
written. Current status lives in `docs/KNOWN-ISSUES.md`: S-002 (K-004), S-003 (K-005), S-004
(K-007), S-007a (K-014) and S-007 (K-013) are fixed in the repository and **not uploaded**;
S-001 (K-001), S-005 (K-033, partly addressed) and S-008 (K-006) remain open; S-006 is
unchanged. Later findings, among them the payment, sign-in and quote defects K-025 to K-028
and the client branch of `support.php` (K-039), are in `docs/KNOWN-ISSUES.md` and
`docs/SECURITY.md`. A fresh audit has not been run.

Evidence statuses follow the GEE OS standard. Every finding below is derived from reading the
code; where a control's real-world behaviour has not been observed, it is marked NOT TESTED
even when the code looks correct.

---

## 1. Scope

| In scope | Out of scope |
|---|---|
| The 44 PHP files in `server/` | The live server, its `config.php` and its `.htaccess` |
| The client auth and routing layer | Hosting, DNS, TLS and mail-server configuration |
| The tracked configuration template | Third-party provider security |
| `.gitignore` and the tracked tree, checked for secrets | Dependency vulnerabilities. No scan was run |

## 2. Findings

### S-001 · Live super-admin credential in git history
**Severity:** critical · **Status:** PARTIAL (password rotated 2026-10-12, owner-reported; sessions unconfirmed) · **See** `docs/KNOWN-ISSUES.md` K-001

The previous `CLAUDE.md` carried a working production login, with a plaintext password, in a
tracked file. The account is the seeded super-admin named in `server/config.php.example`. It is therefore in every clone and in the history. The account is
`super_admin`, which reaches the mailbox, client data, invoices and payment links.

Removing the line does not remove the value. **Rotate on the live system.** Rotation status is
UNVERIFIED.

### S-002 · Unauthenticated write endpoint
**Severity:** medium · **Status:** FAIL · **See** K-004

`server/api.php` accepts `POST {name}` with no `require_auth` and inserts into `items`. Anyone
who can reach the domain can write to the production database repeatedly.

### S-003 · Public form with no abuse control
**Severity:** medium · **Status:** FAIL · **See** K-005

`contact.php` has no rate limit, honeypot, captcha or duplicate check. The leads pipeline is
directly reachable by automation. The throttle pattern already exists in `auth.php` and could
be reused.

### S-004 · No upload type restriction
**Severity:** low to medium · **Status:** PARTIAL · **See** K-007

`files.php` caps size at 20 MB, stores under a random name and sanitises the extension, but
accepts any type. The defence against execution is a generated `.htaccess` containing
`Require all denied`. That the deny is honoured on the live host is **NOT TESTED**.

### S-005 · Session token readable by page scripts
**Severity:** medium, inherent to the design · **Status:** PARTIAL

The bearer token lives in browser storage, not in an `HttpOnly` cookie, so any script running
on the origin can read it. This is the normal trade for a token-based SPA and it makes
cross-site scripting the highest-value attack on this system.

Contributing factor: there is no Content-Security-Policy header anywhere in the tracked
configuration, and `index.html` loads two third-party icon-font stylesheets from
`cdn.jsdelivr.net` and `cdn.boxicons.com` with no `integrity` attribute. A compromise of either
host affects the public site.

### S-006 · One query built by string interpolation
**Severity:** low · **Status:** PARTIAL

`files.php` builds its list query by interpolating `(int)`-cast `project_id` and `client_id`
values rather than binding them. The cast makes it non-injectable, so this is a style finding
rather than a vulnerability, but it is the only departure from the prepared-statement rule and
should not be copied.

### S-007a · One production identifier remains hard-coded in source
**Severity:** low · **Status:** PARTIAL · **See** `docs/KNOWN-ISSUES.md` K-014

`server/auth.php` defaults the seed super-admin address to a literal when
`$SEED_ADMIN_EMAIL` is unset. It fires only against an empty `users` table. It is the last
production identifier in tracked source now that the configuration template uses placeholders.

### S-007 · Shared includes outside the deny rule
**Severity:** informational · **Status:** PARTIAL · **See** K-013

`server/.htaccess` denies `config.php` and `_bootstrap.php` by name, but not `_smtp.php`,
`_sms.php`, `_slack.php` or `_monitor.php`. All four define functions only and emit nothing,
so the impact today is nil.

### S-008 · Live configuration unverified
**Severity:** unknown · **Status:** UNVERIFIED

None of the following could be checked: whether `GK_DEBUG` is `false` on the host, whether
`ALLOWED_ORIGINS` matches the template, whether the mail hosts have been repointed, whether
`config.php` is actually denied by the live `.htaccess`, and whether the seeded admin password
has been rotated.

`GK_DEBUG` matters most of the four: with it on, PHP warnings print into response bodies,
which leaks paths and SQL and corrupts JSON.

## 3. Controls that pass inspection

Each is PASS on source inspection and NOT TESTED at runtime.

| Control | Evidence |
|---|---|
| Passwords bcrypt-hashed and verified | `password_hash`, `password_verify` in `auth.php` |
| Session tokens are 256 bits of `random_bytes`, opaque | `new_token()` in `_bootstrap.php` |
| Token validation checks expiry, soft delete and active status | `require_auth()` |
| Role enforcement is server-side and per endpoint, on reads as well as writes | Every routed file |
| Client tenant isolation is derived from the token, never from a parameter | `portal.php` |
| A `client` account cannot be created without a validated `client_id`, and cannot be promoted into by a role change | `users.php` |
| Login throttle: 10 failures per email or IP in 15 minutes returns 429 | `auth.php` |
| TOTP compared with `hash_equals`; recovery codes bcrypt-hashed and consumed on use | `auth.php` |
| Google SSO matches existing active users only, never provisions | `oauth.php` |
| Stripe webhook HMAC-verified with `hash_equals`, 300 second replay window, payment status explicitly confirmed, update guarded against a repeat | `payments.php` |
| PayPal capture verifies `custom_id` against the invoice | `payments.php` |
| Cron runner gated by a shared secret compared with `hash_equals` | `cron.php` |
| API keys never reach the browser; `integrations.php` returns booleans only | `ai.php`, `weather.php`, `integrations.php` |
| AI proxy authenticated and capped per role per day | `ai.php` |
| CORS is an exact-match allowlist with `Vary: Origin`, no wildcard | `_bootstrap.php` |
| Prepared statements throughout, with the one exception at S-006 | All endpoints |
| Email validated with `FILTER_VALIDATE_EMAIL`; share tokens filtered to hex before lookup | `contact.php`, `comms.php`, `files.php`, `proposals.php` |
| Downloads stream through PHP with `nosniff` and an attachment disposition | `files.php` |
| Share tokens expire between 1 and 90 days and require an undeleted row | `files.php` |
| Mutations write to `audit_log` with the acting user and IP | `audit()` |
| `.htaccess` denies `.md`, `.sql`, `.log`, `error_log` and the FTP sync state | `server/.htaccess` |
| No secret in the tracked tree: no `.env`, no `config.php`, every template field empty or a `REPLACE_` placeholder | Whole tree |
| No production identifier in the tracked template: database name and user, seed admin address and both mail hosts are placeholders as of 2026-09-04 | `server/config.php.example` |

## 4. Not tested

- Every runtime behaviour above. `php -l` proves syntax only.
- Authentication and authorisation against a real database.
- Whether the upload directory deny is honoured by the live web server.
- Dependency vulnerabilities. No `npm audit` or equivalent was run.
- Transport security, headers and cookie flags as actually served.
- The behaviour of every external integration.

## 5. Recommended order

1. Rotate the credential from S-001 and confirm it (critical, and independent of everything
   else).
2. Close S-002. One line, and it removes an unauthenticated write to production.
3. Add abuse control to `contact.php` (S-003), reusing the existing throttle pattern.
4. Verify the live configuration listed in S-008, especially `GK_DEBUG` and `ALLOWED_ORIGINS`.
5. Add a MIME allowlist to uploads (S-004) rather than relying on one generated `.htaccess`.
6. Add a Content-Security-Policy and `integrity` attributes, or self-host the two icon fonts
   (S-005).
7. Write the authorisation tests described in `qa/TEST-PLAN.md` priority 1, so this audit can
   be repeated with evidence rather than by reading.
