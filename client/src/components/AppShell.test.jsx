import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/components/ui/drawer", () => ({ DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2>, DrawerDescription: ({ children }) => <p>{children}</p>, DrawerFooter: ({ children }) => <footer>{children}</footer>, DrawerClose: ({ children }) => children }));
import { clearActiveStoreCache, HomeDrawer, persistActiveStore, publicStoreLink, readActiveStoreCache, resolveActiveStore } from "./AppShell.jsx";

describe("link público da loja", () => {
  it("prioriza o domínio próprio e usa o slug na URL pública padrão", () => {
    expect(publicStoreLink({ slug: "minha-loja" }, "https://multiloja.example/")).toBe("https://multiloja.example/@minha-loja");
    expect(publicStoreLink({ slug: "minha-loja", customDomain: "loja.exemplo.com" }, "https://multiloja.example")).toBe("https://loja.exemplo.com");
  });

  it("expõe no drawer o botão que aciona a cópia do link público", () => {
    const onCopyLink = vi.fn();
    render(<HomeDrawer store={{ id: "store-1", name: "Loja", slug: "minha-loja" }} stores={[{ id: "store-1", name: "Loja", slug: "minha-loja" }]} onStoreChange={vi.fn()} onCreate={vi.fn()} onEdit={vi.fn()} onCopyLink={onCopyLink} onHome={vi.fn()} t={(key) => key === "nav.copyStoreLink" ? "Copiar link da loja" : key} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link da loja" }));
    expect(onCopyLink).toHaveBeenCalledTimes(1);
    cleanup();
  });
});

describe("cache da loja ativa", () => {
  afterEach(() => clearActiveStoreCache());

  it("espelha a loja selecionada no armazenamento local e de sessão", () => {
    const store = { id: "store-1", name: "Loja", slug: "minha-loja" };
    persistActiveStore(store);
    expect(readActiveStoreCache()).toEqual(store);
    expect(JSON.parse(sessionStorage.getItem("ld_store"))).toEqual(store);
  });

  it("remove dados inválidos sem interromper a restauração da interface", () => {
    localStorage.setItem("ld_store", "{inválido");
    expect(readActiveStoreCache()).toBeNull();
    expect(localStorage.getItem("ld_store")).toBeNull();
  });

  it("não mantém uma loja persistida que não está mais disponível para a conta", () => {
    const stores = [{ id: "store-a", name: "Store A" }, { id: "store-b", name: "Store B" }];
    expect(resolveActiveStore(stores, { id: "store-removida" })).toEqual(stores[0]);
    expect(resolveActiveStore([], { id: "store-a" })).toBeNull();
  });
});
