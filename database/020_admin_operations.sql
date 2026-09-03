CREATE TABLE IF NOT EXISTS ld_admin_account_controls (
  user_id CHAR(36) PRIMARY KEY,
  status ENUM('active','blocked','banned') NOT NULL DEFAULT 'active',
  reason VARCHAR(500) NOT NULL DEFAULT '',
  updated_by CHAR(36) NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_admin_account_controls_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  CONSTRAINT ld_admin_account_controls_updated_by_fk FOREIGN KEY (updated_by) REFERENCES ld_users(id) ON DELETE SET NULL,
  INDEX ld_admin_account_controls_status_idx (status)
);

CREATE TABLE IF NOT EXISTS ld_admin_store_controls (
  store_id CHAR(36) PRIMARY KEY,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  reason VARCHAR(500) NOT NULL DEFAULT '',
  updated_by CHAR(36) NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_admin_store_controls_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_admin_store_controls_updated_by_fk FOREIGN KEY (updated_by) REFERENCES ld_users(id) ON DELETE SET NULL,
  INDEX ld_admin_store_controls_status_idx (status)
);

CREATE TABLE IF NOT EXISTS ld_user_presence (
  user_id CHAR(36) PRIMARY KEY,
  last_seen_at BIGINT NOT NULL,
  last_route VARCHAR(255) NOT NULL DEFAULT '',
  last_action VARCHAR(100) NOT NULL DEFAULT 'activity',
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_user_presence_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  INDEX ld_user_presence_last_seen_idx (last_seen_at)
);

CREATE TABLE IF NOT EXISTS ld_user_activity_log (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  store_id CHAR(36) NULL,
  event_type VARCHAR(100) NOT NULL,
  route VARCHAR(255) NOT NULL DEFAULT '',
  metadata_json JSON NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT ld_user_activity_log_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  CONSTRAINT ld_user_activity_log_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE SET NULL,
  INDEX ld_user_activity_log_user_created_idx (user_id, created_at),
  INDEX ld_user_activity_log_store_created_idx (store_id, created_at),
  INDEX ld_user_activity_log_event_created_idx (event_type, created_at)
);

CREATE TABLE IF NOT EXISTS ld_support_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  store_id CHAR(36) NULL,
  requested_by CHAR(36) NOT NULL,
  status ENUM('requested','accepted','declined','ended','expired') NOT NULL DEFAULT 'requested',
  requested_at BIGINT NOT NULL,
  consented_at BIGINT NULL,
  ended_at BIGINT NULL,
  expires_at BIGINT NOT NULL,
  last_event_at BIGINT NULL,
  CONSTRAINT ld_support_sessions_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  CONSTRAINT ld_support_sessions_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE SET NULL,
  CONSTRAINT ld_support_sessions_admin_fk FOREIGN KEY (requested_by) REFERENCES ld_users(id) ON DELETE CASCADE,
  INDEX ld_support_sessions_user_status_idx (user_id, status),
  INDEX ld_support_sessions_status_expiry_idx (status, expires_at)
);
