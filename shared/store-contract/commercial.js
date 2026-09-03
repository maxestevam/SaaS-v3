import { decimalToCents, isoToTimestamp } from "./normalizers.js";
import { addCents, clampCents, multiplyCents, percentageOfCents, subtractCents } from "./money.js";

export class CommercialRuleError extends Error {
  constructor(code, message) { super(message); this.name = "CommercialRuleError"; this.code = code; }
}

export function projectCommercialDomain(contract) {
  return {
    store: {
      id: String(contract.store.id),
      status: String(contract.store.status),
      locale: contract.store.locale || "pt-BR",
      currency: contract.store.currency || "BRL",
      settings: { freeShippingMinCents: decimalToCents(contract.store.settings?.freeShippingMinValue), maxInstallments: numberOrNull(contract.store.settings?.maxInstallments), minInstallmentCents: decimalToCents(contract.store.settings?.minInstallmentValue), showPriceFrom: booleanOrNull(contract.store.settings?.showPriceFrom) },
      paymentMethods: (contract.store.paymentMethods || []).map((method) => ({ id: String(method.id), name: String(method.name), enabled: method.enabled === true, installments: numberOrNull(method.installments), minInstallmentCents: decimalToCents(method.minInstallmentValue), discountPercent: numberOrNull(method.discount), daysToExpire: numberOrNull(method.daysToExpire) })),
      shippingMethods: (contract.store.shippingMethods || []).map((method) => ({ id: String(method.id), name: String(method.name), description: textOrNull(method.description), enabled: method.enabled === true, minDays: numberOrNull(method.minDays), maxDays: numberOrNull(method.maxDays), priceCents: decimalToCents(method.price) })),
    },
    products: (contract.products || []).map((product) => ({ id: String(product.id), categoryId: String(product.categoryId), active: product.active === true, priceCents: decimalToCents(product.price), priceFromCents: decimalToCents(product.priceFrom), stock: numberOrNull(product.stock), variants: (product.variants || []).map((variant) => ({ id: String(variant.id), priceCents: decimalToCents(variant.price), stock: numberOrNull(variant.stock) })) })),
    coupons: (contract.coupons || []).map((coupon) => ({ id: String(coupon.id), code: String(coupon.code).toUpperCase(), type: String(coupon.type), percentageOff: coupon.type === "percentage" ? numberOrNull(coupon.value) : null, valueCents: coupon.type === "fixed" ? decimalToCents(coupon.value) : null, minimumOrderCents: decimalToCents(coupon.minValue) || 0, maxDiscountCents: decimalToCents(coupon.maxDiscount), usageLimit: numberOrNull(coupon.usageLimit), usageCount: numberOrNull(coupon.usageCount) || 0, userLimit: numberOrNull(coupon.userLimit), startsAt: isoToTimestamp(coupon.startDate), expiresAt: isoToTimestamp(coupon.endDate), active: coupon.active === true, categoryIds: (coupon.categories || []).map(String), productIds: (coupon.products || []).map(String) })),
  };
}

export function buildCommercialPreview(domain, input = {}, now = Date.now()) {
  if (domain.store.status !== "active") throw new CommercialRuleError("STORE_UNAVAILABLE", "Esta loja não está disponível para consulta comercial.");
  const items = normalizeItems(input.items);
  const lines = items.map((item) => resolveLine(domain.products, item));
  const subtotalCents = addCents(...lines.map((line) => line.lineTotalCents));
  const coupon = resolveCoupon(domain.coupons, input.couponCode, lines, subtotalCents, now);
  const merchandiseTotalCents = subtractCents(subtotalCents, coupon.discountCents);
  const shipping = resolveShipping(domain.store, input.shippingMethodId, subtotalCents, coupon);
  const payment = resolvePayment(domain.store, input.paymentMethodId);
  const totalCents = shipping.priceCents === null ? null : addCents(merchandiseTotalCents, shipping.priceCents);
  return { storeId: domain.store.id, currency: domain.store.currency, locale: domain.store.locale, lines, subtotalCents, discountCents: coupon.discountCents, merchandiseTotalCents, shipping, payment, totalCents, finalization: { supported: false, reason: "Esta pré-validação não cria pedido, reserva estoque, pagamento ou checkout." }, warnings: [...coupon.warnings, ...shipping.warnings, ...payment.warnings] };
}

export function describeCommercialPrice({ priceCents, priceFromCents, showPriceFrom }) {
  if (priceCents === null) return { kind: "unavailable", effectivePriceCents: null, originalPriceCents: null, fromPriceCents: null, discountPercent: null };
  if (priceFromCents !== null && priceFromCents > priceCents) {
    const savings = priceFromCents - priceCents;
    return { kind: "promotion", effectivePriceCents: priceCents, originalPriceCents: priceFromCents, fromPriceCents: null, discountPercent: Math.floor(savings * 10_000 / priceFromCents) / 100 };
  }
  if (priceFromCents !== null && priceFromCents < priceCents && showPriceFrom === true) return { kind: "from", effectivePriceCents: priceCents, originalPriceCents: null, fromPriceCents: priceFromCents, discountPercent: null };
  return { kind: "standard", effectivePriceCents: priceCents, originalPriceCents: null, fromPriceCents: null, discountPercent: null };
}

export function describeAvailability(stock) { return stock === null ? { status: "unknown", available: null } : stock > 0 ? { status: "available", available: true } : { status: "out_of_stock", available: false }; }

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new CommercialRuleError("ITEMS_REQUIRED", "Informe ao menos um produto para a pré-validação.");
  const grouped = new Map();
  for (const item of items) {
    const productId = String(item?.productId || "").trim();
    const variantId = item?.variantId == null || item.variantId === "" ? null : String(item.variantId);
    const quantity = Number(item?.quantity);
    if (!productId || !Number.isSafeInteger(quantity) || quantity < 1) throw new CommercialRuleError("INVALID_QUANTITY", "Cada item deve possuir produto e quantidade inteira positiva.");
    const key = `${productId}:${variantId || "product"}`;
    grouped.set(key, { productId, variantId, quantity: (grouped.get(key)?.quantity || 0) + quantity });
  }
  return [...grouped.values()];
}

function resolveLine(products, item) {
  const product = products.find((candidate) => candidate.id === item.productId);
  if (!product || !product.active) throw new CommercialRuleError("PRODUCT_UNAVAILABLE", "Um produto solicitado não está disponível.");
  if (product.variants.length && !item.variantId) throw new CommercialRuleError("VARIANT_REQUIRED", "Selecione uma variante válida para este produto.");
  const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId) : null;
  if (item.variantId && !variant) throw new CommercialRuleError("INVALID_VARIANT", "A variante selecionada não pertence ao produto.");
  const stock = variant?.stock ?? product.stock;
  if (stock !== null && stock <= 0) throw new CommercialRuleError("OUT_OF_STOCK", "Um produto solicitado está sem estoque.");
  if (stock !== null && item.quantity > stock) throw new CommercialRuleError("INSUFFICIENT_STOCK", "A quantidade solicitada excede o estoque disponível.");
  const unitPriceCents = variant?.priceCents ?? product.priceCents;
  if (unitPriceCents === null) throw new CommercialRuleError("PRICE_UNAVAILABLE", "Um produto solicitado não possui preço disponível.");
  return { productId: product.id, variantId: variant?.id || null, quantity: item.quantity, unitPriceCents, lineTotalCents: multiplyCents(unitPriceCents, item.quantity), stock: describeAvailability(stock) };
}

function resolveCoupon(coupons, code, lines, subtotalCents, now) {
  if (!code || !String(code).trim()) return { code: null, type: null, discountCents: 0, freeShippingRequested: false, warnings: [] };
  const coupon = coupons.find((candidate) => candidate.code === String(code).trim().toUpperCase());
  if (!coupon || !coupon.active) throw new CommercialRuleError("COUPON_INVALID", "Este cupom não está disponível.");
  if (coupon.startsAt !== null && coupon.startsAt > now) throw new CommercialRuleError("COUPON_NOT_STARTED", "Este cupom ainda não está disponível.");
  if (coupon.expiresAt !== null && coupon.expiresAt < now) throw new CommercialRuleError("COUPON_EXPIRED", "Este cupom expirou.");
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) throw new CommercialRuleError("COUPON_LIMIT_REACHED", "Este cupom atingiu o limite de uso.");
  if (subtotalCents < coupon.minimumOrderCents) throw new CommercialRuleError("COUPON_MINIMUM_NOT_REACHED", "O valor mínimo deste cupom não foi atingido.");
  if (coupon.userLimit !== null || coupon.categoryIds.length || coupon.productIds.length) throw new CommercialRuleError("COUPON_SCOPE_REQUIRES_CONFIRMATION", "A elegibilidade deste cupom requer validação comercial adicional.");
  if (coupon.type === "percentage") {
    const uncapped = percentageOfCents(subtotalCents, coupon.percentageOff);
    return { code: coupon.code, type: coupon.type, discountCents: coupon.maxDiscountCents === null ? uncapped : Math.min(uncapped, coupon.maxDiscountCents), freeShippingRequested: false, warnings: [] };
  }
  if (coupon.type === "fixed") return { code: coupon.code, type: coupon.type, discountCents: clampCents(coupon.valueCents, 0, subtotalCents), freeShippingRequested: false, warnings: [] };
  if (coupon.type === "free_shipping") return { code: coupon.code, type: coupon.type, discountCents: 0, freeShippingRequested: true, warnings: ["A elegibilidade de frete grátis será confirmada quando houver cálculo de entrega."] };
  throw new CommercialRuleError("COUPON_TYPE_UNSUPPORTED", "O tipo de cupom não é suportado.");
}

function resolveShipping(store, shippingMethodId, subtotalCents, coupon) {
  const warnings = [];
  if (!shippingMethodId) return { methodId: null, methodName: null, priceCents: null, status: "not_selected", minDays: null, maxDays: null, freeShippingApplied: false, warnings };
  const method = store.shippingMethods.find((candidate) => candidate.id === String(shippingMethodId));
  if (!method || !method.enabled) throw new CommercialRuleError("SHIPPING_UNAVAILABLE", "O método de frete não está disponível.");
  if (method.priceCents === null) return { methodId: method.id, methodName: method.name, priceCents: null, status: "requires_quote", minDays: method.minDays, maxDays: method.maxDays, freeShippingApplied: false, warnings: ["Este frete precisa de cotação antes da confirmação.", ...warnings] };
  const freeShippingApplied = store.settings.freeShippingMinCents !== null && subtotalCents >= store.settings.freeShippingMinCents;
  if (coupon.freeShippingRequested) warnings.push("O cupom de frete grátis precisa de confirmação de elegibilidade para esta entrega.");
  return { methodId: method.id, methodName: method.name, priceCents: freeShippingApplied ? 0 : method.priceCents, status: "quoted", minDays: method.minDays, maxDays: method.maxDays, freeShippingApplied, warnings };
}

function resolvePayment(store, paymentMethodId) {
  if (!paymentMethodId) return { methodId: null, methodName: null, enabled: null, maxInstallments: null, minInstallmentCents: null, warnings: [] };
  const method = store.paymentMethods.find((candidate) => candidate.id === String(paymentMethodId));
  if (!method || !method.enabled) throw new CommercialRuleError("PAYMENT_UNAVAILABLE", "O método de pagamento não está disponível.");
  return { methodId: method.id, methodName: method.name, enabled: true, maxInstallments: method.installments ?? store.settings.maxInstallments, minInstallmentCents: method.minInstallmentCents ?? store.settings.minInstallmentCents, warnings: method.discountPercent !== null ? ["O desconto do método de pagamento depende de confirmação comercial antes da finalização."] : [] };
}

function textOrNull(value) { const result = String(value ?? "").trim(); return result || null; }
function numberOrNull(value) { return value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value); }
function booleanOrNull(value) { return value === null || value === undefined ? null : Boolean(value); }
