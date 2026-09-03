import { describe, expect, it } from "vitest";
import { aspectValue, hasUnlinkedProductMedia, isProductSaveReady, productMediaLimit } from "./ProductsPage";

describe("guarda de vínculo de mídia de produto", () => {
  it("bloqueia mídia nova pendente, em erro ou sem identificador de upload", () => {
    expect(hasUnlinkedProductMedia([{ existing: false, status: "uploading", uploadId: null }])).toBe(true);
    expect(hasUnlinkedProductMedia([{ existing: false, status: "error", uploadId: null }])).toBe(true);
    expect(hasUnlinkedProductMedia([{ existing: false, status: "uploaded", uploadId: null }])).toBe(true);
  });

  it("permite mídias existentes e novos uploads que já foram vinculados", () => {
    expect(hasUnlinkedProductMedia([{ existing: true, status: "uploaded", uploadId: null }, { existing: false, status: "uploaded", uploadId: "upload-1" }])).toBe(false);
  });

  it("habilita salvar produto apenas com nome, categoria e preço válidos", () => {
    expect(isProductSaveReady({ name: "", categoryId: "category-1", price: "10,00" })).toBe(false);
    expect(isProductSaveReady({ name: "Produto", categoryId: "", price: "10,00" })).toBe(false);
    expect(isProductSaveReady({ name: "Produto", categoryId: "category-1", price: "" })).toBe(false);
    expect(isProductSaveReady({ name: "Produto", categoryId: "category-1", price: "10,00" })).toBe(true);
  });

  it("resolve os três formatos definidos pela categoria antes de preparar as imagens", () => {
    expect(aspectValue("1:1")).toBe(1);
    expect(aspectValue("9:16")).toBe(9 / 16);
    expect(aspectValue("16:9")).toBe(16 / 9);
  });

  it("usa o limite do plano e aplica o teto configurado quando a mídia é ilimitada", () => {
    expect(productMediaLimit({ productImages: 8, productVideos: 2, unlimitedCap: 25 }, "productImages", 3)).toBe(8);
    expect(productMediaLimit({ productImages: 0, productVideos: 0, unlimitedCap: 25 }, "productImages", 3)).toBe(25);
    expect(productMediaLimit({ productImages: 0, productVideos: 0, unlimitedCap: 25 }, "productVideos", 1)).toBe(25);
    expect(productMediaLimit(null, "productImages", 3)).toBe(3);
  });
});
