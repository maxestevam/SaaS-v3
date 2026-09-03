import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ path: "/products", navigate: vi.fn(), api: { getCategories: vi.fn(), getProducts: vi.fn(), getProduct: vi.fn() } }));
vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja de teste" } }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("wouter", () => ({ useLocation: () => [mocks.path, mocks.navigate] }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, description, children }) => <section><h2>{title}</h2><p>{description}</p>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2>, DrawerFooter: ({ children }) => <footer>{children}</footer> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ProductsContent } from "./ProductsPage.jsx";

const product = { id: "product-1", name: "Camiseta", description: "Algodão", categoryId: "category-1", categoryName: "Novidades", priceCents: 5990, status: "active", createdAt: 1, updatedAt: 1, media: [] };
const categories = [{ id: "category-1", name: "Novidades", description: "Coleção atual", active: true, productCount: 1 }];

describe("rotas renderizadas de produtos e categorias", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    mocks.api.getCategories.mockResolvedValue({ categories });
    mocks.api.getProducts.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    mocks.api.getProduct.mockResolvedValue({ product });
    mocks.navigate.mockReset();
  });
  afterEach(() => cleanup());

  it("abre o editor ao acessar a rota de criação", async () => {
    mocks.path = "/products/create";
    render(<ProductsContent />);
    expect(await screen.findByRole("heading", { name: "Adicionar produto", level: 1 })).toBeTruthy();
    expect(await screen.findByText("Categoria, imagens e vídeo")).toBeTruthy();
    expect(screen.getByLabelText("Categoria")).toBeTruthy();
  });

  it("renderiza detalhe e edição quando acessados diretamente", async () => {
    mocks.path = "/products/product-1";
    const detail = render(<ProductsContent />);
    expect(await screen.findByText("Detalhes")).toBeTruthy();
    detail.unmount();
    mocks.path = "/products/product-1/edit";
    render(<ProductsContent />);
    expect(await screen.findByText("Editar produto")).toBeTruthy();
  });

  it("renderiza gerenciamento, criação e edição de categorias nas rotas dedicadas", async () => {
    mocks.path = "/products/categories";
    const manager = render(<ProductsContent />);
    expect(await screen.findByText("Organize o catálogo, as subcategorias e o recorte padrão das imagens.")).toBeTruthy();
    manager.unmount();
    mocks.path = "/products/categories";
    const create = render(<ProductsContent />);
    fireEvent.click(await screen.findByRole("button", { name: "Nova categoria" }));
    expect(await screen.findByLabelText("Nome")).toBeTruthy();
    create.unmount();
    mocks.path = "/products/categories/category-1/edit";
    render(<ProductsContent />);
    expect(await screen.findByText("Editar categoria")).toBeTruthy();
  });
});
