import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: { updateProduct: vi.fn() } }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }) => <section>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { ProductEditor } from "./ProductsPage.jsx";

const image = { id: "media-1", kind: "image", url: "https://cdn.example/image.png" };
const category = { id: "category-1", name: "Novidades", active: true };
const noOp = () => {};
const advanceToSave = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /Enviar mídias e continuar/i }));
  fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
};

describe("guarda visual do editor de produto", () => {
  beforeEach(() => { window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); mocks.api.updateProduct.mockReset(); });
  afterEach(() => cleanup());

  it("mantém Salvar produto desabilitado enquanto dados principais estiverem ausentes", async () => {
    render(<ProductEditor open storeId="store-1" categories={[category]} product={{ id: "product-1", name: "", description: "", categoryId: "", priceCents: 0, media: [image] }} onOpenChange={noOp} onCategoriesChanged={noOp} onSaved={noOp} />);
    fireEvent.change(await screen.findByPlaceholderText("Pesquisar categoria…"), { target: { value: "Novidades" } });
    fireEvent.click(await screen.findByRole("button", { name: "Novidades" }));
    await advanceToSave();
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar produto" }).disabled).toBe(true));
  });

  it("não executa PATCH ao apenas avançar entre as etapas do editor", async () => {
    render(<ProductEditor open storeId="store-1" categories={[category]} product={{ id: "product-1", name: "Produto", description: "", categoryId: "category-1", priceCents: 1000, media: [image] }} onOpenChange={noOp} onCategoriesChanged={noOp} onSaved={noOp} />);
    await advanceToSave();
    await screen.findByRole("button", { name: "Salvar produto" });
    expect(mocks.api.updateProduct).not.toHaveBeenCalled();
  });

  it("bloqueia os campos durante uma submissão em andamento", async () => {
    mocks.api.updateProduct.mockReturnValue(new Promise(() => {}));
    render(<ProductEditor open storeId="store-1" categories={[category]} product={{ id: "product-1", name: "Produto", description: "", categoryId: "category-1", priceCents: 1000, media: [image] }} onOpenChange={noOp} onCategoriesChanged={noOp} onSaved={noOp} />);
    await advanceToSave();
    const save = await screen.findByRole("button", { name: "Salvar produto" });
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByLabelText("Peso (g)").disabled).toBe(true));
  });
});
