import { describe, expect, it } from "vitest";
import { buildProductFilters, matchesMediaSignature, parsePagination, parseProductInput } from "./modules/products/routes.js";
import { bannerMediaKey, isSafeStorageKey, productMediaKey, storeMediaKey } from "./modules/storage/media-storage.js";
import { getProductListInput, parseCategoryInput } from "./modules/products/validation.js";

const categoryId = "3f72bf36-6fcf-4dcf-aed4-a3986b11870c";
const draftId = "b1a7e30f-6055-4854-9e4b-4302444280cb";

describe("regras do catálogo", () => {
  it("normaliza a paginação para os limites permitidos", () => {
    expect(parsePagination({ page: "3", limit: "50" })).toEqual({ page: 3, limit: 50, offset: 100 });
    expect(parsePagination({ page: "0", limit: "13" })).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("aceita a ordenação padrão recente enviada pela página de produtos", () => {
    const input = getProductListInput({ storeId: "store-1", page: "1", limit: "20", sort: "recent" });
    expect(input.sort).toBe("products.created_at DESC");
  });

  it("normaliza o status de ativação da categoria", () => {
    expect(parseCategoryInput({ name: "Coleção de inverno", description: "", active: false })).toMatchObject({ name: "Coleção de inverno", active: false });
    expect(parseCategoryInput({ name: "Novidades" }).active).toBe(true);
  });

  it("monta busca, categoria e intervalo de data apenas com parâmetros", () => {
    const filters = buildProductFilters("store-1", { search: "camisa", categoryId, dateFrom: "100", dateTo: "200" });
    expect(filters.where).toContain("products.store_id = ?");
    expect(filters.where).toContain("products.name LIKE ?");
    expect(filters.where).toContain("products.category_id = ?");
    expect(filters.params).toEqual(["store-1", "%camisa%", "%camisa%", categoryId, 100, 200]);
  });

  it("exige os dados comerciais e mídias antes de criar um produto", () => {
    expect(parseProductInput({ name: "", categoryId, priceCents: 1290, draftId, uploadIds: [draftId] }).valid).toBe(false);
    expect(parseProductInput({ name: "Camiseta", categoryId, priceCents: 12.5, draftId, uploadIds: [draftId] }).valid).toBe(false);
    expect(parseProductInput({ name: "Camiseta", categoryId, priceCents: 1290, draftId, uploadIds: [draftId] }).valid).toBe(true);
  });

  it("reconhece a assinatura esperada das imagens e recusa conteúdo mascarado", () => {
    expect(matchesMediaSignature(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]), "image/jpeg")).toBe(true);
    expect(matchesMediaSignature(Buffer.from("<html>arquivo falso</html>"), "image/jpeg")).toBe(false);
  });

  it("gera chaves R2 por conta e loja para produtos, banners e imagens institucionais", () => {
    const accountId = "account-1";
    const storeId = "store-1";
    const productKey = productMediaKey({ accountId, storeId, draftId, folder: "images", assetId: categoryId, extension: "webp" });
    const bannerKey = bannerMediaKey({ accountId, storeId, bannerId: draftId, breakpoint: "desktop", assetId: categoryId, extension: "png" });
    const logoKey = storeMediaKey({ accountId, storeId, kind: "logo", assetId: categoryId, extension: "png" });
    expect(productKey).toBe(`${accountId}/${storeId}/products/${draftId}/images/${categoryId}.webp`);
    expect(bannerKey).toBe(`${accountId}/${storeId}/banners/${draftId}/desktop/${categoryId}.png`);
    expect(logoKey).toBe(`${accountId}/${storeId}/store/logo/${categoryId}.png`);
    expect([productKey, bannerKey, logoKey].every(isSafeStorageKey)).toBe(true);
    expect(isSafeStorageKey("products/../../.env")).toBe(false);
  });
});
