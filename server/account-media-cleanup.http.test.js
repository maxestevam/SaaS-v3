import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ one: vi.fn(), query: vi.fn(), verifyPassword: vi.fn(), removePrefix: vi.fn() }));

vi.mock("./db.js", () => ({ one: mocks.one, query: mocks.query }));
vi.mock("./auth.js", () => ({ hashPassword: vi.fn(), signSession: vi.fn(), verifyPassword: mocks.verifyPassword }));
vi.mock("./modules/storage/media-storage.js", () => ({
  getProductStorage: () => ({ removePrefix: mocks.removePrefix }),
  storeMediaPrefix: ({ accountId, storeId }) => `${accountId}/${storeId}/`,
}));

import router from "./modules/account/controller.js";

function app() {
  const server = express();
  server.use(express.json());
  server.use((req, _res, next) => { req.user = { id: "account-1" }; next(); });
  server.use(router);
  server.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  return server;
}

async function withServer(callback) {
  const server = app();
  const listener = await new Promise((resolve) => { const result = server.listen(0, () => resolve(result)); });
  try { return await callback(`http://127.0.0.1:${listener.address().port}`); } finally { await new Promise((resolve) => listener.close(resolve)); }
}

describe("exclusão de conta com limpeza R2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.one.mockResolvedValue({ password_hash: "hash" });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.query.mockResolvedValueOnce([{ id: "store-1" }, { id: "store-2" }]).mockResolvedValueOnce({ affectedRows: 1 });
    mocks.removePrefix.mockResolvedValue(undefined);
  });

  it("remove os prefixes de todas as lojas somente após excluir a conta", async () => {
    await withServer(async (base) => {
      const response = await fetch(`${base}/account`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "SenhaSegura8!" }) });
      expect(response.status).toBe(200);
    });

    expect(mocks.removePrefix).toHaveBeenCalledWith("account-1/store-1/");
    expect(mocks.removePrefix).toHaveBeenCalledWith("account-1/store-2/");
    expect(mocks.query.mock.invocationCallOrder[1]).toBeLessThan(mocks.removePrefix.mock.invocationCallOrder[0]);
  });
});
