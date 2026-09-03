import http from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCustomerSession: vi.fn(), getProfile: vi.fn(), logoutCustomer: vi.fn(), requestPasswordReset: vi.fn(), resetPassword: vi.fn(), loginCustomer: vi.fn(), registerCustomer: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(), deleteAccount: vi.fn(), listAddresses: vi.fn(), saveAddress: vi.fn(), setDefaultAddress: vi.fn(), removeAddress: vi.fn(), listFavorites: vi.fn(), addFavorite: vi.fn(), mergeFavorites: vi.fn(), removeFavorite: vi.fn(), clearFavorites: vi.fn(), getCart: vi.fn(), syncCart: vi.fn(), listOrders: vi.fn(), createConsumerCheckout: vi.fn(), cancelOrder: vi.fn(), processConsumerMercadoPagoWebhook: vi.fn() }));

vi.mock("./service.js", () => {
  class StorefrontError extends Error { constructor(status, message) { super(message); this.status = status; } }
  return { StorefrontError, ...mocks };
});

import storefrontRouter from "./controller.js";

function appWith(router) { const app = express(); app.use(express.json()); app.use(router); app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message })); return app; }
async function request(app, path, headers = {}, method = "GET") { const server = await new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)); }); try { return await new Promise((resolve, reject) => { const client = http.request({ hostname: "127.0.0.1", port: server.address().port, path, headers, method }, (response) => { let text = ""; response.on("data", (chunk) => { text += chunk; }); response.on("end", () => resolve({ status: response.statusCode, body: text ? JSON.parse(text) : null })); }); client.on("error", reject); client.end(); }); } finally { await new Promise((resolve) => server.close(resolve)); } }

describe("roteador público de consumidor", () => {
  afterEach(() => vi.clearAllMocks());

  it("bloqueia o uso de uma sessão da Loja A na Loja B", async () => {
    mocks.getCustomerSession.mockResolvedValue({ storeId: "store-a", customer: { id: "customer-a" } });
    const response = await request(appWith(storefrontRouter), "/customer/profile", { authorization: "Bearer token-opaco", "x-store-id": "store-b" });
    expect(response).toEqual({ status: 403, body: { error: "A sessão não pertence a esta loja." } });
    expect(mocks.getProfile).not.toHaveBeenCalled();
  });

  it("confirma eventos sem identificador de pagamento sem consultar provedor", async () => {
    const response = await request(appWith(storefrontRouter), "/consumer/mercado-pago/webhook?store_id=store-a", {}, "POST");
    expect(response).toEqual({ status: 200, body: { ignored: true } });
    expect(mocks.processConsumerMercadoPagoWebhook).not.toHaveBeenCalled();
  });
});
