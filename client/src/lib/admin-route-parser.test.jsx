import { describe, expect, it } from "vitest";
import { parseAdminEntityRoute, parseProductManagementRoute } from "./admin-route-parser";

describe("parser administrativo compartilhado", () => {
  it("resolve lista, criação, detalhe e edição mantendo a chave de identificação do domínio", () => {
    const options = { basePath: "/customers", identifierKey: "customerId" };
    expect(parseAdminEntityRoute("/customers", options)).toMatchObject({ kind: "list" });
    expect(parseAdminEntityRoute("/customers/create", options)).toMatchObject({ kind: "create" });
    expect(parseAdminEntityRoute("/customers/customer-1", options)).toMatchObject({ kind: "view", customerId: "customer-1" });
    expect(parseAdminEntityRoute("/customers/customer-1/edit", options)).toMatchObject({ kind: "edit", customerId: "customer-1" });
  });

  it("rejeita segmentos perigosos e preserva a árvore de categorias do catálogo", () => {
    expect(parseAdminEntityRoute("/banners/banner%20invalido", { basePath: "/banners", identifierKey: "bannerId" })).toMatchObject({ kind: "list" });
    expect(parseProductManagementRoute("/products/categories/category-1/edit")).toMatchObject({ kind: "categories", categoryAction: "edit", categoryId: "category-1" });
    expect(parseProductManagementRoute("/products/../store-b")).toMatchObject({ kind: "list" });
  });
});
