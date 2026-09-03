import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicStoreProvider, usePublicStore } from "./PublicStoreContext";

function createDomain({ id, slug, name, primaryColor, locale = "pt-BR", currency = "BRL" }) {
  return {
    store: {
      id,
      name,
      slug,
      identity: { locale, currency },
      theme: { primaryColor, secondaryColor: null, accentColor: null, backgroundColor: "#ffffff", textColor: "#18181b", fontFamily: "Inter" },
      paymentMethods: [],
      shippingMethods: [],
    },
    banners: [], miniBanners: [], categories: [], products: [], coupons: [], pages: [], orders: [],
  };
}

function Probe() {
  const { store, locale, currency } = usePublicStore();
  return <p>{`${store.id}:${locale}:${currency}`}</p>;
}

describe("PublicStoreProvider", () => {
  it("escopa tokens no root da vitrine e substitui completamente Store A por Store B sem tocar em tokens globais", () => {
    const root = document.documentElement;
    root.style.setProperty("--primary", "#platform-primary");
    localStorage.setItem("ld_store", JSON.stringify({ id: "admin-store" }));
    sessionStorage.setItem("ld_store", JSON.stringify({ id: "admin-store" }));
    const storeA = createDomain({ id: "store-a", slug: "store-a", name: "Store A", primaryColor: "#7C3AED" });
    const storeB = createDomain({ id: "store-b", slug: "store-b", name: "Store B", primaryColor: "#0F766E", locale: "en-US", currency: "USD" });
    const view = render(<PublicStoreProvider domain={storeA}><Probe /></PublicStoreProvider>);

    let storefront = view.container.querySelector("[data-public-store-id]");
    expect(storefront.dataset.publicStoreId).toBe("store-a");
    expect(storefront.style.getPropertyValue("--store-primary")).toBe("#7C3AED");
    expect(screen.getByText("store-a:pt-BR:BRL")).toBeTruthy();
    expect(root.style.getPropertyValue("--primary")).toBe("#platform-primary");

    view.rerender(<PublicStoreProvider domain={storeB}><Probe /></PublicStoreProvider>);
    storefront = view.container.querySelector("[data-public-store-id]");
    expect(storefront.dataset.publicStoreId).toBe("store-b");
    expect(storefront.style.getPropertyValue("--store-primary")).toBe("#0F766E");
    expect(storefront.style.getPropertyValue("--store-secondary")).toBe("#52525b");
    expect(screen.getByText("store-b:en-US:USD")).toBeTruthy();
    expect(root.style.getPropertyValue("--primary")).toBe("#platform-primary");
    expect(localStorage.getItem("ld_store")).toContain("admin-store");
    expect(sessionStorage.getItem("ld_store")).toContain("admin-store");
  });
});
