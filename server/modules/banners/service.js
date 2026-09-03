import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import * as repository from "./repository.js";
import { getProductStorage, bannerMediaKey } from "../storage/media-storage.js";
import { assertMinimumDimensions } from "./validation.js";
import { publicBanner, publicImage } from "./presenters.js";
import { syncStoreContractToR2 } from "../store-contract/r2-sync.js";

export class BannerDomainError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function listBanners({ storeId, userId }) {
  await requireStore({ storeId, userId });
  const { banners, images } = await repository.listBannersWithImages(storeId);
  return banners.map((banner) => publicBanner(banner, images.filter((image) => image.banner_id === banner.id)));
}

export async function getBanner({ storeId, bannerId, userId }) {
  const banner = await requireBanner({ storeId, bannerId, userId });
  return publicBanner(banner, await repository.listBannerImages(banner.id));
}

export async function createBanner({ storeId, userId, input }) {
  await requireStore({ storeId, userId });
  await assertCategoriesBelongToStore(storeId, input.categoryIds);
  const timestamp = Date.now();
  const banner = { id: randomUUID(), storeId, ...input, createdAt: timestamp, updatedAt: timestamp };
  const created = await repository.withinTransaction(async (tx) => {
    const uploadIds = input.uploadIds || [];
    const uploads = await repository.lockStagedUploads(tx, { storeId, userId, draftId: input.draftId, uploadIds });
    if (uploads.length !== uploadIds.length) throw new BannerDomainError(422, "Uma ou mais imagens não estão mais disponíveis. Envie-as novamente.");
    const counts = uploads.reduce((result, upload) => ({ ...result, [upload.breakpoint]: (result[upload.breakpoint] || 0) + 1 }), {});
    if (Object.values(counts).some((count) => count > 4)) throw new BannerDomainError(422, "Você pode adicionar no máximo quatro imagens em cada versão do banner.");
    await repository.insertBanner(banner, tx);
    const attached = uploads.length ? await repository.attachStagedUploads(tx, { bannerId: banner.id, uploads, timestamp }) : [];
    return publicBanner({ ...banner, banner_kind: banner.bannerKind, subtitle: banner.subtitle, target_url: banner.targetUrl, button_text: banner.buttonText, sort_order: banner.sortOrder, pages: JSON.stringify(banner.pages), category_ids: JSON.stringify(banner.categoryIds), display_position: banner.position }, attached);
  });
  await syncStoreContractToR2({ storeId, userId });
  return created;
}

export async function updateBanner({ storeId, bannerId, userId, input }) {
  const existing = await requireBanner({ storeId, bannerId, userId });
  await assertCategoriesBelongToStore(storeId, input.categoryIds);
  const timestamp = Date.now();
  await repository.updateBanner(existing, input, timestamp);
  const images = await repository.listBannerImages(existing.id);
  await syncStoreContractToR2({ storeId, userId });
  return publicBanner({ ...existing, banner_kind: input.bannerKind, title: input.title, subtitle: input.subtitle, target_url: input.targetUrl, button_text: input.buttonText, sort_order: input.sortOrder, pages: JSON.stringify(input.pages), category_ids: JSON.stringify(input.categoryIds), display_position: input.position, active: input.active ? 1 : 0, updated_at: timestamp }, images);
}

export async function removeBanner({ storeId, bannerId, userId }) {
  const banner = await requireBanner({ storeId, bannerId, userId });
  const images = await repository.listBannerImages(banner.id);
  await repository.deleteBanner(banner.id, storeId);
  await Promise.all(images.map((image) => getProductStorage().remove(image.storage_key)));
  await syncStoreContractToR2({ storeId, userId });
}

export async function addBannerImage({ storeId, bannerId, userId, file, mediaInput }) {
  const banner = await requireBanner({ storeId, bannerId, userId });
  const dimensions = imageSize(file.buffer);
  assertMinimumDimensions(dimensions, mediaInput.requirement, mediaInput.breakpoint);
  const existing = await repository.listBannerImages(banner.id, mediaInput.breakpoint);
  if (existing.length >= 4) throw new BannerDomainError(422, "Você pode adicionar no máximo quatro imagens em cada versão do banner.");
  const id = randomUUID();
  const stored = await getProductStorage().put({ key: bannerMediaKey({ accountId: userId, storeId, bannerId: banner.id, breakpoint: mediaInput.breakpoint, assetId: id, extension: mediaInput.extension }), body: file.buffer, contentType: file.mimetype });
  const timestamp = Date.now();
  const image = { id, bannerId: banner.id, breakpoint: mediaInput.breakpoint, storageKey: stored.key, url: stored.url, contentType: file.mimetype, fileSize: file.size, width: dimensions.width, height: dimensions.height, cropX: mediaInput.crop.x, cropY: mediaInput.crop.y, cropZoom: mediaInput.crop.zoom, sortOrder: existing.length, active: true, createdAt: timestamp, updatedAt: timestamp };
  await repository.insertBannerImage(image);
  await syncStoreContractToR2({ storeId, userId });
  return publicImage({ ...image, banner_id: image.bannerId, storage_key: image.storageKey, content_type: image.contentType, file_size: image.fileSize, crop_x: image.cropX, crop_y: image.cropY, crop_zoom: image.cropZoom, sort_order: image.sortOrder, created_at: timestamp, updated_at: timestamp });
}

export async function stageBannerImage({ storeId, userId, file, mediaInput, draftId }) {
  await requireStore({ storeId, userId });
  const dimensions = imageSize(file.buffer);
  assertMinimumDimensions(dimensions, mediaInput.requirement, mediaInput.breakpoint);
  const existing = await repository.listStagedUploadBreakpoints(storeId, userId, draftId);
  if (existing.filter((upload) => upload.breakpoint === mediaInput.breakpoint).length >= 4) throw new BannerDomainError(422, "Você pode adicionar no máximo quatro imagens em cada versão do banner.");
  const id = randomUUID();
  const stored = await getProductStorage().put({ key: bannerMediaKey({ accountId: userId, storeId, bannerId: draftId, breakpoint: mediaInput.breakpoint, assetId: id, extension: mediaInput.extension }), body: file.buffer, contentType: file.mimetype });
  const timestamp = Date.now();
  const upload = { id, storeId, userId, draftId, breakpoint: mediaInput.breakpoint, storageKey: stored.key, url: stored.url, contentType: file.mimetype, fileSize: file.size, width: dimensions.width, height: dimensions.height, cropX: mediaInput.crop.x, cropY: mediaInput.crop.y, cropZoom: mediaInput.crop.zoom, createdAt: timestamp, expiresAt: timestamp + 86400000 };
  await repository.insertStagedUpload(upload);
  return publicImage({ ...upload, banner_id: null, storage_key: upload.storageKey, content_type: upload.contentType, file_size: upload.fileSize, crop_x: upload.cropX, crop_y: upload.cropY, crop_zoom: upload.cropZoom, sort_order: 0, created_at: timestamp });
}

export async function removeStagedBannerImage({ storeId, uploadId, userId }) {
  await requireStore({ storeId, userId });
  const upload = await repository.findStagedUpload(storeId, userId, uploadId);
  if (!upload) throw new BannerDomainError(404, "Upload temporário não encontrado.");
  await repository.deleteStagedUpload(upload.id);
  await getProductStorage().remove(upload.storage_key);
}

export async function attachStagedBannerImages({ storeId, bannerId, userId, draftId, uploadIds }) {
  const banner = await requireBanner({ storeId, bannerId, userId });
  const attachedImages = await repository.withinTransaction(async (tx) => {
    const uploads = await repository.lockStagedUploads(tx, { storeId, userId, draftId, uploadIds });
    if (uploads.length !== uploadIds.length) throw new BannerDomainError(422, "Uma ou mais imagens não estão mais disponíveis. Envie-as novamente.");
    const current = await repository.listBannerImagesInTransaction(tx, banner.id);
    const startOrders = current.reduce((result, image) => ({ ...result, [image.breakpoint]: (result[image.breakpoint] || 0) + 1 }), {});
    const newCounts = uploads.reduce((result, upload) => ({ ...result, [upload.breakpoint]: (result[upload.breakpoint] || 0) + 1 }), {});
    if (Object.entries(newCounts).some(([breakpoint, count]) => count + (startOrders[breakpoint] || 0) > 4)) throw new BannerDomainError(422, "Você pode adicionar no máximo quatro imagens em cada versão do banner.");
    const attached = await repository.attachStagedUploads(tx, { bannerId: banner.id, uploads, timestamp: Date.now(), startOrders });
    return attached.map(publicImage);
  });
  await syncStoreContractToR2({ storeId, userId });
  return attachedImages;
}

export async function changeBannerImage({ storeId, bannerId, imageId, userId, patch }) {
  const banner = await requireBanner({ storeId, bannerId, userId });
  const image = await repository.findBannerImage(banner.id, imageId);
  if (!image) throw new BannerDomainError(404, "Imagem não encontrada.");
  const timestamp = Date.now();
  await repository.updateBannerImage(image.id, patch, timestamp);
  await syncStoreContractToR2({ storeId, userId });
  return publicImage({ ...image, crop_x: patch.crop.x, crop_y: patch.crop.y, crop_zoom: patch.crop.zoom, active: patch.active ? 1 : 0, updated_at: timestamp });
}

export async function removeBannerImage({ storeId, bannerId, imageId, userId }) {
  const banner = await requireBanner({ storeId, bannerId, userId });
  const image = await repository.findBannerImage(banner.id, imageId);
  if (!image) throw new BannerDomainError(404, "Imagem não encontrada.");
  await repository.deleteBannerImage(image.id);
  await getProductStorage().remove(image.storage_key);
  await syncStoreContractToR2({ storeId, userId });
}

async function requireStore({ storeId, userId }) {
  const store = await repository.findStoreOwnedByUser(storeId, userId);
  if (!store) throw new BannerDomainError(404, "Loja não encontrada.");
  return store;
}

async function requireBanner({ storeId, bannerId, userId }) {
  await requireStore({ storeId, userId });
  const banner = await repository.findBannerInStore(storeId, bannerId);
  if (!banner) throw new BannerDomainError(404, "Banner não encontrado.");
  return banner;
}

async function assertCategoriesBelongToStore(storeId, categoryIds) {
  if (!categoryIds.length) return;
  if (await repository.countExistingCategories(storeId, categoryIds) !== categoryIds.length) throw new BannerDomainError(422, "Uma ou mais categorias não pertencem a esta loja.");
}
