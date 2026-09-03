import { one, query, transaction } from "../../db.js";

export { one, query, transaction };

export function findPublicStore(storeId) {
  return one("SELECT id, name, slug, custom_domain FROM ld_stores WHERE id = ?", [storeId]);
}

export function findCustomerByEmail(storeId, email) {
  return one("SELECT * FROM ld_customers WHERE store_id = ? AND email = ? AND deleted_at IS NULL LIMIT 1", [storeId, email]);
}

export function findCustomerById(storeId, customerId) {
  return one("SELECT * FROM ld_customers WHERE store_id = ? AND id = ? AND deleted_at IS NULL LIMIT 1", [storeId, customerId]);
}

export function findCustomerProfile(storeId, customerId) {
  return one("SELECT customers.*, (SELECT phones.phone FROM ld_customer_phones AS phones WHERE phones.customer_id = customers.id ORDER BY phones.is_primary DESC, phones.created_at ASC LIMIT 1) AS primary_phone FROM ld_customers AS customers WHERE customers.store_id = ? AND customers.id = ? AND customers.deleted_at IS NULL LIMIT 1", [storeId, customerId]);
}

export function findSession(tokenHash) {
  return one("SELECT sessions.*, customers.name, customers.email, customers.status, customers.deleted_at FROM ld_customer_sessions AS sessions JOIN ld_customers AS customers ON customers.id = sessions.customer_id WHERE sessions.token_hash = ? AND sessions.expires_at > ? LIMIT 1", [tokenHash, Date.now()]);
}

export function createCustomer(tx, customer) {
  return tx.query("INSERT INTO ld_customers (id, store_id, name, email, password_hash, document, notes, status, created_at, updated_at, account_updated_at) VALUES (?, ?, ?, ?, ?, NULL, '', 'active', ?, ?, ?)", [customer.id, customer.storeId, customer.name, customer.email, customer.passwordHash, customer.timestamp, customer.timestamp, customer.timestamp]);
}

export function createSession(tx, session) {
  return tx.query("INSERT INTO ld_customer_sessions (id, store_id, customer_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [session.id, session.storeId, session.customerId, session.tokenHash, session.expiresAt, session.timestamp, session.timestamp]);
}

export function deleteSession(tokenHash) {
  return query("DELETE FROM ld_customer_sessions WHERE token_hash = ?", [tokenHash]);
}

export function deleteCustomerSessions(tx, customerId) {
  return tx.query("DELETE FROM ld_customer_sessions WHERE customer_id = ?", [customerId]);
}

export function touchSession(tokenHash, timestamp) {
  return query("UPDATE ld_customer_sessions SET last_seen_at = ? WHERE token_hash = ?", [timestamp, tokenHash]);
}

export function savePasswordReset(tx, reset) {
  return tx.query("INSERT INTO ld_customer_password_resets (id, store_id, customer_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)", [reset.id, reset.storeId, reset.customerId, reset.tokenHash, reset.expiresAt, reset.timestamp]);
}

export function revokePasswordResets(tx, customerId) {
  return tx.query("UPDATE ld_customer_password_resets SET used_at = ? WHERE customer_id = ? AND used_at IS NULL", [Date.now(), customerId]);
}

export function findPasswordReset(tokenHash) {
  return one("SELECT resets.*, customers.name, customers.email, customers.status, customers.deleted_at FROM ld_customer_password_resets AS resets JOIN ld_customers AS customers ON customers.id = resets.customer_id WHERE resets.token_hash = ? AND resets.used_at IS NULL AND resets.expires_at > ? LIMIT 1", [tokenHash, Date.now()]);
}

export function finishPasswordReset(tx, { resetId, customerId, passwordHash, timestamp }) {
  return Promise.all([
    tx.query("UPDATE ld_customer_password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL", [timestamp, resetId]),
    tx.query("UPDATE ld_customers SET password_hash = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [passwordHash, timestamp, timestamp, customerId]),
    tx.query("DELETE FROM ld_customer_sessions WHERE customer_id = ?", [customerId]),
  ]);
}

export function updateCustomerProfile(tx, { customerId, name, timestamp }) {
  return tx.query("UPDATE ld_customers SET name = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [name, timestamp, timestamp, customerId]);
}

export async function replacePrimaryPhone(tx, { customerId, phone, timestamp }) {
  await tx.query("DELETE FROM ld_customer_phones WHERE customer_id = ?", [customerId]);
  if (phone) await tx.query("INSERT INTO ld_customer_phones (id, customer_id, label, phone, is_primary, created_at, updated_at) VALUES (?, ?, 'Principal', ?, 1, ?, ?)", [crypto.randomUUID(), customerId, phone, timestamp, timestamp]);
}

export function updateCustomerPassword(tx, { customerId, passwordHash, timestamp }) {
  return tx.query("UPDATE ld_customers SET password_hash = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [passwordHash, timestamp, timestamp, customerId]);
}

export function listAddresses(customerId) {
  return query("SELECT id, label, recipient_name, postal_code, street, number, complement, district, city, state, country, is_primary FROM ld_customer_addresses WHERE customer_id = ? ORDER BY is_primary DESC, created_at ASC", [customerId]);
}

export function findAddress(customerId, addressId) {
  return one("SELECT * FROM ld_customer_addresses WHERE customer_id = ? AND id = ?", [customerId, addressId]);
}

export function countAddressesForCustomer(tx, customerId) {
  return tx.one("SELECT COUNT(*) AS total FROM ld_customer_addresses WHERE customer_id = ? FOR UPDATE", [customerId]);
}

export async function replacePrimaryAddress(tx, customerId, address) {
  const timestamp = Date.now();
  const currentPrimary = await tx.one("SELECT id FROM ld_customer_addresses WHERE customer_id = ? AND is_primary = 1 LIMIT 1", [customerId]);
  const shouldBePrimary = Boolean(address.isPrimary || !currentPrimary);
  if (shouldBePrimary) await tx.query("UPDATE ld_customer_addresses SET is_primary = 0, updated_at = ? WHERE customer_id = ?", [timestamp, customerId]);
  if (address.id) return tx.query("UPDATE ld_customer_addresses SET label = ?, recipient_name = ?, postal_code = ?, street = ?, number = ?, complement = ?, district = ?, city = ?, state = ?, country = ?, is_primary = ?, updated_at = ? WHERE customer_id = ? AND id = ?", [address.label, address.recipientName, address.postalCode, address.street, address.number, address.complement, address.district, address.city, address.state, address.country, shouldBePrimary ? 1 : 0, timestamp, customerId, address.id]);
  return tx.query("INSERT INTO ld_customer_addresses (id, customer_id, label, recipient_name, postal_code, street, number, complement, observation, district, city, state, country, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)", [address.newId, customerId, address.label, address.recipientName, address.postalCode, address.street, address.number, address.complement, address.district, address.city, address.state, address.country, shouldBePrimary ? 1 : 0, timestamp, timestamp]);
}

export function deleteAddress(customerId, addressId) {
  return query("DELETE FROM ld_customer_addresses WHERE customer_id = ? AND id = ?", [customerId, addressId]);
}

export function listFavorites(customerId, storeId) {
  return query("SELECT products.id, products.name, products.price_cents, products.compare_at_price_cents, products.status, (SELECT media.url FROM ld_product_media AS media WHERE media.product_id = products.id AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC LIMIT 1) AS image_url FROM ld_customer_favorites AS favorites JOIN ld_products AS products ON products.id = favorites.product_id WHERE favorites.customer_id = ? AND products.store_id = ? AND products.status = 'active' ORDER BY favorites.created_at DESC", [customerId, storeId]);
}

export function productInStore(storeId, productId) {
  return one("SELECT id FROM ld_products WHERE id = ? AND store_id = ? AND status = 'active'", [productId, storeId]);
}

export function addFavorite(tx, favorite) {
  return tx.query("INSERT IGNORE INTO ld_customer_favorites (id, customer_id, product_id, created_at) VALUES (?, ?, ?, ?)", [favorite.id, favorite.customerId, favorite.productId, favorite.timestamp]);
}

export function removeFavorite(customerId, productId) {
  return query("DELETE FROM ld_customer_favorites WHERE customer_id = ? AND product_id = ?", [customerId, productId]);
}

export function clearFavorites(customerId) {
  return query("DELETE FROM ld_customer_favorites WHERE customer_id = ?", [customerId]);
}

export async function replaceFavorites(tx, { customerId, productIds, timestamp }) {
  await tx.query("DELETE FROM ld_customer_favorites WHERE customer_id = ?", [customerId]);
  for (const productId of productIds) await tx.query("INSERT INTO ld_customer_favorites (id, customer_id, product_id, created_at) VALUES (?, ?, ?, ?)", [crypto.randomUUID(), customerId, productId, timestamp]);
}

export function listCart(storeId, ownerKey) {
  return query("SELECT cart.product_id, cart.variant_key, cart.quantity, products.id, products.name, products.price_cents, products.compare_at_price_cents, products.status, (SELECT media.url FROM ld_product_media AS media WHERE media.product_id = products.id AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC LIMIT 1) AS image_url FROM ld_customer_cart_items AS cart JOIN ld_products AS products ON products.id = cart.product_id WHERE cart.store_id = ? AND cart.owner_key = ? AND cart.expires_at > ? AND products.status = 'active' ORDER BY cart.updated_at DESC", [storeId, ownerKey, Date.now()]);
}

export function replaceCart(tx, { customerId, browserId, storeId, ownerKey, guestOwnerKey, items, timestamp, expiresAt }) {
  return (async () => {
    await tx.query("DELETE FROM ld_customer_cart_items WHERE store_id = ? AND owner_key = ?", [storeId, ownerKey]);
    if (guestOwnerKey && guestOwnerKey !== ownerKey) await tx.query("DELETE FROM ld_customer_cart_items WHERE store_id = ? AND owner_key = ?", [storeId, guestOwnerKey]);
    for (const item of items) await tx.query("INSERT INTO ld_customer_cart_items (id, store_id, customer_id, browser_uuid, owner_key, product_id, variant_key, quantity, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), storeId, customerId || null, browserId, ownerKey, item.productId, item.variantKey, item.quantity, timestamp, timestamp, expiresAt]);
  })();
}

export function cleanupExpiredCarts(timestamp = Date.now()) {
  return query("DELETE FROM ld_customer_cart_items WHERE expires_at <= ?", [timestamp]);
}

export function deactivateCustomer(tx, { customerId, timestamp }) {
  return tx.query("UPDATE ld_customers SET status = 'inactive', deleted_at = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [timestamp, timestamp, timestamp, customerId]);
}

export function checkoutAddress(tx, customerId, addressId) {
  return tx.one("SELECT * FROM ld_customer_addresses WHERE customer_id = ? AND id = ?", [customerId, addressId]);
}

export function checkoutCartItems(tx, storeId, ownerKey) {
  return tx.query("SELECT product_id, variant_key, quantity FROM ld_customer_cart_items WHERE store_id = ? AND owner_key = ? AND expires_at > ? ORDER BY updated_at ASC FOR UPDATE", [storeId, ownerKey, Date.now()]);
}

export function lockCheckoutProduct(tx, storeId, productId) {
  return tx.one("SELECT id, store_id, name, sku, price_cents, stock_quantity, status, (SELECT media.url FROM ld_product_media AS media WHERE media.product_id = ld_products.id AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC LIMIT 1) AS image_url FROM ld_products WHERE id = ? AND store_id = ? FOR UPDATE", [productId, storeId]);
}

export function lockCheckoutVariant(tx, productId, variantKey) {
  return tx.one("SELECT id, product_id, name, sku, price_cents, stock_quantity FROM ld_product_variants WHERE product_id = ? AND (id = ? OR sku = ?) LIMIT 1 FOR UPDATE", [productId, variantKey, variantKey]);
}

export function createConsumerOrder(tx, order) {
  return tx.query("INSERT INTO ld_consumer_orders (id, store_id, customer_id, reference, status, payment_status, payment_provider, currency, subtotal_cents, discount_cents, shipping_cents, total_cents, customer_email, customer_name, shipping_address_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending_payment', 'pending', 'mercado_pago', 'BRL', ?, 0, ?, ?, ?, ?, ?, ?, ?)", [order.id, order.storeId, order.customerId, order.reference, order.subtotalCents, order.shippingCents, order.totalCents, order.customerEmail, order.customerName, JSON.stringify(order.shippingAddress), order.timestamp, order.timestamp]);
}

export function createConsumerOrderItem(tx, item) {
  return tx.query("INSERT INTO ld_consumer_order_items (id, order_id, product_id, variant_key, sku, name, unit_price_cents, quantity, total_cents, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [item.id, item.orderId, item.productId, item.variantKey, item.sku, item.name, item.unitPriceCents, item.quantity, item.totalCents, item.imageUrl, item.timestamp]);
}

export function setOrderPreference(orderId, storeId, preferenceId, timestamp) {
  return query("UPDATE ld_consumer_orders SET provider_preference_id = ?, updated_at = ? WHERE id = ? AND store_id = ?", [preferenceId, timestamp, orderId, storeId]);
}

export function markOrderCheckoutFailure(orderId, storeId, timestamp) {
  return query("UPDATE ld_consumer_orders SET payment_status = 'failed', updated_at = ? WHERE id = ? AND store_id = ? AND payment_status = 'pending'", [timestamp, orderId, storeId]);
}

export function findConsumerOrder(storeId, customerId, orderId) {
  return one("SELECT * FROM ld_consumer_orders WHERE id = ? AND store_id = ? AND customer_id = ?", [orderId, storeId, customerId]);
}

export function listConsumerOrders(storeId, customerId) {
  return query("SELECT * FROM ld_consumer_orders WHERE store_id = ? AND customer_id = ? ORDER BY created_at DESC", [storeId, customerId]);
}

export function listConsumerOrderItems(orderId) {
  return query("SELECT * FROM ld_consumer_order_items WHERE order_id = ? ORDER BY created_at ASC", [orderId]);
}

export function cancelConsumerOrder(storeId, customerId, orderId, timestamp) {
  return query("UPDATE ld_consumer_orders SET status = 'cancelled', payment_status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND store_id = ? AND customer_id = ? AND payment_status IN ('pending', 'rejected', 'failed')", [timestamp, timestamp, orderId, storeId, customerId]);
}

export function lockConsumerOrderById(tx, storeId, orderId) {
  return tx.one("SELECT * FROM ld_consumer_orders WHERE id = ? AND store_id = ? FOR UPDATE", [orderId, storeId]);
}

export function lockConsumerOrderItems(tx, orderId) {
  return tx.query("SELECT * FROM ld_consumer_order_items WHERE order_id = ? FOR UPDATE", [orderId]);
}

export function updateConsumerPayment(tx, order) {
  return tx.query("UPDATE ld_consumer_orders SET status = ?, payment_status = ?, provider_payment_id = ?, provider_payload_json = ?, paid_at = ?, updated_at = ? WHERE id = ?", [order.status, order.paymentStatus, order.providerPaymentId, JSON.stringify(order.providerPayload), order.paidAt, order.timestamp, order.id]);
}

export function decrementProductStock(tx, productId, quantity) {
  return tx.query("UPDATE ld_products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ? AND stock_quantity >= ?", [quantity, Date.now(), productId, quantity]);
}

export function decrementVariantStock(tx, variantKey, productId, quantity) {
  return tx.query("UPDATE ld_product_variants SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ? AND product_id = ? AND stock_quantity >= ?", [quantity, Date.now(), variantKey, productId, quantity]);
}

export function addNotification(tx, notice) {
  return tx.query("INSERT INTO ld_customer_notifications (id, store_id, customer_id, order_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [notice.id, notice.storeId, notice.customerId, notice.orderId, notice.type, notice.title, notice.body, notice.timestamp]);
}
