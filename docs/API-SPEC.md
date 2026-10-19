# API specification

**Status:** current for the tracked source as at 2026-10-14, on `feat/redesign-2026`
(stacked on PR #8). It is verified by source inspection of every PHP file in `server/`. **No endpoint has
been exercised against production.** Some areas are also covered by local integration tests in
`tests/server/`, run with `npm run test:server` against a throwaway `*_test` database: the
Stripe link and webhook, PayPal being switched off, magic links and two-factor, My account
self-service, quote acceptance, blog editing, create endpoints returning the new id, enquiry
follow-ups, the client branch of `support.php`, the work hero actions and `site.php`
(2026-10-14), and `work.php` (`tests/server/work.test.ts`, 2026-10-11). Everything else
below is source inspection only. `work.php` and `site.php` have run only against local test
databases; whether their tables and columns exist on the live database is UNVERIFIED, and
they will not until SQL 3, 4, 7 and 8 in `docs/DEPLOYMENT.md` section 5.2 have run.

The server changes of 2026-09-22 and 2026-10-10 are not known to be uploaded; the list is
`docs/DEPLOYMENT.md` section 5. Where this
document describes behaviour, it describes the repository, not the live server.

Authority: `server/*.php`. Client mirror: `src/lib/api.ts`.

---

## 1. Shared contract

Every routed endpoint requires `_bootstrap.php` first, which provides:

| Helper | Behaviour |
|---|---|
| CORS | Reflects the request origin only when it appears in `ALLOWED_ORIGINS`, and sets `Vary: Origin` |
| `OPTIONS` | Returns 204 and exits, before any endpoint code |
| `body()` | Parses a JSON request body, falling back to `$_POST` |
| `ok($data, $code = 200)` | Emits JSON and exits |
| `fail($message, $code = 400, $extra = [])` | Emits `{"error": ...}` plus any extra keys, and exits |
| `str_field($src, $key, $max)` | Trims and truncates a string field |
| `require_auth($conn, $roles = [])` | Validates the bearer token and the role. 401 or 403 |
| `audit($conn, $userId, $action, $detail)` | Writes to `audit_log` |

Responses are `application/json; charset=utf-8`. Errors are always
`{ "error": "human readable sentence" }` with an HTTP status. `auth.php` adds
`two_factor_required: true` to the 401s that ask for a second factor.

Authentication is an opaque bearer token, 64 hex characters, in the `Authorization` header.
`server/.htaccess` re-exposes that header into `HTTP_AUTHORIZATION`, because the CGI and
FastCGI setup strips it.

Since 2026-09-22 the bootstrap also sends three response headers on every request:
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and
`X-Frame-Options: DENY`.

Files whose names start with an underscore are shared includes, not endpoints:
`_bootstrap.php`, `_money.php`, `_monitor.php`, `_slack.php`, `_sms.php` and `_smtp.php`.
`server/.htaccess` denies a direct request to `config.php` and to any `_*.php` file, so an
include can only run when an endpoint requires it.

`_money.php` holds the one definition of what an invoice costs, `gk_invoice_payable()`:
`subtotal = round(sum(qty * unit_price), 2)`, `vat_amount = round(subtotal * vat_rate / 100, 2)`,
`total = round(subtotal + vat_amount, 2)`, and `total_minor` is the total in pence. Only
`payments.php` includes it today.

## 2. Status codes in use

| Code | Meaning here |
|---|---|
| 200, 201 | Success. 201 on create, and every create returns the new record's `id` |
| 204 | Preflight only |
| 400 | Validation failure, an invalid or expired magic link, or a Stripe webhook with a bad signature or a timestamp outside the replay window |
| 401 | Not authenticated, expired session, or a two-factor code is required |
| 403 | Authenticated but not allowed, inactive account, a bad cron key, or a magic link redeemed by a non-client or two-factor account |
| 404 | Not found, or an expired or invalid share token |
| 405 | Method not allowed |
| 409 | A work slug is already in use; a work record names a client and has no stored consent, so it may not be published; a draft work record is put in the hero, a sixth is switched on, or a hero order does not list exactly the records in the hero; a site section with no saved draft is published; a quote that is not sent, has expired or is no longer open is accepted; or an accepted quote is given a new status |
| 413 | Upload over 20 MB |
| 415 | Upload whose extension is outside the allowlist, or whose sniffed type contradicts it |
| 429 | Login throttle, the contact-form IP throttle, or the per-role AI daily cap |
| 500 | Write failed |
| 502 | Upstream provider error |
| 503 | Integration not configured on the server, PayPal checkout switched off, or a 2026-10-14 feature (work hero, site content) used before its schema step has run |

## 3. Role vocabulary

Each endpoint declares its own list as a local constant. There is no central table on the
server; `src/lib/access.ts` is the client mirror and is not a boundary.

| Constant | Roles | Used by |
|---|---|---|
| `ALL_STAFF` | every role except `client` | `announcements.php` read |
| `ADMINS` | super_admin, admin | `users.php`, `integrations.php`, `slack.php`. `audit.php` uses the same two roles as an inline list |
| `AUTHORS` | super_admin, admin, manager | `announcements.php` write |
| `MAIL_ROLES` | super_admin, admin, manager | `mail.php` |
| `PAY_STAFF` | super_admin, admin, manager | `payments.php` |
| `STAFF` | varies by file, see below | most modules |
| `EDITORS` | super_admin, admin, manager, editor | `blog.php`, `testimonials.php`, `content.php`, `work.php`, `site.php` |
| `PORTAL_PREVIEW_ROLES` | super_admin, admin, manager | `portal.php` staff branch. Narrowed on 2026-09-22 |
| `STAFF_OR_CLIENT` | `support.php`'s STAFF plus `client` | `support.php` GET, `create` and `reply`, so a client caller reaches its own branch. Added 2026-10-10 |
| `MAGIC_ROLES` | client | `auth.php` magic links |

`STAFF` is not one list. Its value per file:

| Value | Files |
|---|---|
| super_admin, admin, manager | `careplan.php`, `contracts.php`, `invoices.php`, `reports.php`, `resourcing.php` |
| super_admin, admin, manager, editor | `clients.php`, `design.php`, `figma.php`, `leads.php`, `proposals.php` |
| super_admin, admin, manager, editor, employee | `comms.php`, `dev.php`, `files.php`, `github.php`, `projects.php`, `support.php`, `tasks.php` |
| super_admin, admin, manager, trainer, editor, employee | `knowledge.php`, `ai.php`, `weather.php` |
| super_admin, admin, manager, editor, employee, trainer | `time.php` |

`time.php` approve and reject narrow further to super_admin, admin and manager.

## 4. Public endpoints, no authentication

Treat these as the internet-facing attack surface.

| Endpoint | Method | Purpose |
|---|---|---|
| `contact.php` | POST | Public enquiry form. Validates name, email and a message of at least 10 characters, then inserts into `enquiries` with the caller IP. Throttled per IP from `audit_log`, modelled on the login throttle; over the limit it returns 429 |
| `verify.php` | GET `?id=` | Certificate lookup by `public_id`, excluding revoked ones |
| `book.php` | GET | Returns the configured Calendly URL, or an empty string |
| `blog.php` | GET, and GET `?slug=` | Published posts without their body, and one published post with its body |
| `testimonials.php` | GET | Approved testimonials |
| `proposals.php` | GET `?token=` | Read-only shared proposal with its line items, at any status. Records a view. Acceptance is a staff action, not part of this link |
| `files.php` | GET `?token=` | Streams a shared file while the token is unexpired. A token issued by `work.php?action=addImage` has **no expiry**, so it streams indefinitely. See section 7. Since 2026-10-19 a link with no expiry sends `Cache-Control: public, max-age=86400` and an expiring one `private, no-store` (K-087); the download headers are described under Delivery |
| `work.php` | GET `?action=list[&kind=]` | Published work records, cover folded in, ordered by featured, then `sort_order`, then id, limit 200 |
| `work.php` | GET `?action=get&slug=` | One published record with its ordered image set |
| `work.php` | GET `?action=hero` | Up to five published records flagged for the homepage hero, in hero order, with brand colour, hero word and screenshots. `[]` before the schema step |
| `site.php` | GET `?action=get` | Published site copy as `{section: data}`, never a draft. `{}` when nothing is published or the table does not exist. `Cache-Control: public, max-age=60`. See section 7a |
| `payments.php` | POST `?action=webhook` | Stripe webhook. HMAC verified, 5 minute replay window. Marks an invoice paid only when the amount and currency Stripe took match the VAT-inclusive payable total. See section 5, Money |
| `payments.php` | GET `?action=paypal_return` | PayPal capture on return. Marks the invoice paid only on a completed capture whose `custom_id`, amount and currency match. Not gated by `$PAYPAL_ENABLED`, but with checkout switched off no new order is created |
| `oauth.php` | GET `?action=status`, `start`, `callback` | Google SSO. Matches an existing active user only, never provisions. Refuses an account with two-factor on, redirecting with `#sso_error=two_factor`, so Google never stands in for the second factor. Carries a CSRF `state` parameter in a short-lived HttpOnly cookie, and validates the id_token's `aud` and `iss` |
| `cron.php` | GET `?key=&job=` | Scheduled jobs. Gated by a shared secret with `hash_equals`, not by a user session |
| `api.php` | GET | Read-only health check. Returns `{ ok, php, db }`, touches no application table and mutates nothing. Any other method is 405 |

`api.php` used to list and INSERT rows in `items` with no authentication. Both branches were
removed on 2026-09-22. See `docs/DECISIONS.md` D-031. **The fix is not uploaded**, so the
unauthenticated POST should be presumed live until someone with server access confirms
otherwise.

## 5. Authenticated endpoints

Grouped by area. Actions are the `?action=` value on POST unless stated.

### Authentication and account

| Endpoint | Actions | Roles |
|---|---|---|
| `auth.php` | `login`, `me`, `logout`, `forgot`, `reset`, `sessions`, `revoke`, `twofa_setup`, `twofa_enable`, `twofa_disable`, `twofa_recodes`, `magic_request`, `magic_consume` | Public for login, forgot, reset and the magic-link pair. `logout` deletes whichever bearer token it is sent and always returns `{ ok: true }`. The rest need a valid token |
| `users.php` | GET list, `create`, `invite`, `role`, `rate`, `status` | ADMINS |
| `audit.php` | GET | ADMINS |
| `integrations.php` | GET | ADMINS. Returns booleans only, never a key |

`auth.php` rules worth knowing:

- `GET ?action=me` returns `{ user, totp_enabled }`. `user` has `id`, `name`, `email`, `role`,
  `client_id` and `status`, the row `require_auth()` reads; `totp_enabled` is the caller's own
  two-factor state, read separately and `null` if the column is missing on an un-migrated
  database. It is the cheapest way to check a token, and My account reads it.
- `sessions`, `revoke`, `twofa_setup`, `twofa_enable`, `twofa_disable` and `twofa_recodes` act
  on the caller's own account only, for every role including `client`
  (`tests/server/account.test.ts`). They back My account at `/app/account`.
- `login` takes `{ email, password, code? }`. An account with two-factor on gets a 401 with
  `two_factor_required: true` until a valid authenticator code or an unused recovery code is
  sent. Failed passwords and failed codes
  both count towards the throttle.
- Magic links are for the `client` role only (`MAGIC_ROLES`), and never for an account with
  two-factor on. `magic_request` always answers `{ ok: true }` and sends a link only to an
  active client account without two-factor, so it reveals nothing about who has an account.
  `magic_consume` redeems a link once, within 15 minutes, and checks the role and two-factor
  again at redemption: a non-client or two-factor account gets a 403 and an audit row
  `login_magic_refused`.
- Google sign-in in `oauth.php` follows the same rule, see section 4.

### Sales

| Endpoint | Actions | Roles |
|---|---|---|
| `leads.php` | GET list, `status`, `meta` | STAFF |
| `clients.php` | GET list, GET `?id=`, `create`, `update`, `convert` | STAFF |
| `bookings.php` | Staff: GET list (`?enquiry_id=` or `?client_id=` to filter), GET `?action=ics&id=`, `create`, `update`, `reschedule`, `status`, `notify`. Client: `request`, GET `?action=mine`, GET `?action=mine_ics&id=` | STAFF (as `leads.php`); every branch, reads included. The `client` role on its own three routes only (2026-10-18) |
| `proposals.php` | GET list, GET `?id=`, `create`, `status`, `accept`, `share`, `unshare` | STAFF |
| `contracts.php` | GET list, GET `?id=`, `create`, `status`, `sign`, `delete` | STAFF |

`leads.php` follow-ups (2026-10-10):

- GET list returns each enquiry with `next_action_at` (a `YYYY-MM-DD` date or null),
  `next_action_note` (up to 300 characters or null) and `priority` (an integer, 0 none, 1 low,
  2 normal, 3 high, separate from the AI `score`).
- `meta` takes `{ id, tags, score, next_action_at?, next_action_note?, priority? }`. A
  follow-up key that is sent is validated and saved; one left out is left alone. An invalid
  date or a priority outside 0 to 3 returns 400 before anything is written. The answer is
  `{ ok: true }`, plus `followup: true` when a follow-up field was stored.
- Before the enquiries `ALTER` in `docs/DEPLOYMENT.md` section 5.2 runs, the list omits the
  three fields and `meta` saves tags and score and answers `followup: false`, rather than
  failing (MySQL error 1054 is caught).

`clients.php?id=N` timeline (2026-10-16): newest first across the source enquiry
(`enquiry`), calls (`call`), quotes (`proposal`), projects, invoices, tickets (`ticket`),
Comms threads (`conversation`) and feedback (`feedback`). Each item is
`{ type, id, label, status, amount, date }`; a feedback item names the rating only, never its
words. `unavailable` lists `calls` and or `feedback` while their 2026-10-16 tables are
missing, and the rest of the record still loads.

`bookings.php` (2026-10-16, `docs/PRODUCT-SPEC.md` section 5.5):

- A booking is `{ id, enquiry_id, client_id, enquiry_name, enquiry_company, client_company,
  starts_at, start_local, timezone, duration_min, location, status, notes, outcome,
  created_at, updated_at, history[] }`. `starts_at` is UTC with a trailing `Z`; `start_local`
  is `YYYY-MM-DDTHH:MM` in `timezone`. `history` is newest first: `{ id, kind, from_status,
  to_status, from_starts_at, from_timezone, to_starts_at, to_timezone, notify_status,
  notify_to, notify_attempts, notify_error, notified_at, by, created_at }`.
- `create` takes `{ enquiry_id?, client_id?, start_local, timezone, duration_min?, location?,
  status?, notes? }`. At least one link is required and each must exist (404 otherwise).
  `timezone` must be an IANA identifier. A local time that does not exist because the clocks
  go forward answers 400; in the autumn overlap the first (summer-time) reading is taken.
  `duration_min` is 5 to 480, default 30. `status` is `requested` (default) or `confirmed`.
  Returns the booking with 201.
- `status` takes `{ id, status, outcome?, notify? }`. Allowed: requested to confirmed or
  cancelled; confirmed to completed or cancelled. Anything else, or a change that loses a race
  with another, answers 409.
- `reschedule` takes `{ id, start_local, timezone, duration_min?, notify? }` for a requested
  or confirmed call only (409 otherwise), keeps the same record and writes the old and new
  time to its history. The same time again answers 400.
- `notify: true` on a reschedule or a cancellation emails the customer (the client's address,
  else the enquiry's) through `gk_send_email`, with no notes or outcome in it. Both answer
  `{ booking, notice }`, where `notice` is `{ status: sent | failed, error, to }` or null. A
  failed send does not undo the change.
- `notify` takes `{ event_id }` and retries a **failed** email only. The event is claimed
  atomically, so a double click or a second tab gets 409 rather than a second email.
- `update` takes `{ id, location?, notes?, outcome? }`.
- Every mutation writes an audit row (`booking_create`, `booking_update`,
  `booking_reschedule`, `booking_status`, `booking_notify_retry`). Without the 2026-10-16
  tables every action answers 503.
- Covered by `tests/server/bookings.test.ts`.

`bookings.php` client routes and calendar file (2026-10-18; the client branch is
security-critical, `docs/SECURITY.md` section 3):

- `request` (client) takes `{ topic, timezone, slots: [{ date, time }] }` with one to three
  slots, none in the past. It creates a `requested` booking against the token's client,
  starting at the first slot, with the topic and every proposed time in the owner-only
  notes, and returns the client shape with 201. A resend answers 409; a sixth open request
  answers 429; staff or an unlinked account 403; a deleted client 404; 503 before the
  2026-10-16 tables.
- `mine` (client) lists the client's own portal requests as `{ id, status, starts_at,
  start_local, timezone, duration_min, created_at }`, never notes, location or outcome.
  Calls the owner recorded by hand are not listed.
- `ics` (staff) and `mine_ics` (client, own portal call) return `text/calendar` with
  `Content-Disposition: attachment; filename="gakinz-call-<id>.ics"` and
  `Cache-Control: private, no-store`, for a **confirmed** call only; anything else answers a
  JSON 404. UTC times, `UID` `booking-<id>@gakinz.com`, `SEQUENCE` the number of reschedules.
  The staff file carries `LOCATION` (and `URL` for a single web address); the client's file
  carries neither. No audit row, as a download is a read. Each route answers 403 to the
  other side.
- Covered by `tests/server/portal-requests.test.ts` and `tests/server/booking-ics.test.ts`.

`proposals.php` rules:

- `accept` takes `{ id }` and converts only a quote whose status is `sent` and whose
  `valid_until` has not passed; otherwise it returns 409. It claims the quote with a guarded
  `UPDATE` inside a transaction, so it runs once: a repeat or concurrent request returns
  `{ ok: true, project_id, existing: true }` for the project already created. A first
  acceptance returns `{ ok: true, project_id, invoices }`: one project and three invoices on
  a 40, 30, 30 split of the ex-VAT subtotal, each carrying the quote's VAT rate, due today,
  in 30 days and in 60 days.
- `status` accepts `draft`, `sent` or `declined`. Once a quote is accepted its terms are
  fixed, so any status change returns 409 and a new quote is needed.
- Acceptance evidence (2026-10-18, SQL 14). Once the columns exist, `accept` takes
  `{ id, method, reference, received_on }`: `method` is `email`, `letter`, `in_person`,
  `phone` or `other`; `reference` is 3 to 200 characters; `received_on` is `YYYY-MM-DD`, not
  after today on the database clock and not before the quote's creation day. Anything
  missing answers 400 and creates nothing. The reply adds `evidence_recorded` and
  `accepted_terms_sha256`. Before SQL 14, accept is unchanged and asks for nothing.
- The 40/30/30 amounts and the fingerprint are computed in integer pence: deposit and stage
  rounded half away from zero, the final invoice takes the remainder (K-068). A quote too
  large for integer arithmetic answers 400.
- GET list and GET `?id=` add `evidence_ready`, `accepted_at`, `accepted_by`,
  `accepted_by_name`, `acceptance_method`, `acceptance_reference`, `acceptance_received_on`
  and `accepted_terms_sha256` (nulls before SQL 14). The public `?token=` view adds only
  `accepted_on`, the date, for an accepted quote.
- Covered by `tests/server/acceptance-evidence.test.ts`.

### Delivery

| Endpoint | Actions | Roles |
|---|---|---|
| `projects.php` | GET list, GET `?action=templates`, `create` (optionally from a template), `status`, `stage` | STAFF |
| `tasks.php` | GET list, `create`, `status` | STAFF |
| `design.php` | GET list with optional `?project_id=`, `create`, `status`, `delete` | STAFF. Two rounds maximum |
| `dev.php` | GET `?project_id=`, GET list, `meta`, `deploy` | STAFF |
| `resourcing.php` | GET list, `leave`, `delete` | STAFF. Weekly capacity constant is 2400 minutes |
| `time.php` | GET list, `create`, `delete`, `approve`, `reject` | STAFF; approve and reject are management only. The list carries `ticket_id` (2026-10-19, SQL 17), NULL before SQL 17 or while `_time.php` is missing |
| `careplan.php` | GET list, `check` | STAFF |
| `files.php` | Staff: GET list with optional `?client_id=` or `?project_id=`, GET `?download=`, `upload`, `share`, `client_share`, `delete`. Client: GET `?action=mine`, GET `?action=mine_download&id=` | STAFF; the `client` role on its own two routes only (2026-10-19, SQL 18) |
| `assets.php` | Staff: GET `?project_id=`, `create`, `update`, `accept`, `reopen`, `delete`. Client: GET `?action=mine`, `supply` | STAFF (as `projects.php`); the `client` role on its own two routes only (2026-10-18) |
| `briefs.php` | GET `?project_id=`, `save`, `measure_create`, `measure_update`, `measure_delete`, GET `?action=handoff&project_id=` | STAFF (as `projects.php`); a `client` gets 403 on every route, reads included (2026-10-19) |

`assets.php` (2026-10-18, SQL 15, `docs/PRODUCT-SPEC.md` sections 6.2 and 7; the client branch
is security-critical):

- `create` `{ project_id, label, note? }`, `update` `{ id, label?, note?, file_id? }`,
  `accept` `{ id }`, `reopen` `{ id }`, `delete` `{ id }` (soft). A label is 1 to 160
  characters and a note at most 1000; longer text answers 400. `file_id` must be a live file
  on the same project (404 otherwise). At most 100 live items per project (409).
- Status: a client moves requested to supplied; staff accept from requested or supplied and
  reopen from supplied or accepted. Reopen clears `supplied_at` and `accepted_at` and keeps
  `client_note`. An invalid move, or a double supply, answers 409.
- `mine` (client) lists items on the client's live projects as `{ id, project_id,
  project_name, label, note, status, client_note, supplied_at, accepted_at, created_at,
  updated_at }`. `supply` (client) takes `{ id, note? }`; another client's item answers 404.
- Audit actions: `asset_create`, `asset_update`, `asset_accept`, `asset_reopen`,
  `asset_delete`, `asset_supply`. Every action answers 503 until SQL 15.
- Covered by `tests/server/project-assets.test.ts`.

`briefs.php` (2026-10-19, SQL 16, `docs/PRODUCT-SPEC.md` sections 6.4 and 6.5):

- GET `?project_id=N` returns `{ project, brief, measurements }`; `brief` is `null` until
  something is saved. A deleted or unknown project answers 404.
- `save` `{ project_id, ...fields }` upserts the brief. No field is required; a field left out
  keeps its value, `null` or a blank string clears it, unknown keys are ignored. Each text field
  has a cap (2000 for most, 4000 for deliverables and the handover checklist, 120 for the quote
  reference, 500 for the next action); a longer value answers 400, never cut.
  `completion_ack_on` is a `YYYY-MM-DD` date.
- `measure_create` `{ project_id, label, ... }` (label 1 to 200 characters; at most 50 live
  measurements per project, 409 after). `measure_update` and `measure_delete` take `{ id,
  project_id }`, and both must match one live row on a live project, otherwise 404.
  `result` is `PASS`, `FAIL`, `PARTIAL` or `NOT TESTED` (default); `kind` is `technical`
  (default) or `business`, and `observation_window` is refused for a technical measurement.
  Delete is soft.
- `?action=handoff` answers a `text/markdown` attachment, `gakinz-handoff-project-<id>.md`:
  project id and name, the client's ID number only, deliverables, exclusions, quote
  reference, each measurement's label, target, method and result, open decisions, next
  action and evidence locations, after a redaction pass. The include and exclude lists are
  in the file's docblock; `docs/SECURITY.md` section 3 describes the limits.
- Audit actions: `brief_save`, `measure_create`, `measure_update`, `measure_delete`,
  `brief_handoff_export`. Every route answers 503 until SQL 16. Every SQL failure is a 500 or
  that 503, never `ok` (K-082).
- Covered by `tests/server/project-briefs.test.ts`.

`projects.php` templates (2026-10-19, `docs/PRODUCT-SPEC.md` section 6.4; staff only):

- GET `?action=templates` returns the five work-type templates from `_templates.php`:
  `business_website`, `ecommerce`, `website_care`, `it_support` and `it_consultancy`, each with
  its starter tasks (title and days after creation), client checklist items and measurement
  rows. Templates are code, not data: changing one needs a code change and an upload.
- `create` takes an optional `template` key and `include_client_checklist`. An unknown key
  answers 400 and creates nothing. The project, its tasks (due dates counted from today in
  PHP's time zone) and its measurement rows (SQL 16, result NOT TESTED) are always written;
  the checklist items (SQL 15) only when `include_client_checklist` is exactly `true`,
  because the client sees them in the portal at once (K-086). No brief row is written.
  Everything, the audit row included, is one transaction. A missing optional table (error
  1146) is skipped and listed in `skipped`; any other failure answers 500 and leaves nothing.
  The reply is `{ id, template, include_client_checklist, created: { tasks, assets,
  measurements }, skipped }` with 201. A create without `template` is unchanged.
- Both template routes answer 503 "Project templates are not available yet." while
  `_templates.php` is not on the server; list, plain create, status and stage still work.
- Covered by `tests/server/project-templates.test.ts`.

`files.php` client sharing and downloads (2026-10-19, SQL 18, `docs/PRODUCT-SPEC.md` sections
6.2 and 7; the client branch is security-critical):

- `client_share` (staff) takes `{ id, visible }`, where `visible` is a boolean (or 0 or 1).
  Showing a file needs exactly one owning client: a project with a client, or a client with
  no project, and the two must agree. Otherwise 409 (no client, a removed project, or a
  client and project that disagree). Hiding always works. `shared_at` keeps the first time a
  file was shown and is cleared on hide. Audit action `file_client_share`, written only when
  the value changes. The staff list adds `client_visible` and `shared_at` (`null` before
  SQL 18).
- `mine` (client) lists the caller's visible, live files as exactly `{ id, name, mime, size,
  shared_at, project_name }`, never the stored name, token, uploader or client id. The
  standing IT support project is named "IT support". `mime` is the stored type only when it
  is on the upload allowlist, otherwise `application/octet-stream`.
- `mine_download&id=N` (client) streams one of those files. Another client's file, a hidden,
  deleted or missing one, or id 0 all answer the same 404 "File not found.".
- A client gets 403 on every staff route, and staff get 403 on both client routes. The
  client id always comes from the token; a `client_id` parameter is ignored.
- Every download (staff `?download=`, the public `?token=` link and `mine_download`) goes
  through one `stream_file()`. The stored name must be a plain file name
  (`^[A-Za-z0-9][A-Za-z0-9._-]{0,254}\z`) that `realpath` resolves to a regular file directly
  inside `uploads/`; anything else answers 404 "File is missing on disk.". Headers:
  `Content-Disposition: attachment; filename="<ASCII fallback>"; filename*=UTF-8''<encoded
  name>`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-store`, except a
  never-expiring `?token=` link, which sends `public, max-age=86400`.
- `client_share`, `mine` and `mine_download` answer 503 until SQL 18; every older action works.
- Covered by `tests/server/portal-files.test.ts`.

### Money

| Endpoint | Actions | Roles |
|---|---|---|
| `invoices.php` | GET list, GET `?id=`, `create`, `status`, `chase`, `record_payment` | STAFF |
| `payments.php` | `link`, `paypal_link` | PAY_STAFF |
| `reports.php` | GET `?report=profitability` | STAFF |

`payments.php` charges what the client owes, not the ex-VAT subtotal:

- `link` takes `{ invoice_id }` and creates a Stripe Checkout Session for the VAT-inclusive
  `total_minor` from `_money.php`, in the invoice's currency. It refuses a paid invoice or
  one with no billable total, and returns `{ url, session_id }`.
- The webhook acts on `checkout.session.completed` with `payment_status` `paid`, or
  `payment_intent.succeeded` with status `succeeded`. It marks the invoice paid only when
  the amount and currency Stripe reports equal the payable total and currency. A mismatch
  is never marked paid: it writes an `invoice_payment_mismatch` audit row for the owner to
  reconcile by hand.
- Each handled Stripe event is recorded in `payment_events` (unique on provider and event
  id) with its outcome: `marked_paid`, `already_paid`, `amount_mismatch`,
  `unknown_invoice` or `ignored`. A redelivered event is acknowledged and changes nothing.
  If the table does not exist yet the webhook still works, guarded by `status <> "paid"`,
  and logs that the event was not recorded. The table is in `server/schema.sql` and is
  not applied until someone runs it.
- PayPal is switched off. `paypal_link` returns 503 unless `$PAYPAL_ENABLED = true` is set
  in `config.php`, and `config.php.example` keeps it `false` because there is no PayPal
  webhook yet (K-026). The code behind the switch charges the same VAT-inclusive total.

`invoices.php?action=record_payment` (2026-10-18, SQL 13) takes `{ id, method, reference?,
paid_on, amount }`. `method` is `bank_transfer`, `cash`, `cheque` or `other`; a reference (up to
100 characters) is required for a bank transfer or cheque; `paid_on` is `YYYY-MM-DD` and not in
the future on the PHP clock (K-067); `amount` is pounds with at most two decimals and must
equal the `_money.php` payable total (a mismatch answers 400 with `expected_pence`). Only a
sent invoice can be recorded: draft, already paid or a concurrent change answers 409, a
missing or deleted invoice 404, and 503 before SQL 13. It returns `{ ok, id, status: "paid",
paid_at, paid_method, paid_reference, paid_amount_pence }` and writes an `invoice_paid_manual`
audit row. Both GETs add the four fields (null when none is recorded). `status` back to draft
or sent clears them. Covered by `tests/server/manual-payment.test.ts`.

### Client-facing

| Endpoint | Actions | Roles |
|---|---|---|
| `portal.php` | GET | Any authenticated user. The `client` role is bound to its own `client_id`. The staff preview branch requires super_admin, admin or manager. Since 2026-10-19 each project carries `kind` (`it_support` or `null`); the standing IT support project is always named "IT support" with zero task counts |
| `support.php` | Staff: GET list, GET `?id=`, `create`, `status`, `priority`, `assign`, `reply`, `log_time`. Client: GET list, GET `?id=`, `create`, `reply`, `update_request`, `deletion_request` | STAFF, plus the `client` role on its own branch |
| `feedback.php` | Staff: GET list (`?client_id=` to filter), `create`, `update`. Client: `create` only | STAFF for every read; the `client` role may only create |
| `comms.php` | GET list, GET `?id=`, `create`, `post`, `send`, `status` | STAFF |
| `mail.php` | GET `status`, `inbox`, `message`; POST `send`, `seen` | MAIL_ROLES |

`support.php` client branch (2026-10-10, security-critical like `portal.php`):

- A `client` caller's client id comes from the token. Any `client_id` in the request is
  ignored, and an account with no linked client gets 403.
- GET list returns that client's tickets, newest activity first, each with `id`, `subject`,
  `body`, `status`, `created_at`, `last_activity` and `replies`. GET `?id=` returns one ticket;
  another client's ticket answers 404, exactly like a missing one.
- `create` takes `{ subject, body? }` (subject required, up to 200 characters; body up to
  5,000) and stores priority `normal`. `reply` takes `{ id, body }` and checks ownership
  first. Over-long text is refused, not cut. Both write an audit row and return `{ id }` with
  201.
- Each reply carries `author` and `from_client`. Staff replies show to the client as
  `GAkinz`, never a staff name. There is no internal-note flag, so every reply is client
  facing.
- Any other action from a client is 403. Clients cannot set status, priority or assignee.
- Covered by `tests/server/support-client.test.ts` with two synthetic clients.
- `update_request` (2026-10-18) takes `{ question, project_id? }` (question up to 5,000
  characters). It creates a ticket titled "Update request: " plus the project name or the
  start of the question, built by the server, and returns `{ id, subject }` with 201. An empty
  question answers 400, a project that is not one of the caller's own 404, and the same open
  question again within ten minutes 409. Audit action `ticket_update_request`. Covered by
  `tests/server/portal-requests.test.ts`.
- `deletion_request` (2026-10-19, `docs/PRIVACY-READINESS.md` section 7) takes no input and
  ignores any body. It creates a ticket with the fixed subject "Data deletion request" and a
  fixed body saying nothing has been deleted yet, priority `normal`, and returns `{ id,
  subject }` with 201. While that client has such a ticket that is not `resolved`, another
  request from any of its logins answers 409; the client row is locked for the check, so
  simultaneous requests make one ticket. Nothing is deleted. Audit action
  `ticket_deletion_request`, `#id (client)`. A staff caller gets 405. Covered by
  `tests/server/deletion-request.test.ts`.

`support.php?action=log_time` (2026-10-19, SQL 17, `docs/PRODUCT-SPEC.md` sections 6.4 and 7):

- Staff only: super_admin, admin, manager, editor and employee, the `STAFF` list of
  `support.php`. `time.php` create also allows `trainer`, but trainer has no Support access,
  so log_time refuses trainer with 403, as it does a client.
- Takes `{ id, minutes, description?, billable?, entry_date? }` with the `time.php` rules
  from `_time.php`: minutes above zero, description trimmed and cut to 300 characters,
  `entry_date` today in PHP's time zone when empty (K-085). The CMS always sends the
  browser's local date.
- Finds the client's standing IT support project (`projects.kind = 'it_support'`) or
  creates it once ("IT support", in progress, stage support, audited `project_create`), then
  writes a draft time entry with the ticket id, audited `ticket_time_log`. Row locks on the
  client and the project keep two parallel calls to one project. Everything, both audit rows
  included, is one transaction.
- Returns `{ id, project_id, project_created }` with 201. 400 for invalid minutes, a missing
  id or a ticket with no client; 404 for an unknown or deleted ticket; 409 "This ticket's
  client was removed."; 503 until SQL 17, or while `_time.php` is missing.
- The staff GET `?id=` adds `time: { total_minutes, entries[] }` (rejected and deleted
  entries left out of the total), or `time: null` before SQL 17 or without `_time.php`. The
  client branch never carries time.
- Covered by `tests/server/ticket-time.test.ts`.

`feedback.php` (2026-10-16, `docs/PRODUCT-SPEC.md` section 6.3; its client branch is
security-critical):

- `create` takes `{ project_id?, rating?, went_well?, could_improve?, follow_up_ok?,
  may_publish?, attribution? }`, plus `client_id` from staff. From a `client` caller the
  client id comes from the token and any `client_id` sent is ignored; a `project_id` of
  another client answers 404 exactly as a missing one. `rating` is 1 to 5 or absent; a rating
  or some text is required. `follow_up_ok` and `may_publish` must be booleans; `may_publish`
  defaults to false and `attribution` is dropped without it. A client gets `{ ok: true }` with
  201 and nothing else back. An identical submission from the same client within ten minutes
  returns the first (`duplicate: true`, 200).
- Every GET is staff only. A client gets 403, so feedback never reaches a client, its author
  included. Each item is `{ id, client_id, client_company, project_id, project_name, source,
  rating, went_well, could_improve, follow_up_ok, may_publish, attribution, follow_up,
  owner_note, submitted_by, created_at, updated_at }`.
- `update` (staff) takes `{ id, follow_up?, owner_note?, may_publish? }`. `follow_up` is
  `new`, `following_up` or `closed`. Setting `may_publish` to false clears the attribution and
  records a withdrawal in the audit detail.
- Nothing here publishes a testimonial. Without the 2026-10-16 table every action answers 503.
- Covered by `tests/server/feedback.test.ts` with two synthetic clients.

### Content

| Endpoint | Actions | Roles |
|---|---|---|
| `blog.php` | GET `?all=1`, GET `?id=`, `create`, `update`, `publish`, `delete` | EDITORS. `?all=1` lists every post without its body; `?id=` returns one post at any status with its body, for the edit form. An `update` that omits `excerpt` or `body` keeps the stored value, so saving other fields never wipes the article |
| `testimonials.php` | GET `?all=1`, `create`, `update`, `approve`, `delete` | EDITORS |
| `content.php` | GET list, `create`, `update`, `delete` | EDITORS |
| `work.php` | `listAll`, `getAdmin`, `create`, `update`, `publish`, `remove`, `reorder`, `addImage`, `removeImage`, `setHero`, `heroOrder` | EDITORS. See section 7 |
| `site.php` | GET `?action=draft`, `save`, `publish` | EDITORS. See section 7a |
| `knowledge.php` | GET list with `?q=` and `?category=`, GET `?id=`, `create`, `update`, `delete` | STAFF |
| `announcements.php` | GET list, `create`, `delete` | ALL_STAFF to read, AUTHORS to write |

### Shared services

| Endpoint | Contract | Roles |
|---|---|---|
| `ai.php` | POST `{task, input, system?}` returns `{text}`. OpenRouter proxy | Every staff role, not `client`. Capped per role per day |
| `weather.php` | GET `?city=` | Every staff role, not `client`. Cached 10 minutes |
| `github.php` | GET `?url=` returns commits, pull requests and the latest Actions run | STAFF |
| `figma.php` | GET `?url=` returns name, last modified and thumbnail | STAFF |
| `slack.php` | POST `?action=test` | ADMINS |

### Daily work and privacy (2026-10-19)

| Endpoint | Contract | Roles |
|---|---|---|
| `today.php` | GET only, read only, not audited | The union of the roles below; a `client` or `trainer` gets 403. Each section mirrors the endpoint that owns its data and is **omitted** for a role that cannot read it: enquiries, follow-ups and calls as `leads.php` and `bookings.php` (super_admin, admin, manager, editor), tasks and assets as `tasks.php` and `assets.php` (plus employee), invoices as `invoices.php` (super_admin, admin, manager) |
| `search.php` | GET `?q=`, read only, not audited | The union of the roles below; a `client` or `trainer` gets 403. Clients, enquiries and quotes as `clients.php`, `leads.php` and `proposals.php` (super_admin, admin, manager, editor); projects as `projects.php` (plus employee); invoices as `invoices.php` (super_admin, admin, manager) |
| `privacy.php` | GET `?action=export&client_id=N` or `&enquiry_email=`, GET `?action=retention_report`, POST `?action=erase_enquiry` | Export: super_admin and admin. Retention report and erase: super_admin |

`today.php` returns `{ generated_at, sections }`, where each present section is `{ status:
"ok", count, items }` or `{ status: "unavailable", count: null, items: [] }`. Sections:
`new_enquiries` (status `new`), `follow_ups_due` (open, next action today or earlier),
`calls` (every `requested` call and `confirmed` calls in the next 7 days), `overdue_tasks`
(not done, due before today, live project), `waiting_material` (assets `requested` for more
than 3 days, or `supplied` and awaiting acceptance) and `unpaid_invoices` (`sent` and past
`due_at`, the `overdue` rule of `invoices.php`). At most 20 items each, oldest or most urgent
first; `count` is the full number. Each item is `{ type, id, title, reason, at, route }`,
where `at` is a UTC time ending `Z` or a plain due date, and `route` a CMS deep link
(`/app/leads?enquiry=`, `/app/leads?due=1&enquiry=`, `/app/leads?view=calls&call=`,
`/app/projects?project=&task=`, `/app/projects?project=&asset=`, `/app/invoicing?invoice=`).
A missing table or failed query marks only its section `unavailable`, never an empty `ok`.
Dates use the database clock (K-075). 405 for anything but GET. Covered by
`tests/server/today.test.ts`.

`search.php` trims `q`, which must be valid UTF-8 and 2 to 80 characters (400 otherwise),
and matches it as a literal substring: `!`, `%` and `_` are escaped and the clause is
`LIKE ? ESCAPE '!'` from `_like.php`, which holds under any `sql_mode`. Only rows with
`deleted_at IS NULL`, at most 8 per type, newest first. Returns `{ query, types, results }`:
`types` maps each type the caller may read to `ok` or `unavailable`; each result is `{ type,
id, title, secondary, route }` and never carries a note, message, budget or amount.

| Type | Fields matched | Route |
|---|---|---|
| `client` | company, contact name, email | `/app/clients?client=<id>` |
| `project` | name | `/app/projects?project=<id>` |
| `enquiry` | name, company, email | `/app/leads?enquiry=<id>` |
| `invoice` | number | `/app/invoicing?invoice=<id>` |
| `quote` | title (proposals have no number) | `/app/proposals` (no detail view, K-077) |

405 for anything but GET. Covered by `tests/server/search.test.ts`.

`privacy.php` (`docs/PRIVACY-READINESS.md` sections 6 and 7):

- `export` takes exactly one of `client_id` or `enquiry_email` (400 for neither, both, an
  invalid id or an invalid address; 404 for an unknown client or an email no enquiry uses). It
  answers a JSON attachment with `Cache-Control: private, no-store`, `nosniff` and
  `Access-Control-Expose-Headers: Content-Disposition`, holding `{ about: { generated_at,
  subject, note, excluded, unavailable }, data }`. `data` has every row held about the subject
  across about 15 tables, soft-deleted rows included; `excluded` lists what is always left
  out (password hashes, token values and hashes, 2FA secrets, share tokens, file contents,
  configuration, other clients' rows, and the author and IP of audit rows the subject did not
  write); `unavailable` names any table that is missing. An enquirer export lists the ids of
  client records using the same address without including them. Each export writes one
  `privacy_export` audit row naming who exported whom, never the content. Since 2026-10-19
  each file row also carries `client_visible` and `shared_at` (SQL 18), so the export shows
  what was shared to the portal and when; before SQL 18 the files rows are listed without
  them (tested in `tests/server/privacy.test.ts`).
- `retention_report` returns `{ dry_run: true, generated_at, rules }`; each rule is `{ key,
  label, config_key, unit, starts_from, period, status, counts }`, where `status` is
  `period_not_set`, `invalid_period` or `counted`, and `counts` maps a table to the rows the
  rule would affect. It runs `SELECT COUNT(*)` only. The same report prints from
  `php cron.php job=retention_report` (command line only; the web answers 400).
- `erase_enquiry` (POST, 2026-10-19) takes `{ id, confirm }`, where `confirm` is the
  enquiry's email address (case and outer spaces ignored). In one transaction, under a row
  lock, it hard-deletes that enquiry (its follow-up fields are columns on the row), the calls
  on it (`bookings`) and their history (`booking_events`), and on every `audit_log` row whose
  text names the address as a whole address it replaces the address and the enquirer's name
  with `[erased]`, clearing the IP of the enquirer's own `enquiry_submit` row. It writes one
  audit row `enquiry_erase`, detail `#id`, and returns `{ erased: true, id, bookings,
  booking_events, audit_scrubbed }`. 400 for a bad id or a missing or wrong confirmation, 404
  for an unknown enquiry, and 409 with `reason` (`won`, `converted`, `client_call`,
  `known_address`), changing nothing, for an enquiry that was won, that a client was created
  from, that has a call filed against a client, or whose address is also a client's, a
  user's or a contract signer's. Covered by `tests/server/erase-enquiry.test.ts`.
- Any other GET answers 400 "Unknown action.", any other method 405. Covered by
  `tests/server/privacy.test.ts`.

## 6. AI daily caps

Enforced in `ai.php` by counting `ai_call` rows in `audit_log` since `CURDATE()`.

| Role | Calls per day |
|---|---|
| super_admin, admin | 1000 |
| manager | 400 |
| editor | 250 |
| employee | 150 |
| trainer, the one staff role not listed | 50 |

Past the cap the endpoint returns 429.

## 7. `work.php` in detail

New on 2026-09-22, and the only endpoint that serves both the public site and the CMS from
one file. It is described at length here because it carries two rules that no other endpoint
has, and because **it has never been executed**: there are no `work` tables on any database.

### Actions

| Action | Method | Auth | Behaviour |
|---|---|---|---|
| `list` (also the default when `action` is absent) | GET | none | Published records only. Optional `kind` filter, validated against the four legal values. Ordered by `featured DESC`, `sort_order ASC`, `id DESC`, limit 200 |
| `get` | GET `?slug=` | none | One published record with its ordered image set |
| `listAll` | GET | EDITORS | Every record including drafts, with consent visible |
| `getAdmin` | GET `?id=` or `?slug=` | EDITORS | One record in full at any status, with its images |
| `create` | POST | EDITORS | Returns `{ id, slug }` with 201. Slug derived from the title if not supplied, and refused if taken |
| `update` | POST | EDITORS | Same field set as `create`, plus `id` |
| `publish` | POST | EDITORS | `{ id, status }` where status is `draft` or `published` |
| `remove` | POST | EDITORS | **A hard delete.** `work_images` rows cascade |
| `reorder` | POST | EDITORS | `{ ids: [...] }`, up to 500, writes each position as `sort_order` |
| `addImage` | POST | EDITORS | `{ work_id, file_id, alt, caption?, sort_order? }`, 201. Alt text is mandatory |
| `removeImage` | POST | EDITORS | `{ id }`, a `work_images` row id |
| `hero` | GET | none | Published records with a `hero_order`, ordered by it, limit 5. Returns `id`, `slug`, `kind`, `title`, `sector`, `summary`, `live_url`, `status`, `hero_order`, `brand_colour`, `hero_word`, `hero_desktop`, `hero_mobile`, and `client_name` only with consent |
| `setHero` | POST | EDITORS | `{ id, on }`, `on` a JSON boolean. On: 409 "Publish this record before putting it in the hero." for a draft, 409 "The hero holds 5 projects. Switch one off first." for a sixth, otherwise appended as max + 1. Off: cleared and the rest renumbered 1..n. Returns `{ ok, hero_order }`. Runs in a transaction with the hero rows locked |
| `heroOrder` | POST | EDITORS | `{ ids: [...] }`, at most 5, each once, and exactly the records currently in the hero (409 otherwise). Writes 1..n in the order given |

### The homepage hero (2026-10-14)

`list`, `get`, `listAll` and `getAdmin` also return `hero_order`, `brand_colour`,
`hero_word`, `hero_desktop_file_id`, `hero_mobile_file_id`, and the screenshots folded as
`hero_desktop` and `hero_mobile`, each `{ file_id, alt, share_token, mime }` or `null`, the
same shape as `cover`. A screenshot is served at `files.php?token=<share_token>`.

`create` and `update` accept `brand_colour` (`#RRGGBB`, stored upper case), `hero_word`
(one or two words, 40 characters at most), and `hero_desktop_file_id` with
`hero_desktop_alt`, `hero_mobile_file_id` with `hero_mobile_alt` (alt required, 200
characters at most). **Each is written only when its key is sent**, so an older form cannot
wipe them; `null` or `""` clears, and clearing a file clears its alt. Attaching a screenshot
issues the file a permanent share token exactly as `addImage` does, and 404s a missing file.

Unpublishing through `publish`, saving as a draft through `update`, or `remove` takes the
record out of the hero and renumbers the rest. `publish` and `update` report this as
`hero_removed`. Audit actions: `work_hero_on`, `work_hero_off`, `work_hero_order`.

Before the schema step runs the hero fields read as `null`, `hero` returns `[]`, and
`setHero`, `heroOrder` or a non-empty hero value on `create`/`update` answer 503.

### The consent rule

**A record that names a client cannot be published without stored consent.** The check runs
in two places, on the shared field reader used by `create` and `update`, and again on
`publish`, and it returns 409 with a sentence explaining why.

The public read enforces the other half: `client_name` is **omitted from the response
entirely**, key and all, unless `client_consent = 1` and the name is non-empty. `client_consent`
itself is never returned publicly. A blank string was rejected as the mechanism because a
caller cannot tell a suppressed value from an absent one.

The rule fails closed on purpose. A forgotten permission produces a refused publish, never a
named client on a public page.

### The permanent share token

`addImage` gives the underlying file a `share_token` with **no expiry**, clearing any
existing expiry, and does so **before** the `work_images` row is written. Written the other
way round, a failure would leave an attached image that silently never renders.

This widens the public exposure of the `files` table, and the trade is recorded in
`docs/DECISIONS.md` D-029. Two audit actions record it: `file_share_permanent` and
`file_share_expiry_cleared`. Since 2026-10-19 `files.php` serves a never-expiring link with
`Cache-Control: public, max-age=86400`, so a Work image can be cached for a day, and a change
to the file, or revoking its token, can take as long to reach every viewer (K-087).

`files.share_token` has **no unique constraint** and the public lookup in `files.php` uses
`LIMIT 1`, so a duplicate token would serve the wrong file. `work.php` checks a token is
unused before writing it and takes the other request's token if it loses a race, but the
real guard is `ALTER TABLE files ADD UNIQUE KEY uk_file_share (share_token)`, which is
written at the foot of `server/schema.sql` and **not applied**.

### Validation worth knowing

`live_url` and `repo_url` must start with `http://` or `https://` or the request is refused
rather than the value rendered. Dates must match `YYYY-MM-DD`. `kind` and `status` are
checked with `in_array(..., true)` against the constants at the top of the file, because the
schema uses `VARCHAR` with a trailing comment rather than an `ENUM`, in keeping with the rest
of the schema.

## 7a. `site.php` in detail

New on 2026-10-14. Editable public-site copy, one row per section in `site_content`. The CMS
saves a draft; only `publish` copies it to the public column.

| Action | Method | Auth | Behaviour |
|---|---|---|---|
| `get` (also the default) | GET | none | `{section: data}` for every section with published content; sections never published are absent. Selects the `published` column only, so a draft cannot leak. `{}` before the table exists |
| `draft` | GET | EDITORS | Every known section as `{ draft, published, updated_at, updated_by_name, published_at, published_by_name }`, nulls where nothing is stored |
| `save` | POST | EDITORS | `{ section, data }`. Validates, stores as the draft, audits `site_save`. Returns `{ ok, section, draft }` with the cleaned data |
| `publish` | POST | EDITORS | `{ sections? }`. Copies draft to published for the sections named, or for every section with a draft. Re-validates each draft first. 409 when a named section has no draft or nothing is saved. Audits `site_publish`. Returns `{ ok, published }` |

Section shapes. Text is trimmed and refused, not cut, when empty or over its limit: 300
characters for short fields, 1200 for `lead`, `summary`, `detail`, `best`, `a` and `footer`.
Lists hold 1 to 12 rows. Unknown sections and unknown keys are refused.

| Section | Shape |
|---|---|
| `hero` | `{ status, lead, cta1, cta2, secs }`, `secs` a whole number from 4 to 10 |
| `services` | `[{ title, summary, slug?, group?, hook?, detail?, needs?, deliverables?, exclusions?, price_basis? }]`. See below |
| `process` | `[{ title, detail }]` |
| `packages` | `[{ name, price, best, featured? }]`, `featured` a boolean |
| `addons` | `[{ name, price }]` |
| `terms` | `[{ stage, share }]` |
| `faqs` | `[{ q, a }]` |
| `contact` | `{ email, reply, footer }`, `email` a valid address |

Service page fields (2026-10-19). `slug` is lower-case words joined by single hyphens, at most
80 characters, unique within the list; `group` is `websites` or `it`; `hook` and `price_basis`
are at most 300 characters; `detail` is at most 1200; `needs`, `deliverables` and `exclusions`
are lists of 1 to 10 lines of up to 300 characters each. `slug`, `group`, `hook`, `needs`,
`deliverables`, `exclusions` and `price_basis` come **all together or not at all**: a row with
some but not all of them is refused with a message naming the row. `detail` is optional. A row
with only `title` and `summary` is still accepted (the older shape). Unknown keys are refused as
before. The public site shows a custom row only when it has every one of those fields
(`docs/KNOWN-ISSUES.md` K-093).

Before the table exists, `get` answers `{}` and the staff actions answer 503 with a message
naming the schema step.

## 8. Adding an endpoint

1. Create `server/<resource>.php`. Start with `require __DIR__ . '/_bootstrap.php';`.
2. Declare a local role constant and call `require_auth($conn, ROLES)` in every branch,
   including read branches.
3. Use prepared statements. Return through `ok()` and `fail()` only.
4. Call `audit()` on every mutation.
5. Add the client group to `src/lib/api.ts`.
6. If it needs a schema change, append the `ALTER TABLE` as a dated comment at the foot of
   `server/schema.sql` and record it in `docs/DATA-MODEL.md` and `docs/DEPLOYMENT.md`
   section 5. There is no migration runner.
7. Run `php -l` on the new file, then `npm run build`, `npm test` and `npm run test:server`.
8. Record the file in the upload list in `docs/DEPLOYMENT.md` section 5 and describe it in this
   file. The deploy pipeline will not ship it, and `npm run docs:check` fails a pull request
   that changes server code without touching `docs/DEPLOYMENT.md`.
