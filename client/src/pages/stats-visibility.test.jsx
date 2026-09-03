import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ api: { getCustomers: vi.fn(), getCoupons: vi.fn(), getBanners: vi.fn(), getCategories: vi.fn() } }));
vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja teste" } }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }) => <section>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2>, DrawerFooter: ({ children }) => <footer>{children}</footer> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CustomersContent } from "./CustomersPage.jsx";
import { CouponsContent } from "./CouponsPage.jsx";
import { BannersContent } from "./BannersPage.jsx";

describe("indicadores condicionais das listagens", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    mocks.api.getCustomers.mockResolvedValue({ data: [], summary: { total: 0, active: 0, orders: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    mocks.api.getCoupons.mockResolvedValue({ data: [], summary: { total: 0, active: 0, freeShipping: 0, uses: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    mocks.api.getBanners.mockResolvedValue({ banners: [] });
    mocks.api.getCategories.mockResolvedValue({ categories: [] });
  });
  afterEach(() => cleanup());

  it("oculta os indicadores de clientes, cupons e banners quando não há itens", async () => {
    const customers = render(<CustomersContent />);
    await screen.findByText("Nenhum cliente encontrado");
    expect(screen.queryByTestId("customer-summary")).toBeNull();
    customers.unmount();

    const coupons = render(<CouponsContent />);
    await screen.findByText("Nenhum cupom encontrado");
    expect(screen.queryByTestId("coupon-summary")).toBeNull();
    coupons.unmount();

    render(<BannersContent />);
    await screen.findByText("Nenhum banner criado");
    expect(screen.queryByTestId("banner-summary")).toBeNull();
  });

  it("mostra os indicadores de banners em duas colunas quando há conteúdo", async () => {
    mocks.api.getBanners.mockResolvedValue({ banners: [{ id: "banner-1", title: "Campanha", active: true, pages: ["home"], categoryIds: [], images: [] }] });
    render(<BannersContent />);
    const summary = await screen.findByTestId("banner-summary");
    expect(summary.className).toContain("grid-cols-2");
    expect(summary.textContent).not.toMatch(/Banners|Segmentados|\bNa\b/);
  });

  it("mostra os indicadores de clientes e cupons quando existe pelo menos um registro", async () => {
    mocks.api.getCustomers.mockResolvedValue({ data: [{ id: "customer-1", name: "Cliente teste", status: "active", primaryPhone: "", email: "", document: "", favoritesCount: 0, totalOrders: 0 }], summary: { total: 1, active: 1, orders: 0 }, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    const customers = render(<CustomersContent />);
    expect(await screen.findByTestId("customer-summary")).toBeTruthy();
    customers.unmount();

    mocks.api.getCoupons.mockResolvedValue({ data: [{ id: "coupon-1", code: "BEMVINDO", discountType: "percentage", percentageOff: 10, amountOffCents: 0, minimumOrderCents: 0, expiresAt: null, usageLimit: null, usageCount: 0, freeShippingStates: [], active: true }], summary: { total: 1, active: 1, freeShipping: 0, uses: 0 }, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    render(<CouponsContent />);
    expect(await screen.findByTestId("coupon-summary")).toBeTruthy();
  });
});
