import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({ Link: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a> }));

import { StorefrontProductCard } from "./StorefrontSections";

describe("mídia da vitrine pública", () => {
  it("mantém o card renderizado quando a imagem do produto falha", () => {
    const product = { id: "product-a", slug: "produto-a", name: "Produto A", imageUrl: "https://images.example/quebrada.jpg", categoryName: "Categoria", badges: { new: false, featured: false }, hasPromotion: false, discountPercent: null, available: true, priceMode: "regular", priceLabel: "R$ 10,00", fromPriceLabel: null, compareAtPriceLabel: null };
    const view = render(<StorefrontProductCard product={product} base="/@store-a" />);
    const image = view.container.querySelector("img");
    expect(image).toBeTruthy();
    fireEvent.error(image);
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.getByText("Produto A")).toBeTruthy();
    expect(view.getByRole("link").getAttribute("href")).toBe("/@store-a/produto/produto-a");
  });
});
