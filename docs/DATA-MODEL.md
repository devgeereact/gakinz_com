# Data model

**Status:** current for the tracked schema. Whether the live database matches it is
**UNVERIFIED**, because no live database was contacted.

Authority: `server/schema.sql`. 31 tables. MySQL, InnoDB, `utf8mb4`.

---

## 1. Conventions

- Integer `id` primary key, `AUTO_INCREMENT`, except `project_dev` which is keyed by
  `project_id`.
- `created_at` on every table, `updated_at` where rows are edited.
- **Soft delete** through `deleted_at TIMESTAMP NULL`. Almost every read filters
  `deleted_at IS NULL`. A hard delete is not the pattern here.
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
| `files` | File metadata | Binary lives on disk under `server/uploads/`, which is gitignored. Optional expiring `share_token` |
| `certificates` | Publicly verifiable certificates | `public_id` is the reference used by `/verify/:id`. `revoked_at` hides a revoked one |

### Content and platform

| Table | Purpose | Notes |
|---|---|---|
| `posts` | Public blog, authored in the CMS Blog module | `blog.php` serves `published` rows publicly |
| `testimonials` | Curated testimonials, approved in the CMS | Public read of approved rows only |
| `content_drafts` | AI content hub output | Platforms: blog, linkedin, x, instagram, facebook, tiktok |
| `kb_articles` | Internal SOPs and wiki | |
| `announcements` | Dashboard broadcasts | Optionally mirrored to Slack |
| `items` | Smoke test only | Two columns. Proves the browser to PHP to MySQL path. Not a product table |

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

Which of these have already been applied to the live database is **UNVERIFIED**. See
`docs/DEPLOYMENT.md`.

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
