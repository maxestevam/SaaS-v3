import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  findCategoryOwnedByUser: vi.fn(),
  listCategoryTree: vi.fn(),
  hasProductsInCategories: vi.fn(),
  listCategoryProductStorageKeys: vi.fn(),
  withinTransaction: vi.fn(),
  deleteProductsInCategories: vi.fn(),
  deleteCategoryTreeInTransaction: vi.fn(),
  deleteCategory: vi.fn(),
  removeMany: vi.fn(),
}));

vi.mock("./modules/products/repository.js", () => mocked);
vi.mock("./modules/storage/media-storage.js", () => ({ getProductStorage: () => ({ removeMany: mocked.removeMany }), productMediaKey: vi.fn() }));
vi.mock("./modules/store-contract/r2-sync.js", () => ({ syncStoreContractToR2: vi.fn().mockResolvedValue({ key: "loja-teste.json" }) }));

import { ProductDomainError, removeCategory } from "./modules/products/service.js";

describe("exclusão confirmada de categoria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.findCategoryOwnedByUser.mockResolvedValue({ id: "category-1", store_id: "store-1" });
    mocked.listCategoryTree.mockResolvedValue([{ id: "category-1", parent_category_id: null }, { id: "subcategory-1", parent_category_id: "category-1" }]);
    mocked.withinTransaction.mockImplementation(async (callback) => callback({ query: vi.fn() }));
  });

  it("exige confirmação quando existem produtos relacionados", async () => {
    mocked.hasProductsInCategories.mockResolvedValue({ id: "product-1" });
    await expect(removeCategory({ storeId: "store-1", categoryId: "category-1", userId: "user-1" })).rejects.toEqual(expect.objectContaining({ message: "Marque a confirmação para excluir as subcategorias e os produtos vinculados." }));
  });

  it("remove mídias do R2 antes de apagar produtos e categoria", async () => {
    mocked.hasProductsInCategories.mockResolvedValue({ id: "product-1" });
    mocked.listCategoryProductStorageKeys.mockResolvedValue([{ storage_key: "user-1/store-1/products/product-1/images/asset.webp" }]);
    mocked.removeMany.mockResolvedValue(undefined);

    await removeCategory({ storeId: "store-1", categoryId: "category-1", userId: "user-1", deleteProducts: true });

    expect(mocked.removeMany).toHaveBeenCalledWith(["user-1/store-1/products/product-1/images/asset.webp"]);
    expect(mocked.removeMany.mock.invocationCallOrder[0]).toBeLessThan(mocked.withinTransaction.mock.invocationCallOrder[0]);
    expect(mocked.deleteProductsInCategories).toHaveBeenCalledWith(expect.any(Object), ["category-1", "subcategory-1"]);
    expect(mocked.deleteCategoryTreeInTransaction).toHaveBeenCalledWith(expect.any(Object), "category-1");
  });
});
