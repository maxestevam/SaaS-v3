import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getStoreContract: vi.fn(), putJson: vi.fn(), remove: vi.fn(), removeMany: vi.fn() }));
vi.mock("./service.js", () => ({ getStoreContract: mocks.getStoreContract }));
vi.mock("../storage/media-storage.js", () => ({ getContractStorage: () => ({ putJson: mocks.putJson, remove: mocks.remove, removeMany: mocks.removeMany }) }));

import { removeStoreContractFromR2, storeContractKey, syncStoreContractToR2 } from "./r2-sync.js";

describe("sincronização do contrato de loja no R2", () => {
  it("gera o nome pelo domínio quando existir e pelo slug nos demais casos", () => {
    expect(storeContractKey({ slug: "minha-loja" })).toBe("stores/minha-loja.json");
    expect(storeContractKey({ slug: "minha-loja", customDomain: "loja.exemplo.com.br" })).toBe("stores/loja.exemplo.com.br.json");
    expect(() => storeContractKey({ slug: "Inválido com espaço" })).toThrow("Slug ou domínio inválido");
  });

  it("publica o contrato e remove somente chaves antigas diferentes", async () => {
    const contract = { contractVersion: "1", store: { slug: "nova-loja" } };
    mocks.getStoreContract.mockResolvedValueOnce(contract);
    mocks.putJson.mockResolvedValueOnce({ key: "stores/nova-loja.json" });
    mocks.removeMany.mockResolvedValueOnce(undefined);

    await expect(syncStoreContractToR2({ storeId: "store-1", userId: "user-1", previousKeys: ["stores/antiga-loja.json", "stores/nova-loja.json"] })).resolves.toMatchObject({ key: "stores/nova-loja.json", contract });
    expect(mocks.putJson).toHaveBeenCalledWith({ key: "stores/nova-loja.json", value: contract });
    expect(mocks.removeMany).toHaveBeenCalledWith(["stores/antiga-loja.json"]);
  });

  it("remove o arquivo canônico ao excluir a loja", async () => {
    await removeStoreContractFromR2({ key: "stores/loja-excluida.json" });
    expect(mocks.remove).toHaveBeenCalledWith("stores/loja-excluida.json");
  });
});
