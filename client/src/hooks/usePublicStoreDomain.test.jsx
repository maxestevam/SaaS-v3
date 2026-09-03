import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getPublicStoreDomain: vi.fn() }));
vi.mock("@/domain/store-contract", () => ({ storeContractDataSource: { getPublicStoreDomain: mocks.getPublicStoreDomain } }));

import { usePublicStoreDomain } from "./usePublicStoreDomain";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

describe("usePublicStoreDomain", () => {
  beforeEach(() => mocks.getPublicStoreDomain.mockReset());

  it("mantém a última loja solicitada quando respostas A→B→A chegam fora de ordem", async () => {
    const firstA = deferred();
    const storeB = deferred();
    const lastA = deferred();
    mocks.getPublicStoreDomain.mockImplementationOnce(() => firstA.promise).mockImplementationOnce(() => storeB.promise).mockImplementationOnce(() => lastA.promise);
    const { result, rerender } = renderHook(({ slug }) => usePublicStoreDomain(slug), { initialProps: { slug: "store-a" } });

    rerender({ slug: "store-b" });
    storeB.resolve({ store: { id: "store-b" } });
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", domain: { store: { id: "store-b" } } }));

    firstA.resolve({ store: { id: "store-a-stale" } });
    await Promise.resolve();
    expect(result.current.domain.store.id).toBe("store-b");

    rerender({ slug: "store-a" });
    lastA.resolve({ store: { id: "store-a" } });
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", domain: { store: { id: "store-a" } } }));
    expect(mocks.getPublicStoreDomain).toHaveBeenNthCalledWith(1, "store-a");
    expect(mocks.getPublicStoreDomain).toHaveBeenNthCalledWith(2, "store-b");
    expect(mocks.getPublicStoreDomain).toHaveBeenNthCalledWith(3, "store-a");
  });

  it("não consulta a API para slug inválido e expõe estado específico", async () => {
    const { result } = renderHook(() => usePublicStoreDomain("loja%20invalida"));
    await waitFor(() => expect(result.current).toMatchObject({ status: "invalid", domain: null }));
    expect(mocks.getPublicStoreDomain).not.toHaveBeenCalled();
  });

  it("permite recarregar uma indisponibilidade sem conservar o erro anterior", async () => {
    mocks.getPublicStoreDomain.mockRejectedValueOnce(new Error("Serviço indisponível.")).mockResolvedValueOnce({ store: { id: "store-a" } });
    const { result } = renderHook(() => usePublicStoreDomain("store-a"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    result.current.reload();
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", domain: { store: { id: "store-a" } }, error: null }));
    expect(mocks.getPublicStoreDomain).toHaveBeenCalledTimes(2);
  });
});
