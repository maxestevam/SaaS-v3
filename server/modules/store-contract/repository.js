import { one, query } from "../../db.js";

export function findStoreForUser(storeId, userId) {
  return one("SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id WHERE stores.id = ? AND stores.user_id = ?", [storeId, userId]);
}

export function findPublicStoreBySlug(slug) {
  return one("SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id WHERE stores.slug = ? AND stores.status = 3", [slug]);
}

export async function loadStoreContractData(storeId) {
  const now = Date.now();
  const [categories, products, media, variants, banners, bannerImages, coupons] = await Promise.all([
    query("SELECT categories.*, COUNT(CASE WHEN products.status = 'active' THEN products.id END) AS product_count FROM ld_product_categories AS categories LEFT JOIN ld_products AS products ON products.category_id = categories.id WHERE categories.store_id = ? AND categories.active = 1 GROUP BY categories.id ORDER BY categories.parent_category_id IS NOT NULL, categories.name ASC", [storeId]),
    query("SELECT products.*, categories.parent_category_id AS category_parent_id FROM ld_products AS products JOIN ld_product_categories AS categories ON categories.id = products.category_id WHERE products.store_id = ? AND products.status = 'active' AND categories.active = 1 ORDER BY products.name ASC", [storeId]),
    query("SELECT media.* FROM ld_product_media AS media JOIN ld_products AS products ON products.id = media.product_id WHERE products.store_id = ? AND products.status = 'active' AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC", [storeId]),
    query("SELECT variants.* FROM ld_product_variants AS variants JOIN ld_products AS products ON products.id = variants.product_id WHERE products.store_id = ? AND products.status = 'active' ORDER BY variants.sort_order ASC, variants.created_at ASC", [storeId]),
    query("SELECT * FROM ld_banners WHERE store_id = ? AND active = 1 ORDER BY display_position ASC, created_at ASC", [storeId]),
    query("SELECT images.* FROM ld_banner_images AS images JOIN ld_banners AS banners ON banners.id = images.banner_id WHERE banners.store_id = ? AND banners.active = 1 AND images.active = 1 ORDER BY images.breakpoint ASC, images.sort_order ASC", [storeId]),
    query("SELECT * FROM ld_coupons WHERE store_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at >= ?) ORDER BY created_at DESC", [storeId, now]),
  ]);
  return { categories, products, media, variants, banners, bannerImages, coupons };
}
