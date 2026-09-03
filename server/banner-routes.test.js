import { describe, expect, it } from "vitest";
import { parseBannerInput, publicBanner, publicImage } from "./modules/banners/routes.js";

describe("regras de banners por loja", () => {
  it("normaliza páginas, categorias e posição do banner", () => {
    const category = "11111111-1111-4111-8111-111111111111";
    const banner = parseBannerInput({ title: " Campanha principal ", pages: ["home", "categories", "home"], categoryIds: [category, category], position: "after_row_2", active: true });
    expect(banner).toEqual({ title: "Campanha principal", subtitle: "", targetUrl: "", buttonText: "", bannerKind: "hero", sortOrder: 0, pages: ["home", "categories"], categoryIds: [category], position: "after_row_2", active: true });
  });

  it("aceita chamadas e ordenação de mini-banner", () => {
    const banner = parseBannerInput({ title: "Coleção", subtitle: "Novidades", targetUrl: "/categoria/novidades", buttonText: "Ver coleção", bannerKind: "mini", sortOrder: 3, pages: ["home"], position: "middle", active: true });
    expect(banner).toMatchObject({ bannerKind: "mini", subtitle: "Novidades", targetUrl: "/categoria/novidades", buttonText: "Ver coleção", sortOrder: 3 });
  });

  it("remove categorias quando a página de categorias não foi selecionada", () => {
    const banner = parseBannerInput({ title: "Inicial", pages: ["home"], categoryIds: ["11111111-1111-4111-8111-111111111111"], position: "top" });
    expect(banner.categoryIds).toEqual([]);
  });

  it("rejeita ausência de página e posição inválida", () => {
    expect(() => parseBannerInput({ title: "Sem página", pages: [], position: "top" })).toThrow("Selecione ao menos uma página");
    expect(() => parseBannerInput({ title: "Posição", pages: ["home"], position: "floating" })).toThrow("posição válida");
    expect(() => parseBannerInput({ title: "Categorias", pages: ["categories"], categoryIds: [], position: "top", active: true })).toThrow("ao menos uma categoria");
  });

  it("expõe mídia de banner com crop e zoom para renderização", () => {
    const image = publicImage({ id: "media-1", banner_id: "banner-1", breakpoint: "desktop", url: "https://cdn.example/account-1/store-1/banners/x/desktop/y.png", width: 1280, height: 360, crop_x: "42.50", crop_y: "70.00", crop_zoom: "1.4", sort_order: 0, active: 0, created_at: 1 });
    const banner = publicBanner({ id: "banner-1", store_id: "store-1", title: "Principal", pages: "[\"home\"]", category_ids: "[]", display_position: "top", active: 1, created_at: 1, updated_at: 2 }, [image]);
    expect(image).toMatchObject({ cropX: 42.5, cropY: 70, cropZoom: 1.4, breakpoint: "desktop", active: false });
    expect(banner.images).toHaveLength(1);
  });
});
