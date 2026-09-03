import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  one: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
  listPrefix: vi.fn(),
  removeMany: vi.fn(),
  cancelSubscription: vi.fn(),
  hashToken: vi.fn((value) => `hash:${value}`),
}));

vi.mock("./db.js", () => ({ one: mocked.one, query: mocked.query, transaction: mocked.transaction }));
vi.mock("./auth.js", () => ({ createResetToken: () => "raw-token", hashToken: mocked.hashToken, verifyPassword: vi.fn() }));
vi.mock("./modules/storage/media-storage.js", () => ({ getProductStorage: () => ({ listPrefix: mocked.listPrefix, removeMany: mocked.removeMany }), storeMediaPrefix: ({ accountId, storeId }) => `${accountId}/${storeId}/` }));
vi.mock("./modules/billing/service.js", () => ({ cancelMercadoPagoSubscription: mocked.cancelSubscription }));
vi.mock("./modules/store-contract/r2-sync.js", () => ({ removeStoreContractFromR2: vi.fn().mockResolvedValue(undefined), storeContractKey: () => "loja-teste.json", syncStoreContractToR2: vi.fn().mockResolvedValue({ key: "loja-teste.json" }) }));

import { confirmStoreDeletion } from "./modules/stores/deletion-service.js";

describe("confirmação de exclusão administrativa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.listPrefix.mockResolvedValue(["user-1/store-1/store/logo/logo.webp"]);
    mocked.removeMany.mockResolvedValue(undefined);
    mocked.query.mockResolvedValue([]);
    mocked.transaction.mockImplementation(async (callback) => callback({ query: vi.fn().mockResolvedValue({ affectedRows: 1 }) }));
  });

  it("lista e remove a mídia R2 antes de excluir a loja no banco", async () => {
    mocked.one.mockResolvedValueOnce({ id: "request-1", store_id: "store-1", user_id: "user-1", action_type: "store", payload_json: "{}" }).mockResolvedValueOnce({ id: "store-1", name: "Loja teste" });

    await expect(confirmStoreDeletion("raw-token")).resolves.toMatchObject({ storeName: "Loja teste", actionType: "store" });

    expect(mocked.listPrefix).toHaveBeenCalledWith("user-1/store-1/");
    expect(mocked.removeMany).toHaveBeenCalledWith(["user-1/store-1/store/logo/logo.webp"]);
    expect(mocked.removeMany.mock.invocationCallOrder[0]).toBeLessThan(mocked.transaction.mock.invocationCallOrder[0]);
  });
});
