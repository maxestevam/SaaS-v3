import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ api: { getBanners: vi.fn(), getCategories: vi.fn(), createBanner: vi.fn(), updateBanner: vi.fn(), deleteBanner: vi.fn(), uploadBannerImage: vi.fn(), updateBannerImage: vi.fn(), deleteBannerImage: vi.fn(), uploadBannerDraftImage: vi.fn(), deleteBannerDraftImage: vi.fn(), attachBannerDraftImages: vi.fn() } }));
vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja de teste" } }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }) => <section>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { BannersContent } from "./BannersPage.jsx";

describe("editor de banners", () => {
  beforeEach(() => { window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); mocks.api.getBanners.mockReset(); mocks.api.getCategories.mockReset(); mocks.api.getBanners.mockResolvedValue({ banners: [] }); mocks.api.getCategories.mockResolvedValue({ categories: [{ id: "category-1", name: "Novidades" }] }); });
  afterEach(() => cleanup());

  it("mantém posição e status na primeira etapa e reserva a segunda apenas para mídias", async () => {
    render(<BannersContent />);
    await screen.findByText("Nenhum banner criado");
    fireEvent.click(screen.getByRole("button", { name: "Novo banner" }));
    expect(screen.getByText("Posição do banner")).toBeTruthy();
    expect(screen.getByText("Banner ativo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Categorias" }));
    expect(screen.getByText("Categorias selecionadas")).toBeTruthy();
    await waitFor(() => expect(mocks.api.getCategories).toHaveBeenCalledWith("store-1"));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar categorias" }));
    expect(screen.getByRole("option", { name: "category-1 Novidades" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "category-1 Novidades" }));
    fireEvent.change(screen.getByPlaceholderText("Ex.: campanha de inverno"), { target: { value: "Lançamento" } });
    fireEvent.click(screen.getByRole("button", { name: "Próxima etapa" }));
    expect(screen.queryByText("Posição do banner")).toBeNull();
    expect(screen.queryByText("Banner ativo")).toBeNull();
    expect(screen.getByText("Banner para desktop")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Salvar banner" }).disabled).toBe(true);
  });
});
