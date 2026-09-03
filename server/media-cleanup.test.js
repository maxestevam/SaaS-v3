import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ remove: vi.fn() }));
const productRepository = vi.hoisted(() => ({
  findStoreOwnedByUser: vi.fn(),
  findProductOwnedByUser: vi.fn(),
  findStagedUpload: vi.fn(),
  listProductStorageKeys: vi.fn(),
  findProductMedia: vi.fn(),
  deleteStagedUpload: vi.fn(),
  deleteProduct: vi.fn(),
  deleteProductMedia: vi.fn(),
  normalizeImageOrder: vi.fn(),
}));
const bannerRepository = vi.hoisted(() => ({
  findStoreOwnedByUser: vi.fn(),
  findBannerInStore: vi.fn(),
  findStagedUpload: vi.fn(),
  listBannerImages: vi.fn(),
  findBannerImage: vi.fn(),
  deleteBanner: vi.fn(),
  deleteStagedUpload: vi.fn(),
  deleteBannerImage: vi.fn(),
}));

vi.mock("./modules/storage/media-storage.js", () => ({
  getProductStorage: () => storage,
  productMediaKey: vi.fn(),
  bannerMediaKey: vi.fn(),
}));
vi.mock("./modules/products/repository.js", () => productRepository);
vi.mock("./modules/banners/repository.js", () => bannerRepository);
vi.mock("./modules/store-contract/r2-sync.js", () => ({ syncStoreContractToR2: vi.fn().mockResolvedValue({ key: "loja-teste.json" }) }));

import { removeProduct, removeProductMedia, removeStagedProductUpload } from "./modules/products/service.js";
import { removeBanner, removeBannerImage, removeStagedBannerImage } from "./modules/banners/service.js";

const userId = "account-1";
const storeId = "store-1";
const productId = "product-1";
const bannerId = "banner-1";

function expectRemovedAfter(persistedMock, key) {
  expect(storage.remove).toHaveBeenCalledWith(key);
  expect(persistedMock.mock.invocationCallOrder[0]).toBeLessThan(storage.remove.mock.invocationCallOrder[0]);
}

describe("limpeza de mídia persistida no R2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.remove.mockResolvedValue(undefined);
    productRepository.findStoreOwnedByUser.mockResolvedValue({ id: storeId, name: "Loja" });
    productRepository.findProductOwnedByUser.mockResolvedValue({ id: productId, created_at: Date.now() });
    bannerRepository.findStoreOwnedByUser.mockResolvedValue({ id: storeId });
    bannerRepository.findBannerInStore.mockResolvedValue({ id: bannerId, store_id: storeId });
  });

  it("remove do R2 um upload temporário de produto depois de excluí-lo do banco", async () => {
    const key = `${userId}/${storeId}/products/draft-1/images/file-1.png`;
    productRepository.findStagedUpload.mockResolvedValue({ id: "upload-1", storage_key: key });
    productRepository.deleteStagedUpload.mockResolvedValue(undefined);

    await removeStagedProductUpload({ storeId, uploadId: "upload-1", userId });

    expectRemovedAfter(productRepository.deleteStagedUpload, key);
  });

  it("remove todas as mídias de um produto do R2 depois de excluir o produto", async () => {
    const keys = [
      `${userId}/${storeId}/products/draft-1/images/file-1.png`,
      `${userId}/${storeId}/products/draft-1/video/file-2.mp4`,
    ];
    productRepository.listProductStorageKeys.mockResolvedValue(keys.map((storage_key) => ({ storage_key })));
    productRepository.deleteProduct.mockResolvedValue(undefined);

    await removeProduct({ storeId, productId, userId });

    expect(storage.remove).toHaveBeenCalledTimes(2);
    expectRemovedAfter(productRepository.deleteProduct, keys[0]);
    expect(storage.remove).toHaveBeenCalledWith(keys[1]);
  });

  it("remove a mídia individual de produto no R2 somente após a exclusão persistida", async () => {
    const key = `${userId}/${storeId}/products/draft-1/images/file-1.png`;
    productRepository.findProductMedia.mockResolvedValue({ id: "media-1", storage_key: key });
    productRepository.deleteProductMedia.mockResolvedValue(undefined);
    productRepository.normalizeImageOrder.mockResolvedValue(undefined);

    await removeProductMedia({ storeId, productId, mediaId: "media-1", userId });

    expectRemovedAfter(productRepository.deleteProductMedia, key);
  });

  it("não oculta uma falha de remoção R2 após excluir a mídia de produto no banco", async () => {
    const key = `${userId}/${storeId}/products/draft-1/images/file-1.png`;
    productRepository.findProductMedia.mockResolvedValue({ id: "media-1", storage_key: key });
    productRepository.deleteProductMedia.mockResolvedValue(undefined);
    storage.remove.mockRejectedValue(new Error("R2 indisponível"));

    await expect(removeProductMedia({ storeId, productId, mediaId: "media-1", userId })).rejects.toThrow("R2 indisponível");
    expectRemovedAfter(productRepository.deleteProductMedia, key);
  });

  it("remove imagens vinculadas ao banner inteiro depois de excluir o registro", async () => {
    const keys = [
      `${userId}/${storeId}/banners/${bannerId}/desktop/file-1.png`,
      `${userId}/${storeId}/banners/${bannerId}/mobile/file-2.png`,
    ];
    bannerRepository.listBannerImages.mockResolvedValue(keys.map((storage_key) => ({ storage_key })));
    bannerRepository.deleteBanner.mockResolvedValue(undefined);

    await removeBanner({ storeId, bannerId, userId });

    expect(storage.remove).toHaveBeenCalledTimes(2);
    expectRemovedAfter(bannerRepository.deleteBanner, keys[0]);
    expect(storage.remove).toHaveBeenCalledWith(keys[1]);
  });

  it("remove o upload temporário e a imagem individual de banner do R2 após as exclusões persistidas", async () => {
    const stagedKey = `${userId}/${storeId}/banners/draft-1/desktop/file-1.png`;
    const imageKey = `${userId}/${storeId}/banners/${bannerId}/desktop/file-2.png`;
    bannerRepository.findStagedUpload.mockResolvedValue({ id: "upload-1", storage_key: stagedKey });
    bannerRepository.deleteStagedUpload.mockResolvedValue(undefined);

    await removeStagedBannerImage({ storeId, uploadId: "upload-1", userId });
    expectRemovedAfter(bannerRepository.deleteStagedUpload, stagedKey);

    storage.remove.mockClear();
    bannerRepository.findBannerImage.mockResolvedValue({ id: "image-1", storage_key: imageKey });
    bannerRepository.deleteBannerImage.mockResolvedValue(undefined);
    await removeBannerImage({ storeId, bannerId, imageId: "image-1", userId });
    expectRemovedAfter(bannerRepository.deleteBannerImage, imageKey);
  });
});
