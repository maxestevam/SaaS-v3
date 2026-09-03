ALTER TABLE ld_customers
  ADD COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN email_verified_at BIGINT NULL,
  ADD COLUMN deleted_at BIGINT NULL,
  ADD COLUMN account_updated_at BIGINT NULL;

ALTER TABLE ld_customers
  ADD INDEX ld_customers_store_email_active_idx (store_id, email, deleted_at);

CREATE TABLE IF NOT EXISTS ld_customer_sessions (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  CONSTRAINT ld_customer_sessions_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_customer_sessions_customer_fk FOREIGN KEY (customer_id) REFERENCES ld_customers(id) ON DELETE CASCADE,
  INDEX ld_customer_sessions_customer_idx (customer_id, expires_at)
);

CREATE TABLE IF NOT EXISTS ld_customer_password_resets (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  used_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT ld_customer_password_resets_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_customer_password_resets_customer_fk FOREIGN KEY (customer_id) REFERENCES ld_customers(id) ON DELETE CASCADE,
  INDEX ld_customer_password_resets_customer_idx (customer_id, expires_at)
);

CREATE TABLE IF NOT EXISTS ld_customer_cart_items (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  variant_key VARCHAR(80) NOT NULL DEFAULT '',
  quantity INT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_customer_cart_items_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_customer_cart_items_customer_fk FOREIGN KEY (customer_id) REFERENCES ld_customers(id) ON DELETE CASCADE,
  CONSTRAINT ld_customer_cart_items_product_fk FOREIGN KEY (product_id) REFERENCES ld_products(id) ON DELETE CASCADE,
  UNIQUE KEY ld_customer_cart_items_customer_product_variant_uq (customer_id, product_id, variant_key),
  INDEX ld_customer_cart_items_customer_idx (customer_id, updated_at)
);

CREATE TABLE IF NOT EXISTS ld_consumer_orders (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  reference VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payment_provider VARCHAR(40) NOT NULL DEFAULT 'mercado_pago',
  provider_preference_id VARCHAR(160) NULL UNIQUE,
  provider_payment_id VARCHAR(160) NULL UNIQUE,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  subtotal_cents INT NOT NULL,
  discount_cents INT NOT NULL DEFAULT 0,
  shipping_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL,
  customer_email VARCHAR(320) NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  shipping_address_json JSON NULL,
  provider_payload_json JSON NULL,
  paid_at BIGINT NULL,
  cancelled_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_consumer_orders_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_consumer_orders_customer_fk FOREIGN KEY (customer_id) REFERENCES ld_customers(id) ON DELETE RESTRICT,
  INDEX ld_consumer_orders_store_status_idx (store_id, status, created_at),
  INDEX ld_consumer_orders_customer_idx (customer_id, created_at)
);

CREATE TABLE IF NOT EXISTS ld_consumer_order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  variant_key VARCHAR(80) NOT NULL DEFAULT '',
  sku VARCHAR(100) NULL,
  name VARCHAR(240) NOT NULL,
  unit_price_cents INT NOT NULL,
  quantity INT NOT NULL,
  total_cents INT NOT NULL,
  image_url TEXT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT ld_consumer_order_items_order_fk FOREIGN KEY (order_id) REFERENCES ld_consumer_orders(id) ON DELETE CASCADE,
  CONSTRAINT ld_consumer_order_items_product_fk FOREIGN KEY (product_id) REFERENCES ld_products(id) ON DELETE RESTRICT,
  INDEX ld_consumer_order_items_order_idx (order_id)
);

CREATE TABLE IF NOT EXISTS ld_customer_notifications (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  order_id CHAR(36) NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  read_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT ld_customer_notifications_store_fk FOREIGN KEY (store_id) REFERENCES ld_stores(id) ON DELETE CASCADE,
  CONSTRAINT ld_customer_notifications_customer_fk FOREIGN KEY (customer_id) REFERENCES ld_customers(id) ON DELETE CASCADE,
  CONSTRAINT ld_customer_notifications_order_fk FOREIGN KEY (order_id) REFERENCES ld_consumer_orders(id) ON DELETE SET NULL,
  INDEX ld_customer_notifications_customer_idx (customer_id, read_at, created_at)
);
