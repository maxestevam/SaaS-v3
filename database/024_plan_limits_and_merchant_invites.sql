CREATE TABLE IF NOT EXISTS ld_plan_limits (
  plan_id VARCHAR(40) PRIMARY KEY,
  products_limit INT NOT NULL DEFAULT 0,
  categories_limit INT NOT NULL DEFAULT 0,
  subcategories_limit INT NOT NULL DEFAULT 0,
  customers_limit INT NOT NULL DEFAULT 0,
  coupons_limit INT NOT NULL DEFAULT 0,
  banners_limit INT NOT NULL DEFAULT 0,
  product_images_limit INT NOT NULL DEFAULT 0,
  product_videos_limit INT NOT NULL DEFAULT 0,
  banner_images_limit INT NOT NULL DEFAULT 0,
  unlimited_cap INT NOT NULL DEFAULT 1000,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_plan_limits_plan_fk FOREIGN KEY (plan_id) REFERENCES ld_plans(id) ON DELETE CASCADE,
  CONSTRAINT ld_plan_limits_unlimited_cap_ck CHECK (unlimited_cap BETWEEN 1 AND 1000)
);

INSERT INTO ld_plan_limits (
  plan_id, products_limit, categories_limit, subcategories_limit, customers_limit,
  coupons_limit, banners_limit, product_images_limit, product_videos_limit,
  banner_images_limit, unlimited_cap, created_at, updated_at
)
SELECT id, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000
FROM ld_plans
ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id);

CREATE TABLE IF NOT EXISTS ld_merchant_invites (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL,
  trial_days INT NOT NULL,
  created_by CHAR(36) NOT NULL,
  email_sent_at BIGINT NOT NULL,
  trial_consumed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT ld_merchant_invites_user_fk FOREIGN KEY (user_id) REFERENCES ld_users(id) ON DELETE CASCADE,
  CONSTRAINT ld_merchant_invites_created_by_fk FOREIGN KEY (created_by) REFERENCES ld_users(id) ON DELETE RESTRICT,
  CONSTRAINT ld_merchant_invites_trial_days_ck CHECK (trial_days BETWEEN 1 AND 365),
  INDEX ld_merchant_invites_email_idx (email),
  INDEX ld_merchant_invites_unconsumed_idx (user_id, trial_consumed_at)
);
