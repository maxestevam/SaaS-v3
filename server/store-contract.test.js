import { describe, expect, it } from "vitest";
import { STORE_CONTRACT_VERSION, validateStoreContract } from "../shared/store-contract/schema.js";
import { StoreContractError, buildStoreContract, getPublicCommercialPreview, getStoreContract } from "./modules/store-contract/service.js";

const store = { id: "store-1", name: "Loja Aurora", slug: "loja-aurora", description: "Moda autoral", logo_url: "https://cdn.example/logo.png", status: 3, color: "#123456", font_family: "inter", contact_email: "oi@aurora.test", contact_phone: "11999999999", whatsapp_phone: "5511999999999", address_street: "Rua Um", address_number: "12", address_district: "Centro", address_city: "São Paulo", address_state: "SP", address_postal_code: "01001000", address_country: "BR", instagram_url: "https://instagram.com/aurora" };
const data = {
  categories: [
    { id: "category-root", name: "Vestidos", description: "Coleção", parent_category_id: null, active: 1, product_count: 1 },
    { id: "category-child", name: "Longos", description: "", parent_category_id: "category-root", active: 1, product_count: 1 },
  ],
  products: [{ id: "product-1", category_id: "category-child", name: "Vestido Aurora", description: "Modelo leve", price_cents: 19990, status: "active", created_at: 1700000000000, updated_at: 1700000000000 }],
  media: [{ id: "media-1", product_id: "product-1", kind: "image", url: "https://cdn.example/product.png", is_primary: 1, sort_order: 0 }],
  banners: [{ id: "banner-1", title: "Verão", display_position: "top", active: 1 }],
  bannerImages: [{ id: "banner-image-1", banner_id: "banner-1", breakpoint: "desktop", url: "https://cdn.example/banner.png", active: 1, sort_order: 0 }],
  coupons: [{ id: "coupon-1", code: "BEMVINDO10", discount_type: "percentage", percentage_off: 10, amount_off_cents: null, minimum_order_cents: 10000, usage_limit: 50, usage_count: 3, expires_at: null, active: 1 }],
};

describe("store contract", () => {
  it("mapeia dados reais do painel para um contrato público validável sem vazar custo ou billing do SaaS", () => {
    const contract = buildStoreContract(store, data);
    expect(contract.contractVersion).toBe(STORE_CONTRACT_VERSION);
    expect(validateStoreContract(contract)).toEqual({ success: true, issues: [] });
    expect(contract.store.contact.address.zipCode).toBe("01001000");
    expect(contract.categories[0].subcategories[0].id).toBe("category-child");
    expect(contract.products[0]).toMatchObject({ categoryId: "category-root", categorySlug: "vestidos", subcategoryId: "category-child", price: 199.9, thumbnail: "https://cdn.example/product.png", variants: [] });
    expect(contract.products[0]).not.toHaveProperty("costPrice");
    expect(contract.banners[0]).toMatchObject({ image: "https://cdn.example/banner.png", imageMobile: "https://cdn.example/banner.png" });
    expect(contract.coupons[0]).toMatchObject({ value: 10, minValue: 100, categories: [], products: [] });
    expect(contract.orders).toEqual([]);
  });

  it("detecta violações do schema formal", () => {
    const contract = buildStoreContract(store, data);
    delete contract.store.slug;
    const result = validateStoreContract(contract);
    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.path === "$.store.slug")).toBe(true);
  });

  it("aceita campos opcionais omitidos pelo contrato de referência", () => {
    const contract = buildStoreContract(store, data);
    delete contract.store.paymentMethods[0]?.discount;
    delete contract.categories[0].subcategories[0].image;
    expect(validateStoreContract(contract)).toEqual({ success: true, issues: [] });
  });

  it("exige a propriedade da loja no builder administrativo e preserva o isolamento multi-tenant", async () => {
    const calls = [];
    const dataSource = {
      findStoreForUser: async (storeId, userId) => { calls.push([storeId, userId]); return storeId === "store-1" && userId === "user-1" ? store : null; },
      loadStoreContractData: async (storeId) => { expect(storeId).toBe("store-1"); return data; },
    };
    await expect(getStoreContract({ storeId: "store-1", userId: "user-1", dataSource })).resolves.toMatchObject({ store: { id: "store-1" } });
    await expect(getStoreContract({ storeId: "store-2", userId: "user-1", dataSource })).rejects.toMatchObject({ status: 404 });
    expect(calls).toEqual([["store-1", "user-1"], ["store-2", "user-1"]]);
  });

  it("classifica uma loja não encontrada como erro de domínio", () => {
    expect(new StoreContractError(404, "Loja não encontrada.")).toMatchObject({ status: 404 });
  });

  it("recalcula uma prévia comercial somente a partir da loja pública resolvida pelo slug", async () => {
    const secondStore = { ...store, id: "store-2", slug: "loja-brisa", name: "Loja Brisa" };
    const source = {
      findPublicStoreBySlug: async (slug) => slug === "loja-aurora" ? store : slug === "loja-brisa" ? secondStore : null,
      loadStoreContractData: async (storeId) => ({ ...data, products: [{ ...data.products[0], id: `product-${storeId}`, price_cents: storeId === "store-1" ? 19990 : 45990 }], coupons: [] }),
    };
    await expect(getPublicCommercialPreview({ slug: "loja-aurora", input: { items: [{ productId: "product-store-1", quantity: 1 }] }, dataSource: source })).resolves.toMatchObject({ storeId: "store-1", subtotalCents: 19990 });
    await expect(getPublicCommercialPreview({ slug: "loja-brisa", input: { items: [{ productId: "product-store-1", quantity: 1 }] }, dataSource: source })).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });
  });
});
