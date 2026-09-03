/** CRUD protegido de produtos, categorias e mídias vinculado à loja ativa. */
import { randomUUID } from "node:crypto";
import * as repository from "./repository.js";
import { getProductStorage, productMediaKey } from "../storage/media-storage.js";
import { mediaFromUpload, publicCategory, publicProduct, publicProductListItem, publicUpload } from "./presenters.js";
import { syncStoreContractToR2 } from "../store-contract/r2-sync.js";

export class ProductDomainError extends Error { constructor(status, message) { super(message); this.status = status; } }

export async function listCategories({ storeId, userId, search }) { await requireStore(storeId, userId); return (await repository.listCategories(storeId, String(search || "").trim().slice(0, 120))).map(publicCategory); }
export async function getCategoryData({ storeId, categoryId, userId }) { return requireCategory(storeId, categoryId, userId); }
export async function createCategory({ storeId, userId, input }) { const store = await requireStore(storeId, userId); await requireParentCategory(store.id, input.parentCategoryId); if (await repository.findCategoryByName(store.id, input.name)) throw new ProductDomainError(409, "Já existe uma categoria com este nome nesta loja."); const timestamp = Date.now(); const category = { id: randomUUID(), storeId: store.id, ...input, createdAt: timestamp, updatedAt: timestamp, productCount: 0 }; await repository.insertCategory(category); await syncStoreContractToR2({ storeId, userId }); return publicCategory(category); }
export async function updateCategory({ storeId, categoryId, userId, input, existing = null }) { const category = existing || await requireCategory(storeId, categoryId, userId); if (input.parentCategoryId === category.id) throw new ProductDomainError(422, "Uma categoria não pode ser sua própria categoria principal."); await requireParentCategory(storeId, input.parentCategoryId); if (await repository.findCategoryByName(storeId, input.name, category.id)) throw new ProductDomainError(409, "Já existe uma categoria com este nome nesta loja."); const timestamp = Date.now(); await repository.updateCategory(category, input, timestamp); await syncStoreContractToR2({ storeId, userId }); return publicCategory({ ...category, ...input, updated_at: timestamp }); }
export async function removeCategory({ storeId, categoryId, userId, deleteProducts = false }) {
  const category = await requireCategory(storeId, categoryId, userId);
  const tree = await repository.listCategoryTree(storeId, category.id);
  const categoryIds = tree.map((item) => item.id);
  const hasProducts = await repository.hasProductsInCategories(categoryIds);
  const hasSubcategories = tree.some((item) => item.parent_category_id === category.id);
  if ((hasProducts || hasSubcategories) && !deleteProducts) throw new ProductDomainError(409, "Marque a confirmação para excluir as subcategorias e os produtos vinculados.");
  if (hasProducts || hasSubcategories) {
    const media = await repository.listCategoryProductStorageKeys(categoryIds);
    await getProductStorage().removeMany(media.map((item) => item.storage_key));
    await repository.withinTransaction(async (tx) => {
      await repository.deleteProductsInCategories(tx, categoryIds);
      await repository.deleteCategoryTreeInTransaction(tx, category.id);
    });
    await syncStoreContractToR2({ storeId, userId });
    return;
  }
  await repository.deleteCategory(category.id);
  await syncStoreContractToR2({ storeId, userId });
}
export async function listProducts({ storeId, userId, listInput }) { await requireStore(storeId, userId); const { count, rows } = await repository.listProductPage(listInput); const total = Number(count?.total || 0); return { data: rows.map(publicProductListItem), pagination: { page: listInput.pagination.page, limit: listInput.pagination.limit, total, totalPages: Math.max(1, Math.ceil(total / listInput.pagination.limit)) } }; }
export async function getProduct({ storeId, productId, userId }) { const product = await requireProduct(storeId, productId, userId); return publicProduct(product, (await repository.listProductMedia(product.id)) || [], (await repository.listProductVariants(product.id)) || []); }
export async function getProductData({ storeId, productId, userId }) { const product = await requireProduct(storeId, productId, userId); return { ...product, variants: (await repository.listProductVariants(product.id)) || [] }; }
export async function uploadProductMedia({ storeId, userId, file, uploadInput }) { const store = await requireStore(storeId, userId); const existing = await repository.listStagedUploadKinds(store.id, userId, uploadInput.draftId); const images = existing.filter((item) => item.kind === "image").length; const videos = existing.filter((item) => item.kind === "video").length; if ((uploadInput.format.kind === "image" && images >= 3) || (uploadInput.format.kind === "video" && videos >= 1)) throw new ProductDomainError(422, uploadInput.format.kind === "image" ? "Você pode adicionar no máximo três imagens." : "Você pode adicionar apenas um vídeo."); const id = randomUUID(); const folder = uploadInput.format.kind === "image" ? "images" : "video"; const stored = await getProductStorage().put({ key: productMediaKey({ accountId: userId, storeId: store.id, draftId: uploadInput.draftId, folder, assetId: id, extension: uploadInput.format.extension }), body: file.buffer, contentType: file.mimetype }); const timestamp = Date.now(); const media = { id, storeId: store.id, userId, draftId: uploadInput.draftId, kind: uploadInput.format.kind, storageKey: stored.key, url: stored.url, contentType: file.mimetype, fileSize: file.size, status: "staged", createdAt: timestamp, expiresAt: timestamp + 86400000 }; await repository.insertStagedUpload(media); return publicUpload(media); }
export async function removeStagedProductUpload({ storeId, uploadId, userId }) { await requireStore(storeId, userId); const upload = await repository.findStagedUpload(storeId, userId, uploadId); if (!upload) throw new ProductDomainError(404, "Upload temporário não encontrado."); await repository.deleteStagedUpload(upload.id); await getProductStorage().remove(upload.storage_key); }
export async function createProduct({ storeId, userId, input }) { await requireStore(storeId, userId); return persistProduct({ storeId, userId, ...input }); }
export async function updateProduct({ storeId, productId, userId, input, existing = null }) { const product = existing || await requireProduct(storeId, productId, userId); return persistProduct({ storeId, userId, productId: product.id, createdAt: product.created_at, currentCategoryId: product.category_id, ...input, updating: true }); }
export async function removeProduct({ storeId, productId, userId }) { const product = await requireProduct(storeId, productId, userId); const media = await repository.listProductStorageKeys(product.id); await repository.deleteProduct(product.id); await Promise.all(media.map((item) => getProductStorage().remove(item.storage_key))); await syncStoreContractToR2({ storeId, userId }); }
export async function removeProductMedia({ storeId, productId, mediaId, userId }) { const product = await requireProduct(storeId, productId, userId); const media = await repository.findProductMedia(product.id, mediaId); if (!media) throw new ProductDomainError(404, "Mídia não encontrada."); await repository.deleteProductMedia(media.id); await getProductStorage().remove(media.storage_key); await repository.normalizeImageOrder(product.id); await syncStoreContractToR2({ storeId, userId }); }

async function persistProduct({ storeId, userId, categoryId, name, sku, description, shortDescription, priceCents, compareAtPriceCents, costPriceCents, brand, tags, stockQuantity, weightGrams, widthMm, heightMm, depthMm, variants, status, draftId, uploadIds, productId = randomUUID(), createdAt = null, currentCategoryId = null, updating = false }) {
  const timestamp = Date.now();
  const persisted = await repository.withinTransaction(async (tx) => {
    const category = await repository.findCategoryInStoreTx(tx, categoryId, storeId); if (!category) throw new ProductDomainError(422, "A categoria selecionada não pertence a esta loja."); if (!Boolean(category.active) && (!updating || categoryId !== currentCategoryId)) throw new ProductDomainError(422, "Ative a categoria selecionada antes de vinculá-la a um produto.");
    if (sku && await repository.findProductBySku(storeId, sku, updating ? productId : null)) throw new ProductDomainError(409, "Já existe um produto com este SKU nesta loja.");
    const currentMedia = updating ? await repository.listProductMediaInTransaction(tx, productId) : [];
    const uploads = uploadIds.length ? await repository.lockStagedUploads(tx, { storeId, userId, draftId, uploadIds }) : [];
    if ((!updating && (!draftId || !uploadIds.length)) || uploads.length !== uploadIds.length) throw new ProductDomainError(422, "Uma ou mais mídias não estão mais disponíveis. Envie-as novamente.");
    validateMediaCounts([...currentMedia, ...uploads]);
    const product = { id: productId, storeId, categoryId, name, sku, description, shortDescription, priceCents, compareAtPriceCents, costPriceCents, brand, tags, stockQuantity, weightGrams, widthMm, heightMm, depthMm, status, createdAt: createdAt || timestamp, updatedAt: timestamp };
    if (updating) await repository.updateProduct(tx, product); else await repository.insertProduct(tx, product);
    await repository.replaceProductVariants(tx, productId, variants, timestamp);
    if (uploads.length) await repository.attachUploads(tx, { productId, uploads, timestamp, startOrder: currentMedia.filter((item) => item.kind === "image").length });
    return publicProduct({ id: productId, store_id: storeId, category_id: categoryId, category_name: category.name, name, sku, description, short_description: shortDescription, price_cents: priceCents, compare_at_price_cents: compareAtPriceCents, cost_price_cents: costPriceCents, brand, tags_json: JSON.stringify(tags), stock_quantity: stockQuantity, weight_grams: weightGrams, width_mm: widthMm, height_mm: heightMm, depth_mm: depthMm, status, created_at: product.createdAt, updated_at: timestamp }, [...currentMedia, ...uploads.map((item, index) => mediaFromUpload(item, index))], variants.map((variant, index) => ({ id: `${productId}-${index}`, name: variant.name, sku: variant.sku, price_cents: variant.priceCents, stock_quantity: variant.stockQuantity, sort_order: index })));
  });
  await syncStoreContractToR2({ storeId, userId });
  return persisted;
}

function validateMediaCounts(media) {
  const images = media.filter((item) => item.kind === "image").length;
  const videos = media.filter((item) => item.kind === "video").length;
  if (images > 3 || videos > 1 || !images) throw new ProductDomainError(422, "Inclua entre uma e três imagens e, no máximo, um vídeo.");
}
async function requireStore(storeId, userId) { const store = await repository.findStoreOwnedByUser(storeId, userId); if (!store) throw new ProductDomainError(404, "Loja não encontrada."); return store; }
async function requireCategory(storeId, categoryId, userId) { const category = await repository.findCategoryOwnedByUser(storeId, categoryId, userId); if (!category) throw new ProductDomainError(404, "Categoria não encontrada."); return category; }
async function requireParentCategory(storeId, parentCategoryId) { if (!parentCategoryId) return null; const parent = await repository.findCategoryInStore(storeId, parentCategoryId); if (!parent || parent.parent_category_id) throw new ProductDomainError(422, "Selecione uma categoria principal válida desta loja."); return parent; }
async function requireProduct(storeId, productId, userId) { const product = await repository.findProductOwnedByUser(storeId, productId, userId); if (!product) throw new ProductDomainError(404, "Produto não encontrado."); return product; }
