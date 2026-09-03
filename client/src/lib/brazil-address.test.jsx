import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookupBrazilianAddress: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { lookupBrazilianAddress: mocks.lookupBrazilianAddress } }));

import { cepDigits, lookupBrazilianAddress } from "./brazil-address";

describe("consulta de CEP pela fronteira da aplicação", () => {
  it("normaliza CEP e rejeita entrada incompleta sem chamada HTTP", async () => {
    expect(cepDigits("01.001-000")).toBe("01001000");
    await expect(lookupBrazilianAddress("123")).rejects.toThrow("oito dígitos");
    expect(mocks.lookupBrazilianAddress).not.toHaveBeenCalled();
  });

  it("usa somente api.js, preserva o endereço normalizado e encaminha cancelamento", async () => {
    mocks.lookupBrazilianAddress.mockResolvedValueOnce({ address: { postalCode: "01001-000", street: "Praça da Sé", complement: "", district: "Sé", city: "São Paulo", state: "SP", country: "BR" } });
    const controller = new AbortController();
    await expect(lookupBrazilianAddress("01001-000", { signal: controller.signal })).resolves.toMatchObject({ state: "SP", country: "BR" });
    expect(mocks.lookupBrazilianAddress).toHaveBeenCalledWith("01001000", { signal: controller.signal });
  });
});
