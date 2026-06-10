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
