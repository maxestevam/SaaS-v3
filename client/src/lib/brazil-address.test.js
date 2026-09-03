import { afterEach, describe, expect, it, vi } from "vitest";
import { cepDigits, lookupBrazilianAddress } from "./brazil-address";

describe("consulta brasileira de CEP", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("normaliza o CEP e mapeia a resposta do ViaCEP para o formulário", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cep: "01001-000", logradouro: "Praça da Sé", complemento: "lado ímpar", bairro: "Sé", localidade: "São Paulo", uf: "SP" }) });
    vi.stubGlobal("fetch", fetch);

    await expect(lookupBrazilianAddress("01001-000")).resolves.toEqual({ postalCode: "01001-000", street: "Praça da Sé", complement: "lado ímpar", district: "Sé", city: "São Paulo", state: "SP", country: "BR" });
    expect(fetch).toHaveBeenCalledWith("https://viacep.com.br/ws/01001000/json/", { signal: undefined });
    expect(cepDigits("01.001-000")).toBe("01001000");
  });

  it("não consulta o serviço quando o CEP não tem oito dígitos", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(lookupBrazilianAddress("0100")).rejects.toThrow("Informe os oito dígitos do CEP.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
