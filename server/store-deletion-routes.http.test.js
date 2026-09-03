import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ requestStoreDeletion: vi.fn(), confirmStoreDeletion: vi.fn() }));

vi.mock("./modules/stores/deletion-service.js", () => ({
  StoreDeletionError: class StoreDeletionError extends Error { constructor(status, message) { super(message); this.status = status; } },
  requestStoreDeletion: mocked.requestStoreDeletion,
  confirmStoreDeletion: mocked.confirmStoreDeletion,
}));

import storeRouter, { publicStoreDeletionRouter } from "./modules/stores/controller.js";

function app() {
  const server = express();
  server.use(express.json());
  server.use(publicStoreDeletionRouter);
  server.use((req, _res, next) => { req.user = { id: "account-1" }; next(); });
  server.use(storeRouter);
  server.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  return server;
}

async function withServer(callback) {
  const server = app();
  const listener = await new Promise((resolve) => { const result = server.listen(0, () => resolve(result)); });
  try { return await callback(`http://127.0.0.1:${listener.address().port}`); } finally { await new Promise((resolve) => listener.close(resolve)); }
}

describe("rotas de exclusão administrativa de loja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.requestStoreDeletion.mockResolvedValue({ ok: true, expiresAt: 1788000000000 });
    mocked.confirmStoreDeletion.mockResolvedValue({ storeName: "Loja teste", actionType: "resources", resources: ["products"] });
  });

  it("cria uma solicitação com a senha e não executa exclusão antes do link", async () => {
    await withServer(async (base) => {
      const response = await fetch(`${base}/stores/store-1/deletion-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "senha", resources: ["products"], deleteStore: false }),
      });
      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({ ok: true, expiresAt: 1788000000000 });
    });

    expect(mocked.requestStoreDeletion).toHaveBeenCalledWith(expect.objectContaining({
      storeId: "store-1", userId: "account-1", password: "senha", resources: ["products"], deleteStore: false,
    }));
    expect(mocked.confirmStoreDeletion).not.toHaveBeenCalled();
  });

  it("permite abrir a confirmação pública sem autenticação e confirma somente pelo token", async () => {
    await withServer(async (base) => {
      const response = await fetch(`${base}/public/store-deletion/confirm?token=token-de-uso-unico`);
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain("Exclusão confirmada");
    });

    expect(mocked.confirmStoreDeletion).toHaveBeenCalledWith("token-de-uso-unico");
  });
});
