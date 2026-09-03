import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: { getCustomers: vi.fn(), getCustomer: vi.fn(), getCoupons: vi.fn(), getCoupon: vi.fn() } }));
vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja de teste" } }), ActiveStoreContext: { Provider: ({ children }) => children } }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }) => <section>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2>, DrawerFooter: ({ children }) => <footer>{children}</footer> }));
vi.mock("@/components/CustomerDetailPanel", () => ({ CustomerDetailPanel: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CustomersContent } from "./CustomersPage.jsx";
import { CouponsContent } from "./CouponsPage.jsx";

const pagination = { page: 1, limit: 20, total: 11, totalPages: 1 };

describe("controles de lista em telas móveis", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/customers");
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    mocks.api.getCustomers.mockResolvedValue({ data: [{ id: "customer-1", name: "Cliente Um", primaryPhone: "", email: "", document: "", status: "active", favoritesCount: 0, totalOrders: 0, totalSpentCents: 0 }], summary: { total: 11, active: 11, inactive: 0, orders: 0, totalSpentCents: 0 }, pagination });
    mocks.api.getCoupons.mockResolvedValue({ data: [{ id: "coupon-1", code: "BEMVINDO", discountType: "percentage", percentageOff: 10, amountOffCents: null, minimumOrderCents: 0, expiresAt: null, usageLimit: null, usageCount: 0, freeShippingStates: [], active: true }], summary: { total: 11, active: 11, freeShipping: 0, uses: 0 }, pagination });
  });
  afterEach(() => cleanup());

  it("mantém a busca visível e abre os filtros adicionais de clientes pelo botão móvel", async () => {
    render(<CustomersContent />);
    await screen.findAllByText("Cliente Um");
    expect(screen.getByTestId("customer-summary").className).toContain("grid-cols-2");
    const toggle = screen.getByRole("button", { name: "Exibir filtros" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("combobox", { name: "Filtrar status" })).toBeTruthy();
  });

  it("mantém a busca visível e abre os filtros adicionais de cupons pelo botão móvel", async () => {
    window.history.pushState({}, "", "/coupons");
    render(<CouponsContent />);
    await screen.findByText("BEMVINDO");
    expect(screen.getByTestId("coupon-summary").className).toContain("grid-cols-2");
    const toggle = screen.getByRole("button", { name: "Exibir filtros" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Ativos" })).toBeTruthy();
  });
});
