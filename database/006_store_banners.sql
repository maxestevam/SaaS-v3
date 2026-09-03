CREATE TABLE IF NOT EXISTS ld_banners (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  banner_kind VARCHAR(20) NOT NULL DEFAULT 'hero',
  title VARCHAR(160) NOT NULL,
  subtitle VARCHAR(300) NOT NULL DEFAULT '',
  target_url VARCHAR(600) NOT NULL DEFAULT '',
  button_text VARCHAR(80) NOT NULL DEFAULT '',
  pages JSON NOT NULL,
  category_ids JSON NOT NULL,
  display_position VARCHAR(24) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_banners_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  INDEX ld_banners_store_idx (store_id, created_at),
  INDEX ld_banners_position_idx (store_id, display_position)
);

CREATE TABLE IF NOT EXISTS ld_banner_images (
  id CHAR(36) PRIMARY KEY,
  banner_id CHAR(36) NOT NULL,
  breakpoint VARCHAR(10) NOT NULL,
  storage_key VARCHAR(360) NOT NULL,
  url VARCHAR(600) NOT NULL,
  content_type VARCHAR(80) NOT NULL,
  file_size INT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  crop_x DECIMAL(5,2) NOT NULL DEFAULT 50,
  crop_y DECIMAL(5,2) NOT NULL DEFAULT 50,
  crop_zoom DECIMAL(4,2) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_banner_images_banner_fk FOREIGN KEY (banner_id) REFERENCES ld_banners(id) ON DELETE CASCADE,
  INDEX ld_banner_images_banner_idx (banner_id, breakpoint, sort_order)
);
