import { trialEndsAtFrom } from "./api.js";
import { describe, expect, it } from "vitest";

describe("teste gratuito por loja", () => {
  it("concede exatamente sete dias a partir do início individual da assinatura", () => {
    const startedAt = Date.UTC(2026, 7, 22, 12, 0, 0);
    expect(trialEndsAtFrom(startedAt)).toBe(startedAt + 7 * 86400000);
  });
});
