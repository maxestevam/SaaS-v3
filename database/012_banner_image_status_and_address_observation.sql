ALTER TABLE ld_banner_images ADD COLUMN active TINYINT NOT NULL DEFAULT 1 AFTER sort_order;
ALTER TABLE ld_customer_addresses ADD COLUMN observation VARCHAR(80) NOT NULL DEFAULT '' AFTER complement;
ALTER TABLE ld_store_profiles ADD COLUMN address_observation VARCHAR(80) NOT NULL DEFAULT '' AFTER address_complement;
