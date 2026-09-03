import { describe, expect, it } from "vitest";
import { decodeRouteSegment, publicSlug, routeIdentifier, routeQueryValue } from "./route-params";

describe("parâmetros de rota", () => {
  it("aceita slugs públicos canônicos e rejeita caminhos, espaços e escapes inválidos", () => {
    expect(publicSlug("atelier-luna")).toBe("atelier-luna");
    expect(publicSlug("loja%20luna")).toBeNull();
    expect(publicSlug("../store-b")).toBeNull();
    expect(decodeRouteSegment("%E0%A4%A")).toBeNull();
  });

  it("mantém IDs administrativos compatíveis e bloqueia segmentos perigosos", () => {
    expect(routeIdentifier("product-1")).toBe("product-1");
    expect(routeIdentifier("5be220d8-239d-4498-8ec9-12e5c6e05a48")).toBe("5be220d8-239d-4498-8ec9-12e5c6e05a48");
    expect(routeIdentifier("../store-b")).toBeNull();
    expect(routeIdentifier("produto com espaço")).toBeNull();
  });

  it("limita query string de busca sem lançar erro", () => {
    expect(routeQueryValue("q=linho", "q")).toBe("linho");
    expect(routeQueryValue(`q=${"a".repeat(121)}`, "q")).toBe("");
  });
});
