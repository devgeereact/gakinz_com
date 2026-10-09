-- GAkinz / GAkinzOS — foundation schema.
-- Run in cPanel → phpMyAdmin against the project database.
-- Later CMS phases add: users, tokens, clients, projects, tasks, proposals,
-- invoices, sessions, tickets, etc. (one table per resource).

-- Smoke test (build order step 1)
CREATE TABLE IF NOT EXISTS items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Public enquiries → leads pipeline (§6.2 Leads)
CREATE TABLE IF NOT EXISTS enquiries (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  email        VARCHAR(200) NOT NULL,
  company      VARCHAR(200) DEFAULT NULL,
  budget       VARCHAR(100) DEFAULT NULL,
  project_type VARCHAR(100) DEFAULT NULL,
  message      TEXT NOT NULL,
  source       VARCHAR(50)  DEFAULT 'website',
  status       VARCHAR(30)  DEFAULT 'new',   -- new | contacted | proposal | won | lost
  tags         VARCHAR(255) DEFAULT NULL,    -- comma-separated labels
  score        INT NOT NULL DEFAULT 0,       -- 0 unscored | 1 cold | 2 warm | 3 hot
  lost_reason  VARCHAR(300) DEFAULT NULL,    -- captured when moved to 'lost'
  ip           VARCHAR(45)  DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users / auth (§6.1). Roles enforced server-side; never trusted from client.
-- Allowed roles: super_admin, admin, manager, trainer, editor, employee, client
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'employee',
  client_id     INT NULL DEFAULT NULL,                   -- set ONLY for role='client': the client they portal into
  cost_rate     DECIMAL(8,2) NOT NULL DEFAULT 0,         -- internal hourly cost (£) for profitability
  totp_secret   VARCHAR(64) DEFAULT NULL,                -- base32 TOTP secret (2FA)
  totp_enabled  TINYINT(1)  NOT NULL DEFAULT 0,          -- is 2FA active for this user
  totp_recovery VARCHAR(1000) DEFAULT NULL,              -- JSON array of bcrypt-hashed backup codes
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active | suspended
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL
  -- No inline FK to clients: this table is created before clients in this file.
  -- The link is enforced in application code (users.php validates client_id).
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MIGRATION for an existing live DB (users table already exists without the column):
--   ALTER TABLE users ADD COLUMN client_id INT NULL DEFAULT NULL AFTER role;

-- Session tokens (opaque random; React sends as Authorization: Bearer)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  token        CHAR(64) NOT NULL UNIQUE,
  user_agent   VARCHAR(255) DEFAULT NULL,             -- device/browser at sign-in
  ip           VARCHAR(45)  DEFAULT NULL,             -- IP at sign-in
  last_seen_at TIMESTAMP NULL DEFAULT NULL,           -- touched on each authed request
  expires_at   TIMESTAMP NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Passwordless magic-link login tokens (short-lived, single-use)
CREATE TABLE IF NOT EXISTS magic_links (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_magic_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit log of sensitive actions (§6.1)
CREATE TABLE IF NOT EXISTS audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  action     VARCHAR(100) NOT NULL,
  detail     VARCHAR(500) DEFAULT NULL,
  ip         VARCHAR(45)  DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clients / CRM (§6 Clients). A won lead converts into a client record.
CREATE TABLE IF NOT EXISTS clients (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  company        VARCHAR(200) NOT NULL,
  contact_name   VARCHAR(200) DEFAULT NULL,
  email          VARCHAR(200) DEFAULT NULL,
  phone          VARCHAR(60)  DEFAULT NULL,
  tag            VARCHAR(30)  NOT NULL DEFAULT 'one-off',  -- retainer | one-off | vip | dormant
  retainer_amount DECIMAL(10,2) NOT NULL DEFAULT 0,        -- monthly care-plan/retainer fee (£), billed by cron
  notes          TEXT DEFAULT NULL,
  source_lead_id INT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_client_lead FOREIGN KEY (source_lead_id) REFERENCES enquiries(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Projects (§6 Projects & Tasks). One workspace per client build.
CREATE TABLE IF NOT EXISTS projects (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  client_id  INT NULL,
  name       VARCHAR(200) NOT NULL,
  status     VARCHAR(30) NOT NULL DEFAULT 'planning', -- planning | in_progress | on_hold | launched
  stage      VARCHAR(20) NOT NULL DEFAULT 'discover', -- discover | design | build | launch | support (5-stage delivery)
  due_date   DATE NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_project_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tasks within a project (kanban: todo | doing | review | done)
CREATE TABLE IF NOT EXISTS tasks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title      VARCHAR(300) NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'todo',
  assignee   VARCHAR(120) DEFAULT NULL,
  due_date   DATE NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Proposals & quotes (§6 Proposals). Accepting one auto-creates a project.
CREATE TABLE IF NOT EXISTS proposals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  client_id   INT NULL,
  title       VARCHAR(200) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | sent | accepted | declined
  currency    VARCHAR(3)  NOT NULL DEFAULT 'GBP',
  vat_rate    DECIMAL(5,2) NOT NULL DEFAULT 0,      -- % VAT carried onto the scheduled invoices
  share_token CHAR(40) DEFAULT NULL UNIQUE,         -- public read-only link token (NULLs allowed)
  views       INT NOT NULL DEFAULT 0,               -- public-view count
  last_viewed_at TIMESTAMP NULL DEFAULT NULL,       -- last time the client opened the link
  notes       TEXT DEFAULT NULL,
  valid_until DATE NULL DEFAULT NULL,
  project_id  INT NULL,                              -- set when accepted
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_proposal_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS proposal_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  description VARCHAR(300) NOT NULL,
  qty         DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_item_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoicing (§6 Invoicing & Payments). Manual mark-as-paid (Stripe is Phase 2).
CREATE TABLE IF NOT EXISTS invoices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  number      VARCHAR(20) DEFAULT NULL,             -- e.g. GK-INV-0007, set after insert
  client_id   INT NULL,
  project_id  INT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | sent | paid
  currency    VARCHAR(3)  NOT NULL DEFAULT 'GBP',
  vat_rate    DECIMAL(5,2) NOT NULL DEFAULT 0,      -- % VAT applied to the line-item subtotal
  notes       TEXT DEFAULT NULL,
  issued_at   DATE NOT NULL,                        -- set by PHP on create
  due_at      DATE NULL DEFAULT NULL,
  paid_at     TIMESTAMP NULL DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_invoice_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoice_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id  INT NOT NULL,
  description VARCHAR(300) NOT NULL,
  qty         DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_invitem_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Time tracking (§6 Time). Billable hours against projects → feed invoices.
CREATE TABLE IF NOT EXISTS time_entries (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  user_id     INT NULL,
  description VARCHAR(300) DEFAULT NULL,
  minutes     INT NOT NULL DEFAULT 0,
  billable    TINYINT(1) NOT NULL DEFAULT 1,
  status      VARCHAR(10) NOT NULL DEFAULT 'draft',  -- draft | approved | rejected (timesheet approval)
  entry_date  DATE NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_time_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_time_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Support tickets (§6 Support). Post-launch care without the chaos.
CREATE TABLE IF NOT EXISTS tickets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  client_id   INT NULL,
  subject     VARCHAR(200) NOT NULL,
  body        TEXT DEFAULT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'open',     -- open | in_progress | resolved
  priority    VARCHAR(10) NOT NULL DEFAULT 'normal',   -- urgent | high | normal | low
  assignee_id INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_ticket_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_ticket_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_replies (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id  INT NOT NULL,
  user_id    INT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reply_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_reply_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Certificates with public verification (§6.8)
CREATE TABLE IF NOT EXISTS certificates (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  public_id  VARCHAR(40) NOT NULL UNIQUE,    -- e.g. GK-7F3A2C
  recipient  VARCHAR(200) NOT NULL,
  programme  VARCHAR(200) NOT NULL,
  issued_at  DATE NOT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Communication Hub (§6 Comms). Every conversation — email logged by hand,
-- a call recap, a client message, an internal note — kept as a thread tied to
-- a client and/or project. No external provider yet: messages are recorded,
-- not sent. `channel` tags the medium; `direction` tags who spoke.
CREATE TABLE IF NOT EXISTS comm_threads (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  subject         VARCHAR(200) NOT NULL,
  client_id       INT NULL,
  project_id      INT NULL,
  channel         VARCHAR(20) NOT NULL DEFAULT 'internal', -- email | call | meeting | client | internal
  status          VARCHAR(20) NOT NULL DEFAULT 'open',     -- open | archived
  created_by      INT NULL,
  last_message_at TIMESTAMP NULL DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_thread_client  FOREIGN KEY (client_id)  REFERENCES clients(id)  ON DELETE SET NULL,
  CONSTRAINT fk_thread_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_thread_user    FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comm_messages (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  thread_id  INT NOT NULL,
  user_id    INT NULL,
  direction  VARCHAR(10) NOT NULL DEFAULT 'note',  -- out (we sent) | in (they sent) | note (internal)
  body       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_thread FOREIGN KEY (thread_id) REFERENCES comm_threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_user   FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATIONS for an existing live DB (partials sprint: VAT, 40/30/30, stages,
-- timesheet approval). Run these once against the live database; the CREATE
-- TABLE blocks above already include the columns for a fresh install.
-- ─────────────────────────────────────────────────────────────────────────────
-- Invoice + proposal VAT (GBP base, ex/inc VAT):
--   ALTER TABLE invoices  ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER currency;
--   ALTER TABLE proposals ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER currency;
-- Project 5-stage delivery (Discover · Design · Build · Launch · Support):
--   ALTER TABLE projects ADD COLUMN stage VARCHAR(20) NOT NULL DEFAULT 'discover' AFTER status;
-- Timesheet approval. New column defaults to 'draft'; grandfather existing rows
-- as 'approved' so historic billable totals are unchanged:
--   ALTER TABLE time_entries ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'draft' AFTER billable;
--   UPDATE time_entries SET status = 'approved' WHERE deleted_at IS NULL;
-- Session device tracking (active-sessions list + revoke):
--   ALTER TABLE auth_tokens ADD COLUMN user_agent VARCHAR(255) DEFAULT NULL AFTER token;
--   ALTER TABLE auth_tokens ADD COLUMN ip VARCHAR(45) DEFAULT NULL AFTER user_agent;
--   ALTER TABLE auth_tokens ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL AFTER ip;
-- Finance (profitability) + 2FA columns on users:
--   ALTER TABLE users ADD COLUMN cost_rate DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER client_id;
--   ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) DEFAULT NULL AFTER cost_rate;
--   ALTER TABLE users ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER totp_secret;
-- Recurring billing + care-plan monitoring:
--   ALTER TABLE clients ADD COLUMN retainer_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tag;
--   ALTER TABLE project_dev ADD COLUMN last_http_status INT NULL DEFAULT NULL AFTER checklist;
--   ALTER TABLE project_dev ADD COLUMN ssl_days_left INT NULL DEFAULT NULL AFTER last_http_status;
--   ALTER TABLE project_dev ADD COLUMN last_checked_at TIMESTAMP NULL DEFAULT NULL AFTER ssl_days_left;
-- Lead depth (tags / scoring / lost-reason) + proposal sharing/view-tracking:
--   ALTER TABLE enquiries ADD COLUMN tags VARCHAR(255) DEFAULT NULL AFTER status;
--   ALTER TABLE enquiries ADD COLUMN score INT NOT NULL DEFAULT 0 AFTER tags;
--   ALTER TABLE enquiries ADD COLUMN lost_reason VARCHAR(300) DEFAULT NULL AFTER score;
--   ALTER TABLE proposals ADD COLUMN share_token CHAR(40) DEFAULT NULL AFTER vat_rate;
--   ALTER TABLE proposals ADD COLUMN views INT NOT NULL DEFAULT 0 AFTER share_token;
--   ALTER TABLE proposals ADD COLUMN last_viewed_at TIMESTAMP NULL DEFAULT NULL AFTER views;
--   ALTER TABLE proposals ADD UNIQUE KEY uk_prop_share (share_token);  -- NULLs allowed; guards token collisions
-- 2FA recovery codes + magic-link login:
--   ALTER TABLE users ADD COLUMN totp_recovery VARCHAR(1000) DEFAULT NULL AFTER totp_enabled;
--   (plus run the new `magic_links` CREATE TABLE above)

-- ─────────────────────────────────────────────────────────────────────────────
-- MISSING-category modules (Design · Dev Pipeline · Resourcing · Contracts · KB).
-- New tables only — safe to run as-is on the live DB (CREATE TABLE IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- Design Workspace: Figma review rounds per project (2-round limit enforced in
-- design.php), with a client comment + sign-off.
CREATE TABLE IF NOT EXISTS design_reviews (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  project_id     INT NOT NULL,
  title          VARCHAR(200) NOT NULL,
  figma_url      VARCHAR(500) DEFAULT NULL,
  round          INT NOT NULL DEFAULT 1,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | changes
  client_comment TEXT DEFAULT NULL,
  created_by     INT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_design_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_design_user    FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Development Pipeline: per-project repo + environment URLs + a JSON build
-- checklist; plus a deploy log.
CREATE TABLE IF NOT EXISTS project_dev (
  project_id  INT PRIMARY KEY,
  repo_url    VARCHAR(500) DEFAULT NULL,
  staging_url VARCHAR(500) DEFAULT NULL,
  prod_url    VARCHAR(500) DEFAULT NULL,
  checklist   TEXT DEFAULT NULL,                        -- JSON: {key:bool} build/QA checklist
  last_http_status INT NULL DEFAULT NULL,               -- last uptime check HTTP code
  ssl_days_left    INT NULL DEFAULT NULL,               -- days until the TLS cert expires
  last_checked_at  TIMESTAMP NULL DEFAULT NULL,         -- when the monitor last ran
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pdev_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deploys (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  environment VARCHAR(20) NOT NULL DEFAULT 'staging',   -- staging | production
  status      VARCHAR(20) NOT NULL DEFAULT 'success',   -- success | failed | rolled_back
  url         VARCHAR(500) DEFAULT NULL,
  notes       VARCHAR(500) DEFAULT NULL,
  created_by  INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deploy_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_deploy_user    FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Resourcing & Capacity: leave/holiday tracking. Capacity is derived live from
-- time_entries, so no committed-hours table is needed.
CREATE TABLE IF NOT EXISTS leave_entries (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  type        VARCHAR(20) NOT NULL DEFAULT 'holiday',   -- holiday | sick | other
  note        VARCHAR(300) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_leave_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contracts & e-Signature: simple typed-name e-sign with an audit trail
-- (signer name, IP, timestamp). NDA triage tag green/yellow/red.
CREATE TABLE IF NOT EXISTS contracts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  client_id    INT NULL,
  project_id   INT NULL,
  kind         VARCHAR(20) NOT NULL DEFAULT 'agreement', -- agreement | nda
  title        VARCHAR(200) NOT NULL,
  body         TEXT DEFAULT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft',     -- draft | sent | signed | void
  nda_triage   VARCHAR(10) DEFAULT NULL,                 -- green | yellow | red
  signer_name  VARCHAR(200) DEFAULT NULL,
  signer_email VARCHAR(200) DEFAULT NULL,
  signed_name  VARCHAR(200) DEFAULT NULL,                -- the typed e-signature
  signed_ip    VARCHAR(45)  DEFAULT NULL,
  signed_at    TIMESTAMP NULL DEFAULT NULL,
  created_by   INT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_contract_client  FOREIGN KEY (client_id)  REFERENCES clients(id)  ON DELETE SET NULL,
  CONSTRAINT fk_contract_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_contract_user    FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Files & Documents: per-project/client file storage. Binary lives on disk under
-- server/uploads/; this row is the metadata + optional expiring share token.
CREATE TABLE IF NOT EXISTS files (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  client_id   INT NULL,
  project_id  INT NULL,
  name        VARCHAR(255) NOT NULL,            -- original filename
  stored      VARCHAR(255) NOT NULL,            -- on-disk name (random)
  mime        VARCHAR(120) DEFAULT NULL,
  size        INT NOT NULL DEFAULT 0,
  share_token CHAR(40) DEFAULT NULL,            -- set when a public link is issued
  expires_at  TIMESTAMP NULL DEFAULT NULL,      -- share-link expiry
  uploaded_by INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_file_client  FOREIGN KEY (client_id)  REFERENCES clients(id)  ON DELETE SET NULL,
  CONSTRAINT fk_file_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_file_user    FOREIGN KEY (uploaded_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Announcements / broadcasts shown on the dashboard.
CREATE TABLE IF NOT EXISTS announcements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  body       TEXT DEFAULT NULL,
  level      VARCHAR(10) NOT NULL DEFAULT 'info',  -- info | warning
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_ann_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Knowledge Base & SOPs: internal wiki / runbooks / client-facing help.
CREATE TABLE IF NOT EXISTS kb_articles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  category    VARCHAR(60) NOT NULL DEFAULT 'General',
  audience    VARCHAR(20) NOT NULL DEFAULT 'internal',  -- internal | client
  body        MEDIUMTEXT DEFAULT NULL,
  author_id   INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_kb_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Public blog (dedicated Blog module → public site) ────────────────────────
-- Authored in the CMS "Blog" module; blog.php serves `published` rows publicly.
CREATE TABLE IF NOT EXISTS posts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  title         VARCHAR(200) NOT NULL,
  excerpt       VARCHAR(400) DEFAULT NULL,
  body          MEDIUMTEXT DEFAULT NULL,
  category      VARCHAR(60) NOT NULL DEFAULT 'General',
  cover         VARCHAR(20) NOT NULL DEFAULT 'article',   -- SiteMockup variant
  read_mins     INT NOT NULL DEFAULT 4,
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',      -- draft | published
  author_id     INT NULL,
  published_at  TIMESTAMP NULL DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_post_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Curated testimonials (CMS-approved → public site) ────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  author      VARCHAR(120) NOT NULL,
  role        VARCHAR(120) DEFAULT NULL,
  company     VARCHAR(120) DEFAULT NULL,
  quote       VARCHAR(600) NOT NULL,
  rating      TINYINT NOT NULL DEFAULT 5,
  approved    TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Content Hub drafts (AI-assisted multi-platform content) ──────────────────
-- Saved output from the CMS "Content Hub". Blog drafts can be pushed into posts.
CREATE TABLE IF NOT EXISTS content_drafts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  topic       VARCHAR(300) NOT NULL,
  platform    VARCHAR(30) NOT NULL DEFAULT 'blog',  -- blog|linkedin|x|instagram|facebook|tiktok
  title       VARCHAR(200) DEFAULT NULL,
  body        MEDIUMTEXT DEFAULT NULL,
  hashtags    VARCHAR(800) DEFAULT NULL,            -- space-separated
  keywords    VARCHAR(800) DEFAULT NULL,            -- comma-separated
  status      VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft|used
  author_id   INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_draft_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- Work / portfolio (public relaunch). New tables only — safe to run as-is on
-- the live DB (CREATE TABLE IF NOT EXISTS). Served by work.php: published rows
-- go to the public site, drafts stay inside the CMS.
--
-- `kind` and `status` are VARCHAR with their legal values in a trailing comment,
-- matching the rest of this schema (no ENUM, no CHECK anywhere); work.php
-- validates them with in_array(..., true). Images live in a child table rather
-- than a JSON column, as proposal_items and invoice_items do, because the
-- host's MySQL version is unverified. `alt` is not optional in practice: the
-- public site must have real alt text for every image, and work.php refuses an
-- addImage without it.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug           VARCHAR(160)  NOT NULL UNIQUE,
  kind           VARCHAR(20)   NOT NULL DEFAULT 'case_study',  -- case_study | product | experiment | writing
  title          VARCHAR(200)  NOT NULL,
  client_name    VARCHAR(160)  NULL,
  client_consent TINYINT(1)    NOT NULL DEFAULT 0,
  sector         VARCHAR(80)   NULL,
  summary        VARCHAR(400)  NULL,
  problem        TEXT          NULL,
  built          TEXT          NULL,
  outcome        TEXT          NULL,
  live_url       VARCHAR(500)  NULL,
  repo_url       VARCHAR(500)  NULL,
  post_id        INT UNSIGNED  NULL,
  started_on     DATE          NULL,
  completed_on   DATE          NULL,
  cover_file_id  INT UNSIGNED  NULL,
  featured       TINYINT(1)    NOT NULL DEFAULT 0,
  sort_order     INT           NOT NULL DEFAULT 0,
  status         VARCHAR(10)   NOT NULL DEFAULT 'draft',       -- draft | published
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_public (status, kind, sort_order),
  KEY idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS work_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_id     INT UNSIGNED NOT NULL,
  file_id     INT UNSIGNED NOT NULL,
  caption     VARCHAR(300) NULL,
  alt         VARCHAR(300) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  KEY idx_work (work_id, sort_order),
  CONSTRAINT fk_work_images_work FOREIGN KEY (work_id) REFERENCES work(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Work images reuse the existing `files` share-token mechanism for public
-- delivery (files.php?token=…). work.php issues a token, with no expiry, when
-- an image is attached to a work record, so the owner never hand-issues a link
-- per picture. files.share_token has no UNIQUE constraint, unlike
-- proposals.share_token above, and the public lookup in files.php uses LIMIT 1,
-- so a duplicate would silently serve the WRONG FILE. work.php checks a token is
-- unused before writing it; this index is the second guard, turning a race into
-- a loud error. Run it once against the live DB, AFTER checking for existing
-- duplicates (see docs/DEPLOYMENT.md) — the ALTER fails if any exist:
--   SELECT share_token, COUNT(*) c FROM files
--     WHERE share_token IS NOT NULL GROUP BY share_token HAVING c > 1;   -- expect 0 rows
--   ALTER TABLE files ADD UNIQUE KEY uk_file_share (share_token);  -- NULLs allowed; guards token collisions
