import { describe, expect, it } from "vitest";
import { buildMercadoPagoAuthorizationUrl, decryptConfig, encryptConfig, publicFreightQuote, renderTemplate } from "./modules/integrations/routes.js";

describe("configurações de integração por loja", () => {
  it("protege e recupera configurações sem expor o conteúdo em texto puro", () => {
    const encrypted = encryptConfig({ accessToken: "token-super-secreto", refreshToken: "refresh" }, "segredo-de-teste");
    expect(encrypted).not.toContain("token-super-secreto");
    expect(decryptConfig(encrypted, "segredo-de-teste")).toEqual({ accessToken: "token-super-secreto", refreshToken: "refresh" });
  });

  it("monta uma autorização OAuth do Mercado Pago com state, redirect estático e PKCE", () => {
    const url = new URL(buildMercadoPagoAuthorizationUrl({ clientId: "123", state: "state-seguro", redirectUri: "https://app.exemplo.com/v1/integrations/mercado-pago/callback", codeChallenge: "challenge" }));
    expect(url.origin).toBe("https://auth.mercadopago.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("platform_id")).toBe("mp");
    expect(url.searchParams.get("state")).toBe("state-seguro");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("renderiza dados de pedido escapando texto em modelos HTML", () => {
    expect(renderTemplate("<p>Olá, {{customerName}}</p>", { customerName: "<Ana>" })).toBe("<p>Olá, &lt;Ana&gt;</p>");
  });

  it("normaliza a cotação do Melhor Envio para o contrato público", () => {
    expect(publicFreightQuote({ id: 1, name: "PAC", custom_price: "22.10", custom_delivery_time: 5, company: { name: "Correios" } })).toMatchObject({ id: 1, carrier: "Correios", service: "PAC", price: "22.10", deliveryTime: 5 });
  });
});
