-- Expansão administrativa de catálogo: campos autorizados do JSON de referência.
-- Deliberadamente não inclui atributos, SEO nem flags manuais de destaque/novo/mais vendido.
ALTER TABLE ld_products
  ADD COLUMN sku VARCHAR(120) NULL,
  ADD COLUMN short_description VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN compare_at_price_cents INT NULL,
  ADD COLUMN cost_price_cents INT NULL,
  ADD COLUMN brand VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN tags_json JSON NULL,
  ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0,
  ADD COLUMN weight_grams INT NULL,
  ADD COLUMN width_mm INT NULL,
  ADD COLUMN height_mm INT NULL,
  ADD COLUMN depth_mm INT NULL;

ALTER TABLE ld_products
  ADD UNIQUE KEY ld_products_store_sku_uq (store_id, sku);

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
