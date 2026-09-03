import { describe, expect, it } from "vitest";
import { sanitizeMelhorEnvioServices, sanitizeMercadoPagoMethods } from "./catalog.js";

describe("catálogos sanitizados de integração", () => {
  it("mantém somente meios ativos e não transmite campos sensíveis do Mercado Pago", () => {
    const methods = sanitizeMercadoPagoMethods([
      { id: "visa", name: "Visa", payment_type_id: "credit_card", status: "active", secret: "nunca" },
      { id: "old", name: "Antigo", payment_type_id: "ticket", status: "deactive" },
    ]);
    expect(methods).toEqual([{ id: "mercado_pago:visa", provider: "mercado_pago", providerMethodId: "visa", name: "Visa", description: "Cartão de crédito", type: "credit_card" }]);
  });

  it("converte os serviços reais do Melhor Envio em opções de leitura seguras", () => {
    expect(sanitizeMelhorEnvioServices([{ id: 2, name: "SEDEX", type: "express", company: { name: "Correios", picture: "https://invalido" } }])).toEqual([
      { id: "melhor_envio:2", provider: "melhor_envio", providerServiceId: 2, name: "Correios · SEDEX", description: "Entrega expressa", type: "express" },
    ]);
  });
});
