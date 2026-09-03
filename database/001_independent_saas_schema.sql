-- Esquema inicial do novo SaaS multi-loja. Não reutiliza tabelas nem dados do projeto anterior.
CREATE TABLE IF NOT EXISTS ld_users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(512) NOT NULL,
  onboarding_completed_at BIGINT NULL,
  session_invalid_before BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX ld_users_email_idx (email)
);

CREATE TABLE IF NOT EXISTS ld_stores (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(240) NOT NULL DEFAULT '',
  color CHAR(7) NOT NULL DEFAULT '#FF32B2',
  slug VARCHAR(120) NOT NULL UNIQUE,
  address_mode VARCHAR(20) NOT NULL DEFAULT 'slug',
  custom_domain VARCHAR(253) NULL,
  status TINYINT NOT NULL DEFAULT 2,
  maintenance TINYINT NOT NULL DEFAULT 0,
  maintenance_message VARCHAR(500) NOT NULL DEFAULT '',
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  locale VARCHAR(20) NOT NULL DEFAULT 'pt-BR',
  timezone VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo',
  template VARCHAR(40) NOT NULL DEFAULT 'default',
  theme_secondary_color CHAR(7) NULL,
  theme_accent_color CHAR(7) NULL,
  theme_background_color CHAR(7) NULL,
  theme_text_color CHAR(7) NULL,
  status_changed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_stores_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  INDEX ld_stores_user_idx (user_id),
  INDEX ld_stores_status_idx (status)
);

CREATE TABLE IF NOT EXISTS ld_plans (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  features_json JSON NOT NULL,
  amount_cents INT NOT NULL,
  is_featured TINYINT NOT NULL DEFAULT 0,
  active TINYINT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX ld_plans_active_idx (active)
);

CREATE TABLE IF NOT EXISTS ld_subscriptions (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  plan_id VARCHAR(40) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'mercado_pago',
  provider_subscription_id VARCHAR(160) NULL UNIQUE,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  amount_cents INT NOT NULL,
  trial_ends_at BIGINT NULL,
  current_period_ends_at BIGINT NULL,
  renewal_due_at BIGINT NULL,
  grace_ends_at BIGINT NULL,
  last_payment_at BIGINT NULL,
  canceled_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_subscriptions_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  INDEX ld_subscriptions_store_idx (store_id)
);

CREATE TABLE IF NOT EXISTS ld_password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  used_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT ld_reset_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  INDEX ld_reset_user_idx (user_id)
);

CREATE TABLE IF NOT EXISTS ld_billing_orders (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NULL,
  user_id CHAR(36) NOT NULL,
  kind VARCHAR(40) NOT NULL DEFAULT 'subscription',
  provider VARCHAR(40) NOT NULL DEFAULT 'mercado_pago',
  provider_payment_id VARCHAR(160) NULL UNIQUE,
  provider_preference_id VARCHAR(160) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  amount_cents INT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  due_at BIGINT NULL,
  paid_at BIGINT NULL,
  checkout_init_point TEXT NULL,
  pix_qr_code TEXT NULL,
  pix_qr_code_base64 MEDIUMTEXT NULL,
  metadata_json JSON NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_billing_orders_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_billing_orders_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  CONSTRAINT ld_billing_orders_subscription_fk FOREIGN KEY (subscription_id) REFERENCES ld_subscriptions(id) ON DELETE SET NULL,
  INDEX ld_billing_orders_store_idx (store_id),
  INDEX ld_billing_orders_status_due_idx (status, due_at)
);

CREATE TABLE IF NOT EXISTS ld_webhook_events (
  id CHAR(36) PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  provider_event_id VARCHAR(191) NOT NULL UNIQUE,
  event_type VARCHAR(80) NOT NULL,
  payload_json JSON NOT NULL,
  processed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  INDEX ld_webhook_events_provider_idx (provider)
);

CREATE TABLE IF NOT EXISTS ld_product_categories (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  crop_aspect VARCHAR(5) NOT NULL DEFAULT '1:1',
  card_image_url VARCHAR(800) NULL,
  hero_image_url VARCHAR(800) NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_product_categories_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  UNIQUE KEY ld_product_categories_store_name_uq (store_id, name),
  INDEX ld_product_categories_store_created_idx (store_id, created_at)
);

CREATE TABLE IF NOT EXISTS ld_products (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  sku VARCHAR(120) NULL,
  description TEXT NOT NULL,
  short_description VARCHAR(500) NOT NULL DEFAULT '',
  price_cents INT NOT NULL,
  compare_at_price_cents INT NULL,
  cost_price_cents INT NULL,
  brand VARCHAR(120) NOT NULL DEFAULT '',
  tags_json JSON NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  weight_grams INT NULL,
  width_mm INT NULL,
  height_mm INT NULL,
  depth_mm INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_products_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_products_category_fk FOREIGN KEY (category_id) REFERENCES ld_product_categories(id) ON DELETE RESTRICT,
  INDEX ld_products_store_created_idx (store_id, created_at),
  INDEX ld_products_store_category_idx (store_id, category_id),
  INDEX ld_products_store_name_idx (store_id, name),
  UNIQUE KEY ld_products_store_sku_uq (store_id, sku)
);

CREATE TABLE IF NOT EXISTS ld_product_media (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  storage_key VARCHAR(512) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_product_media_product_fk FOREIGN KEY (product_id) REFERENCES ld_products(id) ON DELETE CASCADE,
  INDEX ld_product_media_product_kind_idx (product_id, kind),
  INDEX ld_product_media_product_order_idx (product_id, sort_order)
);

CREATE TABLE IF NOT EXISTS ld_product_variants (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  sku VARCHAR(120) NULL,
  price_cents INT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_product_variants_product_fk FOREIGN KEY (product_id) REFERENCES ld_products(id) ON DELETE CASCADE,
  UNIQUE KEY ld_product_variants_product_sku_uq (product_id, sku),
  INDEX ld_product_variants_product_order_idx (product_id, sort_order)
);

CREATE TABLE IF NOT EXISTS ld_product_uploads (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  draft_id CHAR(36) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  storage_key VARCHAR(512) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'staged',
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  attached_at BIGINT NULL,
  CONSTRAINT ld_product_uploads_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_product_uploads_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  INDEX ld_product_uploads_draft_idx (store_id, user_id, draft_id, status),
  INDEX ld_product_uploads_expiry_idx (status, expires_at)
);

INSERT INTO ld_plans (id, name, description, features_json, amount_cents, is_featured, active, created_at, updated_at)
VALUES
  ('essencial', 'Essencial', 'Para testar o básico da sua operação.', JSON_ARRAY('1 loja ativa', 'Catálogo essencial', 'Suporte por e-mail'), 50, 0, 1, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
  ('crescer', 'Crescer', 'Para testar a operação com mais espaço.', JSON_ARRAY('Até 3 lojas ativas', 'Catálogo e pedidos', 'Suporte prioritário'), 60, 1, 1, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  features_json = VALUES(features_json),
  amount_cents = VALUES(amount_cents),
  is_featured = VALUES(is_featured),
  active = VALUES(active),
  updated_at = VALUES(updated_at);
