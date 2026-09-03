import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  one: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}));
const categoryId = "3f72bf36-6fcf-4dcf-aed4-a3986b11870c";
const draftId = "b1a7e30f-6055-4854-9e4b-4302444280cb";

vi.mock("./db.js", () => mocked);
vi.mock("./modules/storage/media-storage.js", () => ({ getProductStorage: () => ({ put: vi.fn(), remove: vi.fn().mockResolvedValue(undefined) }), productMediaKey: ({ accountId, storeId, draftId, folder, assetId, extension }) => `${accountId}/${storeId}/products/${draftId}/${folder}/${assetId}.${extension}` }));
vi.mock("./modules/store-contract/r2-sync.js", () => ({ syncStoreContractToR2: vi.fn().mockResolvedValue({ key: "loja-teste.json" }) }));

import router, { parseProductInput } from "./modules/products/routes.js";

function call(method, url, { body = {}, user = { id: "user-1" } } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url, "http://localhost");
    const req = { method, url: `${parsed.pathname}${parsed.search}`, originalUrl: url, headers: {}, body, query: Object.fromEntries(parsed.searchParams), user };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
    };
    router.handle(req, res, reject);
  });
}

describe("contratos REST de categorias", () => {
  beforeEach(() => { mocked.one.mockReset(); mocked.query.mockReset(); mocked.transaction.mockReset(); });

  it("lista categorias com a contagem de produtos no contrato público", async () => {
    mocked.one.mockResolvedValueOnce({ id: "store-1", name: "Minha loja" });
    mocked.query.mockResolvedValueOnce([{ id: "category-1", store_id: "store-1", name: "Camisetas", description: "Básicos", product_count: 2, created_at: 100, updated_at: 120 }]);
    const response = await call("GET", "/stores/store-1/categories");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ categories: [{ id: "category-1", storeId: "store-1", parentCategoryId: null, name: "Camisetas", description: "Básicos", cropAspect: "1:1", cardImageUrl: null, heroImageUrl: null, active: true, productCount: 2, createdAt: 100, updatedAt: 120 }] });
  });

  it("cria uma categoria e devolve a categoria persistida", async () => {
    mocked.one.mockResolvedValueOnce({ id: "store-1", name: "Minha loja" }).mockResolvedValueOnce(null);
    mocked.query.mockResolvedValueOnce({ affectedRows: 1 });
    const response = await call("POST", "/stores/store-1/categories", { body: { name: "Calçados", description: "Tênis e sapatos" } });
    expect(response.status).toBe(201);
    expect(response.body.category).toMatchObject({ storeId: "store-1", name: "Calçados", description: "Tênis e sapatos", cropAspect: "1:1", productCount: 0 });
    expect(mocked.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO ld_product_categories"), expect.any(Array));
  });

  it("aceita o padrão de recorte escolhido para a categoria", async () => {
    mocked.one.mockResolvedValueOnce({ id: "store-1", name: "Minha loja" }).mockResolvedValueOnce(null);
    mocked.query.mockResolvedValueOnce({ affectedRows: 1 });
    const response = await call("POST", "/stores/store-1/categories", { body: { name: "Stories", cropAspect: "9:16" } });
    expect(response.status).toBe(201);
    expect(response.body.category.cropAspect).toBe("9:16");
    expect(mocked.query.mock.calls[0][1]).toContain("9:16");
  });

  it("persiste as URLs de imagem de card e capa da categoria", async () => {
    mocked.one.mockResolvedValueOnce({ id: "store-1", name: "Minha loja" }).mockResolvedValueOnce(null);
    mocked.query.mockResolvedValueOnce({ affectedRows: 1 });
    const response = await call("POST", "/stores/store-1/categories", { body: { name: "Novidades", cardImageUrl: "https://cdn.example/card.webp", heroImageUrl: "https://cdn.example/capa.webp" } });
    expect(response.status).toBe(201);
    expect(response.body.category).toMatchObject({ cardImageUrl: "https://cdn.example/card.webp", heroImageUrl: "https://cdn.example/capa.webp" });
    expect(mocked.query.mock.calls[0][1]).toEqual(expect.arrayContaining(["https://cdn.example/card.webp", "https://cdn.example/capa.webp"]));
  });

  it("edita uma categoria da loja autenticada", async () => {
    mocked.one.mockResolvedValueOnce({ id: "category-1", store_id: "store-1", name: "Antigo", description: "Antes", created_at: 100, updated_at: 100 }).mockResolvedValueOnce(null);
    mocked.query.mockResolvedValueOnce({ affectedRows: 1 });
    const response = await call("PATCH", "/stores/store-1/categories/category-1", { body: { name: "Novo nome", description: "Depois" } });
    expect(response.status).toBe(200);
    expect(response.body.category).toMatchObject({ id: "category-1", name: "Novo nome", description: "Depois" });
  });

  it("bloqueia a exclusão de categoria com produtos vinculados", async () => {
    mocked.one.mockResolvedValueOnce({ id: "category-1", store_id: "store-1", name: "Camisetas" }).mockResolvedValueOnce({ id: "product-1" });
    mocked.query.mockResolvedValueOnce([{ id: "category-1", parent_category_id: null }]);
    const response = await call("DELETE", "/stores/store-1/categories/category-1");
    expect(response).toEqual({ status: 409, body: { error: "Marque a confirmação para excluir as subcategorias e os produtos vinculados." } });
  });
});

describe("contratos REST de produtos", () => {
  beforeEach(() => { mocked.one.mockReset(); mocked.query.mockReset(); mocked.transaction.mockReset(); });

  it("lista produtos com a ordenação recente usada no carregamento inicial da página", async () => {
    mocked.one.mockResolvedValueOnce({ id: "store-1", name: "Minha loja" }).mockResolvedValueOnce({ total: 0 });
    mocked.query.mockResolvedValueOnce([]);

    const response = await call("GET", "/stores/store-1/products?sort=recent&page=1&limit=20");

    expect(response).toEqual({ status: 200, body: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } } });
    expect(mocked.query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY products.created_at DESC"), ["store-1"]);
  });

  it("retorna o detalhe público do produto com mídias", async () => {
    mocked.one.mockResolvedValueOnce({ id: "product-1", store_id: "store-1", category_id: "category-1", category_name: "Camisetas", name: "Camiseta básica", description: "Algodão", price_cents: 5990, status: "active", created_at: 100, updated_at: 120 });
    mocked.query.mockResolvedValueOnce([{ id: "media-1", kind: "image", url: "https://cdn.example/user-1/store-1/products/x/images/x.webp", content_type: "image/webp", file_size: 1234, sort_order: 0, is_primary: 1, created_at: 101 }]);
    const response = await call("GET", "/stores/store-1/products/product-1");
    expect(response.status).toBe(200);
    expect(response.body.product).toEqual(expect.objectContaining({ id: "product-1", categoryName: "Camisetas", priceCents: 5990, status: "active", media: [expect.objectContaining({ kind: "image", isPrimary: true })] }));
  });

  it("retorna 404 ao consultar produto fora do escopo da loja", async () => {
    mocked.one.mockResolvedValueOnce(null);
    const response = await call("GET", "/stores/store-1/products/product-hidden");
    expect(response).toEqual({ status: 404, body: { error: "Produto não encontrado." } });
  });

  it("não cria produto quando a loja não pertence ao usuário", async () => {
    mocked.one.mockResolvedValueOnce(null);
    const response = await call("POST", "/stores/store-1/products", { body: { name: "Camiseta", categoryId, priceCents: 4990, draftId, uploadIds: [draftId] } });
    expect(response).toEqual({ status: 404, body: { error: "Loja não encontrada." } });
  });

  it("cria produto e devolve o contrato público com categoria e mídia", async () => {
    const stagedImage = { id: draftId, store_id: "store-1", user_id: "user-1", draft_id: draftId, kind: "image", storage_key: `user-1/store-1/products/${draftId}/images/${categoryId}.webp`, url: `https://cdn.example/user-1/store-1/products/${draftId}/images/${categoryId}.webp`, content_type: "image/webp", file_size: 1200, created_at: 100 };
    mocked.one.mockResolvedValueOnce({ id: "store-1", name: "Minha loja" });
    mocked.transaction.mockImplementation(async (callback) => callback({ one: vi.fn().mockResolvedValue({ id: categoryId, name: "Camisetas", active: 1 }), query: vi.fn().mockResolvedValueOnce([stagedImage]).mockResolvedValue({ affectedRows: 1 }) }));
    const response = await call("POST", "/stores/store-1/products", { body: { name: "Camiseta", description: "Algodão", categoryId, priceCents: 4990, status: "active", draftId, uploadIds: [draftId] } });
    expect(response.status).toBe(201);
    expect(response.body.product).toEqual(expect.objectContaining({ storeId: "store-1", categoryId, categoryName: "Camisetas", name: "Camiseta", description: "Algodão", priceCents: 4990, status: "active", media: [expect.objectContaining({ kind: "image", isPrimary: true })] }));
  });

  it("valida e persiste SKU, preços complementares, estoque, dimensões, tags e variantes sem atributos ou SEO", async () => {
    const parsed = parseProductInput({ name: "Camiseta premium", sku: "CAM-001", description: "Algodão", shortDescription: "Básica premium", categoryId, priceCents: 4990, compareAtPriceCents: 6990, costPriceCents: 2100, brand: "Linha própria", tags: ["algodão", "básica"], stockQuantity: 12, weightGrams: 180, widthMm: 300, heightMm: 400, depthMm: 20, variants: [{ name: "P", sku: "CAM-001-P", priceCents: 4990, stockQuantity: 4 }, { name: "M", sku: "CAM-001-M", stockQuantity: 8 }], draftId, uploadIds: [draftId], attributes: { color: "ignorar" }, seo: { title: "ignorar" }, featured: true });
    expect(parsed.valid, parsed.error).toBe(true);
    expect(parsed.value).toMatchObject({ sku: "CAM-001", shortDescription: "Básica premium", compareAtPriceCents: 6990, costPriceCents: 2100, stockQuantity: 12, variants: [expect.objectContaining({ sku: "CAM-001-P" }), expect.objectContaining({ priceCents: null })] });
    expect(parsed.value).not.toHaveProperty("attributes");
    expect(parsed.value).not.toHaveProperty("seo");
    expect(parsed.value).not.toHaveProperty("featured");

    const stagedImage = { id: draftId, store_id: "store-1", user_id: "user-1", draft_id: draftId, kind: "image", storage_key: `user-1/store-1/products/${draftId}/images/${categoryId}.webp`, url: `https://cdn.example/user-1/store-1/products/${draftId}/images/${categoryId}.webp`, content_type: "image/webp", file_size: 1200, created_at: 100 };
    mocked.one.mockResolvedValueOnce({ id: "store-1", name: "Minha loja" });
    mocked.transaction.mockImplementation(async (callback) => callback({ one: vi.fn().mockResolvedValue({ id: categoryId, name: "Camisetas", active: 1 }), query: vi.fn().mockResolvedValueOnce([stagedImage]).mockResolvedValue({ affectedRows: 1 }) }));
    const response = await call("POST", "/stores/store-1/products", { body: { ...parsed.value } });
    expect(response.status).toBe(201);
    expect(response.body.product).toMatchObject({ sku: "CAM-001", brand: "Linha própria", stockQuantity: 12, dimensions: { widthMm: 300, heightMm: 400, depthMm: 20 }, variants: [expect.objectContaining({ name: "P", stockQuantity: 4 }), expect.objectContaining({ name: "M", priceCents: null })] });
    expect(response.body.product).not.toHaveProperty("attributes");
    expect(response.body.product).not.toHaveProperty("seo");
    expect(response.body.product).not.toHaveProperty("featured");
  });

  it("rejeita variantes com SKU duplicado e estoque inválido", () => {
    const base = { name: "Camiseta", categoryId, priceCents: 4990, draftId, uploadIds: [draftId] };
    expect(parseProductInput({ ...base, variants: [{ name: "P", sku: "CAM-1", stockQuantity: 1 }, { name: "M", sku: "cam-1", stockQuantity: 1 }] }).valid).toBe(false);
    expect(parseProductInput({ ...base, stockQuantity: -1 }).valid).toBe(false);
  });

  it("não edita produto inexistente no escopo da loja", async () => {
    mocked.one.mockResolvedValueOnce(null);
    const response = await call("PATCH", "/stores/store-1/products/product-1", { body: { name: "Camiseta", categoryId, priceCents: 4990 } });
    expect(response).toEqual({ status: 404, body: { error: "Produto não encontrado." } });
  });

  it("edita produto e preserva o formato público de resposta", async () => {
    const existing = { id: "product-1", store_id: "store-1", category_id: categoryId, category_name: "Camisetas", name: "Camiseta", description: "Antes", price_cents: 4990, status: "active", created_at: 100, updated_at: 120 };
    const currentImage = { id: "media-1", kind: "image", url: "https://cdn.example/user-1/store-1/products/x/images/x.webp", content_type: "image/webp", file_size: 1200, sort_order: 0, is_primary: 1, created_at: 101 };
    mocked.one.mockResolvedValueOnce(existing);
    mocked.transaction.mockImplementation(async (callback) => callback({ one: vi.fn().mockResolvedValue({ id: categoryId, name: "Camisetas" }), query: vi.fn().mockResolvedValueOnce([currentImage]).mockResolvedValue({ affectedRows: 1 }) }));
    const response = await call("PATCH", "/stores/store-1/products/product-1", { body: { name: "Camiseta renovada", description: "Depois", categoryId, priceCents: 5990, status: "active" } });
    expect(response.status).toBe(200);
    expect(response.body.product).toEqual(expect.objectContaining({ id: "product-1", name: "Camiseta renovada", description: "Depois", categoryName: "Camisetas", priceCents: 5990, createdAt: 100, media: [expect.objectContaining({ id: "media-1", kind: "image" })] }));
  });

  it("exclui um produto pertencente à loja e responde com sucesso", async () => {
    mocked.one.mockResolvedValueOnce({ id: "product-1", store_id: "store-1", name: "Camiseta" });
    mocked.query.mockResolvedValueOnce([{ storage_key: "products/b1a7e30f-6055-4854-9e4b-4302444280cb/images/3f72bf36-6fcf-4dcf-aed4-a3986b11870c.webp" }]).mockResolvedValueOnce({ affectedRows: 1 });
    const response = await call("DELETE", "/stores/store-1/products/product-1");
    expect(response).toEqual({ status: 200, body: { ok: true } });
    expect(mocked.query).toHaveBeenLastCalledWith("DELETE FROM ld_products WHERE id = ?", ["product-1"]);
  });

  it("retorna 404 ao excluir produto fora do escopo da loja", async () => {
    mocked.one.mockResolvedValueOnce(null);
    const response = await call("DELETE", "/stores/store-1/products/product-hidden");
    expect(response).toEqual({ status: 404, body: { error: "Produto não encontrado." } });
  });
});
