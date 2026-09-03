-- Proporção padrão aplicada às novas imagens de produtos da categoria.
ALTER TABLE ld_product_categories
  ADD COLUMN crop_aspect VARCHAR(5) NOT NULL DEFAULT '1:1' AFTER description;
