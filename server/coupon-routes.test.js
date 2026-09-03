import { describe, expect, it } from "vitest";
import { parseCouponInput } from "./modules/coupons/routes.js";

describe("regras de cupom por loja", () => {
  it("normaliza desconto percentual, valor mínimo, validade e limite de usos", () => {
    const coupon = parseCouponInput({ code: " boas vindas 10 ", discountType: "percentage", percentageOff: "10", minimumOrderCents: 5000, expiresAt: 1788000000000, usageLimit: 100, active: true, newUsersOnly: true });
    expect(coupon).toMatchObject({ code: "BOAS-VINDAS-10", discountType: "percentage", percentageOff: 10, minimumOrderCents: 5000, usageLimit: 100, active: true, newUsersOnly: true });
  });

  it("mantém a regra de novo usuário desativada quando ela não é informada", () => {
    expect(parseCouponInput({ code: "LIVRE", discountType: "percentage", percentageOff: 10, minimumOrderCents: 0 }).newUsersOnly).toBe(false);
  });

  it("normaliza estados válidos e rejeita estados inválidos para frete grátis", () => {
    const coupon = parseCouponInput({ code: "FRETE-SP", discountType: "free_shipping", minimumOrderCents: 0, freeShippingStates: ["sp", "RJ", "SP"] });
    expect(coupon.freeShippingStates).toEqual(["SP", "RJ"]);
    expect(coupon.amountOffCents).toBeNull();
    expect(() => parseCouponInput({ code: "FRETE-INVALIDO", discountType: "free_shipping", minimumOrderCents: 0, freeShippingStates: ["SP", "XX"] })).toThrow("estados válidos");
  });

  it("rejeita desconto fixo sem valor e tipo inválido", () => {
    expect(() => parseCouponInput({ code: "SEMVALOR", discountType: "fixed", amountOffCents: 0 })).toThrow("valor fixo");
    expect(() => parseCouponInput({ code: "INVALIDO", discountType: "other" })).toThrow("tipo de benefício");
  });
});
