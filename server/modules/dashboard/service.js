import { getStoresForUser } from "../stores/service.js";
import { publicStore } from "../shared/presenters.js";
import { reconcileStoresForUser } from "../billing/service.js";
import { listCatalogMetricsForUser } from "./repository.js";

export async function getDashboardForUser(userId) {
  const [alerts, stores, metricRows] = await Promise.all([reconcileStoresForUser(userId), getStoresForUser(userId), listCatalogMetricsForUser(userId, Date.now() - 30 * 24 * 60 * 60 * 1000)]);
  const metricsByStore = new Map(metricRows.map((row) => [row.store_id, catalogMetrics(row)]));
  return { stores: stores.map((store) => publicStore({ ...store, catalog: metricsByStore.get(store.id) || catalogMetrics() })), alerts };
}

function catalogMetrics(row = {}) { return { totalProducts: Number(row.total_products || 0), activeProducts: Number(row.active_products || 0), draftProducts: Number(row.draft_products || 0), archivedProducts: Number(row.archived_products || 0), categoriesWithProducts: Number(row.categories_with_products || 0), inventoryUnits: Number(row.inventory_units || 0), outOfStockProducts: Number(row.out_of_stock_products || 0), lowStockProducts: Number(row.low_stock_products || 0), newProductsLast30Days: Number(row.new_products_last_30_days || 0) }; }
