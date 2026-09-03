-- Carrinho público: um UUID por navegador, associação posterior ao cliente e retenção por expiração.
-- Execute os comandos na ordem abaixo em instalações já migradas pela 017.
ALTER TABLE ld_customer_cart_items
  DROP INDEX ld_customer_cart_items_customer_product_variant_uq;

ALTER TABLE ld_customer_cart_items
  DROP FOREIGN KEY ld_customer_cart_items_customer_fk;

ALTER TABLE ld_customer_cart_items
  MODIFY COLUMN customer_id CHAR(36) NULL,
  ADD COLUMN browser_uuid CHAR(36) NULL AFTER customer_id,
  ADD COLUMN owner_key VARCHAR(100) NULL AFTER browser_uuid,
  ADD COLUMN expires_at BIGINT NULL AFTER updated_at;

UPDATE ld_customer_cart_items
  SET owner_key = CONCAT('customer:', customer_id),
      expires_at = updated_at + 604800000
  WHERE customer_id IS NOT NULL;

ALTER TABLE ld_customer_cart_items
  MODIFY COLUMN owner_key VARCHAR(100) NOT NULL,
  MODIFY COLUMN expires_at BIGINT NOT NULL,
  ADD CONSTRAINT ld_customer_cart_items_customer_fk FOREIGN KEY (customer_id) REFERENCES ld_customers(id) ON DELETE CASCADE,
  ADD UNIQUE KEY ld_customer_cart_items_owner_product_variant_uq (store_id, owner_key, product_id, variant_key),
  ADD INDEX ld_customer_cart_items_browser_idx (store_id, browser_uuid, expires_at),
  ADD INDEX ld_customer_cart_items_expiry_idx (expires_at);
