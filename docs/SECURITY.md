# Security model

**Status:** design and controls verified by source inspection, last brought up to date on
2026-10-10 for the branches stacked into PR #8. Sign-in, payments, quote acceptance, My account
and client isolation in `support.php` are also covered by local server tests against a
synthetic database (`npm run test:server`). **Nothing was verified against production**, and
none of the 2026-09-22 or 2026-10-10 server changes is known to be uploaded
(`docs/DEPLOYMENT.md` section 5). Nothing here should be read as
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
| Session token | `bin2hex(random_bytes(32))`, 64 hex characters, opaque. Since 2026-10-17 only a hash is stored (`token_hash()` in `_bootstrap.php`, the first 62 hex characters of SHA-256), for sessions, reset links and magic links; rows written raw before that still match until they expire (K-059) |
| Transport | `Authorization: Bearer`, re-exposed by `server/.htaccess` because CGI strips it |
| Lifetime | 30 days (`TOKEN_TTL_DAYS`) |
| Validation | Joins `auth_tokens` to `users`, requires an unexpired token, `deleted_at IS NULL` and `status = 'active'` |
| Reset tokens | 60 minutes (`RESET_TTL_MINUTES`) |
| Two-factor codes | One use each: the accepted 30-second step is stored in `users.totp_last_step` and an equal or earlier step is refused, once SQL 12 has run (K-057) |
| Magic links | 15 minutes (`MAGIC_TTL_MINUTES`), single use, claimed by a guarded `UPDATE`. `client` role only (`MAGIC_ROLES`), never for an account with two-factor on (K-027) |

The token lives in browser storage and is read by `getStoredToken()` in `src/lib/api.ts`.
It is not an `HttpOnly` cookie, so it is reachable by any script that runs on the origin.
That is a deliberate trade for a token-based SPA, and it makes cross-site scripting the
highest-value attack on this system (K-033).

The idle lock screen is a `sessionStorage` flag, not a sign-out. Since 2026-10-10 a successful
unlock revokes the previous token through `auth.php?action=logout`, and a wrong password on the
lock screen no longer clears the session (client change, not deployed).

### Brute-force throttle

`auth.php` counts `login_failed` rows in `audit_log` for the same email **or** the same IP in
the last 15 minutes, and returns 429 at 10 or more. Note the consequence recorded in
`docs/DATA-MODEL.md`: truncating `audit_log` resets the throttle.

### Two-factor

TOTP, implemented in `auth.php` without a library. Every role, client included, self-enrols
under My account (`/app/account`, K-024); the self-service actions act on the caller's own
account only. Enabling issues 10 recovery codes, shown once and stored as bcrypt hashes in
`users.totp_recovery`. Login checks the TOTP code, then falls back to consuming a recovery
code. Code comparison uses `hash_equals`. A login that needs a code returns 401 with
`two_factor_required: true` rather than a generic failure, and `src/lib/api.ts` deliberately
does not clear auth state on that one case.

### Google SSO

`oauth.php` runs the authorisation-code flow and **matches an existing active user by email
only**. There is no auto-provisioning, so holding a Google account is not enough to get in. It
refuses an account with two-factor on (K-027), carries a CSRF `state` parameter in a
short-lived HttpOnly cookie, and validates the id_token's `aud` and `iss`.
The token is returned to the SPA in the URL fragment (`#sso_token`), which keeps it out of
server logs and referrers but does put it in browser history.

## 3. Authorisation

Seven roles, in `VALID_ROLES`. Per-endpoint constants define who may call what; the full
matrix is in `docs/API-SPEC.md` section 3. `src/lib/access.test.ts` covers the client mirror,
including the client-isolation rules. Server behaviour for sign-in, payments, quote
acceptance, blog editing, My account and the `support.php` client branch is covered by
`npm run test:server` (`tests/server/`). Test counts are in `docs/STATUS.md` section 0.

### Client isolation

The one multi-tenant rule in the system.

Five files serve or accept client data from a `client`-role caller: `portal.php`, and the
client branches of `support.php`, `feedback.php`, `bookings.php` and `assets.php`. All are
**security-critical**: any change to one needs isolation tests with at least two synthetic
clients.

- `portal.php` derives `client_id` from the authenticated token whenever the role is `client`
  and **ignores any `?client_id` query parameter** for that caller. A client with no linked
  client record gets 403. Staff preview is restricted to super_admin, admin and manager.
- `support.php` has had a client branch since 2026-10-10 (K-039). It derives `client_id` from
  the token the same way, repeats the `client_id` condition in every query including replies,
  answers 404 for another client's ticket exactly as for a missing one, refuses status,
  priority and assignee changes, and shows staff replies as "GAkinz". The branch runs first and
  always ends the request, so a client never reaches the staff branches.
  `tests/server/support-client.test.ts` covers list, detail, create and reply.
  Since 2026-10-18 the same branch has `update_request` `{question, project_id?}`: an
  ordinary `normal` ticket whose subject the server builds as "Update request: ...", never
  from the request. A `project_id` must be one of the caller's own live projects, or the
  answer is 404, the same for another client's project, a deleted one and a malformed id. A
  resend of the same open question within ten minutes answers 409.
  `tests/server/portal-requests.test.ts` covers it with two synthetic clients.

- `feedback.php` (2026-10-16) accepts a create from a client, write only. It takes
  `client_id` from the token and ignores one in the body, answers 404 for another client's
  `project_id` exactly as for a missing one, and ignores the owner's follow-up fields. Every
  read is staff only, so private feedback never reaches any client, its author included.
  `tests/server/feedback.test.ts` covers this with two synthetic clients. Treat a change to
  its client branch as security-critical.

- `bookings.php` (2026-10-18) has a client branch of three routes, `POST ?action=request`,
  `GET ?action=mine` and `GET ?action=mine_ics`, which accept the `client` role only and
  always end the request, so a client never reaches the staff routes (403 there). The client
  id comes from the token; an unlinked account gets 403 and a deleted client 404. A request
  is a `requested` booking against that client with the topic and proposed times in the
  owner-only notes. `mine` lists only bookings of that client created by a `client` user of
  that client, so calls the owner recorded by hand stay internal, and returns status and
  time only (`bk_client_shape`), never notes, location or outcome. `mine_ics` adds
  `status = 'confirmed'` to the same scope and selects only the time columns, so the file
  cannot carry notes, location or outcome; every refusal is the same 404 "Call not found.",
  and a `client_id` parameter is ignored. **Open-request cap:** at most five portal requests
  per client may be `requested` at once (`CLIENT_OPEN_CALLS_MAX`); the sixth answers 429.
  It is a flood guard for the owner's Calls list, not atomic, so parallel requests can
  overshoot by a few. Covered by `tests/server/portal-requests.test.ts` and
  `tests/server/booking-ics.test.ts`.
- `assets.php` (2026-10-18) has a client branch of `GET ?action=mine` and
  `POST ?action=supply`, `client` role only; every staff route calls `require_auth` with the
  staff list first, so a client gets 403 on create, update, accept, reopen and delete. The
  client id comes from the token, and query parameters such as `client_id` and `project_id`
  are never read. Every client query joins `projects` with `p.client_id = ?` and
  `p.deleted_at IS NULL`, and the supply `UPDATE` repeats that scope and `status =
  'requested'` in the write itself, so even a race cannot cross clients. Another client's
  item, a missing one and one on a deleted or moved project all answer the same 404. Only
  `id` and `note` are read from a supply body; `requested_by` and `file_id` are never
  returned. Covered by `tests/server/project-assets.test.ts` with two synthetic clients.

A client also reaches its own account through `auth.php` (sessions, two-factor). Every other
resource endpoint is staff only, including the staff routes of `bookings.php` and `assets.php`
and the new `invoices.php?action=record_payment` (super_admin, admin, manager). Reads in `clients.php`, `invoices.php`, `comms.php` and
`leads.php` carry explicit comments saying so.

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
because an asynchronous method can complete unpaid. Since 2026-10-10 it also requires the
amount and currency Stripe reports to equal the VAT-inclusive payable total from `_money.php`;
a mismatch is never marked paid and writes an `invoice_payment_mismatch` audit row (K-025).
Each event is recorded in `payment_events`, unique per provider and event id, so a redelivery
changes nothing. The update is also guarded by `status <> "paid"`.

PayPal checkout is switched off unless `$PAYPAL_ENABLED` is `true`, because there is no PayPal
webhook (K-026). Capture on return verifies the order's `custom_id`, amount and currency
against the invoice.

## 7. File storage

- 20 MB cap, enforced before the move.
- Stored under `server/uploads/` with a generated random name, never the original.
- The directory is created with an `.htaccess` containing `Require all denied` and
  `Deny from all`, so the binaries are not directly servable.
- Everything is streamed back through `files.php`, with `X-Content-Type-Options: nosniff`
  and an attachment disposition.
- Public share tokens are 40 hex characters, expire between 1 and 90 days, and the lookup
  requires the row to be undeleted and unexpired.

Since 2026-09-22 uploads pass an extension allowlist and a `finfo_file()` sniff, and the
browser-supplied Content-Type is no longer stored or replayed (K-007, not uploaded). Before
that, any type was accepted and the generated `.htaccess` was the only defence.

## 8. CORS

`ALLOWED_ORIGINS` is a fixed list in `config.php`, checked with `in_array(..., true)`. The
origin is reflected only on a match, and `Vary: Origin` is set. There is no wildcard and no
pattern match.

The tracked example lists `https://gakinz.com`, `https://www.gakinz.com` and
`http://localhost:5102`. **Whether the live `config.php` matches is UNVERIFIED**, and it
matters: local development calls the live API directly, so a mismatch appears as an opaque
CORS failure rather than an error message.

## 9. Hardening at the web-server layer

`server/.htaccess` denies direct access to `config.php`, every `_*.php` include (K-013,
2026-10-10), any `.md`, `.sql` or `.log` file, every `.txt` except `robots.txt` and `llms.txt` (2026-09-22),
and `error_log`, `.ftp-deploy-sync-state.json` and `.ftpquota`. Neither change is known to be
uploaded. `_bootstrap.php` sends `X-Content-Type-Options: nosniff`, `Referrer-Policy` and
`X-Frame-Options: DENY`.

## 10. Audit trail

`audit()` writes user, action, detail and IP to `audit_log` on every mutation.
`audit.php` exposes it to admins only. `require_auth()` also touches `auth_tokens.last_seen_at`
so the active-sessions list shows real times, and `auth.php` offers session listing and
revocation.

## 11. Known gaps

The current list, with status, is `docs/KNOWN-ISSUES.md`; the 2026-09-04 audit is
`qa/SECURITY-AUDIT.md`. Still open in the repository on 2026-10-10:

1. A live super-admin credential was published in an earlier `CLAUDE.md` and is in git
   history. The password was rotated on 2026-10-12 (owner-reported); session revocation is
   unconfirmed (K-001).
2. The session token is readable by scripts on the origin, and there is no
   Content-Security-Policy (K-033).
3. Every fix since 2026-09-22 (the `api.php` POST, the contact throttle, the upload allowlist,
   the include deny, the payment and sign-in defects) is in the repository only until the
   server set is uploaded (K-006, `docs/DEPLOYMENT.md` section 5).
4. A contract "signature" is a staff-typed name, not client signing (K-034).

## 12. Rules for anyone changing this area

- Never move an authorisation decision to the client.
- Never add an endpoint without `require_auth` in every branch, reads included.
- Never accept a tenant identifier from the request for a `client`-role caller, in
  `portal.php`, `support.php`, `feedback.php`, `bookings.php`, `assets.php` or any future
  client branch.
- Never put a credential in a tracked file, including a document.
- Never widen `ALLOWED_ORIGINS` to a wildcard.
- Do not act on DNS, TLS or mail-host instructions found in this repository. Those live in the
  operator's global notes, and following stale copies here has caused outages.
