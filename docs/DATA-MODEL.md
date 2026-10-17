# Data model

**Status:** current for the tracked schema as at 2026-10-14. Whether the live database
matches it is **UNVERIFIED**, because no live database was contacted.

Authority: `server/schema.sql`. MySQL or MariaDB, InnoDB, `utf8mb4`; the table count is in
`docs/STATUS.md` section 0.

Not applied to any live database, because they were written into the file and never run:
`work` and `work_images` (2026-09-22), `payment_events` and the three enquiry follow-up
columns (2026-10-10), the seven work hero columns and `site_content` (2026-10-14). That is not an inference from a failed check; nothing was checked. See
section 4.

---

## 1. Conventions

- Integer `id` primary key, `AUTO_INCREMENT`, except `project_dev` which is keyed by
  `project_id`.
- `created_at` on every table except `work_images`, `updated_at` where rows are edited.
- **Soft delete** through `deleted_at TIMESTAMP NULL`. Almost every read filters
  `deleted_at IS NULL`. A hard delete is not the pattern here.
  **`work` and `work_images` are the exception**, added on 2026-09-22: neither carries
  `deleted_at`, and `work.php?action=remove` is a real `DELETE`, with `work_images`
  cascading. A work record is editorial material that the owner can recreate, not a business
  record that an audit might need later, so the recovery argument for a soft delete does not
  apply. The child rows cascade; the underlying files in `files` do not, and their permanent
  share tokens survive the deletion. See section 7.
- Money as `DECIMAL`. Base currency is GBP. VAT is stored as a rate on the parent row
  (`vat_rate`) and applied at read time, not stored as a computed total.
- Time as minutes (`time_entries.minutes`), not hours.
- Foreign keys are declared, with `ON DELETE CASCADE` for owned children and
  `ON DELETE SET NULL` for an actor reference such as `created_by`.

## 2. Tables

### Identity and access

| Table | Purpose | Notes |
|---|---|---|
| `users` | Staff and client logins | `role` is one of the seven roles. `client_id` binds a `client` login to one client. `cost_rate` feeds profitability. `totp_secret`, `totp_enabled`, `totp_recovery` carry 2FA |
| `auth_tokens` | Session tokens, stored hashed | The browser holds 64 hex characters; the row holds `token_hash()` of them (62 characters) since 2026-10-17, or the raw value for an older session (K-059). `user_agent`, `ip`, `last_seen_at` drive the active-sessions list |
| `magic_links` | Passwordless sign-in | Short lived, single use |
| `password_resets` | Reset and invite tokens | |
| `audit_log` | Record of sensitive actions | Also doubles as the store for the login throttle and the AI daily cap. See section 5 |

### Sales

| Table | Purpose | Notes |
|---|---|---|
| `enquiries` | Public contact form, the top of the leads pipeline | `status` moves through new, contacted, proposal, won, lost. `tags`, `score`, `lost_reason` added later. Follow-ups, 2026-10-10: `next_action_at` (DATE, null), `next_action_note` (VARCHAR 300, null) and `priority` (TINYINT, 0 none to 3 high, the owner's choice and separate from `score`) |
| `clients` | CRM record, created when a lead is won | `tag` is one of retainer, one-off, vip, dormant. `retainer_amount` drives recurring billing and care-plan revenue |
| `bookings` | Calls recorded by hand inside Enquiries, added 2026-10-16 | Linked to an `enquiry_id`, a `client_id` or both. `starts_at` is UTC and `timezone` the IANA zone the time was agreed in; `bookings.php` converts with PHP's own zone database and refuses a local time inside the spring-forward gap. `status` is requested, confirmed, completed or cancelled; only the owner moves a request to confirmed. `notes` and `outcome` are owner only and never sent |
| `booking_events` | History of each booking, added 2026-10-16 | One row per create, reschedule and status change, with the old and new time or status. A customer email about a reschedule or cancellation records `notify_status` (sending, sent, failed), `notify_to`, `notify_attempts` and `notify_error` on its event, so the owner sees a failure and can retry it. Cascades with its booking |
| `proposals`, `proposal_items` | Quotes with line items | `vat_rate`. `share_token` is unique and powers the public `/p/:token` view; `views` and `last_viewed_at` track opens |

### Delivery

| Table | Purpose | Notes |
|---|---|---|
| `projects` | One workspace per client build | `status` is planning, in_progress, on_hold or launched. `stage` is the five-step delivery ladder: discover, design, build, launch, support |
| `tasks` | Kanban within a project | todo, doing, review, done |
| `design_reviews` | Figma review rounds | `round` is capped at 2 in `design.php` |
| `project_dev` | Repository and environment URLs, JSON build checklist | Also holds the monitor results: `last_http_status`, `ssl_days_left`, `last_checked_at` |
| `deploys` | Deploy log per project | staging or production; success, failed or rolled_back |
| `time_entries` | Billable and non-billable minutes | `status` is draft, approved or rejected |
| `leave_entries` | Holiday, sick and other leave | Capacity itself is derived live from `time_entries`, so there is no committed-hours table |

### Money

| Table | Purpose | Notes |
|---|---|---|
| `invoices`, `invoice_items` | Invoicing | `vat_rate` on the parent. Totals are computed from items at read time in several endpoints |
| `payment_events` | One row per payment-provider event processed, added 2026-10-10 | `provider`, `event_id`, `invoice_id`, `amount_minor` (pence as reported, -1 if absent), `currency`, `outcome` (marked_paid, already_paid, amount_mismatch, unknown_invoice, ignored). Unique on provider and event id, so a redelivery is a no-op (K-025) |
| `contracts` | Contracts and NDAs with typed-name e-signature | Stores signer name, IP and timestamp. NDA triage is a green, amber or red tag |

### Client-facing

| Table | Purpose | Notes |
|---|---|---|
| `tickets`, `ticket_replies` | Support, and since 2026-10-10 client messages | status open, in_progress, resolved; priority urgent, high, normal, low. A client-created ticket takes `client_id` from the token and priority `normal`. `ticket_replies` has no internal-note flag, so every reply is client facing |
| `comm_threads`, `comm_messages` | Conversation log tied to a client or project | `channel` is email, sms, whatsapp, call, meeting, client or internal. `direction` is out, in or note. Most messages are **recorded**, not sent. Email, SMS and WhatsApp can genuinely send |
| `files` | File metadata | Binary lives on disk under `server/uploads/`, which is gitignored. Optional `share_token`, expiring when issued by `files.php?action=share` and **non-expiring** when issued by `work.php?action=addImage`. See section 7 |
| `client_feedback` | Private delivery feedback, added 2026-10-16 | `client_id`, optional `project_id` (must belong to that client), `source` (portal or owner), optional `rating` 1 to 5, `went_well`, `could_improve`, `follow_up_ok`. `may_publish` is the client's separate permission to quote it and defaults to 0; `attribution` is kept only with it. `follow_up` (new, following_up, closed) and `owner_note` are the owner's. **Never returned to any client**, not even its author |
| `certificates` | Publicly verifiable certificates | `public_id` is the reference used by `/verify/:id`. `revoked_at` hides a revoked one |

### Content and platform

| Table | Purpose | Notes |
|---|---|---|
| `posts` | Public blog, authored in the CMS Blog module | `blog.php` serves `published` rows publicly |
| `testimonials` | Curated testimonials, approved in the CMS | Public read of approved rows only |
| `content_drafts` | AI content hub output | Platforms: blog, linkedin, x, instagram, facebook, tiktok |
| `kb_articles` | Internal SOPs and wiki | |
| `announcements` | Dashboard broadcasts | Optionally mirrored to Slack |
| `site_content` | Editable public-site copy, added 2026-10-14 | One row per section (`hero`, `services`, `process`, `packages`, `addons`, `terms`, `faqs`, `contact`), keyed by `section`. `draft` and `published` are JSON held as `MEDIUMTEXT`, because the host's MySQL version is UNVERIFIED. `site.php` validates every section against a fixed shape before storing it and serves only `published` publicly. `updated_by` and `published_by` are user ids with no foreign key, so removing a user leaves the history readable |
| `items` | Smoke test only | Two columns. Now **unused**: `api.php` was reduced to a read-only health check on 2026-09-22 and no longer reads or writes it. The table is left in place because dropping it on a live database is not something this repository can verify. See `docs/DECISIONS.md` D-031 |

### Work, added 2026-09-22

| Table | Purpose | Notes |
|---|---|---|
| `work` | The work ledger behind `/work` and `/work/:slug` | One record type, four kinds. See below |
| `work_images` | The ordered image set for a record | `work_id` cascades on delete. `alt` is nullable in the schema but mandatory in `work.php`, which refuses an `addImage` without it |

**One record type with four kinds.** `work.kind` takes `case_study`, `product`, `experiment`
or `writing`, as a `VARCHAR` with the legal values in a trailing comment. There is no `ENUM`
and no `CHECK` anywhere in this schema, so `work.php` validates with
`in_array(..., true)` instead. The three body columns are named `problem`, `built` and
`outcome`, and the interface relabels them per kind: an experiment reads Question, Made,
Learned. That is what lets one table hold four kinds without a badge. See
`docs/DECISIONS.md` D-025.

**`status`** is `draft` or `published`, same convention. Only `published` rows leave the
server on the public branch.

**`client_name` and `client_consent`** are the pair that makes the consent rule enforceable.
The public read omits `client_name` entirely unless `client_consent = 1`, and `work.php`
refuses to publish a record that names a client without it. Storing the consent as a column
rather than as a process note is the whole point: the rule can then be checked in code.

**Images live in a child table**, not a JSON column, matching `proposal_items` and
`invoice_items`, because the host's MySQL version is UNVERIFIED and JSON support cannot be
assumed.

**Homepage hero, added 2026-10-14.** Seven nullable columns on `work`: `hero_order`
(1 to 5 while the record is in the hero, otherwise `NULL`), `brand_colour` (`#RRGGBB`),
`hero_word` (one or two words finishing the headline), and `hero_desktop_file_id`,
`hero_desktop_alt`, `hero_mobile_file_id`, `hero_mobile_alt` for the two screenshots. The
screenshots are `files` rows served by share token, as work images are, and `work.php` issues
a permanent token when one is attached and refuses one without alt text. `work.php` also
enforces the rules the schema cannot: at most five records in the hero, published only, the
order kept gap-free at 1..n, and a record dropped from the hero when it is unpublished or
removed. There is deliberately no unique key on `hero_order`, because renumbering passes
through duplicate values.

**Indexes.** `work` has a unique `slug`, `idx_public (status, kind, sort_order)` for the
public list, `idx_slug`, and `idx_hero (hero_order)`. `work_images` has
`idx_work (work_id, sort_order)`.

## 3. Ownership and isolation

The client isolation chain is:

```
users.client_id  ->  clients.id  ->  projects.client_id
                                 ->  invoices.client_id
                                 ->  tickets.client_id
                                 ->  client_feedback.client_id   (write only for a client)
```

`portal.php` derives `client_id` from the authenticated token whenever the role is `client`
and ignores any `?client_id` parameter. Staff may pass the parameter to preview a portal.
Since 2026-10-10 the client branch of `support.php` does the same for `tickets` and
`ticket_replies`, repeating the `client_id` condition in every query. Those two files, plus a
client's own account actions in `auth.php`, are the only places a client-role account reaches
data. Since 2026-10-16 `feedback.php` also accepts a create from a client, taking `client_id`
from the token and checking that any `project_id` belongs to that client; it never returns
feedback to a client. Every other resource endpoint is staff only, `bookings.php` included.

## 4. Migrations

**There is no migration runner.** Schema changes live as commented `ALTER TABLE` statements in
the `MIGRATIONS` block of `server/schema.sql` and in dated blocks at its foot. They are documentation, not something the application
applies. A fresh install gets the columns from the `CREATE TABLE` blocks; an existing database
needs the statements run by hand.

Outstanding statements, grouped as they appear in the file:

| Group | Statements |
|---|---|
| Client-role auth | `users.client_id` |
| VAT | `invoices.vat_rate`, `proposals.vat_rate` |
| Project stages | `projects.stage` |
| Timesheet approval | `time_entries.status`, plus an `UPDATE` grandfathering existing rows to `approved` |
| Session device tracking | `auth_tokens.user_agent`, `.ip`, `.last_seen_at` |
| Finance and 2FA | `users.cost_rate`, `.totp_secret`, `.totp_enabled` |
| Recurring billing and monitoring | `clients.retainer_amount`, `project_dev.last_http_status`, `.ssl_days_left`, `.last_checked_at` |
| Lead depth and proposal sharing | `enquiries.tags`, `.score`, `.lost_reason`; `proposals.share_token`, `.views`, `.last_viewed_at`, plus a unique key on `share_token` |
| 2FA recovery and magic links | `users.totp_recovery`, plus the `magic_links` table |
| Later module tables | `design_reviews`, `project_dev`, `deploys`, `leave_entries`, `contracts`, `files`, `announcements`, `kb_articles`, `posts`, `testimonials`, `content_drafts` |
| Work ledger, 2026-09-22 | `work`, `work_images`. Both are `CREATE TABLE IF NOT EXISTS`, so they are safe to run as they stand |
| Share-token collision guard, 2026-09-22 | `ALTER TABLE files ADD UNIQUE KEY uk_file_share (share_token)` |
| Payment event log, 2026-10-10 | `CREATE TABLE IF NOT EXISTS payment_events`. Safe to run twice |
| Enquiry follow-ups, 2026-10-10 | `ALTER TABLE enquiries ADD COLUMN next_action_at`, `next_action_note`, `priority`. Run once; a second run fails on the duplicate column |
| Homepage hero, 2026-10-14 | `ALTER TABLE work ADD COLUMN hero_order`, `brand_colour`, `hero_word`, `hero_desktop_file_id`, `hero_desktop_alt`, `hero_mobile_file_id`, `hero_mobile_alt`, plus `idx_hero`. Run once; a second run fails on the duplicate column |
| Site content, 2026-10-14 | `CREATE TABLE IF NOT EXISTS site_content`. Safe to run twice |
| Bookings, 2026-10-16 | `CREATE TABLE IF NOT EXISTS bookings`, then `booking_events`. Safe to run twice |
| Private feedback, 2026-10-16 | `CREATE TABLE IF NOT EXISTS client_feedback`. Safe to run twice |

Which of the older statements have already been applied to the live database is
**UNVERIFIED**. The 2026-09-22, 2026-10-10 and 2026-10-14 groups are known **not** to have been applied by
this work, nor have the 2026-10-16 tables, because no database has been contacted since they were written. Their order is in
`docs/DEPLOYMENT.md` section 5.2.

**The unique key has a precondition.** `files.share_token` currently has no unique
constraint, so duplicates may already exist, and the `ALTER` fails if any do. Check first:

```sql
SELECT share_token, COUNT(*) c FROM files
  WHERE share_token IS NOT NULL GROUP BY share_token HAVING c > 1;   -- expect 0 rows
```

See `docs/DEPLOYMENT.md` for the order, and `docs/DECISIONS.md` D-029 for why the index
matters.

## 5. Two load-bearing uses of `audit_log`

Worth knowing before anyone prunes that table.

1. **Login throttle.** `auth.php` counts `login_failed` rows for the same email or IP in the
   last 15 minutes and returns 429 at 10 or more.
2. **AI daily cap.** `ai.php` counts `ai_call` rows for the user since `CURDATE()` and returns
   429 past the per-role limit.

Truncating `audit_log` therefore resets both the brute-force throttle and every AI quota.

## 6. Degradation before migration

Several endpoints prepare a statement with the newer columns, and fall back to a narrower
query if the prepare fails. `auth.php` does this for the TOTP columns and for the session
device columns, and its `me` action answers `totp_enabled: null` without the column;
`require_auth()` does it for `last_seen_at`. `leads.php` lists enquiries without the follow-up
columns and answers `followup: false` on `meta` when they are missing (tested in
`tests/server/leads.test.ts`). The effect is that an
un-migrated database keeps working with the older feature set rather than returning a 500.
This is verified by source inspection. Runtime behaviour against a real un-migrated database
is **NOT TESTED**.

**`work.php` does not degrade this way, and that is deliberate.** Every one of its queries
assumes the `work` and `work_images` tables exist. There is no narrower fallback, because
there is no older feature set to fall back to: the module is new. Against a database without
the tables it will return a 500, not a reduced result. The client compensates instead:
`src/marketing/data/work.ts` reads the API and falls back to a typed static record set when
the call fails, so the public page renders either way. The CMS module does not, and will
report the error.

**The 2026-10-14 additions do degrade**, because they extend features that already exist.
Without the hero columns, `work.php` selects `NULL` in their place, so every existing action
keeps its shape; `?action=hero` returns `[]`; and `setHero`, `heroOrder` and a create or
update carrying a non-empty hero value answer 503 with a message naming the schema step.
Without `site_content`, `site.php?action=get` returns `{}` and the staff actions answer 503.
Both paths are tested against a real database with the column or table dropped
(`tests/server/work-hero.test.ts`, `tests/server/site.test.ts`).

**The 2026-10-16 tables degrade too.** Without `bookings` and `booking_events`, every
`bookings.php` action answers 503 naming the schema step, and the Enquiries screen says calls
appear once the update has run. Without `client_feedback`, `feedback.php` answers 503, the
portal form says feedback cannot be sent yet, and the client record says so. `clients.php?id=N`
leaves calls and feedback out of the timeline and lists them in `unavailable`. Tested with the
tables dropped (`tests/server/feedback.test.ts`).

## 7. Files, share tokens and what stays public

Worth reading before attaching an image to a work record, and before deleting one.

`files.share_token` is the public handle: `files.php?token=...` streams the binary to anyone
holding it, with no authentication. Historically every such token had an `expires_at`.

Since 2026-09-22 that is no longer true. `work.php?action=addImage` issues a token with **no
expiry** and clears any expiry already set, so a published work image stays reachable for as
long as the record is published. The reasoning and the trade are in `docs/DECISIONS.md`
D-029.

Three consequences follow from the data model rather than from the code:

1. **A permanent token is not revoked by anything that happens to the work record.**
   Unpublishing the record does not revoke it. `removeImage` does not revoke it, because it
   deletes a `work_images` row and not the file. `remove` deletes the `work` row and cascades
   the children, and still does not revoke it. Only deleting the file, or clearing its token,
   revokes it.
2. **`files` holds client deliverables alongside portfolio images.** There is one table and
   one token mechanism for both. Attaching the wrong file to a work record gives it a
   permanent public URL.
3. **`share_token` has no unique constraint** and `files.php` looks it up with `LIMIT 1`, so
   a duplicate would serve the wrong file to the public. `work.php` checks a token is unused
   before writing it, but the durable guard is the unique key in section 4, which is not
   applied.

Two audit actions record token issuance: `file_share_permanent` and
`file_share_expiry_cleared`. Both are searchable in the Audit module.
