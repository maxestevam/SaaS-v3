import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ path: "/customers", navigate: vi.fn(), api: { getCustomers: vi.fn(), getCustomer: vi.fn(), getProducts: vi.fn(), getCoupons: vi.fn(), getCoupon: vi.fn(), getBanners: vi.fn(), getBanner: vi.fn(), getCategories: vi.fn() } }));
vi.mock("wouter", () => ({ useLocation: () => [mocks.path, mocks.navigate] }));
vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja de teste" } }), ActiveStoreContext: { Provider: ({ children }) => children } }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, description, children }) => <section><h2>{title}</h2><p>{description}</p>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2>, DrawerFooter: ({ children }) => <footer>{children}</footer> }));
vi.mock("@/components/CustomerDetailPanel", () => ({ CustomerDetailPanel: ({ customer }) => <section>Detalhe: {customer.name}</section> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CustomersContent } from "./CustomersPage.jsx";
import { CouponsContent } from "./CouponsPage.jsx";
import { BannersContent } from "./BannersPage.jsx";

const customer = { id: "customer-1", name: "Cliente rota", email: "cliente@exemplo.com", document: "", status: "active", primaryPhone: "", favoritesCount: 0, totalOrders: 0, totalSpentCents: 0, phones: [], addresses: [], favorites: [], purchases: [] };
const coupon = { id: "coupon-1", code: "ROTA10", discountType: "percentage", percentageOff: 10, amountOffCents: null, minimumOrderCents: 0, expiresAt: null, usageLimit: null, usageCount: 0, freeShippingStates: [], active: true, newUsersOnly: false };
const banner = { id: "banner-1", title: "Banner rota", pages: ["home"], categoryIds: [], position: "top", active: true, images: [] };

describe("rotas diretas de clientes, cupons e banners", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    mocks.navigate.mockReset();
    mocks.api.getCustomers.mockResolvedValue({ data: [], summary: { total: 0, active: 0, inactive: 0, orders: 0, totalSpentCents: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    mocks.api.getCustomer.mockResolvedValue({ customer });
    mocks.api.getProducts.mockResolvedValue({ data: [] });
    mocks.api.getCoupons.mockResolvedValue({ data: [], summary: { total: 0, active: 0, freeShipping: 0, uses: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    mocks.api.getCoupon.mockResolvedValue({ coupon });
    mocks.api.getBanners.mockResolvedValue({ banners: [] });
    mocks.api.getBanner.mockResolvedValue({ banner });
    mocks.api.getCategories.mockResolvedValue({ categories: [] });
  });
  afterEach(() => cleanup());

  it("renderiza cliente novo, detalhe e edição nas URLs próprias", async () => {
    mocks.path = "/customers/create";
    const create = render(<CustomersContent />);
    expect(await screen.findByRole("heading", { name: "Novo cliente", level: 1 })).toBeTruthy();
    create.unmount();
    mocks.path = "/customers/customer-1";
    const view = render(<CustomersContent />);
    expect(await screen.findByText("Detalhe: Cliente rota")).toBeTruthy();
    view.unmount();
    mocks.path = "/customers/customer-1/edit";
    render(<CustomersContent />);
    expect(await screen.findByRole("heading", { name: "Editar cliente", level: 1 })).toBeTruthy();
  });

  it("renderiza cupom novo, detalhe e edição nas URLs próprias", async () => {
    mocks.path = "/coupons/create";
    const create = render(<CouponsContent />);
    expect(await screen.findByRole("heading", { name: "Criar cupom", level: 1 })).toBeTruthy();
    create.unmount();
    mocks.path = "/coupons/coupon-1";
    const view = render(<CouponsContent />);
    expect(await screen.findByRole("heading", { name: "ROTA10", level: 1 })).toBeTruthy();
    view.unmount();
    mocks.path = "/coupons/coupon-1/edit";
    render(<CouponsContent />);
    expect(await screen.findByRole("heading", { name: "Editar cupom", level: 1 })).toBeTruthy();
  });

  it("renderiza banner novo, detalhe e edição nas URLs próprias", async () => {
    mocks.path = "/banners/create";
    const create = render(<BannersContent />);
    expect(await screen.findByRole("heading", { name: "Criar banner", level: 1 })).toBeTruthy();
    create.unmount();
    mocks.path = "/banners/banner-1";
    const view = render(<BannersContent />);
    expect(await screen.findByRole("heading", { name: "Banner rota", level: 1 })).toBeTruthy();
    view.unmount();
    mocks.path = "/banners/banner-1/edit";
    render(<BannersContent />);
    expect(await screen.findByRole("heading", { name: "Editar banner", level: 1 })).toBeTruthy();
  });
});
