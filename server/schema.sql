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
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active | suspended
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Session tokens (opaque random; React sends as Authorization: Bearer)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
