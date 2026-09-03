import { query } from "../../db.js";

export async function listCatalogMetricsForUser(userId, createdAfter) {
  return query(`SELECT stores.id AS store_id,
    COUNT(products.id) AS total_products,
    SUM(CASE WHEN products.status = 'active' THEN 1 ELSE 0 END) AS active_products,
    SUM(CASE WHEN products.status = 'draft' THEN 1 ELSE 0 END) AS draft_products,
    SUM(CASE WHEN products.status = 'archived' THEN 1 ELSE 0 END) AS archived_products,
    COUNT(DISTINCT products.category_id) AS categories_with_products,
    COALESCE(SUM(CASE WHEN products.status = 'active' THEN products.stock_quantity ELSE 0 END), 0) AS inventory_units,
    SUM(CASE WHEN products.status = 'active' AND products.stock_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock_products,
    SUM(CASE WHEN products.status = 'active' AND products.stock_quantity BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS low_stock_products,
    SUM(CASE WHEN products.created_at >= ? THEN 1 ELSE 0 END) AS new_products_last_30_days
    FROM ld_stores AS stores
    LEFT JOIN ld_products AS products ON products.store_id = stores.id
    WHERE stores.user_id = ?
    GROUP BY stores.id`, [createdAfter, userId]);
}
