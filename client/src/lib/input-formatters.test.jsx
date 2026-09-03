import { describe, expect, it } from "vitest";
import { centsToCurrencyInput, currencyInputToCents, formatCurrencyInput } from "./input-formatters";

describe("máscara monetária de campos administrativos", () => {
  it("formata dígitos no padrão brasileiro e devolve centavos sem texto formatado", () => {
    expect(formatCurrencyInput("123456")).toBe("1.234,56");
    expect(currencyInputToCents("1.234,56")).toBe(123456);
    expect(centsToCurrencyInput(99)).toBe("0,99");
  });
});
