CREATE TABLE IF NOT EXISTS ld_store_integrations (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
  account_email VARCHAR(320) NULL,
  config_encrypted MEDIUMTEXT NULL,
  metadata_json MEDIUMTEXT NOT NULL,
  connected_at BIGINT NULL,
  last_tested_at BIGINT NULL,
  last_error VARCHAR(500) NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_store_integrations_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  UNIQUE KEY ld_store_integrations_store_provider_uq (store_id, provider),
  INDEX ld_store_integrations_store_status_idx (store_id, status)
);

CREATE TABLE IF NOT EXISTS ld_store_integration_oauth_states (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  state_hash CHAR(64) NOT NULL,
  code_verifier_encrypted MEDIUMTEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  consumed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT ld_store_integration_oauth_states_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_store_integration_oauth_states_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  UNIQUE KEY ld_store_integration_oauth_state_uq (state_hash),
  INDEX ld_store_integration_oauth_state_lookup_idx (provider, expires_at, consumed_at)
);

CREATE TABLE IF NOT EXISTS ld_store_email_settings (
  store_id CHAR(36) PRIMARY KEY,
  provider VARCHAR(20) NOT NULL DEFAULT 'resend',
  from_name VARCHAR(120) NOT NULL DEFAULT '',
  from_email VARCHAR(320) NOT NULL DEFAULT '',
  reply_to VARCHAR(320) NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_store_email_settings_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ld_store_email_templates (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  event_key VARCHAR(48) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body_html MEDIUMTEXT NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_store_email_templates_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  UNIQUE KEY ld_store_email_templates_store_event_uq (store_id, event_key)
);
