import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  one: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  removePrefix: vi.fn(),
  cancelSubscription: vi.fn(),
  storeWithProfileForUser: vi.fn(),
  getStoresForUser: vi.fn(),
  ensureStoreProfile: vi.fn(),
  normalizeStoreProfile: vi.fn(),
}));

vi.mock("./db.js", () => ({ one: mocks.one, query: mocks.query, transaction: mocks.transaction }));
vi.mock("./modules/billing/service.js", () => ({ cancelMercadoPagoSubscription: mocks.cancelSubscription }));
vi.mock("./modules/stores/service.js", () => ({
  ensureStoreProfile: mocks.ensureStoreProfile,
  getStoresForUser: mocks.getStoresForUser,
  normalizeStoreProfile: mocks.normalizeStoreProfile,
  storeWithProfileForUser: mocks.storeWithProfileForUser,
}));
vi.mock("./modules/storage/media-storage.js", () => ({
  getProductStorage: () => ({ put: mocks.put, remove: mocks.remove, removePrefix: mocks.removePrefix }),
  storeMediaKey: ({ accountId, storeId, assetId, extension }) => `${accountId}/${storeId}/store/logo/${assetId}.${extension}`,
  storeMediaPrefix: ({ accountId, storeId }) => `${accountId}/${storeId}/`,
}));
vi.mock("./modules/store-contract/r2-sync.js", () => ({ syncStoreContractToR2: vi.fn().mockResolvedValue({ key: "loja-teste.json" }), storeContractKey: () => "loja-teste.json" }));

import router from "./modules/stores/controller.js";

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

function png() {
  const buffer = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12);
  buffer.writeUInt32BE(24, 16);
  buffer.writeUInt32BE(24, 20);
  buffer[24] = 8;
  buffer[25] = 2;
  return buffer;
}

describe("limpeza de identidade e loja no R2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.put.mockResolvedValue({ key: "account-1/store-1/store/logo/new.png", url: "https://cdn.example/new.png" });
    mocks.remove.mockResolvedValue(undefined);
    mocks.removePrefix.mockResolvedValue(undefined);
    mocks.query.mockResolvedValue({ affectedRows: 1 });
    mocks.getStoresForUser.mockResolvedValue([]);
  });

  it("remove a logo anterior somente após persistir a substituição", async () => {
    const oldKey = "account-1/store-1/store/logo/old.png";
    mocks.one.mockResolvedValue({ id: "store-1", logo_storage_key: oldKey });
    mocks.storeWithProfileForUser.mockResolvedValue({ id: "store-1", name: "Loja", slug: "loja", status: 2, logo_url: "https://cdn.example/new.png" });

    await withServer(async (base) => {
      const form = new FormData();
      form.append("file", new Blob([png()], { type: "image/png" }), "logo.png");
      const response = await fetch(`${base}/stores/store-1/logo`, { method: "POST", body: form });
      expect(response.status).toBe(201);
    });

    expect(mocks.remove).toHaveBeenCalledWith(oldKey);
    expect(mocks.query.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it("remove a nova logo do R2 quando a persistência da substituição falha", async () => {
    const oldKey = "account-1/store-1/store/logo/old.png";
    const newKey = "account-1/store-1/store/logo/new.png";
    mocks.one.mockResolvedValue({ id: "store-1", logo_storage_key: oldKey });
    mocks.query.mockRejectedValue(new Error("Banco indisponível"));

    await withServer(async (base) => {
      const form = new FormData();
      form.append("file", new Blob([png()], { type: "image/png" }), "logo.png");
      const response = await fetch(`${base}/stores/store-1/logo`, { method: "POST", body: form });
      expect(response.status).toBe(500);
    });

    expect(mocks.remove).toHaveBeenCalledWith(newKey);
    expect(mocks.remove).not.toHaveBeenCalledWith(oldKey);
    expect(mocks.query.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it("bloqueia a exclusão direta da loja e exige solicitação confirmada por e-mail", async () => {
    mocks.one.mockResolvedValue({ id: "store-1" });
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce({ affectedRows: 1 });

    await withServer(async (base) => {
      const response = await fetch(`${base}/stores/store-1`, { method: "DELETE" });
      expect(response.status).toBe(405);
    });

    expect(mocks.removePrefix).not.toHaveBeenCalled();
  });
});
