import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reconcileStoresForUser: vi.fn(), getStoresForUser: vi.fn(), listCatalogMetricsForUser: vi.fn() }));
vi.mock("../billing/service.js", () => ({ reconcileStoresForUser: mocks.reconcileStoresForUser }));
vi.mock("../stores/service.js", () => ({ getStoresForUser: mocks.getStoresForUser }));
vi.mock("./repository.js", () => ({ listCatalogMetricsForUser: mocks.listCatalogMetricsForUser }));
vi.mock("../shared/presenters.js", () => ({ publicStore: (store) => ({ id: store.id, name: store.name, catalog: store.catalog }) }));

import { getDashboardForUser } from "./service.js";

describe("métricas do catálogo no dashboard", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.reconcileStoresForUser.mockResolvedValue([{ storeId: "store-a", type: "billing" }]); mocks.getStoresForUser.mockResolvedValue([{ id: "store-a", name: "Loja A" }, { id: "store-b", name: "Loja B" }]); });

  it("agrega métricas reais por loja e preserva lojas sem produto com zeros", async () => {
    mocks.listCatalogMetricsForUser.mockResolvedValue([{ store_id: "store-a", total_products: "6", active_products: "4", draft_products: "1", archived_products: "1", categories_with_products: "3", inventory_units: "12", out_of_stock_products: "1", low_stock_products: "2", new_products_last_30_days: "3" }]);

    const dashboard = await getDashboardForUser("user-a");

    expect(dashboard.alerts).toEqual([{ storeId: "store-a", type: "billing" }]);
    expect(dashboard.stores).toEqual([{ id: "store-a", name: "Loja A", catalog: { totalProducts: 6, activeProducts: 4, draftProducts: 1, archivedProducts: 1, categoriesWithProducts: 3, inventoryUnits: 12, outOfStockProducts: 1, lowStockProducts: 2, newProductsLast30Days: 3 } }, { id: "store-b", name: "Loja B", catalog: { totalProducts: 0, activeProducts: 0, draftProducts: 0, archivedProducts: 0, categoriesWithProducts: 0, inventoryUnits: 0, outOfStockProducts: 0, lowStockProducts: 0, newProductsLast30Days: 0 } }]);
    expect(mocks.listCatalogMetricsForUser).toHaveBeenCalledWith("user-a", expect.any(Number));
  });
});
