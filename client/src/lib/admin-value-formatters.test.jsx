import { describe, expect, it } from "vitest";
import { dateInputToTimestamp, dateRangeFromInputs, formatAdminCurrency, formatAdminDate, normalizeDisplayTimestamp } from "./admin-value-formatters";

describe("formatadores administrativos centralizados", () => {
  it("formata somente inteiros seguros em centavos", () => {
    expect(formatAdminCurrency(1299)).toMatch(/12,99/);
    expect(formatAdminCurrency("inválido")).toBe("—");
    expect(formatAdminCurrency(12.5)).toBe("—");
  });

  it("normaliza timestamp ou ISO e recusa data inválida", () => {
    expect(normalizeDisplayTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(normalizeDisplayTimestamp("2024-01-20T12:00:00.000Z")).toBe(Date.parse("2024-01-20T12:00:00.000Z"));
    expect(formatAdminDate("data-impossível")).toBe("—");
  });

  it("converte filtros de data para limites UTC válidos", () => {
    expect(dateInputToTimestamp("2024-02-30")).toBeNull();
    expect(dateRangeFromInputs({ dateFrom: "2024-02-01", dateTo: "2024-02-02" })).toEqual({ dateFrom: Date.UTC(2024, 1, 1), dateTo: Date.UTC(2024, 1, 2, 23, 59, 59, 999) });
  });
});
