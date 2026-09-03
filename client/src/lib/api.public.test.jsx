import { api } from "./api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("fronteira HTTP pública", () => {
  beforeEach(() => {
    localStorage.setItem("ld_token", "admin-secret-token");
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("não encaminha o token administrativo para CEP, contrato e prévia pública", async () => {
    await api.lookupBrazilianAddress("01001000");
    await api.getPublicStoreContract("store-a");
    await api.previewPublicCommercial("store-a", { items: [] });

    expect(global.fetch.mock.calls[0][0]).toContain("/v1/public/address/cep/01001000");
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
    expect(global.fetch.mock.calls[2][1].headers.Authorization).toBeUndefined();
  });

  it("mantém autenticação para operações administrativas", async () => {
    await api.getStores();
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer admin-secret-token");
  });

  it("preserva status e código quando a API pública retorna 404", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: "Loja não encontrada.", code: "STORE_NOT_FOUND" }) });
    await expect(api.getPublicStoreContract("ausente")).rejects.toMatchObject({ name: "ApiError", status: 404, code: "STORE_NOT_FOUND", message: "Loja não encontrada." });
  });

  it("classifica indisponibilidade de rede sem perder o contexto da rota", async () => {
    global.fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.getPublicStoreContract("store-a")).rejects.toMatchObject({ name: "ApiError", status: 0, retryable: true, path: "/v1/public/stores/store-a/contract" });
  });
});
