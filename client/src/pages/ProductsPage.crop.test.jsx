import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cropper: vi.fn(), compressImage: vi.fn(async (file) => file), compressVideo: vi.fn(async (file) => file) }));

vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ open = true, title, description, children }) => open ? <section><h2>{title}</h2><p>{description}</p>{children}</section> : null }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2> }));
vi.mock("@/components/EasyImageCropper", () => ({ EasyImageCropper: (props) => { mocks.cropper(props); return <button type="button">Recortador aberto</button>; } }));
vi.mock("@/lib/media", () => ({ compressImage: mocks.compressImage, compressVideo: mocks.compressVideo }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ProductEditor } from "./ProductsPage";

describe("proporção da categoria no recortador de produto", () => {
  it("usa 9:16 para uma categoria vertical antes de abrir o recortador", async () => {
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:preview");
    render(<ProductEditor open storeId="store-1" categories={[{ id: "category-vertical", name: "Stories", active: true, cropAspect: "9:16" }]} onCategoriesChanged={vi.fn()} product={null} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(await screen.findByPlaceholderText("Pesquisar categoria…"), { target: { value: "Stories" } });
    fireEvent.click(await screen.findByRole("button", { name: "Stories" }));
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(["image"], "foto.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Recortar" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Recortar" }));
    await waitFor(() => expect(mocks.cropper).toHaveBeenLastCalledWith(expect.objectContaining({ aspect: 9 / 16, mediaType: "image" })));
    URL.createObjectURL = originalCreateObjectURL;
  });
});
