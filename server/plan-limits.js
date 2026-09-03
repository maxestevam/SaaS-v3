export const PLAN_LIMIT_FIELDS = [
  "products",
  "categories",
  "subcategories",
  "customers",
  "coupons",
  "banners",
  "productImages",
  "productVideos",
  "bannerImages",
];

const COLUMN_BY_FIELD = {
  products: "products_limit",
  categories: "categories_limit",
  subcategories: "subcategories_limit",
  customers: "customers_limit",
  coupons: "coupons_limit",
  banners: "banners_limit",
  productImages: "product_images_limit",
  productVideos: "product_videos_limit",
  bannerImages: "banner_images_limit",
};

const LABEL_BY_FIELD = {
  products: "produtos cadastrados",
  categories: "categorias",
  subcategories: "subcategorias",
  customers: "clientes",
  coupons: "cupons",
  banners: "banners",
  productImages: "fotos por produto",
  productVideos: "vídeos por produto",
  bannerImages: "fotos por banner",
};

export function normalizePlanLimits(source = {}) {
  const unlimitedCap = readInteger(source.unlimitedCap ?? source.unlimited_cap, "teto de ilimitado", 1, 1000, 1000);
  const limits = { unlimitedCap };
  for (const field of PLAN_LIMIT_FIELDS) limits[field] = readInteger(source[field] ?? source[COLUMN_BY_FIELD[field]], LABEL_BY_FIELD[field], 0, 1000, 0);
  return limits;
}

export function planLimitsFromRow(row = {}) {
  return normalizePlanLimits(row);
}

export function quotaFor(limits, field) {
  const normalized = normalizePlanLimits(limits);
  return normalized[field] === 0 ? normalized.unlimitedCap : normalized[field];
}

export function planLimitsSqlColumns(prefix = "limits") {
  return PLAN_LIMIT_FIELDS.map((field) => `${prefix}.${COLUMN_BY_FIELD[field]} AS ${COLUMN_BY_FIELD[field]}`).concat(`${prefix}.unlimited_cap AS unlimited_cap`).join(", ");
}

export async function getActiveStorePlanLimits({ storeId, one, now = Date.now() }) {
  const row = await one(`SELECT subscriptions.id AS subscription_id, subscriptions.plan_id, plans.name AS plan_name, ${planLimitsSqlColumns()} FROM ld_subscriptions subscriptions INNER JOIN ld_plans plans ON plans.id = subscriptions.plan_id AND plans.active = 1 LEFT JOIN ld_plan_limits limits ON limits.plan_id = plans.id WHERE subscriptions.store_id = ? AND (subscriptions.status IN ('active','authorized') OR (subscriptions.status = 'trial' AND subscriptions.trial_ends_at > ?)) ORDER BY subscriptions.created_at DESC LIMIT 1`, [storeId, now]);
  if (!row) return null;
  return { subscriptionId: row.subscription_id, planId: row.plan_id, planName: row.plan_name, limits: planLimitsFromRow(row) };
}

export async function requirePlanQuota({ storeId, field, countSql, one, createError, now = Date.now() }) {
  const plan = await getActiveStorePlanLimits({ storeId, one, now });
  if (!plan) throw createError(402, "Escolha ou regularize um plano ativo para continuar esta operação.");
  const limit = quotaFor(plan.limits, field);
  if (!countSql) return { ...plan, limit, used: 0 };
  const count = await one(countSql, [storeId]);
  const used = Number(count?.total || 0);
  if (used >= limit) throw createError(409, `O plano ${plan.planName} atingiu o limite de ${limit} ${LABEL_BY_FIELD[field]}.`);
  return { ...plan, limit, used };
}

export async function getStorePlanUsage({ storeId, one }) {
  const [products, categories, subcategories, customers, coupons, banners, productImages, productVideos, bannerImages] = await Promise.all([
    one("SELECT COUNT(*) AS total FROM ld_products WHERE store_id = ?", [storeId]),
    one("SELECT COUNT(*) AS total FROM ld_product_categories WHERE store_id = ? AND parent_category_id IS NULL", [storeId]),
    one("SELECT COUNT(*) AS total FROM ld_product_categories WHERE store_id = ? AND parent_category_id IS NOT NULL", [storeId]),
    one("SELECT COUNT(*) AS total FROM ld_customers WHERE store_id = ?", [storeId]),
    one("SELECT COUNT(*) AS total FROM ld_coupons WHERE store_id = ?", [storeId]),
    one("SELECT COUNT(*) AS total FROM ld_banners WHERE store_id = ?", [storeId]),
    one("SELECT COALESCE(MAX(image_count), 0) AS total FROM (SELECT products.id, SUM(media.kind = 'image') AS image_count FROM ld_products products LEFT JOIN ld_product_media media ON media.product_id = products.id WHERE products.store_id = ? GROUP BY products.id) media_per_product", [storeId]),
    one("SELECT COALESCE(MAX(video_count), 0) AS total FROM (SELECT products.id, SUM(media.kind = 'video') AS video_count FROM ld_products products LEFT JOIN ld_product_media media ON media.product_id = products.id WHERE products.store_id = ? GROUP BY products.id) media_per_product", [storeId]),
    one("SELECT COALESCE(MAX(image_count), 0) AS total FROM (SELECT banners.id, COUNT(images.id) AS image_count FROM ld_banners banners LEFT JOIN ld_banner_images images ON images.banner_id = banners.id WHERE banners.store_id = ? GROUP BY banners.id) images_per_banner", [storeId]),
  ]);
  return { products: Number(products?.total || 0), categories: Number(categories?.total || 0), subcategories: Number(subcategories?.total || 0), customers: Number(customers?.total || 0), coupons: Number(coupons?.total || 0), banners: Number(banners?.total || 0), productImages: Number(productImages?.total || 0), productVideos: Number(productVideos?.total || 0), bannerImages: Number(bannerImages?.total || 0) };
}

export function maxNewMedia({ limits, field, existing = 0, incoming = 1, createError }) {
  const limit = quotaFor(limits, field);
  if (existing + incoming > limit) throw createError(409, `O plano atingiu o limite de ${limit} ${LABEL_BY_FIELD[field]}.`);
  return limit;
}

function readInteger(value, label, min, max, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`Informe ${label} entre ${min} e ${max}.`);
  return parsed;
}
