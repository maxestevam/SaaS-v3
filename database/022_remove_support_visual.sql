DROP INDEX ld_support_sessions_visual_status_idx ON ld_support_sessions;

ALTER TABLE ld_support_sessions
  DROP COLUMN visual_consented_at,
  DROP COLUMN visual_revoked_at,
  DROP COLUMN viewer_last_seen_at,
  DROP COLUMN latest_frame_key,
  DROP COLUMN latest_frame_at,
  DROP COLUMN latest_frame_size;
