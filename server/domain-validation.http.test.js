import express from "express";
import http from "node:http";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ registerAccount: vi.fn(), createCustomer: vi.fn(), createProduct: vi.fn() }));

vi.mock("./modules/auth/service.js", () => ({ AuthDomainError: class AuthDomainError extends Error {}, loginAccount: vi.fn(), registerAccount: mocks.registerAccount, requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));
vi.mock("./modules/customers/service.js", () => ({ CustomerDomainError: class CustomerDomainError extends Error {}, addPurchase: vi.fn(), createCustomer: mocks.createCustomer, getCustomer: vi.fn(), listCustomers: vi.fn(), removeCustomer: vi.fn(), removePurchase: vi.fn(), updateCustomer: vi.fn() }));
vi.mock("./modules/products/service.js", () => ({ ProductDomainError: class ProductDomainError extends Error {}, createCategory: vi.fn(), createProduct: mocks.createProduct, getCategoryData: vi.fn(), getProduct: vi.fn(), getProductData: vi.fn(), listCategories: vi.fn(), listProducts: vi.fn(), removeCategory: vi.fn(), removeProduct: vi.fn(), removeProductMedia: vi.fn(), updateCategory: vi.fn(), updateProduct: vi.fn(), uploadProductMedia: vi.fn() }));

import authRouter from "./modules/auth/routes.js";
import customerRouter from "./modules/customers/routes.js";
import productRouter from "./modules/products/routes.js";

function appWith(router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: "user_1", email: "owner@example.com", name: "Owner" }; next(); });
  app.use(router);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  return app;
}

async function request(app, path, { method = "POST", body = {} } = {}) {
  const server = await new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  try {
    const payload = JSON.stringify(body);
    return await new Promise((resolve, reject) => {
      const client = http.request({ hostname: "127.0.0.1", port: server.address().port, path, method, headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } }, (response) => {
        let text = "";
        response.on("data", (chunk) => { text += chunk; });
        response.on("end", () => resolve({ status: response.statusCode, body: text ? JSON.parse(text) : null }));
      });
      client.on("error", reject);
      client.write(payload);
      client.end();
    });
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

describe("validação HTTP antecipada por domínio", () => {
  it("rejeita cadastro inválido antes de chamar o serviço de autenticação", async () => {
    const response = await request(appWith(authRouter), "/auth/register", { body: { name: "A", email: "invalido", password: "123" } });
    expect(response.status).toBe(422);
    expect(mocks.registerAccount).not.toHaveBeenCalled();
  });

  it("rejeita lista de telefones inválida antes de criar cliente", async () => {
    const response = await request(appWith(customerRouter), "/stores/store_1/customers", { body: { name: "Cliente válido", phones: "11999999999" } });
    expect(response.status).toBe(422);
    expect(response.body.error).toContain("lista válida de telefones");
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it("rejeita categoria de produto inválida antes de criar o catálogo", async () => {
    const response = await request(appWith(productRouter), "/stores/store_1/products", { body: { name: "Produto teste", categoryId: "categoria inválida", priceCents: 1000, draftId: "not-a-uuid", uploadIds: [] } });
    expect(response.status).toBe(422);
    expect(response.body.error).toContain("categoria válida");
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });
});
