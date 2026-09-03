import express from "express";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  billingOne: vi.fn(), billingQuery: vi.fn(),
  storeOne: vi.fn(), storeQuery: vi.fn(), storeTransaction: vi.fn(),
  accountOne: vi.fn(), accountQuery: vi.fn(),
  getActivePlan: vi.fn(), ownedStoreForUser: vi.fn(),
}));

vi.mock("./modules/billing/repository.js", () => ({ one: mocks.billingOne, query: mocks.billingQuery }));
vi.mock("./modules/billing/service.js", () => ({
  createMercadoPagoPayment: vi.fn(), getActivePlan: mocks.getActivePlan, getMercadoPagoCollectorEmail: vi.fn(), isCollectorPayer: vi.fn(), MercadoPagoOrderError: class MercadoPagoOrderError extends Error {}, ownedPendingOrder: vi.fn(), persistPaymentForOrder: vi.fn(), syncMercadoPagoSubscription: vi.fn(), trialEndsAtFrom: vi.fn(), cancelMercadoPagoSubscription: vi.fn(),
}));
vi.mock("./modules/stores/service.js", () => ({ ensureStoreProfile: vi.fn(), getStoresForUser: vi.fn(), listStoreFontOptions: vi.fn().mockResolvedValue([]), normalizeStoreProfile: vi.fn(), storeWithProfileForUser: vi.fn(), ownedStoreForUser: mocks.ownedStoreForUser }));
vi.mock("./modules/stores/repository.js", () => ({ one: mocks.storeOne, query: mocks.storeQuery, transaction: mocks.storeTransaction }));
vi.mock("./modules/account/repository.js", () => ({ one: mocks.accountOne, query: mocks.accountQuery }));

import billingRouter from "./modules/billing/routes.js";
import storesRouter from "./modules/stores/routes.js";
import accountRouter from "./modules/account/routes.js";

function appWith(router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: "user_1", email: "owner@example.com", name: "Owner" }; next(); });
  app.use(router);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  return app;
}

async function request(app, path, { method = "GET", body } = {}) {
  const server = await new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  try {
    const address = server.address();
    const payload = body ? JSON.stringify(body) : "";
    const response = await new Promise((resolve, reject) => {
      const client = http.request({ hostname: "127.0.0.1", port: address.port, path, method, headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } }, (result) => {
        let text = "";
        result.on("data", (chunk) => { text += chunk; });
        result.on("end", () => { resolve({ status: result.statusCode, body: text ? JSON.parse(text) : null }); });
      });
      client.on("error", reject);
      if (payload) client.write(payload);
      client.end();
    });
    return response;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe("rejeição HTTP antecipada nos módulos prioritários", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset?.());
  });
  afterEach(() => vi.restoreAllMocks());

  it("rejeita checkout sem loja e plano antes de consultar cobrança", async () => {
    const response = await request(appWith(billingRouter), "/billing/start-checkout", { method: "POST", body: {} });
    expect(response.status).toBe(422);
    expect(response.body.error).toContain("loja");
    expect(mocks.getActivePlan).not.toHaveBeenCalled();
    expect(mocks.billingOne).not.toHaveBeenCalled();
  });

  it("rejeita consulta de status sem loja antes da consulta SQL", async () => {
    const response = await request(appWith(billingRouter), "/billing/status");
    expect(response.status).toBe(422);
    expect(response.body.error).toContain("loja");
    expect(mocks.billingOne).not.toHaveBeenCalled();
  });

  it("rejeita a cor inválida da nova loja antes de persistir", async () => {
    const response = await request(appWith(storesRouter), "/stores", { method: "POST", body: { name: "Loja teste", color: "rosa" } });
    expect(response.status).toBe(422);
    expect(response.body.error).toContain("cor hexadecimal");
    expect(mocks.storeOne).not.toHaveBeenCalled();
    expect(mocks.storeQuery).not.toHaveBeenCalled();
  });

  it("rejeita um slug vazio enviado explicitamente em vez de substituí-lo pelo nome", async () => {
    const response = await request(appWith(storesRouter), "/stores", { method: "POST", body: { name: "Loja teste", slug: "" } });
    expect(response.status).toBe(422);
    expect(response.body.error).toContain("slug válido");
    expect(mocks.storeOne).not.toHaveBeenCalled();
    expect(mocks.storeQuery).not.toHaveBeenCalled();
  });

  it("rejeita perfil de conta inválido antes de consultar e atualizar a conta", async () => {
    const response = await request(appWith(accountRouter), "/account", { method: "PATCH", body: { name: "A", email: "email-inválido" } });
    expect(response.status).toBe(422);
    expect(response.body.error).toContain("nome e e-mail válidos");
    expect(mocks.accountOne).not.toHaveBeenCalled();
    expect(mocks.accountQuery).not.toHaveBeenCalled();
  });
});
