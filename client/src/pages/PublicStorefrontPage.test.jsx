import { afterEach, describe, expect, it, vi } from "vitest";

import { beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ path: "/@atelier-luna", search: "", params: { slug: "atelier-luna" }, state: { status: "ready", domain: null, error: null }, navigate: vi.fn() }));
vi.mock("wouter", () => ({ Link: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a>, useLocation: () => [mocks.path, mocks.navigate], useSearch: () => mocks.search, useParams: () => mocks.params }));
vi.mock("@/hooks/usePublicStoreDomain", () => ({ usePublicStoreDomain: () => mocks.state }));

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PublicStorefrontPage from "./PublicStorefrontPage";

const domain = {
  store: { id: "store-a", name: "Ateliê Luna", slug: "atelier-luna", status: "active", identity: { description: "Peças autorais", logoUrl: null, faviconUrl: null, maintenance: false, maintenanceMessage: null, locale: "pt-BR", currency: "BRL" }, contact: { email: "oi@atelier.test", phone: null, whatsapp: "5511999999999", address: {}, social: { instagram: "https://instagram.com/atelie" } }, seo: { title: "Ateliê Luna", description: "Peças autorais", keywords: [], ogImageUrl: null }, theme: { primaryColor: "#563C70", secondaryColor: null, accentColor: null, backgroundColor: "#ffffff", textColor: "#1d1722", fontFamily: "Inter" }, settings: {}, paymentMethods: [], shippingMethods: [] },
  banners: [{ id: "banner-1", title: "Nova coleção", subtitle: null, desktopImageUrl: "https://images.example/banner-desktop.jpg", mobileImageUrl: "https://images.example/banner-mobile.jpg", link: null, buttonText: null, position: 1, active: true }], miniBanners: [{ id: "mini-1", title: "Linho em foco", imageUrl: "https://images.example/linho.jpg", link: null, active: true }],
  categories: [{ id: "cat-1", slug: "vestidos", name: "Vestidos", description: "Leves", imageUrl: null, bannerUrl: null, parentId: null, position: 0, active: true, productCount: 1, subcategories: [{ id: "sub-1", slug: "festa", name: "Festa", active: true, subcategories: [] }] }],
  products: [{ id: "product-1", sku: "VEST-1", name: "Vestido Aurora", slug: "vestido-aurora", description: "Linho natural", shortDescription: "Linho", priceCents: 29990, priceFromCents: 35990, media: [{ id: "media-1", url: "https://images.example/vestido.jpg", sortOrder: 0, isPrimary: true }], thumbnailUrl: "https://images.example/vestido.jpg", categoryId: "cat-1", categorySlug: "vestidos", categoryName: "Vestidos", subcategoryId: "sub-1", brand: "Luna", tags: ["linho"], commerce: { featured: true, isNew: true, isBestSeller: false, active: true }, inventory: { stock: 3, weightKg: 0.4, dimensionsCm: null }, variants: [{ id: "variant-1", name: "P · Rosa", sku: "VEST-1-P", priceCents: 29990, stock: 1, attributes: { size: "P", color: "Rosa" } }], attributes: {}, seo: {}, createdAt: 1, updatedAt: 1 }],
  coupons: [], pages: [{ id: "page-1", title: "Sobre", slug: "sobre", content: "Feito com cuidado.", active: true, seo: { title: null, description: null } }], orders: [],
};

const domainB = {
  ...domain,
  store: {
    ...domain.store,
    id: "store-b",
    name: "Casa Norte",
    slug: "casa-norte",
    identity: { ...domain.store.identity, description: "Objetos para a casa", logoUrl: "https://images.example/casa-norte.svg", faviconUrl: "https://images.example/casa-norte.ico", locale: "en-US", currency: "USD" },
    seo: { title: "Casa Norte", description: "Objetos para a casa", keywords: [], ogImageUrl: "https://images.example/casa-norte-og.jpg" },
    theme: { primaryColor: "#0F766E", secondaryColor: "#CCFBF1", accentColor: "#115E59", backgroundColor: "#ffffff", textColor: "#102A2A", fontFamily: "Georgia" },
  },
  banners: [{ ...domain.banners[0], id: "banner-b", title: "Casa em destaque" }],
  miniBanners: [{ ...domain.miniBanners[0], id: "mini-b", title: "Mesa posta" }],
  categories: [{ ...domain.categories[0], id: "cat-b", slug: "decoracao", name: "Decoração", subcategories: [] }],
  products: [{ ...domain.products[0], id: "product-b", name: "Vaso Horizonte", slug: "vaso-horizonte", categoryId: "cat-b", categorySlug: "decoracao", categoryName: "Decoração", priceCents: 5900, priceFromCents: null }],
  pages: [],
};

describe("vitrine pública baseada no domínio canônico", () => {
  beforeEach(() => { mocks.path = "/@atelier-luna"; mocks.search = ""; mocks.params = { slug: "atelier-luna" }; mocks.state = { status: "ready", domain, error: null }; });
  afterEach(() => { cleanup(); mocks.path = "/@atelier-luna"; mocks.search = ""; mocks.params = { slug: "atelier-luna" }; mocks.state = { status: "ready", domain, error: null }; });

  it("renderiza identidade, banner, categoria e catálogo sem usar a marca da plataforma", () => {
    render(<PublicStorefrontPage screen="home" />);
    expect(screen.getByRole("link", { name: "Início da Ateliê Luna" })).toBeTruthy();
    expect(screen.getByText("Nova coleção")).toBeTruthy();
    expect(screen.getByText("Linho em foco")).toBeTruthy();
    expect(screen.getAllByText("Vestidos").length).toBeGreaterThan(0);
    expect(screen.getByText("Vestido Aurora")).toBeTruthy();
    expect(screen.queryByText("Loja Descomplicada")).toBeNull();
  });

  it("filtra a busca e renderiza estados vazios sem dados comerciais fixos", () => {
    mocks.path = "/@atelier-luna/busca";
    mocks.search = "q=linho";
    render(<PublicStorefrontPage screen="search" />);
    expect(screen.getByText("Resultados para “linho”")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Buscar na loja"), { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhum produto corresponde à sua busca.")).toBeTruthy();
  });

  it("renderiza detalhe com preço de view model, variante e estoque do domínio", () => {
    mocks.params = { slug: "atelier-luna", productSlug: "vestido-aurora" };
    render(<PublicStorefrontPage screen="product" />);
    expect(screen.getByRole("heading", { name: "Vestido Aurora" })).toBeTruthy();
    expect(screen.getByText(/299,90/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "P · Rosa" })).toBeTruthy();
    expect(screen.getByText("Disponível")).toBeTruthy();
  });

  it("respeita a hierarquia canônica ao filtrar uma subcategoria na URL", () => {
    mocks.params = { slug: "atelier-luna", categorySlug: "vestidos" };
    mocks.search = "subcategoria=festa";
    render(<PublicStorefrontPage screen="category" />);
    expect(screen.getByRole("link", { name: "Festa" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Vestidos · Festa" })).toBeTruthy();
    expect(screen.getByText("Vestido Aurora")).toBeTruthy();
  });

  it("trata página, conteúdo não encontrado e manutenção", () => {
    mocks.params = { slug: "atelier-luna", pageSlug: "sobre" };
    const page = render(<PublicStorefrontPage screen="page" />);
    expect(screen.getByText("Feito com cuidado.")).toBeTruthy();
    page.unmount();
    mocks.params = { slug: "atelier-luna", pageSlug: "ausente" };
    render(<PublicStorefrontPage screen="page" />);
    expect(screen.getByText("Conteúdo não encontrado")).toBeTruthy();
    cleanup();
    mocks.state = { status: "ready", domain: { ...domain, store: { ...domain.store, identity: { ...domain.store.identity, maintenance: true, maintenanceMessage: "Atualizando a coleção." } } }, error: null };
    render(<PublicStorefrontPage screen="home" />);
    expect(screen.getByText("Atualizando a coleção.")).toBeTruthy();
  });

  it("distingue endereço de loja inválido de indisponibilidade da API", () => {
    mocks.params = { slug: "loja%20invalida" };
    mocks.state = { status: "invalid", domain: null, error: "Endereço da loja inválido." };
    const invalid = render(<PublicStorefrontPage screen="home" />);
    expect(screen.getByRole("heading", { name: "Loja não encontrada" })).toBeTruthy();
    invalid.unmount();
    mocks.state = { status: "error", domain: null, error: "Não foi possível conectar ao serviço." };
    render(<PublicStorefrontPage screen="home" />);
    expect(screen.getByRole("heading", { name: "Loja indisponível" })).toBeTruthy();
  });

  it("mantém a vitrine estável quando o contrato não fornece catálogo, categorias, banners, logo ou tema", () => {
    mocks.state = {
      status: "ready",
      domain: {
        ...domain,
        store: { ...domain.store, identity: { ...domain.store.identity, logoUrl: null }, theme: {} },
        banners: [],
        miniBanners: [],
        categories: [],
        products: [],
        pages: [],
      },
      error: null,
    };
    const view = render(<PublicStorefrontPage screen="home" />);
    expect(screen.getByRole("link", { name: "Início da Ateliê Luna" })).toBeTruthy();
    expect(screen.getByText("Esta loja ainda não possui produtos disponíveis.")).toBeTruthy();
    expect(screen.queryByText("Nova coleção")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Categorias" })).toBeNull();
    expect(view.container.querySelector("[data-public-store-id]").style.getPropertyValue("--store-primary")).toBe("#18181b");
  });

  it("substitui identidade, catálogo, moeda, tema e SEO em uma troca A→B→A sem reter conteúdo anterior", () => {
    const view = render(<PublicStorefrontPage screen="home" />);
    expect(screen.getByText("Vestido Aurora")).toBeTruthy();
    mocks.params = { slug: "casa-norte" };
    mocks.state = { status: "ready", domain: domainB, error: null };
    view.rerender(<PublicStorefrontPage screen="home" />);
    const rootB = view.container.querySelector("[data-public-store-id]");
    expect(screen.getByRole("link", { name: "Início da Casa Norte" })).toBeTruthy();
    expect(screen.getByText("Casa em destaque")).toBeTruthy();
    expect(screen.getByText("Vaso Horizonte")).toBeTruthy();
    expect(screen.queryByText("Vestido Aurora")).toBeNull();
    expect(screen.getByText("$59.00")).toBeTruthy();
    expect(rootB.dataset.publicStoreId).toBe("store-b");
    expect(rootB.style.getPropertyValue("--store-primary")).toBe("#0F766E");
    expect(document.title).toBe("Casa Norte");
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("Casa Norte");
    expect(document.head.querySelector('link[rel="icon"][data-public-store-managed]')?.getAttribute("href")).toBe("https://images.example/casa-norte.ico");

    mocks.params = { slug: "atelier-luna" };
    mocks.state = { status: "ready", domain, error: null };
    view.rerender(<PublicStorefrontPage screen="home" />);
    const rootA = view.container.querySelector("[data-public-store-id]");
    expect(screen.getByText("Vestido Aurora")).toBeTruthy();
    expect(screen.queryByText("Vaso Horizonte")).toBeNull();
    expect(rootA.dataset.publicStoreId).toBe("store-a");
    expect(rootA.style.getPropertyValue("--store-primary")).toBe("#563C70");
  });
});
