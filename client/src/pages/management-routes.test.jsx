import { describe, expect, it } from "vitest";
import { shouldShowListControls } from "@/lib/list-controls";
import { productRoute } from "./ProductsPage.jsx";
import { customerRoute } from "./CustomersPage.jsx";
import { couponRoute } from "./CouponsPage.jsx";
import { bannerRoute } from "./BannersPage.jsx";

describe("rotas navegáveis da gestão", () => {
  it("resolve criação, visualização e edição dos recursos principais", () => {
    expect(productRoute("/products/create")).toMatchObject({ kind: "create" });
    expect(productRoute("/products/product-1")).toMatchObject({ kind: "view", productId: "product-1" });
    expect(productRoute("/products/product-1/edit")).toMatchObject({ kind: "edit", productId: "product-1" });
    expect(customerRoute("/customers/create")).toMatchObject({ kind: "create" });
    expect(customerRoute("/customers/customer-1")).toMatchObject({ kind: "view", customerId: "customer-1" });
    expect(customerRoute("/customers/customer-1/edit")).toMatchObject({ kind: "edit", customerId: "customer-1" });
    expect(couponRoute("/coupons/create")).toMatchObject({ kind: "create" });
    expect(couponRoute("/coupons/coupon-1")).toMatchObject({ kind: "view", couponId: "coupon-1" });
    expect(couponRoute("/coupons/coupon-1/edit")).toMatchObject({ kind: "edit", couponId: "coupon-1" });
    expect(bannerRoute("/banners/create")).toMatchObject({ kind: "create" });
    expect(bannerRoute("/banners/banner-1")).toMatchObject({ kind: "view", bannerId: "banner-1" });
    expect(bannerRoute("/banners/banner-1/edit")).toMatchObject({ kind: "edit", bannerId: "banner-1" });
  });

  it("resolve as rotas dedicadas de categorias", () => {
    expect(productRoute("/products/categories")).toMatchObject({ kind: "categories" });
    expect(productRoute("/products/categories/create")).toMatchObject({ kind: "categories", categoryAction: "create" });
    expect(productRoute("/products/categories/category-1/edit")).toMatchObject({ kind: "categories", categoryAction: "edit", categoryId: "category-1" });
  });

  it("não transforma segmentos inválidos em requisições de detalhe", () => {
    expect(productRoute("/products/../store-b")).toMatchObject({ kind: "list" });
    expect(customerRoute("/customers/cliente%20invalido")).toMatchObject({ kind: "list" });
    expect(couponRoute("/coupons/%E0%A4%A")).toMatchObject({ kind: "list" });
    expect(bannerRoute("/banners/banner%20invalido/edit")).toMatchObject({ kind: "list" });
  });

  it("mostra busca, filtros e paginação somente acima de dez itens", () => {
    expect(shouldShowListControls(0)).toBe(false);
    expect(shouldShowListControls(10)).toBe(false);
    expect(shouldShowListControls(11)).toBe(true);
  });
});
