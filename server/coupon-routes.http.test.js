import express from "express";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ one: vi.fn(), query: vi.fn() }));
vi.mock("./db.js", () => ({ one: mocks.one, query: mocks.query }));
vi.mock("./modules/store-contract/r2-sync.js", () => ({ syncStoreContractToR2: vi.fn().mockResolvedValue({ key: "loja-teste.json" }) }));
import couponRouter from "./modules/coupons/routes.js";

function app() { const server = express(); server.use(express.json()); server.use((req, _res, next) => { req.user = { id: "user-1" }; next(); }); server.use(couponRouter); server.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message })); return server; }
async function request(path, { method = "GET", body } = {}) { const server = app(); const instance = await new Promise((resolve) => { const listener = server.listen(0, () => resolve(listener)); }); try { const payload = body ? JSON.stringify(body) : ""; return await new Promise((resolve, reject) => { const client = http.request({ hostname: "127.0.0.1", port: instance.address().port, path, method, headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } }, (response) => { let text = ""; response.on("data", (chunk) => { text += chunk; }); response.on("end", () => { let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; } resolve({ status: response.statusCode, body: data }); }); }); client.on("error", reject); if (payload) client.write(payload); client.end(); }); } finally { await new Promise((resolve) => instance.close(resolve)); } }
const row = { id: "coupon-1", store_id: "store-1", code: "BEMVINDO10", discount_type: "percentage", percentage_off: "10.00", amount_off_cents: null, minimum_order_cents: 5000, expires_at: null, usage_limit: 10, usage_count: 2, free_shipping_states: "[]", active: 1, created_at: 1, updated_at: 1 };

describe("CRUD HTTP de cupons por loja", () => {
  beforeEach(() => { mocks.one.mockReset(); mocks.query.mockReset(); });
  afterEach(() => vi.restoreAllMocks());

  it("bloqueia a listagem de uma loja que não pertence ao usuário", async () => {
    mocks.one.mockResolvedValue(null);
    const result = await request("/stores/store-alheia/coupons");
    expect(result.status).toBe(404);
    expect(result.body.error).toBe("Loja não encontrada.");
  });

  it("lista cupons com filtro e resumo no escopo da loja", async () => {
    mocks.one.mockResolvedValueOnce({ id: "store-1" }).mockResolvedValueOnce({ total: 1 }).mockResolvedValueOnce({ total: 1, active: 1, free_shipping: 0, uses: 2 });
    mocks.query.mockResolvedValue([row]);
    const result = await request("/stores/store-1/coupons?q=bem&status=active&page=1&limit=20");
    expect(result.status).toBe(200);
    expect(result.body.data[0]).toMatchObject({ code: "BEMVINDO10", percentageOff: 10, minimumOrderCents: 5000 });
    expect(result.body.summary).toMatchObject({ total: 1, active: 1, uses: 2 });
    expect(mocks.query.mock.calls[0][0]).toContain("code LIKE ?");
  });

  it("cria, edita e exclui um cupom pertencente à loja ativa", async () => {
    mocks.one.mockResolvedValueOnce({ id: "store-1" }); mocks.query.mockResolvedValueOnce({ affectedRows: 1 });
    const created = await request("/stores/store-1/coupons", { method: "POST", body: { code: "frete sp", discountType: "free_shipping", minimumOrderCents: 0, freeShippingStates: ["SP", "RJ"] } });
    expect(created.status).toBe(201); expect(created.body.coupon).toMatchObject({ code: "FRETE-SP", freeShippingStates: ["SP", "RJ"] });
    mocks.one.mockResolvedValueOnce({ id: "store-1" }).mockResolvedValueOnce({ ...row, id: "coupon-1" }); mocks.query.mockResolvedValueOnce({ affectedRows: 1 });
    const updated = await request("/stores/store-1/coupons/coupon-1", { method: "PATCH", body: { code: "fixo", discountType: "fixed", amountOffCents: 1500, minimumOrderCents: 3000 } });
    expect(updated.status).toBe(200); expect(updated.body.coupon).toMatchObject({ code: "FIXO", discountType: "fixed", amountOffCents: 1500 });
    mocks.one.mockResolvedValueOnce({ id: "store-1" }); mocks.query.mockResolvedValueOnce({ affectedRows: 1 });
    const deleted = await request("/stores/store-1/coupons/coupon-1", { method: "DELETE" });
    expect(deleted.status).toBe(200); expect(deleted.body).toEqual({ ok: true });
  });

  it("retorna conflito quando o código já existe na mesma loja", async () => {
    mocks.one.mockResolvedValueOnce({ id: "store-1" }); const duplicate = new Error("duplicate"); duplicate.code = "ER_DUP_ENTRY"; mocks.query.mockRejectedValue(duplicate);
    const result = await request("/stores/store-1/coupons", { method: "POST", body: { code: "REPETIDO", discountType: "percentage", percentageOff: 10 } });
    expect(result.status).toBe(409); expect(result.body.error).toContain("Já existe");
  });

  it("recusa a aplicação de cupom exclusivo de novo usuário para cliente com compra anterior", async () => {
    mocks.one.mockResolvedValueOnce({ id: "store-1" }).mockResolvedValueOnce({ ...row, new_users_only: 1 }).mockResolvedValueOnce({ id: "purchase-1" });
    const result = await request("/stores/store-1/coupons/coupon-1/validate", { method: "POST", body: { customerId: "customer-1" } });
    expect(result.status).toBe(422);
    expect(result.body.error).toContain("novos usuários");
  });

  it("permite a aplicação de cupom exclusivo de novo usuário sem compras anteriores", async () => {
    mocks.one.mockResolvedValueOnce({ id: "store-1" }).mockResolvedValueOnce({ ...row, new_users_only: 1 }).mockResolvedValueOnce(null);
    const result = await request("/stores/store-1/coupons/coupon-1/validate", { method: "POST", body: { customerId: "customer-new" } });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ eligible: true, coupon: { newUsersOnly: true } });
  });
});
