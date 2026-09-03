import { describe, expect, it } from "vitest";
import { BillingValidationError, parseCardPaymentInput } from "./modules/billing/validation.js";

describe("validação do checkout transparente", () => {
  it("assume uma parcela somente quando o campo não foi enviado", () => {
    expect(parseCardPaymentInput({ storeId: "store_1", token: "tok_abc", paymentMethodId: "visa" })).toMatchObject({ storeId: "store_1", installments: 1 });
  });
  it("rejeita payload de cartão sem token, loja ou método", () => {
    expect(() => parseCardPaymentInput({ storeId: "store_1", paymentMethodId: "visa" })).toThrow(BillingValidationError);
    expect(() => parseCardPaymentInput({ token: "tok_abc", paymentMethodId: "visa" })).toThrow(BillingValidationError);
  });
  it("rejeita parcelas fora da faixa do contrato", () => {
    expect(() => parseCardPaymentInput({ storeId: "store_1", token: "tok_abc", paymentMethodId: "visa", installments: 0 })).toThrow(BillingValidationError);
    expect(() => parseCardPaymentInput({ storeId: "store_1", token: "tok_abc", paymentMethodId: "visa", installments: 13 })).toThrow(BillingValidationError);
    expect(() => parseCardPaymentInput({ storeId: "store_1", token: "tok_abc", paymentMethodId: "visa", installments: "" })).toThrow(BillingValidationError);
    expect(() => parseCardPaymentInput({ storeId: "store_1", token: "tok_abc", paymentMethodId: "visa", installments: null })).toThrow(BillingValidationError);
  });
});
