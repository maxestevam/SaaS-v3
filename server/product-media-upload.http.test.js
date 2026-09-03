import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";

const mocks = vi.hoisted(() => ({ one: vi.fn(), query: vi.fn(), transaction: vi.fn(), put: vi.fn(), remove: vi.fn() }));
vi.mock("./modules/storage/media-storage.js", () => ({ getProductStorage: () => ({ put: mocks.put, remove: mocks.remove }), productMediaKey: ({ accountId, storeId, draftId, folder, assetId, extension }) => `${accountId}/${storeId}/products/${draftId}/${folder}/${assetId}.${extension}` }));
vi.mock("./modules/products/../../db.js", () => ({ one: mocks.one, query: mocks.query, transaction: mocks.transaction }));
import router from "./modules/products/routes.js";

function app() { const server = express(); server.use(express.json()); server.use((req, _res, next) => { req.user = { id: "user-1" }; next(); }); server.use(router); server.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message })); return server; }
async function withServer(callback) { const server = app(); const listener = await new Promise((resolve) => { const result = server.listen(0, () => resolve(result)); }); try { return await callback(`http://127.0.0.1:${listener.address().port}`); } finally { await new Promise((resolve) => listener.close(resolve)); } }
function png() { const buffer = Buffer.alloc(33); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0); buffer.writeUInt32BE(13, 8); buffer.write("IHDR", 12); buffer.writeUInt32BE(24, 16); buffer.writeUInt32BE(24, 20); buffer[24] = 8; buffer[25] = 2; return buffer; }

describe("upload imediato de produto", () => {
  beforeEach(() => { mocks.one.mockReset(); mocks.query.mockReset(); mocks.transaction.mockReset(); mocks.put.mockReset(); mocks.remove.mockReset(); mocks.transaction.mockImplementation((callback) => callback({ one: mocks.one, query: mocks.query })); mocks.remove.mockResolvedValue(undefined); });
  it("persiste a mídia no storage antes de o produto ser salvo", async () => {
    mocks.one.mockResolvedValue({ id: "store-1", name: "Minha loja" });
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce({ affectedRows: 1 });
    mocks.put.mockResolvedValue({ key: "user-1/store-1/products/b1a7e30f-6055-4854-9e4b-4302444280cb/images/media-1.png", url: "https://cdn.example/user-1/store-1/products/b1a7e30f-6055-4854-9e4b-4302444280cb/images/media-1.png" });
    await withServer(async (base) => {
      const form = new FormData();
      form.append("draftId", "b1a7e30f-6055-4854-9e4b-4302444280cb");
      form.append("file", new Blob([png()], { type: "image/png" }), "produto.png");
      const response = await fetch(`${base}/stores/store-1/products/media`, { method: "POST", body: form });
      const body = await response.json();
      expect(response.status).toBe(201);
      expect(body.media).toMatchObject({ kind: "image", url: "https://cdn.example/user-1/store-1/products/b1a7e30f-6055-4854-9e4b-4302444280cb/images/media-1.png" });
    });
    expect(mocks.put).toHaveBeenCalledTimes(1);
  });

  it("rejeita upload sem rascunho válido antes de chamar o storage", async () => {
    await withServer(async (base) => {
      const form = new FormData();
      form.append("file", new Blob([png()], { type: "image/png" }), "produto.png");
      const response = await fetch(`${base}/stores/store-1/products/media`, { method: "POST", body: form });
      const body = await response.json();
      expect(response.status).toBe(422);
      expect(body.error).toContain("identificador temporário");
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });
});
