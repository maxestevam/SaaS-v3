/** Confere se a chave Resend configurada pode consultar o endpoint leve de domínios. */
import { describe, expect, it } from "vitest";

const hasResendConfig = Boolean(String(process.env.RESEND_API_KEY || "").trim());

describe.skipIf(!hasResendConfig)("integração Resend", () => {
  it("autentica a chave configurada na consulta de domínios", async () => {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  }, 15000);
});
