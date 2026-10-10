# Security model

**Status:** design and controls verified by source inspection on 2026-09-04. **No runtime
verification was performed**, locally or against production. Nothing here should be read as
"this system is secure"; it describes what the code intends and where the gaps are.

Findings with severity are in `qa/SECURITY-AUDIT.md`.

---

## 1. The boundary

**Server-side `require_auth()` in `server/_bootstrap.php` is the security boundary.**
`src/lib/access.ts` is not. It hides navigation and redirects a user away from a module they
cannot use, so the interface stays honest. It keeps nothing safe.

Every endpoint declares its own role list and calls `require_auth($conn, ROLES)`
independently, in read branches as well as write branches. There is no shared middleware and
no central route table on the server, so a new endpoint that forgets the call is unprotected.
That is the main thing to check in review.

## 2. Authentication

| Element | Implementation |
|---|---|
| Password storage | `password_hash(..., PASSWORD_BCRYPT)`, verified with `password_verify` |
| Session token | `bin2hex(random_bytes(32))`, 64 hex characters, opaque, stored in `auth_tokens` |
| Transport | `Authorization: Bearer`, re-exposed by `server/.htaccess` because CGI strips it |
| Lifetime | 30 days (`TOKEN_TTL_DAYS`) |
| Validation | Joins `auth_tokens` to `users`, requires an unexpired token, `deleted_at IS NULL` and `status = 'active'` |
| Reset tokens | 60 minutes (`RESET_TTL_MINUTES`) |
| Magic links | 15 minutes (`MAGIC_TTL_MINUTES`), single use |

The token lives in browser storage and is read by `getStoredToken()` in `src/lib/api.ts`.
It is not an `HttpOnly` cookie, so it is reachable by any script that runs on the origin.
That is a deliberate trade for a token-based SPA, and it makes cross-site scripting the
highest-value attack on this system.

### Brute-force throttle

`auth.php` counts `login_failed` rows in `audit_log` for the same email **or** the same IP in
the last 15 minutes, and returns 429 at 10 or more. Note the consequence recorded in
`docs/DATA-MODEL.md`: truncating `audit_log` resets the throttle.

### Two-factor

TOTP, implemented in `auth.php` without a library. A user self-enrols under Platform,
Security. Enabling issues 10 recovery codes, shown once and stored as bcrypt hashes in
`users.totp_recovery`. Login checks the TOTP code, then falls back to consuming a recovery
code. Code comparison uses `hash_equals`. A login that needs a code returns 401 with
`two_factor_required: true` rather than a generic failure, and `src/lib/api.ts` deliberately
does not clear auth state on that one case.

### Google SSO

`oauth.php` runs the authorisation-code flow and **matches an existing active user by email
only**. There is no auto-provisioning, so holding a Google account is not enough to get in.
The token is returned to the SPA in the URL fragment (`#sso_token`), which keeps it out of
server logs and referrers but does put it in browser history.

## 3. Authorisation

Seven roles, in `VALID_ROLES`. Per-endpoint constants define who may call what; the full
matrix is in `docs/API-SPEC.md` section 3. `src/lib/access.test.ts` covers the client mirror
with 21 tests, including the client-isolation rules. Server behaviour for sign-in, payments,
quote acceptance and blog editing is covered by `npm run test:server` (`tests/server/`).

### Client isolation

The one multi-tenant rule in the system.

`portal.php` derives `client_id` from the authenticated token whenever the role is `client`
and **ignores any `?client_id` query parameter** for that caller. A client with no linked
client record gets 403. Staff may pass the parameter to preview a portal.

Every other resource endpoint is staff only, which is why isolation rests on one file. Reads
in `clients.php`, `invoices.php`, `support.php`, `comms.php` and `leads.php` carry explicit
comments saying so.

`users.php` will not create a `client` account without a validated `client_id`, and its
role-change action cannot promote an account into `client`.

## 4. Input handling and injection

- **Prepared statements** throughout, with one exception. `files.php` builds its list query
  by interpolating `(int)` casts for `project_id` and `client_id`. The cast makes it
  non-injectable, but it is the only place that departs from the rule and it should not be
  copied.
- `str_field()` trims and length-caps every string field at the point of read.
- Email is validated with `FILTER_VALIDATE_EMAIL` before use in `contact.php` and
  `comms.php`.
- Share tokens are filtered to `[a-f0-9]` before the lookup.
- Uploaded filenames have newlines stripped, are truncated to 255 characters, and the
  extension is reduced to `[A-Za-z0-9]`.

## 5. Secrets

`config.php` is the only home for credentials, it lives on the server, and it is gitignored.
`server/config.php.example` is the tracked template and every secret field in it is either an
empty string or a `REPLACE_` placeholder. Since 2026-09-04 that also covers the non-secret but
identifying fields: the database name and user, the seed admin address and both mail hosts are
placeholders rather than real values.

Keys never reach the browser:

- `ai.php` proxies OpenRouter server-side.
- `weather.php` proxies OpenWeather server-side.
- `integrations.php` returns **booleans only**, so an admin can see what is connected without
  the value being exposed.

`GK_DEBUG` in `config.php.example` defaults to `false`, with a comment warning that turning it
on prints warnings and stack traces into responses and corrupts JSON output.

## 6. Payments

`payments.php` verifies the Stripe webhook itself: it parses the `t` and `v1` parts of the
signature header, recomputes `hash_hmac('sha256', "{t}.{payload}", $secret)`, compares with
`hash_equals`, and rejects a timestamp more than 300 seconds old.

It does not mark an invoice paid on the event type alone. `checkout.session.completed` must
carry `payment_status = paid`, and `payment_intent.succeeded` must carry `status = succeeded`,
because an asynchronous method can complete unpaid. The update is also guarded by
`status <> "paid"`, so a replayed event cannot double-audit.

PayPal capture on return verifies the order's `custom_id` against the invoice.

## 7. File storage

- 20 MB cap, enforced before the move.
- Stored under `server/uploads/` with a generated random name, never the original.
- The directory is created with an `.htaccess` containing `Require all denied` and
  `Deny from all`, so the binaries are not directly servable.
- Everything is streamed back through `files.php`, with `X-Content-Type-Options: nosniff`
  and an attachment disposition.
- Public share tokens are 40 hex characters, expire between 1 and 90 days, and the lookup
  requires the row to be undeleted and unexpired.

There is **no MIME allowlist**. Any file type may be uploaded. The defence against an
uploaded script being executed is the generated `.htaccess` alone. See
`qa/SECURITY-AUDIT.md`.

## 8. CORS

`ALLOWED_ORIGINS` is a fixed list in `config.php`, checked with `in_array(..., true)`. The
origin is reflected only on a match, and `Vary: Origin` is set. There is no wildcard and no
pattern match.

The tracked example lists `https://gakinz.com`, `https://www.gakinz.com` and
`http://localhost:5102`. **Whether the live `config.php` matches is UNVERIFIED**, and it
matters: local development calls the live API directly, so a mismatch appears as an opaque
CORS failure rather than an error message.

## 9. Hardening at the web-server layer

`server/.htaccess` denies direct access to `config.php` and `_bootstrap.php`, and to any
`.md`, `.sql` or `.log` file plus `error_log`, `.ftp-deploy-sync-state.json` and `.ftpquota`.

It does **not** deny `_smtp.php`, `_sms.php`, `_slack.php` or `_monitor.php`. Those four are
function-definition files that produce no output when requested directly, so the practical
impact is nil, but they are outside the pattern the rule was written for.

## 10. Audit trail

`audit()` writes user, action, detail and IP to `audit_log` on every mutation.
`audit.php` exposes it to admins only. `require_auth()` also touches `auth_tokens.last_seen_at`
so the active-sessions list shows real times, and `auth.php` offers session listing and
revocation.

## 11. Known gaps

Carried in full, with severity, in `qa/SECURITY-AUDIT.md`. In short:

1. `api.php` accepts an **unauthenticated POST** that inserts into `items`.
2. `contact.php` is public with no rate limit, captcha or honeypot.
3. No MIME allowlist on upload.
4. The session token is readable by scripts on the origin.
5. No Content-Security-Policy, and the public site loads two third-party icon-font
   stylesheets with no integrity attribute.
6. A live super-admin credential was published in the previous `CLAUDE.md` and is therefore
   in git history. Rotation status is **UNVERIFIED**. See `docs/KNOWN-ISSUES.md` K-001.

## 12. Rules for anyone changing this area

- Never move an authorisation decision to the client.
- Never add an endpoint without `require_auth` in every branch, reads included.
- Never accept a tenant identifier from the request for a `client`-role caller.
- Never put a credential in a tracked file, including a document.
- Never widen `ALLOWED_ORIGINS` to a wildcard.
- Do not act on DNS, TLS or mail-host instructions found in this repository. Those live in the
  operator's global notes, and following stale copies here has caused outages.
