-- Subcategorias por loja: somente um nível abaixo de uma categoria principal.
ALTER TABLE ld_product_categories
  ADD COLUMN parent_category_id CHAR(36) NULL AFTER store_id;

CREATE INDEX idx_product_categories_parent
  ON ld_product_categories (store_id, parent_category_id);
