ALTER TABLE ld_stores
  ADD COLUMN maintenance TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN maintenance_message VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'BRL',
  ADD COLUMN locale VARCHAR(20) NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN timezone VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN template VARCHAR(40) NOT NULL DEFAULT 'default',
  ADD COLUMN theme_secondary_color CHAR(7) NULL,
  ADD COLUMN theme_accent_color CHAR(7) NULL,
  ADD COLUMN theme_background_color CHAR(7) NULL,
  ADD COLUMN theme_text_color CHAR(7) NULL;

ALTER TABLE ld_store_profiles
  ADD COLUMN favicon_url VARCHAR(800) NULL,
  ADD COLUMN pinterest_url VARCHAR(320) NOT NULL DEFAULT '',
  ADD COLUMN twitter_url VARCHAR(320) NOT NULL DEFAULT '',
  ADD COLUMN settings_json JSON NULL,
  ADD COLUMN payment_methods_json JSON NULL,
  ADD COLUMN shipping_methods_json JSON NULL;

ALTER TABLE ld_banners
  ADD COLUMN banner_kind VARCHAR(20) NOT NULL DEFAULT 'hero',
  ADD COLUMN subtitle VARCHAR(300) NOT NULL DEFAULT '',
  ADD COLUMN target_url VARCHAR(600) NOT NULL DEFAULT '',
  ADD COLUMN button_text VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

ALTER TABLE ld_product_categories
  ADD COLUMN card_image_url VARCHAR(800) NULL,
  ADD COLUMN hero_image_url VARCHAR(800) NULL;
