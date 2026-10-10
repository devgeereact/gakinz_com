# API specification

**Status:** current for the tracked source as at 2026-10-10. It is verified by source
inspection of the 46 PHP files in `server/`. **No endpoint has been exercised against
production.** Five areas are also covered by local integration tests in `tests/server/`,
run with `npm run test:server` against a throwaway `*_test` database: the Stripe link and
webhook, PayPal being switched off, magic links and two-factor, quote acceptance, blog
editing, and create endpoints returning the new id. Everything else below is source
inspection only. That applies with particular force to `work.php`, which has never run and
has no tables behind it on any database.

The server changes of 2026-09-22 and 2026-10-10 are not known to be uploaded. Where this
document describes behaviour, it describes the repository, not the live server.

Authority: `server/*.php`. Client mirror: `src/lib/api.ts`, 36 exported groups.

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
| 409 | A work slug is already in use; a work record names a client and has no stored consent, so it may not be published; a quote that is not sent, has expired or is no longer open is accepted; or an accepted quote is given a new status |
| 413 | Upload over 20 MB |
| 415 | Upload whose extension is outside the allowlist, or whose sniffed type contradicts it |
| 429 | Login throttle, the contact-form IP throttle, or the per-role AI daily cap |
| 500 | Write failed |
| 502 | Upstream provider error |
| 503 | Integration not configured on the server, or PayPal checkout switched off |

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
| `EDITORS` | super_admin, admin, manager, editor | `blog.php`, `testimonials.php`, `content.php`, `work.php` |
| `PORTAL_PREVIEW_ROLES` | super_admin, admin, manager | `portal.php` staff branch. Narrowed on 2026-09-22 |

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
| `files.php` | GET `?token=` | Streams a shared file while the token is unexpired. A token issued by `work.php?action=addImage` has **no expiry**, so it streams indefinitely. See section 7 |
| `work.php` | GET `?action=list[&kind=]` | Published work records, cover folded in, ordered by featured, then `sort_order`, then id, limit 200 |
| `work.php` | GET `?action=get&slug=` | One published record with its ordered image set |
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

- `GET ?action=me` returns `{ user }` with `id`, `name`, `email`, `role`, `client_id` and
  `status`, the row `require_auth()` reads. It is the cheapest way to check a token.
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
| `proposals.php` | GET list, GET `?id=`, `create`, `status`, `accept`, `share` | STAFF |
| `contracts.php` | GET list, GET `?id=`, `create`, `status`, `sign`, `delete` | STAFF |

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

### Delivery

| Endpoint | Actions | Roles |
|---|---|---|
| `projects.php` | GET list, `create`, `status`, `stage` | STAFF |
| `tasks.php` | GET list, `create`, `status` | STAFF |
| `design.php` | GET list with optional `?project_id=`, `create`, `status`, `delete` | STAFF. Two rounds maximum |
| `dev.php` | GET `?project_id=`, GET list, `meta`, `deploy` | STAFF |
| `resourcing.php` | GET list, `leave`, `delete` | STAFF. Weekly capacity constant is 2400 minutes |
| `time.php` | GET list, `create`, `delete`, `approve`, `reject` | STAFF; approve and reject are management only |
| `careplan.php` | GET list, `check` | STAFF |
| `files.php` | GET list with optional `?client_id=` or `?project_id=`, GET `?download=`, `upload`, `share`, `delete` | STAFF |

### Money

| Endpoint | Actions | Roles |
|---|---|---|
| `invoices.php` | GET list, GET `?id=`, `create`, `status`, `chase` | STAFF |
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

### Client-facing

| Endpoint | Actions | Roles |
|---|---|---|
| `portal.php` | GET | Any authenticated user. The `client` role is bound to its own `client_id` and that branch is unchanged. The staff preview branch now requires super_admin, admin or manager |
| `support.php` | GET list, GET `?id=`, `create`, `status`, `priority`, `assign`, `reply` | STAFF |
| `comms.php` | GET list, GET `?id=`, `create`, `post`, `send`, `status` | STAFF |
| `mail.php` | GET `status`, `inbox`, `message`; POST `send`, `seen` | MAIL_ROLES |

### Content

| Endpoint | Actions | Roles |
|---|---|---|
| `blog.php` | GET `?all=1`, GET `?id=`, `create`, `update`, `publish`, `delete` | EDITORS. `?all=1` lists every post without its body; `?id=` returns one post at any status with its body, for the edit form. An `update` that omits `excerpt` or `body` keeps the stored value, so saving other fields never wipes the article |
| `testimonials.php` | GET `?all=1`, `create`, `update`, `approve`, `delete` | EDITORS |
| `content.php` | GET list, `create`, `update`, `delete` | EDITORS |
| `work.php` | `listAll`, `getAdmin`, `create`, `update`, `publish`, `remove`, `reorder`, `addImage`, `removeImage` | EDITORS. See section 7 |
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
`file_share_expiry_cleared`.

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

## 8. Adding an endpoint

1. Create `server/<resource>.php`. Start with `require __DIR__ . '/_bootstrap.php';`.
2. Declare a local role constant and call `require_auth($conn, ROLES)` in every branch,
   including read branches.
3. Use prepared statements. Return through `ok()` and `fail()` only.
4. Call `audit()` on every mutation.
5. Add the client group to `src/lib/api.ts`.
6. If it needs a schema change, append the `ALTER TABLE` as a comment at the foot of
   `server/schema.sql` and record it in `docs/DEPLOYMENT.md`. There is no migration runner.
7. Run `php -l` on the new file, then `npm run build` and `npm test`.
8. Record the file in the outstanding-upload list in `docs/DEPLOYMENT.md`. The deploy pipeline
   will not ship it.
