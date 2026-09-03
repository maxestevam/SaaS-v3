import { describe, expect, it } from "vitest";

describe("URL pública da vitrine", () => {
  it("usa uma URL HTTPS configurada", async () => {
    const value = String(process.env.STOREFRONT_APP_URL || "").trim();
    expect(value).toMatch(/^https:\/\//);
  });

  it.skipIf(!process.env.STOREFRONT_TEMP_HOST)("expõe a rota por slug no host temporário configurado", async () => {
    const host = String(process.env.STOREFRONT_TEMP_HOST || "").trim();
    expect(host).toMatch(/^[a-z0-9.-]+$/i);
    const response = await fetch(`https://${host}/@loja-hq`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  });
});
