ALTER TABLE ld_support_sessions
  ADD COLUMN visual_consented_at BIGINT NULL,
  ADD COLUMN visual_revoked_at BIGINT NULL,
  ADD COLUMN viewer_last_seen_at BIGINT NULL,
  ADD COLUMN latest_frame_key VARCHAR(512) NULL,
  ADD COLUMN latest_frame_at BIGINT NULL,
  ADD COLUMN latest_frame_size INT NULL;

CREATE INDEX ld_support_sessions_visual_status_idx
  ON ld_support_sessions (status, visual_consented_at, viewer_last_seen_at);
