/** Valida a assinatura HMAC das notificações Mercado Pago sem depender de uma chamada externa. */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "./api.js";

describe("assinatura de webhook Mercado Pago", () => {
  it("aceita o manifesto assinado e rejeita uma assinatura adulterada", () => {
    const secret = "segredo-de-webhook-para-teste";
    const requestId = "req-123";
    const resourceId = "SUBSCRIPTION-9";
    const timestamp = "1704908010";
    const manifest = `id:${resourceId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
    const signature = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(verifyMercadoPagoSignature({ signature: `ts=${timestamp},v1=${signature}`, requestId, resourceId, secret })).toBe(true);
    expect(verifyMercadoPagoSignature({ signature: `ts=${timestamp},v1=${"0".repeat(64)}`, requestId, resourceId, secret })).toBe(false);
  });
});
