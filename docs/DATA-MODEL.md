# Data model

**Status:** current for the tracked schema as at 2026-09-22. Whether the live database
matches it is **UNVERIFIED**, because no live database was contacted.

Authority: `server/schema.sql`. 33 tables. MySQL, InnoDB, `utf8mb4`.

Two of those tables, `work` and `work_images`, were added on 2026-09-22 and **do not exist
on any database**. That is not an inference from a failed check; nothing was checked. They
were written into the file and never run. See section 4.

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
| `auth_tokens` | Opaque session tokens | 64 hex characters, sent as `Authorization: Bearer`. `user_agent`, `ip`, `last_seen_at` drive the active-sessions list |
| `magic_links` | Passwordless sign-in | Short lived, single use |
| `password_resets` | Reset and invite tokens | |
| `audit_log` | Record of sensitive actions | Also doubles as the store for the login throttle and the AI daily cap. See section 5 |

### Sales

| Table | Purpose | Notes |
|---|---|---|
| `enquiries` | Public contact form, the top of the leads pipeline | `status` moves through new, contacted, proposal, won, lost. `tags`, `score`, `lost_reason` added later |
| `clients` | CRM record, created when a lead is won | `tag` is one of retainer, one-off, vip, dormant. `retainer_amount` drives recurring billing and care-plan revenue |
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
| `contracts` | Contracts and NDAs with typed-name e-signature | Stores signer name, IP and timestamp. NDA triage is a green, amber or red tag |

### Client-facing

| Table | Purpose | Notes |
|---|---|---|
| `tickets`, `ticket_replies` | Support | status open, in_progress, resolved; priority urgent, high, normal, low |
| `comm_threads`, `comm_messages` | Conversation log tied to a client or project | `channel` is email, sms, whatsapp, call, meeting, client or internal. `direction` is out, in or note. Most messages are **recorded**, not sent. Email, SMS and WhatsApp can genuinely send |
| `files` | File metadata | Binary lives on disk under `server/uploads/`, which is gitignored. Optional `share_token`, expiring when issued by `files.php?action=share` and **non-expiring** when issued by `work.php?action=addImage`. See section 7 |
| `certificates` | Publicly verifiable certificates | `public_id` is the reference used by `/verify/:id`. `revoked_at` hides a revoked one |

### Content and platform

| Table | Purpose | Notes |
|---|---|---|
| `posts` | Public blog, authored in the CMS Blog module | `blog.php` serves `published` rows publicly |
| `testimonials` | Curated testimonials, approved in the CMS | Public read of approved rows only |
| `content_drafts` | AI content hub output | Platforms: blog, linkedin, x, instagram, facebook, tiktok |
| `kb_articles` | Internal SOPs and wiki | |
| `announcements` | Dashboard broadcasts | Optionally mirrored to Slack |
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

**Indexes.** `work` has a unique `slug`, `idx_public (status, kind, sort_order)` for the
public list, and `idx_slug`. `work_images` has `idx_work (work_id, sort_order)`.

## 3. Ownership and isolation

The client isolation chain is:

```
users.client_id  ->  clients.id  ->  projects.client_id
                                 ->  invoices.client_id
                                 ->  tickets.client_id
```

`portal.php` derives `client_id` from the authenticated token whenever the role is `client`
and ignores any `?client_id` parameter. Staff may pass the parameter to preview a portal.
This is the only place a client-role account reaches its data. Every other resource endpoint
is staff only.

## 4. Migrations

**There is no migration runner.** Schema changes live as commented `ALTER TABLE` statements
from line 291 of `server/schema.sql`. They are documentation, not something the application
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

Which of the older statements have already been applied to the live database is
**UNVERIFIED**. The two 2026-09-22 groups are a different case: they are known **not** to
have been applied, because they were written in this working tree and no database has been
contacted since.

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
device columns; `require_auth()` does it for `last_seen_at`. The effect is that an
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
