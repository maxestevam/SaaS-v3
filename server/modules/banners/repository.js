import { randomUUID } from "node:crypto";
import { one, query, transaction } from "../../db.js";

export const withinTransaction = transaction;

export function findStoreOwnedByUser(storeId, userId) {
  return one("SELECT id FROM ld_stores WHERE id = ? AND user_id = ?", [storeId, userId]);
}

export function findBannerInStore(storeId, bannerId) {
  return one("SELECT * FROM ld_banners WHERE id = ? AND store_id = ?", [bannerId, storeId]);
}

export async function listBannersWithImages(storeId) {
  const banners = await query("SELECT * FROM ld_banners WHERE store_id = ? ORDER BY banner_kind ASC, sort_order ASC, created_at DESC LIMIT 100", [storeId]);
  if (!banners.length) return { banners, images: [] };
  const images = await query(`SELECT * FROM ld_banner_images WHERE banner_id IN (${banners.map(() => "?").join(",")}) ORDER BY breakpoint ASC, sort_order ASC`, banners.map((banner) => banner.id));
  return { banners, images };
}

export function listBannerImages(bannerId, breakpoint = null) {
  return breakpoint
    ? query("SELECT * FROM ld_banner_images WHERE banner_id = ? AND breakpoint = ? ORDER BY sort_order ASC", [bannerId, breakpoint])
    : query("SELECT * FROM ld_banner_images WHERE banner_id = ? ORDER BY breakpoint ASC, sort_order ASC", [bannerId]);
}

export function findBannerImage(bannerId, imageId) {
  return one("SELECT * FROM ld_banner_images WHERE id = ? AND banner_id = ?", [imageId, bannerId]);
}

export async function countExistingCategories(storeId, categoryIds) {
  if (!categoryIds.length) return 0;
  const rows = await query(`SELECT id FROM ld_product_categories WHERE store_id = ? AND id IN (${categoryIds.map(() => "?").join(",")})`, [storeId, ...categoryIds]);
  return rows.length;
}

export function insertBanner(banner, executor = { query }) {
  return executor.query("INSERT INTO ld_banners (id, store_id, banner_kind, title, subtitle, target_url, button_text, pages, category_ids, display_position, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [banner.id, banner.storeId, banner.bannerKind, banner.title, banner.subtitle, banner.targetUrl, banner.buttonText, JSON.stringify(banner.pages), JSON.stringify(banner.categoryIds), banner.position, banner.sortOrder, banner.active ? 1 : 0, banner.createdAt, banner.updatedAt]);
}

export function updateBanner(banner, input, timestamp) {
  return query("UPDATE ld_banners SET banner_kind = ?, title = ?, subtitle = ?, target_url = ?, button_text = ?, pages = ?, category_ids = ?, display_position = ?, sort_order = ?, active = ?, updated_at = ? WHERE id = ? AND store_id = ?", [input.bannerKind, input.title, input.subtitle, input.targetUrl, input.buttonText, JSON.stringify(input.pages), JSON.stringify(input.categoryIds), input.position, input.sortOrder, input.active ? 1 : 0, timestamp, banner.id, banner.store_id]);
}

export function deleteBanner(bannerId, storeId) {
  return query("DELETE FROM ld_banners WHERE id = ? AND store_id = ?", [bannerId, storeId]);
}

export function insertBannerImage(image) {
  return query("INSERT INTO ld_banner_images (id, banner_id, breakpoint, storage_key, url, content_type, file_size, width, height, crop_x, crop_y, crop_zoom, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [image.id, image.bannerId, image.breakpoint, image.storageKey, image.url, image.contentType, image.fileSize, image.width, image.height, image.cropX, image.cropY, image.cropZoom, image.sortOrder, image.active === false ? 0 : 1, image.createdAt, image.updatedAt]);
}

export function updateBannerImage(imageId, patch, timestamp) {
  return query("UPDATE ld_banner_images SET crop_x = ?, crop_y = ?, crop_zoom = ?, active = ?, updated_at = ? WHERE id = ?", [patch.crop.x, patch.crop.y, patch.crop.zoom, patch.active ? 1 : 0, timestamp, imageId]);
}

export function deleteBannerImage(imageId) {
  return query("DELETE FROM ld_banner_images WHERE id = ?", [imageId]);
}

export function listStagedUploadBreakpoints(storeId, userId, draftId) {
  return query("SELECT breakpoint FROM ld_banner_uploads WHERE store_id = ? AND user_id = ? AND draft_id = ? AND status = 'staged'", [storeId, userId, draftId]);
}

export function insertStagedUpload(upload) {
  return query("INSERT INTO ld_banner_uploads (id, store_id, user_id, draft_id, breakpoint, storage_key, url, content_type, file_size, width, height, crop_x, crop_y, crop_zoom, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'staged', ?, ?)", [upload.id, upload.storeId, upload.userId, upload.draftId, upload.breakpoint, upload.storageKey, upload.url, upload.contentType, upload.fileSize, upload.width, upload.height, upload.cropX, upload.cropY, upload.cropZoom, upload.createdAt, upload.expiresAt]);
}

export function findStagedUpload(storeId, userId, uploadId) {
  return one("SELECT * FROM ld_banner_uploads WHERE id = ? AND store_id = ? AND user_id = ? AND status = 'staged'", [uploadId, storeId, userId]);
}

export function deleteStagedUpload(uploadId) {
  return query("DELETE FROM ld_banner_uploads WHERE id = ? AND status = 'staged'", [uploadId]);
}

export function lockStagedUploads(tx, { storeId, userId, draftId, uploadIds }) {
  if (!uploadIds.length) return [];
  return tx.query(`SELECT * FROM ld_banner_uploads WHERE id IN (${uploadIds.map(() => "?").join(", ")}) AND store_id = ? AND user_id = ? AND draft_id = ? AND status = 'staged' AND expires_at > ? FOR UPDATE`, [...uploadIds, storeId, userId, draftId, Date.now()]);
}

export function listBannerImagesInTransaction(tx, bannerId) {
  return tx.query("SELECT breakpoint FROM ld_banner_images WHERE banner_id = ?", [bannerId]);
}

export async function attachStagedUploads(tx, { bannerId, uploads, timestamp, startOrders = {} }) {
  const orderByBreakpoint = { ...startOrders };
  const images = [];
  for (const upload of uploads) {
    const sortOrder = orderByBreakpoint[upload.breakpoint] || 0;
    orderByBreakpoint[upload.breakpoint] = sortOrder + 1;
    const image = { id: randomUUID(), banner_id: bannerId, stagedUploadId: upload.id, breakpoint: upload.breakpoint, storage_key: upload.storage_key, url: upload.url, content_type: upload.content_type, file_size: upload.file_size, width: upload.width, height: upload.height, crop_x: upload.crop_x, crop_y: upload.crop_y, crop_zoom: upload.crop_zoom, sort_order: sortOrder, active: 1, created_at: timestamp, updated_at: timestamp };
    await tx.query("INSERT INTO ld_banner_images (id, banner_id, breakpoint, storage_key, url, content_type, file_size, width, height, crop_x, crop_y, crop_zoom, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [image.id, image.banner_id, image.breakpoint, image.storage_key, image.url, image.content_type, image.file_size, image.width, image.height, image.crop_x, image.crop_y, image.crop_zoom, image.sort_order, image.active, image.created_at, image.updated_at]);
    images.push(image);
  }
  await tx.query(`UPDATE ld_banner_uploads SET status = 'attached', attached_at = ? WHERE id IN (${uploads.map(() => "?").join(", ")})`, [timestamp, ...uploads.map((upload) => upload.id)]);
  return images;
}
