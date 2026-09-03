import { describe, expect, it } from "vitest";
import { buildCommercialPreview, describeCommercialPrice, projectCommercialDomain } from "../shared/store-contract/commercial.js";
import { addCents, formatCents, percentageOfCents } from "../shared/store-contract/money.js";

function contract({ storeId = "store-a", productPrice = 10000, couponCode = "DEZ", couponType = "percentage", couponValue = 10, usageCount = 0, usageLimit = null } = {}) {
  return {
    store: { id: storeId, status: "active", locale: "pt-BR", currency: "BRL", settings: { freeShippingMinValue: 150, maxInstallments: 6, minInstallmentValue: 20, showPriceFrom: true }, paymentMethods: [{ id: "pix", name: "Pix", enabled: true, discount: null }, { id: "card", name: "Cartão", enabled: true, installments: 6, minInstallmentValue: 20 }], shippingMethods: [{ id: "pickup", name: "Retirada", description: "Retire", minDays: 0, maxDays: 0, price: 0, enabled: true }, { id: "pac", name: "PAC", description: "Entrega", minDays: 5, maxDays: 7, price: 20, enabled: true }] },
    products: [{ id: "product-1", categoryId: "category-1", active: true, price: productPrice / 100, priceFrom: productPrice === 10000 ? 150 : null, stock: 3, variants: [{ id: "variant-1", price: productPrice / 100, stock: 2 }] }],
    coupons: [{ id: "coupon-1", code: couponCode, type: couponType, value: couponValue, minValue: 50, maxDiscount: couponType === "percentage" ? 30 : null, usageLimit, usageCount, userLimit: null, startDate: null, endDate: null, active: true, categories: [], products: [] }],
  };
}

describe("domínio comercial", () => {
  it("centraliza operações monetárias em centavos com arredondamento determinístico", () => {
    expect(addCents(199, 1)).toBe(200);
    expect(percentageOfCents(19990, 10)).toBe(1999);
    expect(formatCents(29990)).toMatch(/299,90/);
  });

  it("preserva preço normal, promoção e semântica de preço a partir de", () => {
    expect(describeCommercialPrice({ priceCents: 10000, priceFromCents: 15000, showPriceFrom: true })).toMatchObject({ kind: "promotion", effectivePriceCents: 10000, originalPriceCents: 15000, discountPercent: 33.33 });
    expect(describeCommercialPrice({ priceCents: 15000, priceFromCents: 10000, showPriceFrom: true })).toMatchObject({ kind: "from", fromPriceCents: 10000 });
    expect(describeCommercialPrice({ priceCents: 0, priceFromCents: null, showPriceFrom: true })).toMatchObject({ kind: "standard", effectivePriceCents: 0 });
  });

  it("recalcula subtotal, cupom percentual limitado, frete e pagamento no domínio", () => {
    const preview = buildCommercialPreview(projectCommercialDomain(contract()), { items: [{ productId: "product-1", variantId: "variant-1", quantity: 2 }], couponCode: "dez", shippingMethodId: "pac", paymentMethodId: "card" });
    expect(preview).toMatchObject({ storeId: "store-a", subtotalCents: 20000, discountCents: 2000, merchandiseTotalCents: 18000, totalCents: 18000, shipping: { methodId: "pac", priceCents: 0, freeShippingApplied: true }, payment: { methodId: "card", maxInstallments: 6 } });
    expect(preview.finalization.supported).toBe(false);
  });

  it("rejeita quantidade, estoque, variante, cupom vencido por uso e método indisponível", () => {
    const domain = projectCommercialDomain(contract({ usageLimit: 1, usageCount: 1 }));
    expect(() => buildCommercialPreview(domain, { items: [{ productId: "product-1", quantity: 1 }] })).toThrow(/variante/i);
    expect(() => buildCommercialPreview(domain, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 3 }] })).toThrow(/estoque/i);
    expect(() => buildCommercialPreview(domain, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "DEZ" })).toThrow(/limite/i);
    expect(() => buildCommercialPreview(projectCommercialDomain(contract()), { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], paymentMethodId: "unknown" })).toThrow(/pagamento/i);
  });

  it("protege os limites de desconto, estoque e validade sem reduzir totais abaixo de zero", () => {
    const fixed = projectCommercialDomain(contract({ couponType: "fixed", couponValue: 500 }));
    const fixedPreview = buildCommercialPreview(fixed, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "DEZ" });
    expect(fixedPreview).toMatchObject({ subtotalCents: 10000, discountCents: 10000, merchandiseTotalCents: 0 });

    const hundredPercent = projectCommercialDomain(contract({ couponValue: 100 }));
    const percentPreview = buildCommercialPreview(hundredPercent, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "DEZ" });
    expect(percentPreview.discountCents).toBe(3000);

    const expiredSource = contract();
    expiredSource.coupons[0].endDate = "2020-01-01T00:00:00.000Z";
    expect(() => buildCommercialPreview(projectCommercialDomain(expiredSource), { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "DEZ" })).toThrow(/expirou/i);
    const inactiveSource = contract();
    inactiveSource.coupons[0].active = false;
    expect(() => buildCommercialPreview(projectCommercialDomain(inactiveSource), { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "DEZ" })).toThrow(/disponível/i);
    const belowMinimum = contract();
    belowMinimum.coupons[0].minValue = 150;
    expect(() => buildCommercialPreview(projectCommercialDomain(belowMinimum), { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "DEZ" })).toThrow(/mínimo/i);
  });

  it("bloqueia estoque zero e negativo e mantém frete grátis por cupom em confirmação", () => {
    const zeroStock = contract();
    zeroStock.products[0].variants[0].stock = 0;
    expect(() => buildCommercialPreview(projectCommercialDomain(zeroStock), { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }] })).toThrow(/sem estoque/i);
    const negativeStock = contract();
    negativeStock.products[0].variants[0].stock = -2;
    expect(() => buildCommercialPreview(projectCommercialDomain(negativeStock), { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }] })).toThrow(/sem estoque/i);
    const freeShipping = projectCommercialDomain(contract({ couponType: "free_shipping", couponValue: 0 }));
    const preview = buildCommercialPreview(freeShipping, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "DEZ", shippingMethodId: "pac" });
    expect(preview.shipping.warnings.join(" ")).toMatch(/cupom de frete grátis/i);
  });

  it("mantém preços e cupons isolados por domínio de loja", () => {
    const storeA = projectCommercialDomain(contract({ storeId: "store-a", productPrice: 10000, couponCode: "A10" }));
    const storeB = projectCommercialDomain(contract({ storeId: "store-b", productPrice: 25000, couponCode: "B10" }));
    const previewA = buildCommercialPreview(storeA, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "A10" });
    const previewB = buildCommercialPreview(storeB, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "B10" });
    expect(previewA).toMatchObject({ storeId: "store-a", subtotalCents: 10000, discountCents: 1000 });
    expect(previewB).toMatchObject({ storeId: "store-b", subtotalCents: 25000, discountCents: 2500 });
    expect(() => buildCommercialPreview(storeA, { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }], couponCode: "B10" })).toThrow(/cupom/i);
  });
});
