import http from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import addressRouter from "./modules/address/routes.js";
import { apiErrorHandler } from "./modules/shared/response.js";

function appWith(router) {
  const app = express();
  app.use(router);
  app.use(apiErrorHandler);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message, code: error.code }));
  return app;
}

async function request(app, path) {
  const server = await new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  try {
    return await new Promise((resolve, reject) => {
      const client = http.request({ hostname: "127.0.0.1", port: server.address().port, path }, (response) => {
        let text = "";
        response.on("data", (chunk) => { text += chunk; });
        response.on("end", () => resolve({ status: response.statusCode, body: text ? JSON.parse(text) : null }));
      });
      client.on("error", reject);
      client.end();
    });
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

describe("rota pública de CEP", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejeita CEP inválido antes de chamar o provedor externo", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(appWith(addressRouter), "/public/address/cep/123");
    expect(response).toMatchObject({ status: 422, body: { code: "INVALID_CEP" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retorna apenas endereço sanitizado ou erro seguro do provedor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cep: "01001-000", logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP", segredo: "não expor" }) }));
    const response = await request(appWith(addressRouter), "/public/address/cep/01001000");
    expect(response).toMatchObject({ status: 200, body: { address: { postalCode: "01001-000", state: "SP", country: "BR" } } });
    expect(response.body.address.segredo).toBeUndefined();
  });
});
