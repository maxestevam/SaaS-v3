CREATE TABLE IF NOT EXISTS ld_store_deletion_requests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  store_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  payload_json TEXT NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  used_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  INDEX ld_store_deletion_requests_token_idx (token_hash, expires_at),
  INDEX ld_store_deletion_requests_store_idx (store_id, user_id, used_at)
);
