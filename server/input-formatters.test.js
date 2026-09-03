import { centsToCurrencyInput, currencyInputToCents, formatCep, formatCpf, formatPhone } from "../client/src/lib/input-formatters.js";
import { describe, expect, it } from "vitest";

describe("formatadores de formulário", () => {
  it("aplica máscaras brasileiras a CPF, telefone e CEP", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatCep("01310100")).toBe("01310-100");
  });

  it("converte moeda mascarada para centavos sem perda de precisão", () => {
    expect(centsToCurrencyInput(123456)).toBe("1.234,56");
    expect(currencyInputToCents("1.234,56")).toBe(123456);
  });
});
