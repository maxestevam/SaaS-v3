import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, hashToken, verifyPassword } from "../../auth.js";
import { getStoreMercadoPagoAccessToken, sendStoreTransactionalEmail } from "../integrations/service.js";
import { verifyMercadoPagoSignature } from "../billing/service.js";
import * as repository from "./repository.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;
const GUEST_CART_TTL_MS = 48 * 60 * 60 * 1000;
const CUSTOMER_CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class StorefrontError extends Error { constructor(status, message) { super(message); this.status = status; } }

export async function registerCustomer({ storeId, input }) {
  const store = await requireStore(storeId);
  const email = normalizeEmail(input.email);
  const name = requiredText(input.name, 2, 160, "Informe seu nome.");
  const password = validPassword(input.password);
  if (!email) throw new StorefrontError(422, "Informe um e-mail válido.");
  if (await repository.findCustomerByEmail(store.id, email)) throw new StorefrontError(409, "Já existe uma conta com este e-mail nesta loja.");
  const timestamp = Date.now();
  const customer = { id: randomUUID(), storeId: store.id, name, email, passwordHash: await hashPassword(password), timestamp };
  const session = await repository.transaction(async (tx) => {
    await repository.createCustomer(tx, customer);
    return createSession(tx, customer, timestamp);
  });
  return { accessToken: session.accessToken, user: publicCustomer(customer) };
}

export async function loginCustomer({ storeId, input }) {
  const store = await requireStore(storeId);
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const customer = email ? await repository.findCustomerByEmail(store.id, email) : null;
  if (!customer || customer.status !== "active" || !customer.password_hash || !(await verifyPassword(password, customer.password_hash))) throw new StorefrontError(401, "E-mail ou senha inválidos.");
  const session = await repository.transaction((tx) => createSession(tx, customer, Date.now()));
  return { accessToken: session.accessToken, user: publicCustomer(customer) };
}

export async function getCustomerSession(token) {
  if (!token) throw new StorefrontError(401, "Faça login para continuar.");
  const session = await repository.findSession(hashToken(token));
  if (!session || session.status !== "active" || session.deleted_at) throw new StorefrontError(401, "Sua sessão expirou. Entre novamente.");
  void repository.touchSession(hashToken(token), Date.now());
  return { tokenHash: hashToken(token), storeId: session.store_id, customer: publicCustomer({ id: session.customer_id, name: session.name, email: session.email }) };
}

export async function logoutCustomer(token) { if (token) await repository.deleteSession(hashToken(token)); }

export async function getProfile(session) {
  const customer = await repository.findCustomerProfile(session.storeId, session.customer.id);
  if (!customer) throw new StorefrontError(404, "Conta não encontrada.");
  return publicCustomer(customer);
}

export async function updateProfile({ session, input }) {
  const name = requiredText(input.name, 2, 160, "Informe seu nome.");
  const hasPhone = Object.prototype.hasOwnProperty.call(input, "phone");
  const phone = hasPhone ? normalizePhone(input.phone) : null;
  if (hasPhone && !phone) throw new StorefrontError(422, "Informe um telefone válido com DDD.");
  const timestamp = Date.now();
  await repository.transaction(async (tx) => { await repository.updateCustomerProfile(tx, { customerId: session.customer.id, name, timestamp }); if (hasPhone) await repository.replacePrimaryPhone(tx, { customerId: session.customer.id, phone, timestamp }); });
  return getProfile(session);
}

export async function requestPasswordReset({ storeId, email }) {
  const store = await requireStore(storeId);
  const customer = await repository.findCustomerByEmail(store.id, normalizeEmail(email));
  if (!customer || customer.status !== "active" || !customer.password_hash) return { ok: true };
  const rawToken = randomBytes(32).toString("base64url");
  const timestamp = Date.now();
  await repository.transaction(async (tx) => {
    await repository.revokePasswordResets(tx, customer.id);
    await repository.savePasswordReset(tx, { id: randomUUID(), storeId: store.id, customerId: customer.id, tokenHash: hashToken(rawToken), expiresAt: timestamp + RESET_TTL_MS, timestamp });
  });
  const resetUrl = storefrontRoute(store, "/redefinir-senha", { token: rawToken });
  await sendStoreTransactionalEmail({ storeId: store.id, eventKey: "customer_password_reset", recipient: customer.email, variables: { customerName: customer.name, resetUrl } });
  return { ok: true };
}

export async function resetPassword({ token, password }) {
  const reset = await repository.findPasswordReset(hashToken(token));
  if (!reset || reset.status !== "active" || reset.deleted_at) throw new StorefrontError(422, "O link de redefinição é inválido ou expirou.");
  const timestamp = Date.now();
  const passwordHash = await hashPassword(validPassword(password));
  await repository.transaction((tx) => repository.finishPasswordReset(tx, { resetId: reset.id, customerId: reset.customer_id, passwordHash, timestamp }));
  return { ok: true };
}

export async function changePassword({ session, input }) {
  const customer = await repository.findCustomerById(session.storeId, session.customer.id);
  if (!customer || !(await verifyPassword(String(input.currentPassword || ""), customer.password_hash))) throw new StorefrontError(422, "A senha atual está incorreta.");
  const timestamp = Date.now();
  await repository.transaction(async (tx) => {
    await repository.updateCustomerPassword(tx, { customerId: customer.id, passwordHash: await hashPassword(validPassword(input.newPassword)), timestamp });
    await repository.deleteCustomerSessions(tx, customer.id);
  });
  return { ok: true };
}

export async function listAddresses(session) { return (await repository.listAddresses(session.customer.id)).map(publicAddress); }
export async function saveAddress({ session, addressId, input, setDefault = false }) {
  const address = parseAddress(input);
  if (addressId && !(await repository.findAddress(session.customer.id, addressId))) throw new StorefrontError(404, "Endereço não encontrado.");
  const result = { ...address, id: addressId || null, newId: addressId ? null : randomUUID(), isPrimary: Boolean(setDefault || input.isPrimary) };
  await repository.transaction(async (tx) => {
    if (!addressId) {
      const count = await repository.countAddressesForCustomer(tx, session.customer.id);
      if (Number(count?.total || 0) >= 4) throw new StorefrontError(409, "Você pode cadastrar no máximo quatro endereços.");
    }
    await repository.replacePrimaryAddress(tx, session.customer.id, result);
  });
  const addresses = await listAddresses(session);
  return { addresses, address: addresses.find((item) => item.id === (addressId || result.newId)) || null };
}
export async function setDefaultAddress({ session, addressId }) { const address = await repository.findAddress(session.customer.id, addressId); if (!address) throw new StorefrontError(404, "Endereço não encontrado."); return saveAddress({ session, addressId, input: address, setDefault: true }); }
export async function removeAddress({ session, addressId }) { await repository.deleteAddress(session.customer.id, addressId); }

export async function listFavorites(session) { return (await repository.listFavorites(session.customer.id, session.storeId)).map(publicFavorite); }
export async function addFavorite({ session, productId }) { if (!(await repository.productInStore(session.storeId, productId))) throw new StorefrontError(404, "Produto não encontrado."); await repository.transaction((tx) => repository.addFavorite(tx, { id: randomUUID(), customerId: session.customer.id, productId, timestamp: Date.now() })); return listFavorites(session); }
export async function removeFavorite({ session, productId }) { await repository.removeFavorite(session.customer.id, productId); return listFavorites(session); }
export async function mergeFavorites({ session, productIds }) { const unique = [...new Set(productIds.filter((id) => typeof id === "string" && id.length === 36))]; await repository.transaction(async (tx) => { for (const productId of unique) if (await repository.productInStore(session.storeId, productId)) await repository.addFavorite(tx, { id: randomUUID(), customerId: session.customer.id, productId, timestamp: Date.now() }); }); return listFavorites(session); }
export async function syncFavorites({ session, productIds }) { const unique = [...new Set((Array.isArray(productIds) ? productIds : []).filter((id) => typeof id === "string" && id.length === 36))]; const valid = []; for (const productId of unique) if (await repository.productInStore(session.storeId, productId)) valid.push(productId); await repository.transaction((tx) => repository.replaceFavorites(tx, { customerId: session.customer.id, productIds: valid, timestamp: Date.now() })); return listFavorites(session); }
export async function clearFavorites(session) { await repository.clearFavorites(session.customer.id); }

export async function getCart({ storeId, session, browserId }) { const identity = await resolveCartIdentity({ storeId, session, browserId }); await repository.cleanupExpiredCarts(); return { items: (await repository.listCart(identity.storeId, identity.ownerKey)).map(publicCartItem) }; }
export async function syncCart({ storeId, session, browserId, items }) { const identity = await resolveCartIdentity({ storeId, session, browserId }); const normalized = await normalizeCart(identity.storeId, items); const timestamp = Date.now(); await repository.transaction((tx) => repository.replaceCart(tx, { ...identity, items: normalized, timestamp, expiresAt: timestamp + identity.ttlMs })); return getCart({ storeId: identity.storeId, session, browserId: identity.browserId }); }
export async function cleanupExpiredCarts() { const result = await repository.cleanupExpiredCarts(); return { deleted: Number(result?.affectedRows || 0) }; }

export async function deleteAccount({ session, password }) {
  const customer = await repository.findCustomerById(session.storeId, session.customer.id);
  if (!customer || !(await verifyPassword(String(password || ""), customer.password_hash))) throw new StorefrontError(422, "Confirme sua senha para excluir a conta.");
  await repository.transaction(async (tx) => { await repository.deactivateCustomer(tx, { customerId: customer.id, timestamp: Date.now() }); await repository.deleteCustomerSessions(tx, customer.id); });
}

export async function createConsumerCheckout({ session, input }) {
  const store = await requireStore(session.storeId);
  const customer = await repository.findCustomerById(session.storeId, session.customer.id);
  const addressId = String(input?.addressId || "");
  const cartIdentity = await resolveCartIdentity({ session, browserId: input?.browserId });
  if (!customer || !addressId) throw new StorefrontError(422, "Selecione um endereço de entrega antes de continuar.");
  await repository.cleanupExpiredCarts();
  const created = await repository.transaction(async (tx) => {
    const address = await repository.checkoutAddress(tx, customer.id, addressId);
    if (!address) throw new StorefrontError(404, "Endereço de entrega não encontrado.");
    const cartItems = await repository.checkoutCartItems(tx, store.id, cartIdentity.ownerKey);
    if (!cartItems.length) throw new StorefrontError(422, "Seu carrinho está vazio.");
    const items = [];
    for (const cartItem of cartItems) {
      const product = await repository.lockCheckoutProduct(tx, store.id, cartItem.product_id);
      if (!product || product.status !== "active") throw new StorefrontError(422, "Um produto do carrinho não está mais disponível.");
      const variant = cartItem.variant_key ? await repository.lockCheckoutVariant(tx, product.id, cartItem.variant_key) : null;
      if (cartItem.variant_key && !variant) throw new StorefrontError(422, `A variação de ${product.name} não está mais disponível.`);
      const stock = Number(variant?.stock_quantity ?? product.stock_quantity);
      const quantity = Number(cartItem.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > stock) throw new StorefrontError(422, `O estoque de ${variant ? `${product.name} — ${variant.name}` : product.name} mudou. Revise seu carrinho.`);
      const unitPriceCents = Number(variant?.price_cents ?? product.price_cents);
      if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) throw new StorefrontError(422, "Não foi possível confirmar o preço de um item do carrinho.");
      items.push({ productId: product.id, variantKey: variant?.id || "", sku: variant?.sku || product.sku || null, name: variant ? `${product.name} — ${variant.name}` : product.name, unitPriceCents, quantity, totalCents: unitPriceCents * quantity, imageUrl: product.image_url || "" });
    }
    const timestamp = Date.now();
    const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
    const order = { id: randomUUID(), storeId: store.id, customerId: customer.id, reference: `PED-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`, subtotalCents, shippingCents: 0, totalCents: subtotalCents, customerEmail: customer.email, customerName: customer.name, shippingAddress: publicAddress(address), timestamp };
    await repository.createConsumerOrder(tx, order);
    for (const item of items) await repository.createConsumerOrderItem(tx, { id: randomUUID(), orderId: order.id, ...item, timestamp });
    return { order, items };
  });
  try {
    const preference = await createMercadoPagoPreference({ store, customer, order: created.order, items: created.items });
    await repository.setOrderPreference(created.order.id, store.id, preference.preferenceId, Date.now());
    try { await sendStoreTransactionalEmail({ storeId: store.id, eventKey: "payment_requested", recipient: customer.email, variables: { customerName: customer.name, orderReference: created.order.reference, orderTotal: formatCurrency(created.order.totalCents), paymentUrl: preference.checkoutUrl } }); } catch { /* a falta de provedor configurado não impede a compra */ }
    return { orderId: created.order.id, orderReference: created.order.reference, checkoutUrl: preference.checkoutUrl };
  } catch (error) {
    await repository.markOrderCheckoutFailure(created.order.id, store.id, Date.now());
    if (error instanceof StorefrontError) throw error;
    throw new StorefrontError(502, "Não foi possível iniciar o pagamento Mercado Pago. Tente novamente em alguns instantes.");
  }
}

export async function listOrders(session) { const orders = await repository.listConsumerOrders(session.storeId, session.customer.id); return Promise.all(orders.map(async (order) => presentOrder(order, await repository.listConsumerOrderItems(order.id)))); }
export async function cancelOrder({ session, orderId }) { const order = await repository.findConsumerOrder(session.storeId, session.customer.id, orderId); if (!order) throw new StorefrontError(404, "Pedido não encontrado."); await repository.cancelConsumerOrder(session.storeId, session.customer.id, orderId, Date.now()); return { ok: true }; }

export async function processConsumerMercadoPagoWebhook({ signature, requestId, paymentId, storeId }) {
  const secret = String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || "");
  if (!verifyMercadoPagoSignature({ signature, requestId, resourceId: paymentId, secret })) throw new StorefrontError(401, "Assinatura de webhook inválida.");
  const store = await requireStore(storeId);
  const accessToken = await getStoreMercadoPagoAccessToken(store.id);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new StorefrontError(502, "Não foi possível consultar o pagamento informado pelo Mercado Pago.");
  const payment = await response.json();
  const orderId = String(payment.external_reference || payment.metadata?.consumer_order_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { ignored: true };
  const email = await persistConsumerPayment({ store, payment, orderId });
  if (email) try { await sendStoreTransactionalEmail(email); } catch { /* configuração de e-mail é exclusiva do lojista */ }
  return { ignored: false };
}

async function createMercadoPagoPreference({ store, customer, order, items }) {
  const accessToken = await getStoreMercadoPagoAccessToken(store.id);
  const webhookUrl = `${requiredAppUrl()}/v1/consumer/mercado-pago/webhook?store_id=${encodeURIComponent(store.id)}`;
  const backUrl = (status) => storefrontRoute(store, status === "sucesso" ? "/pedido-confirmado" : "/checkout", { order: order.id, paymentStatus: status });
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": order.id }, body: JSON.stringify({ external_reference: order.id, metadata: { consumer_order_id: order.id, store_id: store.id }, payer: { email: customer.email, name: customer.name }, items: items.map((item) => ({ id: item.sku || item.productId, title: item.name, quantity: item.quantity, unit_price: Number((item.unitPriceCents / 100).toFixed(2)), currency_id: "BRL", picture_url: item.imageUrl || undefined })), back_urls: { success: backUrl("sucesso"), failure: backUrl("falha"), pending: backUrl("pendente") }, auto_return: "approved", notification_url: webhookUrl }), signal: AbortSignal.timeout(20_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id || !(payload.init_point || payload.sandbox_init_point)) throw new StorefrontError(502, "O Mercado Pago não aceitou a solicitação de checkout desta loja.");
  return { preferenceId: String(payload.id), checkoutUrl: String(payload.init_point || payload.sandbox_init_point) };
}

async function persistConsumerPayment({ store, payment, orderId }) {
  let email = null;
  await repository.transaction(async (tx) => {
    const order = await repository.lockConsumerOrderById(tx, store.id, orderId);
    if (!order || order.payment_status === "approved") return;
    const paymentStatus = normalizePaymentStatus(payment.status);
    let status = paymentStatus === "approved" ? "paid" : order.status;
    if (paymentStatus === "approved") {
      const items = await repository.lockConsumerOrderItems(tx, order.id);
      let stockAvailable = true;
      for (const item of items) { const product = await repository.lockCheckoutProduct(tx, store.id, item.product_id); const variant = item.variant_key ? await repository.lockCheckoutVariant(tx, item.product_id, item.variant_key) : null; if (!product || (item.variant_key && !variant) || Number(variant?.stock_quantity ?? product.stock_quantity) < Number(item.quantity)) { stockAvailable = false; break; } }
      if (stockAvailable) for (const item of items) { const updated = item.variant_key ? await repository.decrementVariantStock(tx, item.variant_key, item.product_id, Number(item.quantity)) : await repository.decrementProductStock(tx, item.product_id, Number(item.quantity)); if (Number(updated.affectedRows || 0) !== 1) { stockAvailable = false; break; } }
      status = stockAvailable ? "paid" : "paid_stock_exception";
      await repository.addNotification(tx, { id: randomUUID(), storeId: store.id, customerId: order.customer_id, orderId: order.id, type: stockAvailable ? "payment_approved" : "payment_stock_exception", title: stockAvailable ? "Pagamento confirmado" : "Pagamento confirmado; estoque será revisado", body: stockAvailable ? `O pagamento do pedido ${order.reference} foi confirmado.` : `O pagamento do pedido ${order.reference} foi confirmado, mas um item precisa de revisão de estoque.`, timestamp: Date.now() });
      if (stockAvailable) email = { storeId: store.id, eventKey: "purchase_paid", recipient: order.customer_email, variables: { customerName: order.customer_name, orderReference: order.reference, orderTotal: formatCurrency(Number(order.total_cents)) } };
    }
    await repository.updateConsumerPayment(tx, { id: order.id, status, paymentStatus, providerPaymentId: String(payment.id), providerPayload: publicPaymentPayload(payment), paidAt: paymentStatus === "approved" ? Date.now() : null, timestamp: Date.now() });
  });
  return email;
}

async function createSession(tx, customer, timestamp) {
  const accessToken = randomBytes(48).toString("base64url");
  await repository.createSession(tx, { id: randomUUID(), storeId: customer.store_id || customer.storeId, customerId: customer.id, tokenHash: hashToken(accessToken), expiresAt: timestamp + SESSION_TTL_MS, timestamp });
  return { accessToken };
}
function storefrontRoute(store, pathname, params = {}) { const domain = String(store.custom_domain || "").trim().toLowerCase(); const configured = String(process.env.STOREFRONT_APP_URL || "").replace(/\/$/, ""); const temporaryHost = String(process.env.STOREFRONT_TEMP_HOST || "5173-ie4e817p10lgi0y7zw6he-b3e65758.us3.manus.computer").trim().toLowerCase(); const usesCustomDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain); const base = usesCustomDomain ? `https://${domain}` : configured; if (!base.startsWith("https://")) throw new StorefrontError(503, "A URL pública da vitrine ainda não foi configurada para esta loja."); const baseUrl = new URL(base); const route = String(pathname || "/").startsWith("/") ? pathname : `/${pathname}`; const prefix = !usesCustomDomain && baseUrl.hostname.toLowerCase() === temporaryHost ? `/@${store.slug}` : ""; const url = new URL(`${prefix}${route}`, `${baseUrl.origin}/`); for (const [key, value] of Object.entries(params)) if (value != null) url.searchParams.set(key, String(value)); return url.toString(); }
async function resolveCartIdentity({ storeId, session, browserId }) { const resolvedStoreId = session?.storeId || String(storeId || ""); const store = await requireStore(resolvedStoreId); if (session && store.id !== session.storeId) throw new StorefrontError(403, "A sessão não pertence a esta loja."); const normalizedBrowserId = normalizeBrowserId(browserId); if (!normalizedBrowserId) throw new StorefrontError(422, "O identificador deste carrinho é inválido."); const customerId = session?.customer?.id || null; return { storeId: store.id, customerId, browserId: normalizedBrowserId, ownerKey: customerId ? `customer:${customerId}:${normalizedBrowserId}` : `guest:${normalizedBrowserId}`, guestOwnerKey: customerId ? `guest:${normalizedBrowserId}` : null, ttlMs: customerId ? CUSTOMER_CART_TTL_MS : GUEST_CART_TTL_MS }; }
function requiredAppUrl() { const value = String(process.env.APP_URL || "").replace(/\/$/, ""); if (!value.startsWith("https://")) throw new StorefrontError(503, "A URL HTTPS do serviço ainda não foi configurada para receber pagamentos."); return value; }
function normalizePaymentStatus(value) { const status = String(value || "").toLowerCase(); return ["approved", "pending", "in_process", "rejected", "cancelled", "refunded", "charged_back"].includes(status) ? status : "pending"; }
function publicPaymentPayload(payment) { return { id: String(payment.id || ""), status: normalizePaymentStatus(payment.status), statusDetail: String(payment.status_detail || ""), paymentMethodId: String(payment.payment_method_id || ""), transactionAmount: Number(payment.transaction_amount || 0), externalReference: String(payment.external_reference || "") }; }
function formatCurrency(cents) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100); }
async function requireStore(storeId) { const store = storeId ? await repository.findPublicStore(storeId) : null; if (!store) throw new StorefrontError(404, "Loja não encontrada."); return store; }
async function normalizeCart(storeId, items) { if (!Array.isArray(items) || items.length > 100) throw new StorefrontError(422, "Carrinho inválido."); const result = []; for (const item of items) { const productId = String(item?.productId || item?.product?.id || ""); const quantity = Math.floor(Number(item?.quantity)); const variantKey = String(item?.variantKey || item?.variant?.id || item?.variant?.sku || "").slice(0, 80); if (!productId || quantity < 1 || quantity > 99 || !(await repository.productInStore(storeId, productId))) continue; result.push({ productId, variantKey, quantity }); } return result; }
function validPassword(value) { const password = String(value || ""); if (password.length < 8 || password.length > 200) throw new StorefrontError(422, "A senha deve ter entre 8 e 200 caracteres."); return password; }
function requiredText(value, min, max, message) { const text = String(value || "").trim(); if (text.length < min || text.length > max) throw new StorefrontError(422, message); return text; }
function normalizeEmail(value) { const email = String(value || "").trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""; }
function normalizePhone(value) { const digits = String(value || "").replace(/\D/g, ""); return digits.length >= 10 && digits.length <= 13 ? digits : ""; }
function normalizeBrowserId(value) { const id = String(value || "").trim().toLowerCase(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) ? id : ""; }
function parseAddress(input = {}) { return { label: requiredText(input.label || "Principal", 1, 60, "Informe o rótulo do endereço."), recipientName: requiredText(input.recipientName || input.recipient_name, 2, 160, "Informe quem receberá o pedido."), postalCode: String(input.postalCode || input.postal_code || "").replace(/\D/g, "").slice(0, 8), street: requiredText(input.street, 2, 180, "Informe a rua."), number: requiredText(input.number, 1, 30, "Informe o número."), complement: String(input.complement || "").slice(0, 120), district: requiredText(input.district, 2, 120, "Informe o bairro."), city: requiredText(input.city, 2, 120, "Informe a cidade."), state: requiredText(input.state, 2, 80, "Informe o estado."), country: String(input.country || "BR").slice(0, 2).toUpperCase() }; }
function publicCustomer(customer) { return { id: customer.id, name: customer.name, email: customer.email, phone: customer.primary_phone || "" }; }
function publicAddress(address) { return { id: address.id, label: address.label, recipientName: address.recipient_name, postalCode: address.postal_code, street: address.street, number: address.number, complement: address.complement || "", district: address.district, city: address.city, state: address.state, country: address.country, isPrimary: Boolean(address.is_primary) }; }
function publicFavorite(item) { return { id: item.id, name: item.name, slug: item.id, priceCents: Number(item.price_cents), compareAtPriceCents: item.compare_at_price_cents == null ? null : Number(item.compare_at_price_cents), imageUrl: item.image_url || "" }; }
function publicCartItem(item) { return { productId: item.product_id, variantKey: item.variant_key, quantity: Number(item.quantity), product: { id: item.id, name: item.name, slug: item.id, priceCents: Number(item.price_cents), compareAtPriceCents: item.compare_at_price_cents == null ? null : Number(item.compare_at_price_cents), imageUrl: item.image_url || "" } }; }
function presentOrder(order, items) { return { id: order.id, orderNumber: order.reference, status: order.status, paymentStatus: order.payment_status, totalCents: Number(order.total_cents), subtotalCents: Number(order.subtotal_cents), shippingCents: Number(order.shipping_cents), currency: order.currency, createdAt: Number(order.created_at), updatedAt: Number(order.updated_at), shippingAddress: parseJson(order.shipping_address_json, null), items: items.map((item) => ({ id: item.id, productId: item.product_id, variantKey: item.variant_key, sku: item.sku, name: item.name, unitPriceCents: Number(item.unit_price_cents), quantity: Number(item.quantity), totalCents: Number(item.total_cents), imageUrl: item.image_url || "" })) }; }
function parseJson(value, fallback) { try { return typeof value === "object" && value ? value : JSON.parse(value || "null"); } catch { return fallback; } }
