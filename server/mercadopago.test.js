/** Confere a autenticação do Access Token Mercado Pago por uma consulta leve do perfil da conta. */
import { describe, expect, it } from "vitest";

async function profileResponse(attempt = 0) {
  try {
    return await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(12000) });
  } catch (error) {
    if (attempt >= 2) throw error;
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    return profileResponse(attempt + 1);
  }
}

const hasMercadoPagoConfig = Boolean(
  String(process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "").trim() &&
  String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim(),
);
const runExternalSmoke = process.env.RUN_MERCADO_PAGO_EXTERNAL_SMOKE === "true";

describe.skipIf(!hasMercadoPagoConfig)("Checkout Transparente do Mercado Pago", () => {
  it("dispõe de uma chave pública compatível com o checkout transparente", () => {
    expect(process.env.VITE_MERCADO_PAGO_PUBLIC_KEY).toMatch(/^(TEST|APP_USR)-[a-zA-Z0-9_-]+$/);
  });

  it("mantém o Access Token exclusivo ao servidor", () => {
    const accessToken = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
    expect(accessToken.length).toBeGreaterThan(20);
    expect(accessToken).not.toBe(process.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
  });
});

describe.skipIf(!hasMercadoPagoConfig || !runExternalSmoke)("smoke externo do Mercado Pago", () => {
  it("autentica o Access Token configurado", async () => {
    const response = await profileResponse();
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  }, 40000);
});
