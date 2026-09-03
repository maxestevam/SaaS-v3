import express from "express";
import { createServer } from "node:http";
import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminRouter } from "./admin-router.js";

const encoder = new TextEncoder();
const nativeFetch = globalThis.fetch;
let server;

async function adminToken() {
  return new SignJWT({ name: "Admin", email: "admin@exemplo.com", role: "super_admin" }).setProtectedHeader({ alg: "HS256" }).setSubject("admin-1").setIssuedAt().setExpirationTime("1h").sign(encoder.encode(String(process.env.JWT_SECRET)));
}

async function request({ query = vi.fn(async () => ({ affectedRows: 1 })), one = vi.fn(async () => null), path, options = {} }) {
  const app = express(); app.use(express.json()); app.use("/api/admin", createAdminRouter({ query, one })); server = createServer(app); await new Promise((resolve) => server.listen(0, resolve));
  const response = await nativeFetch(`http://127.0.0.1:${server.address().port}${path}`, options); return { response, query, one };
}

afterEach(async () => { if (server) await new Promise((resolve) => server.close(resolve)); server = undefined; vi.unstubAllGlobals(); });

describe("gestão administrativa", () => {
  it("cria um plano com os campos comerciais validados", async () => {
    const token = await adminToken(); const one = vi.fn().mockResolvedValue({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null });
    const { response, query } = await request({ one, path: "/api/admin/plans", options: { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ name: "Pro", description: "Plano profissional", amountCents: 4990, features: ["Catálogo"], active: true, featured: true }) } });
    expect(response.status).toBe(201); await expect(response.json()).resolves.toMatchObject({ plan: { name: "Pro", amount_cents: 4990, active: true } }); expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO ld_plans"), expect.any(Array));
  });

  it("persiste quotas normalizadas junto com o plano", async () => {
    const token = await adminToken(); const one = vi.fn().mockResolvedValue({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null });
    const { response, query } = await request({ one, path: "/api/admin/plans", options: { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ name: "Escala", description: "Plano com quota", amountCents: 9990, features: [], limits: { products: 0, customers: 50, unlimitedCap: 200 } }) } });
    expect(response.status).toBe(201); await expect(response.json()).resolves.toMatchObject({ plan: { limits: { products: 0, customers: 50, unlimitedCap: 200 } } }); expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO ld_plan_limits"), expect.arrayContaining([0, 50, 200]));
  });

  it("processa convites em lote de forma independente e informa falhas sem vazar tokens", async () => {
    const token = await adminToken(); const one = vi.fn().mockResolvedValueOnce({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null }).mockResolvedValueOnce(null);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ id: "mail" }) })));
    const { response } = await request({ one, path: "/api/admin/merchants/invitations", options: { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ invites: [{ name: "Primeiro", email: "primeiro@exemplo.com", trialDays: 14 }, { name: "Duplicado", email: "primeiro@exemplo.com", trialDays: 7 }] }) } });
    expect(response.status).toBe(201); const body = await response.json(); expect(body).toMatchObject({ sent: 1, failed: 1, results: [{ status: "sent", email: "primeiro@exemplo.com" }, { status: "failed", email: "primeiro@exemplo.com" }] }); expect(JSON.stringify(body)).not.toContain("token"); expect(global.fetch.mock.calls[0][1].body).toContain("14 dias grátis");
  });

  it("retorna detalhes de lojista e lojas sem senha ou token", async () => {
    const token = await adminToken(); const one = vi.fn().mockResolvedValueOnce({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null }).mockResolvedValueOnce({ id: "merchant-1", name: "Lojista", email: "lojista@exemplo.com", account_status: "active", online: 1, trial_days: 10 });
    const query = vi.fn().mockResolvedValue([{ id: "store-1", name: "Loja", slug: "loja", products_count: 2, sales_cents: 0 }]);
    const { response } = await request({ one, query, path: "/api/admin/merchants/merchant-1/details", options: { headers: { authorization: `Bearer ${token}` } } });
    expect(response.status).toBe(200); const body = await response.json(); expect(body).toMatchObject({ merchant: { id: "merchant-1", online: true, stores: [{ id: "store-1", slug: "loja" }] } }); expect(JSON.stringify(body)).not.toMatch(/password|token_hash/i);
  });

  it("envia apenas um link de redefinição, sem retornar ou definir a senha do lojista", async () => {
    const token = await adminToken(); const one = vi.fn().mockResolvedValueOnce({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null }).mockResolvedValueOnce({ id: "merchant-1", name: "Lojista", email: "lojista@exemplo.com" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ id: "mail" }) })));
    const { response } = await request({ one, path: "/api/admin/merchants/merchant-1/reset-password", options: { method: "POST", headers: { authorization: `Bearer ${token}` } } });
    expect(response.status).toBe(200); await expect(response.json()).resolves.toEqual({ ok: true }); expect(global.fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it.each(["blocked", "active"])("aplica o estado administrativo %s e invalida sessões anteriores", async (status) => {
    const token = await adminToken();
    const one = vi.fn()
      .mockResolvedValueOnce({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null })
      .mockResolvedValueOnce({ id: "merchant-1" });
    const { response, query } = await request({ one, path: "/api/admin/merchants/merchant-1/status", options: { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ status, reason: "Teste de segurança" }) } });
    expect(response.status).toBe(200); await expect(response.json()).resolves.toEqual({ ok: true, status });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ld_admin_account_controls"), expect.arrayContaining(["merchant-1", status]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("session_invalid_before"), expect.arrayContaining(["merchant-1"]));
  });

  it("entrega o dashboard sem colunas não agrupadas", async () => {
    const token = await adminToken();
    const one = vi.fn()
      .mockResolvedValueOnce({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null })
      .mockResolvedValueOnce({ merchants: 1, stores: 1, active_subscriptions: 1, pending_invoices: 0, customers: 1, online_merchants: 1 })
      .mockResolvedValueOnce({ paid_cents: 0 });
    const query = vi.fn().mockResolvedValueOnce([{ id: "merchant-1", name: "Lojista", store_count: 1 }]).mockResolvedValueOnce([]);
    const { response } = await request({ one, query, path: "/api/admin/dashboard", options: { headers: { authorization: `Bearer ${token}` } } });
    expect(response.status).toBe(200); await expect(response.json()).resolves.toMatchObject({ metrics: { merchants: 1, paidCents: 0 } });
    expect(query.mock.calls[0][0]).toContain("GROUP BY users.id, users.name, users.email, users.created_at, controls.status, presence.last_seen_at");
  });

  it("lista lojistas com todas as colunas não agregadas presentes no agrupamento", async () => {
    const token = await adminToken();
    const one = vi.fn().mockResolvedValueOnce({ id: "admin-1", name: "Admin", email: "admin@exemplo.com", role: "super_admin", account_status: "active", session_invalid_before: null });
    const query = vi.fn().mockResolvedValueOnce([{ id: "merchant-1", name: "Lojista", paid_cents: 0, subscription_status: "trial", online: 1 }]);
    const { response } = await request({ one, query, path: "/api/admin/merchants", options: { headers: { authorization: `Bearer ${token}` } } });
    expect(response.status).toBe(200); await expect(response.json()).resolves.toMatchObject({ merchants: [{ id: "merchant-1", online: true }] });
    expect(query.mock.calls[0][0]).toContain("GROUP BY users.id, users.name, users.email, users.created_at, roles.role, controls.status, presence.last_seen_at");
  });
});
