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
  next_action_at   DATE NULL DEFAULT NULL,         -- owner's next follow-up date
  next_action_note VARCHAR(300) NULL DEFAULT NULL, -- what that follow-up is
  priority     TINYINT NOT NULL DEFAULT 0,   -- owner's choice: 0 none | 1 low | 2 normal | 3 high (separate from score)
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
  totp_last_step BIGINT NULL DEFAULT NULL,               -- last accepted 30-second TOTP step: blocks replay (2026-10-17)
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
  -- Acceptance evidence (SQL 14, 2026-10-18): what the client sent, recorded by staff.
  accepted_at            DATETIME     NULL DEFAULT NULL, -- when staff recorded the acceptance
  accepted_by            INT          NULL DEFAULT NULL, -- staff user who recorded it
  acceptance_method      VARCHAR(20)  NULL DEFAULT NULL, -- email | letter | in_person | phone | other
  acceptance_reference   VARCHAR(200) NULL DEFAULT NULL, -- e.g. email subject and sender; staff only
  acceptance_received_on DATE         NULL DEFAULT NULL, -- the day the client's acceptance arrived
  accepted_terms_sha256  CHAR(64)     NULL DEFAULT NULL, -- SHA-256 of the canonical terms JSON (proposals.php)
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
  paid_method       VARCHAR(20)  NULL DEFAULT NULL, -- bank_transfer | cash | cheque | other, from record_payment (2026-10-18)
  paid_reference    VARCHAR(100) NULL DEFAULT NULL, -- bank or cheque reference the owner checked
  paid_amount_pence INT          NULL DEFAULT NULL, -- amount received, equal to the payable total
  paid_recorded_by  INT          NULL DEFAULT NULL, -- users.id who recorded it; never shown to a client
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
  `stored`    VARCHAR(255) NOT NULL,            -- on-disk name (random)
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
  hero_order     TINYINT UNSIGNED NULL,                        -- 1..5 on the homepage hero, NULL when off (2026-10-14)
  brand_colour   CHAR(7)       NULL,                           -- #RRGGBB, validated by work.php
  hero_word      VARCHAR(40)   NULL,                           -- one or two words finishing the hero headline
  hero_desktop_file_id INT UNSIGNED NULL,                      -- files.id, served by share token like work images
  hero_desktop_alt     VARCHAR(200) NULL,
  hero_mobile_file_id  INT UNSIGNED NULL,
  hero_mobile_alt      VARCHAR(200) NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_public (status, kind, sort_order),
  KEY idx_hero (hero_order),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-10 · Payment provider event log (K-025).
-- payments.php records every Stripe webhook event it processes, keyed by the
-- provider's event id, so a redelivered event is a no-op, and stores the amount
-- the provider reported so a mismatch can be reconciled by hand. Additive and
-- safe to run once against the live DB (see docs/DEPLOYMENT.md). Until it runs,
-- the webhook still works but cannot de-duplicate or keep this evidence.
CREATE TABLE IF NOT EXISTS payment_events (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider      VARCHAR(20)  NOT NULL,              -- stripe | paypal
  event_id      VARCHAR(255) NOT NULL,              -- provider's event / capture id
  invoice_id    INT NOT NULL,
  amount_minor  INT NOT NULL,                       -- pence as reported by the provider; -1 if absent
  currency      VARCHAR(3)   NOT NULL DEFAULT '',
  outcome       VARCHAR(30)  NOT NULL,              -- marked_paid | already_paid | amount_mismatch | unknown_invoice | ignored
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider_event (provider, event_id),
  KEY idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-10 · Enquiry follow-ups (owner next action, note and priority).
-- The owner sets a next-action date, a short note and a simple priority on an
-- enquiry; the Enquiries board and the dashboard list the follow-ups that are
-- due. `priority` is the owner's own choice and is separate from `score`.
-- Fresh installs get the columns from the CREATE TABLE above. Additive and safe
-- to run once against the live DB (see docs/DEPLOYMENT.md). Until it runs,
-- leads.php still lists and updates enquiries but cannot store a follow-up.
--   ALTER TABLE enquiries
--     ADD COLUMN next_action_at   DATE NULL DEFAULT NULL AFTER lost_reason,
--     ADD COLUMN next_action_note VARCHAR(300) NULL DEFAULT NULL AFTER next_action_at,
--     ADD COLUMN priority         TINYINT NOT NULL DEFAULT 0 AFTER next_action_note;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-14 · Homepage hero from the Work table.
-- Up to five PUBLISHED work records are flagged for the homepage hero, in the
-- order given by `hero_order` (1..5, NULL when not in the hero). Each carries a
-- brand colour, a one-to-two word "hero word" that finishes the headline, and a
-- desktop and a phone screenshot. The screenshots are `files` rows served by
-- share token (files.php?token=…) exactly as work images are: work.php issues a
-- permanent token when a screenshot is attached, and requires alt text for it.
-- work.php enforces the limit of five and the published-only rule, and drops a
-- record from the hero when it is unpublished or removed.
-- Fresh installs get the columns from the CREATE TABLE above. Additive and safe
-- to run once against the live DB (see docs/DEPLOYMENT.md). Until it runs,
-- work.php serves every existing action with the hero fields as NULL, the
-- public `hero` action returns an empty list, and setHero / heroOrder refuse
-- with a message asking for this step.
--   ALTER TABLE work
--     ADD COLUMN hero_order           TINYINT UNSIGNED NULL DEFAULT NULL AFTER status,
--     ADD COLUMN brand_colour         CHAR(7)      NULL DEFAULT NULL AFTER hero_order,
--     ADD COLUMN hero_word            VARCHAR(40)  NULL DEFAULT NULL AFTER brand_colour,
--     ADD COLUMN hero_desktop_file_id INT UNSIGNED NULL DEFAULT NULL AFTER hero_word,
--     ADD COLUMN hero_desktop_alt     VARCHAR(200) NULL DEFAULT NULL AFTER hero_desktop_file_id,
--     ADD COLUMN hero_mobile_file_id  INT UNSIGNED NULL DEFAULT NULL AFTER hero_desktop_alt,
--     ADD COLUMN hero_mobile_alt      VARCHAR(200) NULL DEFAULT NULL AFTER hero_mobile_file_id,
--     ADD KEY idx_hero (hero_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-14 · Editable public-site copy (site.php).
-- One row per public section (hero, services, process, packages, addons, terms,
-- faqs, contact). The CMS saves to `draft`; publishing copies `draft` to
-- `published`, and only `published` is ever served to the public site. Both
-- hold JSON as MEDIUMTEXT rather than a JSON column because the host's MySQL
-- version is unverified (the same reasoning as work_images above); site.php
-- validates every section against a fixed shape before it is stored.
-- New table only, so safe to run as-is on the live DB (CREATE TABLE IF NOT
-- EXISTS). Until it runs, the public `get` returns {} so the site keeps its
-- built-in copy, and the CMS actions refuse with a message asking for this step.
CREATE TABLE IF NOT EXISTS site_content (
  section       VARCHAR(32)   NOT NULL PRIMARY KEY,   -- hero | services | process | packages | addons | terms | faqs | contact
  draft         MEDIUMTEXT    NULL,                   -- JSON, last saved from the CMS
  published     MEDIUMTEXT    NULL,                   -- JSON, what the public site shows
  updated_by    INT UNSIGNED  NULL,                   -- users.id of the last save
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_by  INT UNSIGNED  NULL,                   -- users.id of the last publish
  published_at  TIMESTAMP     NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-16 · Call bookings inside Enquiries (bookings.php).
-- docs/PRODUCT-SPEC.md section 5.5: a booking is recorded by hand against an
-- enquiry, a client or both. It starts as a request; only the owner confirms
-- it. `starts_at` is UTC; `timezone` is the IANA zone the call was agreed in,
-- so the local time is always recoverable, daylight saving included.
-- bookings.php computes `starts_at` from the local time and zone with PHP's own
-- time zone database. Every change of time or status adds a `booking_events`
-- row, so a reschedule keeps its history, and a customer email about a
-- reschedule or cancellation records its outcome there for the owner to retry.
-- New tables only, so safe to run as-is on the live DB (CREATE TABLE IF NOT
-- EXISTS); `bookings` before `booking_events`. Until they run, bookings.php
-- answers 503 with a message asking for this step, the Enquiries screen hides
-- calls, and the client timeline leaves calls out.
CREATE TABLE IF NOT EXISTS bookings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enquiry_id    INT NULL,                          -- enquiries.id, when the call came from an enquiry
  client_id     INT NULL,                          -- clients.id, when the call is with a client
  starts_at     DATETIME     NOT NULL,             -- UTC
  timezone      VARCHAR(64)  NOT NULL,             -- IANA zone the time was agreed in, e.g. Europe/London
  duration_min  SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  location      VARCHAR(500) NULL DEFAULT NULL,    -- meeting link, phone number or place
  status        VARCHAR(20)  NOT NULL DEFAULT 'requested', -- requested | confirmed | completed | cancelled
  notes         TEXT         NULL,                 -- owner only, never sent to the customer
  outcome       VARCHAR(1000) NULL DEFAULT NULL,   -- what the call decided, owner only
  created_by    INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  KEY idx_booking_enquiry (enquiry_id),
  KEY idx_booking_client (client_id),
  KEY idx_booking_start (starts_at),
  CONSTRAINT fk_booking_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_client  FOREIGN KEY (client_id)  REFERENCES clients(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS booking_events (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id      INT UNSIGNED NOT NULL,
  user_id         INT NULL,                        -- who made the change
  kind            VARCHAR(20)  NOT NULL,           -- created | rescheduled | status | edited
  from_status     VARCHAR(20)  NULL DEFAULT NULL,
  to_status       VARCHAR(20)  NULL DEFAULT NULL,
  from_starts_at  DATETIME     NULL DEFAULT NULL,  -- UTC, on a reschedule
  from_timezone   VARCHAR(64)  NULL DEFAULT NULL,
  to_starts_at    DATETIME     NULL DEFAULT NULL,  -- UTC
  to_timezone     VARCHAR(64)  NULL DEFAULT NULL,
  notify_status   VARCHAR(10)  NULL DEFAULT NULL,  -- NULL not asked | sending | sent | failed
  notify_to       VARCHAR(200) NULL DEFAULT NULL,
  notify_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  notify_error    VARCHAR(300) NULL DEFAULT NULL,
  notified_at     TIMESTAMP    NULL DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_event_booking (booking_id),
  CONSTRAINT fk_event_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-16 · Private delivery feedback (feedback.php).
-- docs/PRODUCT-SPEC.md section 6.3: a client leaves private feedback from the
-- portal, or the owner records feedback received another way. It is never
-- returned to any client, not even its author. `may_publish` is the client's
-- separate, opt-in permission to quote it; it defaults to no, and it does not
-- by itself publish anything: a testimonial is still created by hand in
-- Testimonials. `follow_up` and `owner_note` are the owner's own.
-- New table only, so safe to run as-is on the live DB. Until it runs,
-- feedback.php answers 503, the portal form says feedback cannot be sent yet,
-- and the client record shows no feedback.
CREATE TABLE IF NOT EXISTS client_feedback (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id     INT NOT NULL,
  project_id    INT NULL DEFAULT NULL,             -- must belong to client_id
  source        VARCHAR(10)  NOT NULL,             -- portal | owner
  rating        TINYINT UNSIGNED NULL DEFAULT NULL, -- optional, 1 to 5
  went_well     TEXT NULL,
  could_improve TEXT NULL,
  follow_up_ok  TINYINT(1) NOT NULL DEFAULT 0,     -- the client welcomes a follow-up
  may_publish   TINYINT(1) NOT NULL DEFAULT 0,     -- separate permission to quote it publicly
  attribution   VARCHAR(200) NULL DEFAULT NULL,    -- how the client wants to be named, if quoted
  follow_up     VARCHAR(20)  NOT NULL DEFAULT 'new', -- new | following_up | closed (owner)
  owner_note    VARCHAR(1000) NULL DEFAULT NULL,   -- owner only
  submitted_by  INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  KEY idx_feedback_client (client_id),
  CONSTRAINT fk_feedback_client  FOREIGN KEY (client_id)  REFERENCES clients(id)  ON DELETE CASCADE,
  CONSTRAINT fk_feedback_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-17 · Two-factor code replay (auth.php, K-057).
-- A valid code stayed usable for its whole 90-second window, so someone who saw
-- one could use it again. auth.php now records the 30-second step of each
-- accepted code and refuses that step or an earlier one. Additive. Run once
-- only; a second run fails on the duplicate column. Until it runs, codes are
-- checked exactly as before and replay is not blocked.
--   ALTER TABLE users ADD COLUMN totp_last_step BIGINT NULL DEFAULT NULL AFTER totp_recovery;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-18 · SQL 13 · Manual payment record on invoices (invoices.php).
-- docs/PRODUCT-SPEC.md section 5.5: the owner records a bank transfer, cash or
-- cheque payment with its method, reference, date and amount. The amount must
-- equal the VAT-inclusive payable total from _money.php; a part payment is a
-- separate instalment invoice. `paid_at` holds the date the money arrived.
-- Moving an invoice back from paid clears all four. `paid_recorded_by` is
-- staff only and never returned by portal.php. Additive. Run once only; a
-- second run fails on the duplicate column. Until it runs, the record_payment
-- action answers 503 with a message asking for this step, and every existing
-- invoice action works as before.
--   ALTER TABLE invoices
--     ADD COLUMN paid_method       VARCHAR(20)  NULL DEFAULT NULL AFTER paid_at,
--     ADD COLUMN paid_reference    VARCHAR(100) NULL DEFAULT NULL AFTER paid_method,
--     ADD COLUMN paid_amount_pence INT          NULL DEFAULT NULL AFTER paid_reference,
--     ADD COLUMN paid_recorded_by  INT          NULL DEFAULT NULL AFTER paid_amount_pence;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-18 · SQL 14 · Quote acceptance evidence (proposals.php).
-- docs/PRODUCT-SPEC.md sections 5.5 and 7: staff clicking Accept is not proof
-- the client agreed. Accept now records how the client's acceptance arrived
-- (email, letter, in person, phone or other), a reference such as the email
-- subject and sender, the day it was received, who recorded it and when, and
-- a SHA-256 fingerprint of the exact terms accepted, all in the same atomic
-- claim. The reference and recorder are staff only; the public link shows only
-- the acceptance date. Additive. Run once only; a second run fails on the
-- duplicate column. Until it runs, accept behaves exactly as before and
-- requires no evidence, so the live journey keeps working.
--   ALTER TABLE proposals
--     ADD COLUMN accepted_at            DATETIME     NULL DEFAULT NULL AFTER project_id,
--     ADD COLUMN accepted_by            INT          NULL DEFAULT NULL AFTER accepted_at,
--     ADD COLUMN acceptance_method      VARCHAR(20)  NULL DEFAULT NULL AFTER accepted_by,
--     ADD COLUMN acceptance_reference   VARCHAR(200) NULL DEFAULT NULL AFTER acceptance_method,
--     ADD COLUMN acceptance_received_on DATE         NULL DEFAULT NULL AFTER acceptance_reference,
--     ADD COLUMN accepted_terms_sha256  CHAR(64)     NULL DEFAULT NULL AFTER acceptance_received_on;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-18 · SQL 15 · Project asset checklist (assets.php).
-- docs/PRODUCT-SPEC.md sections 6.2 and 7: the owner lists what a client must
-- send for a project (logo, copy, photos, a description of a login without the
-- password itself), the client sees the list in the portal and marks each item
-- supplied with an optional note, and the owner accepts it or reopens it.
-- Status: requested | supplied | accepted. A client can only move an item of
-- their own project from requested to supplied; accept, reopen, edit and
-- delete are staff only. Reopening returns an item to requested and clears
-- supplied_at and accepted_at, but keeps client_note so the history of what
-- the client said stays visible. `file_id` is set only by staff, to a file
-- already stored against the same project in Files; clients cannot upload
-- here. `requested_by` and `file_id` are never returned to a client.
-- New table only, so safe to run as-is on the live DB. Until it runs,
-- assets.php answers 503, the project board explains the step and the portal
-- hides the checklist.
CREATE TABLE IF NOT EXISTS project_assets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id    INT NOT NULL,
  label         VARCHAR(160)  NOT NULL,             -- what to send, e.g. "Logo, as SVG or large PNG"
  note          VARCHAR(1000) NULL DEFAULT NULL,    -- owner guidance shown to the client
  status        VARCHAR(12)   NOT NULL DEFAULT 'requested', -- requested | supplied | accepted
  client_note   VARCHAR(1000) NULL DEFAULT NULL,    -- the client's note when supplying; kept on reopen
  file_id       INT NULL DEFAULT NULL,              -- files.id on the same project, staff only
  requested_by  INT NULL DEFAULT NULL,              -- users.id, staff only
  supplied_at   TIMESTAMP NULL DEFAULT NULL,
  accepted_at   TIMESTAMP NULL DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  KEY idx_asset_project (project_id),
  CONSTRAINT fk_asset_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_file    FOREIGN KEY (file_id)    REFERENCES files(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-19 · SQL 16 · Project brief and measurements (briefs.php).
-- docs/PRODUCT-SPEC.md sections 6.4 and 6.5: a small brief inside an existing
-- project (problem, users, agreed outcome, scope, milestones, decisions,
-- handover and completion acknowledgement) and a few agreed measurements with
-- dated evidence. One brief row per project; every field is optional, because
-- no field is required to open a project. Long text is TEXT with a length cap
-- enforced in briefs.php, so the caps can change without a migration.
-- Measurement result: PASS | FAIL | PARTIAL | NOT TESTED (default). Kind:
-- technical (default) | business; observation_window is kept for business
-- observations only and cleared for technical ones. Measurements are soft
-- deleted. Staff only, with the roles of projects.php: a client sees nothing
-- from either table. briefs.php also serves the manual, sanitised GEE OS
-- handoff export (Markdown); its include and exclude lists are in that file.
-- New tables only, so safe to run as-is on the live DB. Until it runs,
-- briefs.php answers 503 and the project board explains the step.
CREATE TABLE IF NOT EXISTS project_briefs (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id          INT NOT NULL,
  problem             TEXT NULL,                       -- cap 2000
  intended_users      TEXT NULL,                       -- cap 1000
  agreed_outcome      TEXT NULL,                       -- cap 2000
  deliverables        TEXT NULL,                       -- cap 4000
  exclusions          TEXT NULL,                       -- cap 2000
  quote_reference     VARCHAR(120) NULL DEFAULT NULL,  -- e.g. "Q-0042", the approved quote
  milestones_note     TEXT NULL,                       -- cap 2000
  next_action         VARCHAR(500) NULL DEFAULT NULL,
  open_decisions      TEXT NULL,                       -- cap 2000
  handover_checklist  TEXT NULL,                       -- cap 4000
  support_boundaries  TEXT NULL,                       -- cap 2000
  completion_ack_on   DATE NULL DEFAULT NULL,          -- when the client acknowledged completion
  completion_ack_note VARCHAR(1000) NULL DEFAULT NULL, -- how, e.g. "by email, reply kept in Files"
  updated_by          INT NULL DEFAULT NULL,           -- users.id of the last editor
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_brief_project (project_id),
  CONSTRAINT fk_brief_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS project_measurements (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id         INT NOT NULL,
  label              VARCHAR(200)  NOT NULL,              -- what is measured, e.g. "Enquiry form reaches the inbox"
  target             VARCHAR(500)  NULL DEFAULT NULL,     -- the agreed target
  baseline           VARCHAR(500)  NULL DEFAULT NULL,     -- where available
  actual             VARCHAR(500)  NULL DEFAULT NULL,     -- the actual result
  result             VARCHAR(12)   NOT NULL DEFAULT 'NOT TESTED', -- PASS | FAIL | PARTIAL | NOT TESTED
  measured_on        DATE NULL DEFAULT NULL,
  environment        VARCHAR(200)  NULL DEFAULT NULL,     -- e.g. "staging, Safari 18 on iPhone"
  method             VARCHAR(1000) NULL DEFAULT NULL,     -- how it was checked, with caveats
  evidence_location  VARCHAR(500)  NULL DEFAULT NULL,     -- a non-sensitive link or file name
  kind               VARCHAR(10)   NOT NULL DEFAULT 'technical', -- technical | business
  observation_window VARCHAR(200)  NULL DEFAULT NULL,     -- business only, e.g. "1 to 31 March"
  created_by         INT NULL DEFAULT NULL,               -- users.id
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         TIMESTAMP NULL DEFAULT NULL,
  KEY idx_measure_project (project_id),
  CONSTRAINT fk_measure_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
