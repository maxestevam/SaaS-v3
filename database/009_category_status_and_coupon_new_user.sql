ALTER TABLE ld_product_categories
  ADD COLUMN active TINYINT NOT NULL DEFAULT 1 AFTER description;

ALTER TABLE ld_coupons
  ADD COLUMN new_users_only TINYINT NOT NULL DEFAULT 0 AFTER active;
