import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  api: { createCustomerPurchase: vi.fn(), deleteCustomerPurchase: vi.fn(), deleteCustomer: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, className, fullscreen }) => <section data-testid="customer-dialog" data-fullscreen={String(fullscreen)} className={className}>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children, className }) => <section data-testid="customer-drawer" className={className}>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2> }));

import { CustomerDetailPanel } from "./CustomerDetailPanel.jsx";

const customer = { id: "customer-1", name: "Cliente", email: "cliente@exemplo.com", document: "", status: "active", notes: "", totalOrders: 0, totalSpentCents: 0, phones: [], addresses: [], favorites: [], purchases: [] };

describe("histórico de compras do cliente", () => {
  beforeEach(() => { window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); mocks.api.createCustomerPurchase.mockReset(); mocks.toast.success.mockReset(); });
  afterEach(() => cleanup());

  it("registra uma compra no escopo da loja e entrega o cliente atualizado ao CRM", async () => {
    const updated = { ...customer, totalOrders: 1, totalSpentCents: 12990, purchases: [{ id: "purchase-1", reference: "PED-1", amountCents: 12990, purchasedAt: 1787425600000 }] };
    mocks.api.createCustomerPurchase.mockResolvedValue({ customer: updated });
    const onUpdated = vi.fn();
    render(<CustomerDetailPanel customer={customer} storeId="store-1" onUpdated={onUpdated} onClose={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Referência do pedido (opcional)"), { target: { value: "PED-1" } });
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "12990" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await waitFor(() => expect(mocks.api.createCustomerPurchase).toHaveBeenCalledWith("store-1", "customer-1", expect.objectContaining({ reference: "PED-1", amountCents: 12990 })));
    expect(onUpdated).toHaveBeenCalledWith(updated);
  });

  it("abre os detalhes em modal fullscreen mesmo com pouco conteúdo", () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<CustomerDetailPanel customer={customer} storeId="store-1" onUpdated={vi.fn()} onClose={vi.fn()} onEdit={vi.fn()} />);
    const dialog = screen.getByTestId("customer-dialog");
    expect(dialog.getAttribute("data-fullscreen")).toBe("true");
  });

  it("oferece cópia, Maps, WhatsApp e exclusão na experiência móvel", async () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    window.open = vi.fn();
    const detailed = { ...customer, phones: [{ id: "phone-1", label: "WhatsApp", phone: "(11) 99999-0000" }], addresses: [{ id: "address-1", label: "Casa", street: "Rua das Flores", number: "10", city: "São Paulo", state: "SP", postalCode: "01001-000" }] };
    render(<CustomerDetailPanel customer={detailed} storeId="store-1" onUpdated={vi.fn()} onClose={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Endereços" }));
    fireEvent.click(screen.getByLabelText("Copiar endereço Casa"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Rua das Flores")));
    fireEvent.click(screen.getByLabelText("Abrir Casa no Google Maps"));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("google.com/maps/search"), "_blank", "noopener,noreferrer");
    fireEvent.click(screen.getByRole("tab", { name: "Contato" }));
    fireEvent.click(screen.getByLabelText("Abrir WhatsApp no WhatsApp"));
    expect(window.open).toHaveBeenCalledWith("https://wa.me/11999990000", "_blank", "noopener,noreferrer");
    fireEvent.click(screen.getByRole("tab", { name: "Excluir" }));
    expect(screen.getByRole("button", { name: "Excluir cliente" })).toBeTruthy();
  });
});
