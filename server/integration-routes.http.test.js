import express from "express";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  one: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
  fetch: vi.fn(),
  sendMail: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("./db.js", () => ({ one: mocks.one, query: mocks.query, transaction: mocks.transaction }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: mocks.sendMail, verify: mocks.verify }) } }));

import integrationRouter, { encryptConfig, publicIntegrationRouter, sendStoreTransactionalEmail } from "./modules/integrations/routes.js";

const store = { id: "store-1", name: "Loja de teste" };
const timestamp = 1787420000000;

function appWith(router, user = { id: "user-1", email: "owner@example.com" }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  app.use(router);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  return app;
}

async function request(app, path, options = {}) {
  const server = await new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  try {
    const address = server.address();
    const payload = options.body || "";
    const result = await new Promise((resolve, reject) => {
      const client = http.request({ hostname: "127.0.0.1", port: address.port, path, method: options.method || "GET", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...(options.headers || {}) } }, (response) => {
        let text = "";
        response.on("data", (chunk) => { text += chunk; });
        response.on("end", () => { let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text || null; } resolve({ status: response.statusCode, headers: response.headers, body }); });
      });
      client.on("error", reject);
      if (payload) client.write(payload);
      client.end();
    });
    return { response: result, body: result.body };
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

function integrationRow(provider, config = {}) {
  return { provider, status: "connected", account_email: "conta@exemplo.com", config_encrypted: encryptConfig(config), metadata_json: JSON.stringify({ environment: "sandbox", originPostalCode: "01001000" }), connected_at: timestamp, last_tested_at: null, last_error: null };
}

describe("rotas HTTP das integrações por loja", () => {
  beforeEach(() => {
    mocks.one.mockReset(); mocks.query.mockReset(); mocks.transaction.mockReset(); mocks.fetch.mockReset(); mocks.sendMail.mockReset(); mocks.verify.mockReset();
    mocks.query.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (callback) => callback({ one: mocks.one, query: mocks.query }));
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("não expõe configurações de uma loja que não pertence ao usuário", async () => {
    mocks.one.mockResolvedValue(null);
    const { response, body } = await request(appWith(integrationRouter), "/stores/store-estranha/settings");
    expect(response.status).toBe(404);
    expect(body.error).toBe("Loja não encontrada.");
  });

  it("salva a configuração Resend por loja e responde apenas com o estado público", async () => {
    mocks.one.mockImplementation(async (sql) => {
      if (sql.includes("FROM ld_stores")) return store;
      if (sql.includes("FROM ld_store_integrations")) return { ...integrationRow("resend", { apiKey: "re_secret" }), config_encrypted: null, metadata_json: "{}" };
      return null;
    });
    const { response, body } = await request(appWith(integrationRouter), "/stores/store-1/integrations/resend", { method: "PUT", body: JSON.stringify({ apiKey: "re_secret" }) });
    expect(response.status).toBe(200);
    expect(body.integration).toMatchObject({ provider: "resend", connected: true });
    expect(JSON.stringify(body)).not.toContain("re_secret");
    expect(mocks.query).toHaveBeenCalled();
  });

  it("rejeita pela HTTP uma chave Resend fora do tamanho permitido antes de persistir", async () => {
    mocks.one.mockResolvedValue(store);
    const { response, body } = await request(appWith(integrationRouter), "/stores/store-1/integrations/resend", { method: "PUT", body: JSON.stringify({ apiKey: "curta" }) });
    expect(response.status).toBe(422);
    expect(body.error).toContain("chave de API do Resend");
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejeita o e-mail de teste inválido antes de consultar a loja", async () => {
    const { response, body } = await request(appWith(integrationRouter), "/stores/store-1/email/test", { method: "POST", body: JSON.stringify({ recipient: "destino-invalido" }) });
    expect(response.status).toBe(422);
    expect(body.error).toContain("e-mail de destino válido");
    expect(mocks.one).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("mantém a resposta de modelo inexistente ao passar pelo controller", async () => {
    mocks.one.mockResolvedValue(store);
    const { response, body } = await request(appWith(integrationRouter), "/stores/store-1/email-templates/modelo-invalido", { method: "PUT", body: JSON.stringify({ subject: "Assunto", bodyHtml: "<p>Corpo</p>" }) });
    expect(response.status).toBe(404);
    expect(body.error).toBe("Modelo de e-mail não encontrado.");
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejeita um token do Melhor Envio quando o provedor retorna erro", async () => {
    mocks.one.mockImplementation(async (sql) => {
      if (sql.includes("FROM ld_stores")) return store;
      if (sql.includes("FROM ld_store_integrations")) return integrationRow("melhor_envio", { accessToken: "token-invalido" });
      return null;
    });
    mocks.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: "Unauthenticated" }) });
    const { response, body } = await request(appWith(integrationRouter), "/stores/store-1/integrations/melhor-envio/test", { method: "POST", body: "{}" });
    expect(response.status).toBe(422);
    expect(body.error).toContain("recusou a credencial");
  });

  it("recusa callback OAuth com state ausente ou inválido antes de trocar tokens", async () => {
    mocks.one.mockResolvedValue(null);
    const { response } = await request(appWith(publicIntegrationRouter), "/integrations/mercado-pago/callback?state=invalido&code=code", { headers: {} });
    expect(response.status).toBe(302);
    expect(response.headers.location).toContain("connection=invalid_state");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe("envio transacional por provedor da loja", () => {
  beforeEach(() => {
    mocks.one.mockReset(); mocks.query.mockReset(); mocks.sendMail.mockReset(); mocks.fetch.mockReset();
    mocks.query.mockResolvedValue([]);
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  function mockEmailStore(provider, config) {
    mocks.one.mockImplementation(async (sql) => {
      if (sql.includes("ld_store_email_settings")) return { provider, from_name: "Loja de teste", from_email: "vendas@exemplo.com", reply_to: "" };
      if (sql.includes("ld_store_email_templates")) return { event_key: "purchase_paid", subject: "Olá {{customerName}}", body_html: "<p>{{storeName}}</p>", enabled: 1, updated_at: timestamp };
      if (sql.includes("SELECT id, name FROM ld_stores")) return store;
      if (sql.includes("FROM ld_store_integrations")) return integrationRow(provider, config);
      return null;
    });
  }

  it("envia pelo Resend com HTML renderizado e sem expor a chave", async () => {
    mockEmailStore("resend", { apiKey: "re_secret" });
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    const result = await sendStoreTransactionalEmail({ storeId: store.id, eventKey: "purchase_paid", recipient: "cliente@exemplo.com", variables: { customerName: "Ana" } });
    expect(result).toEqual({ skipped: false, messageId: "email-1" });
    expect(mocks.fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    expect(mocks.fetch.mock.calls[0][1].body).toContain("Loja de teste");
    expect(mocks.fetch.mock.calls[0][1].body).not.toContain("re_secret");
  });

  it("envia pelo SMTP e informa erro seguro quando o servidor rejeita a mensagem", async () => {
    mockEmailStore("smtp", { host: "smtp.exemplo.com", port: 587, username: "user", password: "secret", secure: false });
    mocks.sendMail.mockResolvedValue({ messageId: "smtp-1" });
    await expect(sendStoreTransactionalEmail({ storeId: store.id, eventKey: "purchase_paid", recipient: "cliente@exemplo.com" })).resolves.toEqual({ skipped: false, messageId: "smtp-1" });
    mocks.sendMail.mockRejectedValue(new Error("rejeitado"));
    await expect(sendStoreTransactionalEmail({ storeId: store.id, eventKey: "purchase_paid", recipient: "cliente@exemplo.com" })).rejects.toMatchObject({ status: 502, message: "O provedor SMTP não aceitou o envio deste e-mail." });
  });
});
