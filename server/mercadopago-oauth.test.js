import { describe, expect, it } from "vitest";

const hasMercadoPagoOAuthConfig = Boolean(
  String(process.env.MERCADO_PAGO_OAUTH_CLIENT_ID || "").trim() &&
  String(process.env.MERCADO_PAGO_OAUTH_CLIENT_SECRET || "").trim(),
);
const runExternalSmoke = process.env.RUN_MERCADO_PAGO_EXTERNAL_SMOKE === "true";

describe.skipIf(!hasMercadoPagoOAuthConfig || !runExternalSmoke)("Mercado Pago OAuth", () => {
  it("obtém um token de aplicação para validar as credenciais OAuth configuradas", async () => {
    const clientId = String(process.env.MERCADO_PAGO_OAUTH_CLIENT_ID || "").trim();
    const clientSecret = String(process.env.MERCADO_PAGO_OAUTH_CLIENT_SECRET || "").trim();
    expect(clientId).not.toBe("");
    expect(clientSecret).not.toBe("");

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => ({}));
    expect(response.ok, `OAuth retornou ${response.status}: ${String(payload?.message || payload?.error || "sem detalhe")}`).toBe(true);
    expect(typeof payload.access_token).toBe("string");
    expect(payload.access_token.length).toBeGreaterThan(20);
  }, 15_000);
});
