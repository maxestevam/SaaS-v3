export class BillingValidationError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "BillingValidationError";
    this.status = status;
  }
}

export function parseCardPaymentInput(source = {}) {
  const storeId = String(source.storeId || "").trim();
  const token = String(source.token || "").trim();
  const paymentMethodId = String(source.paymentMethodId || "").trim();
  if (!storeId) throw new BillingValidationError(422, "Informe a loja.");
  if (!token) throw new BillingValidationError(422, "Informe o token do cartão.");
  if (!paymentMethodId) throw new BillingValidationError(422, "Informe o método de pagamento.");
  const installments = source.installments === undefined ? 1 : Number(source.installments);
  if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
    throw new BillingValidationError(422, "Informe uma quantidade de parcelas válida.");
  }
  return { storeId, token, paymentMethodId, installments };
}

export function parsePixPaymentInput(source = {}) {
  const storeId = String(source.storeId || "").trim();
  if (!storeId) throw new BillingValidationError(422, "Informe a loja.");
  return { storeId };
}
