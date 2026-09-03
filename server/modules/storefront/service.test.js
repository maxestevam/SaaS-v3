import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPublicStore: vi.fn(), findCustomerByEmail: vi.fn(), findSession: vi.fn(), touchSession: vi.fn(), transaction: vi.fn(), createCustomer: vi.fn(), createSession: vi.fn(), revokePasswordResets: vi.fn(), savePasswordReset: vi.fn(), findCustomerById: vi.fn(), productInStore: vi.fn(), addFavorite: vi.fn(), listFavorites: vi.fn(), replaceFavorites: vi.fn(), listCart: vi.fn(), replaceCart: vi.fn(), cleanupExpiredCarts: vi.fn(), countAddressesForCustomer: vi.fn(), replacePrimaryAddress: vi.fn(), checkoutAddress: vi.fn(), checkoutCartItems: vi.fn(), findConsumerOrder: vi.fn(), cancelConsumerOrder: vi.fn(), listConsumerOrders: vi.fn(), listConsumerOrderItems: vi.fn(),
  hashPassword: vi.fn(), verifyPassword: vi.fn(), hashToken: vi.fn(), sendStoreTransactionalEmail: vi.fn(), verifyMercadoPagoSignature: vi.fn(),
}));

vi.mock("../../auth.js", () => ({ hashPassword: mocks.hashPassword, verifyPassword: mocks.verifyPassword, hashToken: mocks.hashToken }));
vi.mock("../integrations/service.js", () => ({ sendStoreTransactionalEmail: mocks.sendStoreTransactionalEmail, getStoreMercadoPagoAccessToken: vi.fn() }));
vi.mock("../billing/service.js", () => ({ verifyMercadoPagoSignature: mocks.verifyMercadoPagoSignature }));
vi.mock("./repository.js", () => ({
  findPublicStore: mocks.findPublicStore, findCustomerByEmail: mocks.findCustomerByEmail, findSession: mocks.findSession, touchSession: mocks.touchSession, transaction: mocks.transaction, createCustomer: mocks.createCustomer, createSession: mocks.createSession, revokePasswordResets: mocks.revokePasswordResets, savePasswordReset: mocks.savePasswordReset, findCustomerById: mocks.findCustomerById, productInStore: mocks.productInStore, addFavorite: mocks.addFavorite, listFavorites: mocks.listFavorites, replaceFavorites: mocks.replaceFavorites, listCart: mocks.listCart, replaceCart: mocks.replaceCart, cleanupExpiredCarts: mocks.cleanupExpiredCarts, countAddressesForCustomer: mocks.countAddressesForCustomer, replacePrimaryAddress: mocks.replacePrimaryAddress, checkoutAddress: mocks.checkoutAddress, checkoutCartItems: mocks.checkoutCartItems, findConsumerOrder: mocks.findConsumerOrder, cancelConsumerOrder: mocks.cancelConsumerOrder, listConsumerOrders: mocks.listConsumerOrders, listConsumerOrderItems: mocks.listConsumerOrderItems,
}));

import { StorefrontError, cancelOrder, cleanupExpiredCarts, createConsumerCheckout, listOrders, loginCustomer, mergeFavorites, processConsumerMercadoPagoWebhook, registerCustomer, requestPasswordReset, saveAddress, syncCart, syncFavorites } from "./service.js";

describe("domínio público de cliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashToken.mockImplementation((value) => `hash:${value}`);
    mocks.transaction.mockImplementation(async (callback) => callback({ query: vi.fn(), one: vi.fn() }));
    mocks.findPublicStore.mockResolvedValue({ id: "store-a", name: "Loja A", slug: "loja-a", custom_domain: null });
    mocks.createSession.mockResolvedValue();
  });

  it("não cria conta duplicada dentro da mesma loja", async () => {
    mocks.findCustomerByEmail.mockResolvedValue({ id: "customer-a" });
    await expect(registerCustomer({ storeId: "store-a", input: { name: "Cliente A", email: "cliente@exemplo.com", password: "senha-segura" } })).rejects.toMatchObject({ status: 409 });
    expect(mocks.findCustomerByEmail).toHaveBeenCalledWith("store-a", "cliente@exemplo.com");
  });

  it("autentica usando o cliente escopado pela loja e entrega sessão opaca", async () => {
    mocks.findCustomerByEmail.mockResolvedValue({ id: "customer-a", store_id: "store-a", name: "Cliente A", email: "cliente@exemplo.com", status: "active", password_hash: "hash" });
    mocks.verifyPassword.mockResolvedValue(true);
    const result = await loginCustomer({ storeId: "store-a", input: { email: "CLIENTE@EXEMPLO.COM", password: "senha-segura" } });
    expect(mocks.findCustomerByEmail).toHaveBeenCalledWith("store-a", "cliente@exemplo.com");
    expect(result.user).toEqual({ id: "customer-a", name: "Cliente A", email: "cliente@exemplo.com", phone: "" });
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it("mantém a resposta genérica de recuperação quando o e-mail não existe", async () => {
    mocks.findCustomerByEmail.mockResolvedValue(null);
    await expect(requestPasswordReset({ storeId: "store-a", email: "ausente@exemplo.com" })).resolves.toEqual({ ok: true });
    expect(mocks.sendStoreTransactionalEmail).not.toHaveBeenCalled();
  });

  it("gera o link de recuperação com base path por slug no host temporário", async () => {
    const previousUrl = process.env.STOREFRONT_APP_URL;
    const previousHost = process.env.STOREFRONT_TEMP_HOST;
    process.env.STOREFRONT_APP_URL = "https://5173-ie4e817p10lgi0y7zw6he-b3e65758.us3.manus.computer";
    process.env.STOREFRONT_TEMP_HOST = "5173-ie4e817p10lgi0y7zw6he-b3e65758.us3.manus.computer";
    mocks.findCustomerByEmail.mockResolvedValue({ id: "customer-a", name: "Cliente A", email: "cliente@exemplo.com", status: "active", password_hash: "hash" });
    await requestPasswordReset({ storeId: "store-a", email: "cliente@exemplo.com" });
    expect(mocks.sendStoreTransactionalEmail).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ resetUrl: expect.stringMatching(/^https:\/\/5173-ie4e817p10lgi0y7zw6he-b3e65758\.us3\.manus\.computer\/@loja-a\/redefinir-senha\?token=/) }) }));
    process.env.STOREFRONT_APP_URL = previousUrl;
    process.env.STOREFRONT_TEMP_HOST = previousHost;
  });

  it("rejeita webhook de consumidor sem assinatura Mercado Pago válida", async () => {
    mocks.verifyMercadoPagoSignature.mockReturnValue(false);
    await expect(processConsumerMercadoPagoWebhook({ signature: "inválida", requestId: "req", paymentId: "123", storeId: "store-a" })).rejects.toBeInstanceOf(StorefrontError);
    await expect(processConsumerMercadoPagoWebhook({ signature: "inválida", requestId: "req", paymentId: "123", storeId: "store-a" })).rejects.toMatchObject({ status: 401 });
  });

  it("sincroniza favoritos somente quando o produto pertence à loja da sessão", async () => {
    const productA = "11111111-1111-1111-1111-111111111111";
    const productB = "22222222-2222-2222-2222-222222222222";
    mocks.productInStore.mockImplementation(async (_storeId, productId) => productId === productA);
    mocks.listFavorites.mockResolvedValue([]);
    await mergeFavorites({ session: { storeId: "store-a", customer: { id: "customer-a" } }, productIds: [productA, productB] });
    expect(mocks.addFavorite).toHaveBeenCalledTimes(1);
    expect(mocks.addFavorite).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "customer-a", productId: productA }));
  });

  it("persiste o estado final de favoritos em uma única operação por fila", async () => {
    const productA = "11111111-1111-1111-1111-111111111111";
    mocks.productInStore.mockResolvedValue(true);
    mocks.listFavorites.mockResolvedValue([]);
    await syncFavorites({ session: { storeId: "store-a", customer: { id: "customer-a" } }, productIds: [productA, productA] });
    expect(mocks.replaceFavorites).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "customer-a", productIds: [productA] }));
  });

  it("descarta itens de outra loja durante a sincronização do carrinho", async () => {
    const now = Date.now();
    const productA = "11111111-1111-1111-1111-111111111111";
    const productB = "22222222-2222-2222-2222-222222222222";
    const browserId = "33333333-3333-4333-8333-333333333333";
    mocks.productInStore.mockImplementation(async (_storeId, productId) => productId === productA);
    mocks.listCart.mockResolvedValue([]);
    await syncCart({ session: { storeId: "store-a", customer: { id: "customer-a" } }, browserId, items: [{ productId: productA, quantity: 2 }, { productId: productB, quantity: 4 }] });
    const payload = mocks.replaceCart.mock.calls.at(-1)[1];
    expect(payload).toMatchObject({ customerId: "customer-a", browserId, ownerKey: `customer:customer-a:${browserId}`, storeId: "store-a", items: [{ productId: productA, variantKey: "", quantity: 2 }] });
    expect(payload.expiresAt).toBeGreaterThanOrEqual(now + 604_799_000);
    expect(payload.expiresAt).toBeLessThanOrEqual(now + 604_801_000);
  });

  it("retém carrinho convidado por 48 horas sob o UUID deste navegador", async () => {
    const now = Date.now();
    const browserId = "33333333-3333-4333-8333-333333333333";
    const productId = "11111111-1111-1111-1111-111111111111";
    mocks.productInStore.mockResolvedValue(true);
    mocks.listCart.mockResolvedValue([]);
    await syncCart({ storeId: "store-a", browserId, items: [{ productId, quantity: 1 }] });
    const payload = mocks.replaceCart.mock.calls.at(-1)[1];
    expect(payload).toMatchObject({ customerId: null, browserId, ownerKey: `guest:${browserId}` });
    expect(payload.expiresAt).toBeGreaterThanOrEqual(now + 172_799_000);
    expect(payload.expiresAt).toBeLessThanOrEqual(now + 172_801_000);
  });

  it("expõe limpeza idempotente de carrinhos expirados", async () => {
    mocks.cleanupExpiredCarts.mockResolvedValue({ affectedRows: 3 });
    await expect(cleanupExpiredCarts()).resolves.toEqual({ deleted: 3 });
  });

  it("bloqueia o quinto endereço do cliente no servidor", async () => {
    mocks.countAddressesForCustomer.mockResolvedValue({ total: 4 });
    await expect(saveAddress({ session: { storeId: "store-a", customer: { id: "customer-a" } }, input: { label: "Casa", recipientName: "Cliente A", postalCode: "01001000", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP" } })).rejects.toMatchObject({ status: 409 });
    expect(mocks.replacePrimaryAddress).not.toHaveBeenCalled();
  });

  it("impede checkout com endereço que não pertence ao cliente autenticado", async () => {
    mocks.findCustomerById.mockResolvedValue({ id: "customer-a", email: "cliente@exemplo.com", name: "Cliente A" });
    mocks.checkoutAddress.mockResolvedValue(null);
    await expect(createConsumerCheckout({ session: { storeId: "store-a", customer: { id: "customer-a" } }, input: { addressId: "address-b", browserId: "33333333-3333-4333-8333-333333333333" } })).rejects.toMatchObject({ status: 404 });
    expect(mocks.checkoutCartItems).not.toHaveBeenCalled();
  });

  it("não permite cancelar pedido que não pertence ao cliente da sessão", async () => {
    mocks.findConsumerOrder.mockResolvedValue(null);
    await expect(cancelOrder({ session: { storeId: "store-a", customer: { id: "customer-a" } }, orderId: "order-b" })).rejects.toMatchObject({ status: 404 });
    expect(mocks.cancelConsumerOrder).not.toHaveBeenCalled();
  });

  it("consulta histórico de pedidos usando simultaneamente loja e cliente da sessão", async () => {
    mocks.listConsumerOrders.mockResolvedValue([]);
    await expect(listOrders({ storeId: "store-a", customer: { id: "customer-a" } })).resolves.toEqual([]);
    expect(mocks.listConsumerOrders).toHaveBeenCalledWith("store-a", "customer-a");
  });
});
