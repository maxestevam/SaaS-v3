import { applyPublicStoreMetadata } from "./public-store-metadata";
import { beforeEach, describe, expect, it } from "vitest";

function shell({ slug, name, description, faviconUrl = null, ogImageUrl = null }) {
  return { store: { slug, name, description, logoUrl: null, faviconUrl, seo: { title: `${name} SEO`, description, ogImageUrl } } };
}

function content(selector) {
  return document.head.querySelector(selector)?.getAttribute("content") || null;
}

describe("metadata pública por loja", () => {
  beforeEach(() => {
    document.title = "Painel da plataforma";
    document.head.querySelectorAll("meta, link[rel=icon], link[rel=canonical]").forEach((node) => node.remove());
    document.head.insertAdjacentHTML("beforeend", '<meta name="description" content="Descrição da plataforma"><link rel="icon" href="/platform.ico">');
  });

  it("troca A→B sem manter título, canonical, Open Graph ou favicon obsoletos e restaura a plataforma ao desmontar", () => {
    const cleanupA = applyPublicStoreMetadata(shell({ slug: "store-a", name: "Store A", description: "Descrição A", faviconUrl: "https://cdn.test/a.ico", ogImageUrl: "https://cdn.test/a.png" }), {}, new URL("https://market.test/@store-a/produto/a?q=1"));
    expect(document.title).toBe("Store A SEO");
    expect(content('meta[property="og:title"]')).toBe("Store A SEO");
    expect(content('meta[property="og:url"]')).toBe("https://market.test/@store-a/produto/a?q=1");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://market.test/@store-a/produto/a?q=1");
    expect(document.head.querySelector('link[rel="icon"][data-public-store-managed]')?.getAttribute("href")).toBe("https://cdn.test/a.ico");

    cleanupA();
    const cleanupB = applyPublicStoreMetadata(shell({ slug: "store-b", name: "Store B", description: "Descrição B" }), { title: "Catálogo B", seo: {} }, new URL("https://market.test/@store-b/categoria/novidades"));
    expect(document.title).toBe("Catálogo B");
    expect(content('meta[name="description"]')).toBe("Descrição B");
    expect(content('meta[property="og:title"]')).toBe("Catálogo B");
    expect(content('meta[property="og:description"]')).toBe("Descrição B");
    expect(content('meta[property="og:image"]')).toBeNull();
    expect(content('meta[property="og:url"]')).toBe("https://market.test/@store-b/categoria/novidades");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://market.test/@store-b/categoria/novidades");
    expect(document.head.querySelector('link[rel="icon"][data-public-store-managed]')).toBeNull();

    cleanupB();
    expect(document.title).toBe("Painel da plataforma");
    expect(content('meta[name="description"]')).toBe("Descrição da plataforma");
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute("href")).toBe("/platform.ico");
  });
});
