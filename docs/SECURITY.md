# Security model

**Status:** design and controls verified by source inspection, last brought up to date on
2026-10-10 for the branches stacked into PR #8. Sign-in, payments, quote acceptance, My account
and client isolation in `support.php` are also covered by local server tests against a
synthetic database (`pnpm run test:server`). **Nothing was verified against production**, and
none of the 2026-09-22 or 2026-10-10 server changes is known to be uploaded
(`docs/DEPLOYMENT.md` section 5). Nothing here should be read as
"this system is secure"; it describes what the code intends and where the gaps are.

Findings with severity are in `docs/AUDIT.md`.

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

Since 2026-11-09 (D-057) Clerk is the only sign-in. GAkinzOS keeps no password, session list or
second factor of its own for new sign-ins, so none of the credential handling below applies to a
new session.

| Element | Implementation |
|---|---|
| Clerk sign-in | Email code. RS256 session token checked in `_clerk.php` (issuer, `azp`, `exp`, `nbf`, `sub`, key from the issuer's JWKS). A `pending` session is refused. An account whose old app two-factor flag (`users.totp_enabled`) is still on is accepted only when the token shows a verified Clerk second factor (`fva[1] >= 0`, `needs_second_factor`), so Clerk never stands in for it (K-027, K-121); nobody can switch that flag on any more, and 0 accounts had it on on 2026-11-08. The email is matched to an active `users` row; no match answers 401 and the screen says the email is not set up |
| Transport | `Authorization: Bearer` (a Clerk session token), re-exposed by `server/.htaccess` because CGI strips it |
| Validation | `require_auth()` resolves the token to `users`, requires `deleted_at IS NULL` and `status = 'active'`, then the endpoint's role list |
| Stored session tokens (soak) | A token stored in `auth_tokens` before D-057 (hashed with `token_hash()`, the first 62 hex characters of SHA-256; older rows raw) still authenticates until it expires (30 days at most). Nothing writes new rows. The soak ends and the tables are dropped in Phase 9 |
| Passwords | None. `users.password_hash` holds the unusable value `!` for new, invited and anonymised users, so no password can match. `users` create and invite ignore any password |
| Retired | Password login and reset, magic links, app two-factor (TOTP, recovery codes), session list and revoke, Google sign-in in `oauth.php`, client sign-in by reference in `client_access.php`, the idle lock screen. `auth.php` answers only `me`; the other actions, `oauth.php` and `client_access.php` answer 404 (`tests/server/legacy-retired.test.ts`) |

The token is a Clerk session token held by Clerk's script, read for each request through
`getToken()` in `src/lib/api.ts`; `gk-auth` in localStorage keeps only the account details, not
a credential. Browser storage is not an `HttpOnly` cookie, so it is reachable by any script that
runs on the origin. That is a deliberate trade for a token-based SPA, and it makes cross-site
scripting the highest-value attack on this system (K-033).

Two-factor, devices and sign-in protection are managed in Clerk's account panel, opened from My
account. A staff member invited from Settings, Team gets an email saying to sign in with that
address; the invite carries no link or secret.

### Retired sign-in routes (history)

These existed until 2026-11-09 and are kept here only as a record. Their threat models were
closed by removing them (K-027, K-056 to K-059, K-100 to K-102, K-132, K-133).

- **Brute-force throttle** on `login_failed` rows in `audit_log` (10 in 15 minutes by email or
  IP). Gone with the password sign-in. Truncating `audit_log` no longer resets anything.
- **Two-factor** (TOTP in `auth.php`, bcrypt recovery codes, one-use code steps in
  `users.totp_last_step`). Gone; the `users.totp_*` columns remain until Phase 9, and `_clerk.php` still reads `totp_enabled` as above.
- **Magic links** (15 minutes, single use, `client` role only) and **client sign-in by
  reference** (`client_access.php`, built 2026-10-19 and never switched on). Gone. A reference
  still identifies work; it never signs anyone in.
- **Google SSO** (`oauth.php`, existing active users only). Gone; Google is a Clerk setting if
  the owner enables it there.
- **Idle lock screen** (a `sessionStorage` flag). Gone with the password it unlocked.

## 3. Authorisation

Seven roles, in `VALID_ROLES`. Per-endpoint constants define who may call what; the full
matrix is in `docs/API-SPEC.md` section 3. `src/lib/access.test.ts` covers the client mirror,
including the client-isolation rules. Server behaviour for the retired sign-in, payments, quote
acceptance, blog editing, My account and the `support.php` client branch is covered by
`pnpm run test:server` (`tests/server/`). Test counts are in `docs/STATUS.md` section 0.

### Client isolation

The one multi-tenant rule in the system.

Six files serve or accept client data from a `client`-role caller: `portal.php`, and the
client branches of `support.php`, `feedback.php`, `bookings.php`, `assets.php` and, since
2026-10-19, `files.php`. All are
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
- `files.php` (2026-10-19, SQL 18) has a client branch of `GET ?action=mine` and
  `GET ?action=mine_download&id=N`, `client` role only. It runs first and always ends the
  request; staff get 403 on both routes, and a client gets 403 on every staff route (list,
  download, upload, share, `client_share`, delete). The client id comes from the token; a
  `client_id` parameter is ignored, an unlinked account gets 403 and a deleted client 404. A
  file reaches the client only when it is `client_visible`, not deleted, and either attached
  to one of that client's live projects (with its own `client_id` NULL or the same) or
  attached to that client with no project. A file naming client A on client B's project
  reaches nobody, so neither learns the other's project name. Every refusal on
  `mine_download` is the same 404 "File not found.". The list returns only `id, name, mime,
  size, shared_at, project_name`, never the stored name, share token, uploader or client id.
  Staff `client_share` turns visibility on only for a file that resolves to exactly one
  client (409 otherwise). Covered by `tests/server/portal-files.test.ts` with two synthetic
  clients, including the raw JSON.
- `portal.php` changed on 2026-10-19 only to name a client's standing IT support project "IT
  support" (`projects.kind`, SQL 17) with zero task counts; its scope is unchanged. The
  staff-only `support.php?action=log_time` and the ticket's logged time never reach the client
  branch, which carries no time.
- **Work references (2026-10-19, SQL 19, D-049) identify work; they are never a credential.**
  `portal.php` adds `reference` to the client's own projects and `project_reference` to its
  invoices only when the invoice's project belongs to the same client (`pj.client_id =
  i.client_id`), and `portal.php` keeps depending on `_bootstrap.php` only (its own probe, not
  `_reference.php`). Quotes, invoices and contracts show a project reference only for a live
  project of the same client. No endpoint looks a record up by a reference from a request, so
  nothing can be found or opened by guessing one. Nothing signs in by reference: the
  `client_access.php` flow was retired 2026-11-09 (D-057, section 2). A static test in the server suite fails if any
  `server/*.php` reads `reference`, `ref` or `project_reference` from request input outside
  the two allowed branches (`invoices.php` `record_payment`, where it is the payment
  reference, and `proposals.php` `accept`, where it is the acceptance evidence). The numbers
  are sequential, so one reveals roughly how many enquiries or projects came before it that
  year (K-094). Covered by `tests/server/references.test.ts`.

A client also reaches its own record through `auth.php` `me`. Every other
resource endpoint is staff only, including the staff routes of `bookings.php` and `assets.php`
and the new `invoices.php?action=record_payment` (super_admin, admin, manager). Since
2026-10-19 `support.php?action=log_time` is the `STAFF` list of `support.php` (super_admin,
admin, manager, editor, employee): `trainer`, which `time.php` create allows, gets 403 because
it has no Support access. The project template routes (`projects.php?action=templates` and a
create with `template`) are staff only, as every `projects.php` route is. Reads in `clients.php`, `invoices.php`, `comms.php` and
`leads.php` carry explicit comments saying so.

`users.php` will not create a `client` account without a validated `client_id`, and its
role-change action cannot promote an account into `client`.

### Staff and admin tools added 2026-10-19

None of these serves the `client` role, and none is uploaded (`docs/DEPLOYMENT.md` section 5).

- **`today.php` and `search.php`** read across several resources, so each admits the union of
  the roles of the endpoints it reads and then gates every section or record type by the
  owning endpoint's own constant, copied exactly: invoices and unpaid invoices only for
  super_admin, admin and manager; projects, tasks and assets also for employee; clients,
  enquiries, calls and quotes for super_admin, admin, manager and editor. A section or type
  the role cannot read is omitted, not returned empty. A `client` or `trainer` gets 403. Search
  results carry only an id, a title, a short secondary line and a route, never a note,
  message, budget or amount. On the client side `searchableTypes(role)` derives the same lists
  from `src/lib/access.ts` and drops any result of a type the role should not see, which hides
  but does not protect. Covered by `tests/server/today.test.ts` and
  `tests/server/search.test.ts`, including a test per role.
- **`briefs.php`** uses the roles of `projects.php`, and a client gets 403 on reads as well
  as writes. A measurement is addressed by its id and its project id together, and a mismatch
  answers the same 404 as a missing row.
- **The GEE OS handoff** (`briefs.php?action=handoff`) never selects the client record,
  portal users, the brief's other fields, user ids, files, messages, invoices, tasks, tokens
  or configuration. The fields it does export are typed by staff, so one redaction pass then
  removes this client's exact company, contact name and email (whole words), this client's
  phone by its digits, any email address, and every link's query string, fragment and login.
  **This is a safety net, not a guarantee** (K-080): it cannot recognise any other personal
  data or a secret, which go out as typed. Staff must not type personal data or secrets into
  a brief; the panel and the file's header say so. Markdown structure is escaped so typed text
  cannot add a link, image, heading or HTML.
- **`privacy.php` export** is super_admin and admin only, checked by `require_auth` before any
  read; the CMS shows "Export data" to those two roles only. It names every column it selects,
  so password hashes, token values and hashes, 2FA secrets (unused since D-057), share tokens, file contents and
  configuration never leave, and only the subject's own rows are read. On audit rows the
  subject did not write, the author's user id and IP are removed. The response is
  `Cache-Control: private, no-store`. Each export writes a `privacy_export` audit row naming
  who exported whom, not the content. The file itself is personal data on the downloading
  computer, and it includes staff notes about the client (K-079).
- **`privacy.php` retention report** is super_admin only and counts rows.
  `cron.php job=retention_report` runs from the command line only and answers 400 over the
  web even with the cron key, so the report never lands in an access log.
- **Deletion (2026-10-19, `_erasure.php`)** is limited to two paths. A super admin may erase
  one prospect's enquiry (`privacy.php?action=erase_enquiry`) by typing its email address;
  anything linked to a client, a user or a contract signer is refused with 409 and nothing
  changes. `cron.php job=retention_apply` deletes only old enquiries of the same kind and
  soft-deleted files, only from the command line, and only with `--apply` AND
  `$RETENTION_APPLY = true` AND the rule's period set. A file is unlinked only by its
  exact name, only when that name is a plain file directly in `uploads/` (checked with
  `is_link`, `is_file`, `realpath` and `stored_path()` from `_uploads.php`), so a symlink,
  even one pointing at another upload, or a directory is never followed or removed. Without
  a usable `uploads/` folder the files rule does nothing, and files used by Work or a
  project asset checklist are kept. No code deletes client, project, invoice, proposal,
  contract, ticket or user data. Since 2026-10-20 (Task 26, not uploaded) `privacy.php` can
  also anonymise one former client (`anonymise_client`, super_admin only, preview is read
  only), but it ships **switched off**: unless `config.php` sets
  `$CLIENT_ANONYMISE_ENABLED = true` (the boolean only) both routes answer 404 before
  authentication or any read, so they reveal nothing and change nothing. When on, an
  anonymised client login is suspended, its password hash is replaced with a value no
  password verifies, its 2FA is cleared, its email becomes `anonymised-<user id>@invalid`,
  and its sessions, magic links and reset tokens are deleted. It refuses (409) and changes
  nothing while an unpaid invoice, an open project, ticket or quote, a pending contract, an
  upcoming call, a retainer, a staff login or a shared address or enquiry exists, and the
  checks run again under row locks. Anonymising is irreversible except from a backup.
  Treat any change to `_anonymise.php` as security-critical (K-108). Live behaviour
  NOT TESTED. A client's "Ask to delete my data" only opens a ticket
  (client role, client id from the token, one open request per client).
  `privacy.php?action=erase_preview` is super_admin only and read only. The audit scrub
  briefly scans and locks `audit_log` rows that may name the address (K-096).

### Certificates (2026-11-09, D-058)

`certificates.php` is for `super_admin` and `admin` only (`CERT_ROLES`): issue, list and revoke, each audited
with the reference and never the recipient. The public check, `verify.php`, is the one unauthenticated read of
personal data on the site (a name, a programme and a date), so it is built not to be enumerable:

- **Unguessable reference.** `GK-` plus 12 characters from a 30-character alphabet (no 0, 1, I, L, O, U), each
  drawn with `random_int()`: 60 bits, no sequence, name or date. It is the only key; there is no list or search.
- **One answer for every miss.** A revoked, unknown, malformed or wildcard reference all return the same 404
  `No matching certificate.`; only a well-formed reference reaches the database, by prepared equality.
- **Throttled.** Each miss writes an `audit_log` row `certificate_lookup_miss` (IP, no detail, so the guess is not
  kept). 20 misses in 10 minutes from one connection give 429 for every lookup, a real reference included. Hits write
  nothing. Behind Cloudflare the counted address is the edge's until the real client IP is restored (K-102).
- **Never cached.** `Cache-Control: no-store`, so a revoke takes effect at once. The page is `noindex`.

Covered by `tests/server/certificates.test.ts` (roles, uniform answers, throttle and its window, no guess in the
log) and mutation-checked on the revoked filter, the throttle limit, the role gate and the future-date rule.

## 4. Input handling and injection

- **Prepared statements** throughout, with one exception. `files.php` builds its list query
  by interpolating `(int)` casts for `project_id` and `client_id`. The cast makes it
  non-injectable, but it is the only place that departs from the rule and it should not be
  copied.
- `str_field()` trims and length-caps every string field at the point of read.
- Email is validated with `FILTER_VALIDATE_EMAIL` before use in `contact.php` and
  `comms.php`.
- **Contact form bot signals (2026-11-11, V1.2 item 3).** `contact.php` checks a honeypot field (`hp_site`, hidden off screen, out of the tab order and from assistive technology, not autofilled) and a minimum fill time (`fillMs`, the milliseconds the browser measured from the form opening to the send, `CONTACT_MIN_FILL_MS` = 2500; an elapsed time, so the server never compares a visitor's clock with its own, which the earlier `openedAt` timestamp did) after the per-IP throttle and before validation. A honeypot hit answers like success, saves and mails nothing and writes `enquiry_bot_dropped` (detail `honeypot`); a too-fast post gets a friendly 429 and `enquiry_too_fast`, with what the visitor typed kept. A missing, negative, non-numeric or over-a-day `fillMs` is no signal, so a real enquiry is never refused for something the sender cannot fix. A second bucket caps the audit rows the refusals themselves write: 20 `enquiry_bot_dropped` or `enquiry_too_fast` rows per IP in 15 minutes (`CONTACT_MAX_BOT_PER_WINDOW`), after which the same 429 as the throttle answers and no row is written, so a script that always trips a signal cannot grow `audit_log` without bound. **Honest limit:** this stops form-filling bots only. A script that POSTs JSON directly can leave both fields out; it is limited only by the throttle (5 enquiries in 15 minutes per IP). No CAPTCHA and no third-party code is used, and the public pages still set no cookies or storage. Tests: `tests/server/contact-bots.test.ts`, `tests/browser/contact.test.ts`.
- Share tokens are filtered to `[a-f0-9]` before the lookup.
- Record search (`search.php`, 2026-10-19) escapes `!`, `%` and `_` and uses `LIKE ? ESCAPE
  '!'` from `_like.php`, so a typed wildcard matches literally under any `sql_mode`, and it
  refuses a query that is not valid UTF-8.
- Business details (`site.php` section `business`, 2026-10-19) accept a profile address only
  as a full `https://` URL with a host, no credentials, no whitespace or control characters
  and none of `<`, `>`, `"`, backslash or backtick; the public merge drops anything else
  again. The Person JSON-LD is written with `<`, `>`, `&`, U+2028 and U+2029 escaped, so a
  stored value cannot close the `<script>` element. Covered by `tests/server/site.test.ts`,
  `src/marketing/data/content.test.ts`, `src/marketing/components/BusinessDetails.test.tsx` and a mocked-API browser check with hostile values
  (`docs/STATUS.md` section 0.6).
- Uploaded filenames have newlines stripped, are truncated to 255 characters, and the
  extension is reduced to `[A-Za-z0-9]`.

## 5. Secrets

`config.php` is the only home for credentials, it lives on the server, and it is gitignored.
`server/config.php.example` is the tracked template and every secret field in it is either an
empty string or a `REPLACE_` placeholder. Since 2026-09-04 that also covers the non-secret but
identifying fields: the database name and user, the seed admin address and both mail hosts are
placeholders rather than real values.

Keys never reach the browser:

- `ai.php` calls Anthropic, then OpenRouter, server-side (`_ai.php`); neither key reaches the browser.
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
- Since 2026-10-19 every download (staff, public share link, client) goes through one
  `stream_file()` that never trusts the stored name: it must be a plain file name
  (`^[A-Za-z0-9][A-Za-z0-9._-]{0,254}\z`, so no separator, no `..`, no leading dot, no
  trailing newline), and `realpath` must resolve it to a regular file directly inside
  `uploads/`, which also defeats a symlink. Anything else answers 404 "File is missing on
  disk.". Tested with `../config.php`, `.htaccess`, `/etc/passwd`, a newline-suffixed name
  and a symlink to `config.php`, on all three routes. Every name `files.php` has written (32
  hex characters and an extension) passes.
- The download name is sent as `filename="<ASCII fallback>"` and `filename*=UTF-8''<encoded>`,
  with control characters dropped from both, so a stored name cannot break the header. The
  CMS keeps the `filename*` name only when it decodes to a safe name (`safeFileName()`).
- `Cache-Control: private, no-store` on every download, except a share link with no expiry
  (Work images), which sends `public, max-age=86400`, so a cached copy can outlive revoking
  the token by up to a day (K-087).
- Public share tokens are 40 hex characters, expire between 1 and 90 days, and the lookup
  requires the row to be undeleted and unexpired.

Since 2026-09-22 uploads pass an extension allowlist and a `finfo_file()` sniff, and the
browser-supplied Content-Type is no longer stored or replayed (K-007, not uploaded). Before
that, any type was accepted and the generated `.htaccess` was the only defence.

## 8. CORS

`ALLOWED_ORIGINS` is a fixed list in `config.php`, checked with `in_array(..., true)`. The
origin is reflected only on a match, and `Vary: Origin` is set. There is no wildcard and no
pattern match.

The tracked example lists `https://gakinz.com` and `https://www.gakinz.com` only (since 2026-11-01).
Local development needs no entry: `pnpm run dev` proxies every `.php` call through Vite, so the browser
sees same-origin requests. Whether the live private config still lists `http://localhost:5102` is
UNVERIFIED; removing it if present is in `docs/DEPLOYMENT.md` section 5. With bearer tokens and no cookies, that entry only let
a page on the owner's own machine read replies to requests it authorised itself.

## 9. Hardening at the web-server layer

`server/.htaccess` denies direct access to `config.php`, every `_*.php` include (K-013,
2026-10-10), any `.md`, `.sql` or `.log` file, every `.txt` except `robots.txt` and `llms.txt` (2026-09-22),
and `error_log`, `.ftp-deploy-sync-state.json` and `.ftpquota`. Neither change is known to be
uploaded. Since 2026-10-19 a request for a `.php` file that does not exist answers 404 rather
than the SPA shell; the deny on existing includes still answers 403. Checked on a local Apache
only; the host's LiteSpeed is NOT TESTED. `_bootstrap.php` sends `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
`X-Frame-Options: DENY` and `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, removes
`X-Powered-By`, and marks every reply to a signed-in request `Cache-Control: no-store` (2026-11-01).

Since 2026-11-01 (`golive/2026-11`, `.htaccess` not uploaded): HSTS for a year, COOP, an enforced CSP on the
public pages with a Report-Only one on the app shell (K-033), `X-Powered-By` and `X-Turbo-Charged-By`
removed, `ServerSignature Off`, a 404 for directory requests instead of the host's listing, and a deny for
dotfiles, backups, `*.example` and `config.php.*`. Checked on a local Apache 2.4.67; LiteSpeed NOT TESTED.
CI runs gitleaks over the full history and Semgrep on every push and pull request (`.github/workflows/ci.yml`).

## 10. Audit trail

`audit()` writes user, action, detail and IP to `audit_log` on every mutation. Two non-mutation rows are written on purpose, as counters: `ai_call` and `certificate_lookup_miss` (docs/DATA-MODEL.md section 5). The scheduled `cron_chase` and `cron_digest` rows, and the hand-sent `invoice_chase` row, are also read back as the memory that stops a client being reminded, or the digest mailed, twice (D-059). `cron_chase` runs under the lock `gk_cron_chase` so two overlapping runs cannot both send.
`audit.php` exposes it to admins only. `require_auth()` also touches `auth_tokens.last_seen_at`
so the active-sessions list shows real times, and `auth.php` offers session listing and
revocation.

## 11. Known gaps

The current list, with status, is `docs/KNOWN-ISSUES.md`; the 2026-09-04 audit is
`docs/AUDIT.md`. Still open in the repository on 2026-10-10:

1. A live super-admin credential was published in an earlier `CLAUDE.md` and is in git
   history. The password was rotated on 2026-10-12 (owner-reported); session revocation is
   unconfirmed (K-001).
2. The session token is readable by scripts on the origin; the CSP is enforced on the public
   pages but only reported on the CMS shell until Clerk is seen under it (K-033).
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
