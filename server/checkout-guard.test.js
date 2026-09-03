import { describe, expect, it } from "vitest";
import { buildMercadoPagoOrderPayload, isCollectorPayer, mercadoPagoOrderFailure, originFor, preapprovalRejectionGuidance, providerIssueSummary } from "./api.js";

describe("proteção do checkout Mercado Pago", () => {
  it("bloqueia um assinante que é a própria conta recebedora", () => {
    expect(isCollectorPayer("comprador@exemplo.com", "COMPRADOR@EXEMPLO.COM")).toBe(true);
  });

  it("permite contas compradora e recebedora distintas", () => {
    expect(isCollectorPayer("comprador@exemplo.com", "vendedor@exemplo.com")).toBe(false);
  });

  it("preserva HTTPS nos retornos de checkout atrás do proxy", () => {
    const request = { protocol: "http", headers: { "x-forwarded-proto": "https", host: "multiloja-5u5xbdws.manus.space" }, header: (name) => name === "x-forwarded-proto" ? "https" : undefined, get: (name) => name === "host" ? "multiloja-5u5xbdws.manus.space" : undefined };
    expect(originFor(request)).toBe(process.env.APP_URL || "https://multiloja-5u5xbdws.manus.space");
  });

  it("explica uma URL de retorno recusada sem culpar o e-mail do pagador", () => {
    expect(preapprovalRejectionGuidance("back_url is invalid").code).toBe("MERCADO_PAGO_CALLBACK_URL_REJECTED");
  });

  it("remove caracteres inseguros do detalhe retornado pelo provedor", () => {
    expect(providerIssueSummary("invalid payer <token=abc>")).toBe("invalid payer token abc");
  });

  it("monta um pedido PIX compatível com a Orders API sem callback legado", () => {
    const payload = buildMercadoPagoOrderPayload({ order: { id: "order-1", amount_cents: 4990 }, email: "comprador@exemplo.com", name: "Maria da Silva", method: "pix" });
    expect(payload).toEqual({ type: "online", processing_mode: "automatic", total_amount: "49.90", external_reference: "order-1", payer: { email: "comprador@exemplo.com", first_name: "Maria" }, transactions: { payments: [{ amount: "49.90", payment_method: { id: "pix", type: "bank_transfer" }, expiration_time: "P1D" }] } });
    expect(payload).not.toHaveProperty("notification_url");
  });

  it("converte rejeições do provedor em mensagens seguras para o checkout", () => {
    expect(mercadoPagoOrderFailure(401, { error: "invalid_credentials" })).toMatchObject({ status: 503, code: "MERCADO_PAGO_CREDENTIALS" });
    expect(mercadoPagoOrderFailure(400, { errors: [{ code: "invalid_payer_email" }] })).toMatchObject({ status: 422, code: "MERCADO_PAGO_PAYER_REJECTED" });
  });
});
