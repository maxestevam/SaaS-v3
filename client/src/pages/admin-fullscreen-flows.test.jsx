import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, title, fullscreen, page, onOpenChange }) => page ? <>{children}</> : <section data-testid="admin-dialog" data-fullscreen={String(fullscreen)}><h2>{title}</h2><button type="button" aria-label="Fechar modal" onClick={() => onOpenChange?.(false)}>Fechar</button>{children}</section>,
}));
vi.mock("@/lib/api", () => ({ api: { getCategories: vi.fn().mockResolvedValue({ categories: [] }) } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ProductPreview } from "./ProductsPage.jsx";
import { CouponViewer } from "./CouponsPage.jsx";
import { BannerViewer } from "./BannersPage.jsx";
import { CustomerDetailPanel } from "@/components/CustomerDetailPanel";
import { CategoryManagerV2 } from "@/components/CategoryManager";

const customer = { id: "customer-1", name: "Cliente", email: "", document: "", status: "active", notes: "", totalOrders: 0, totalSpentCents: 0, phones: [], addresses: [], favorites: [], purchases: [] };
const product = { id: "product-1", name: "Produto", categoryName: "Categoria", priceCents: 1000, status: "active", description: "", createdAt: Date.now(), updatedAt: Date.now(), media: [] };
const coupon = { id: "coupon-1", code: "BEMVINDO", discountType: "percentage", percentageOff: 10, amountOffCents: 0, minimumOrderCents: 0, expiresAt: null, usageLimit: null, usageCount: 0, active: true };
const banner = { id: "banner-1", title: "Banner", pages: ["home"], position: "top", active: true, images: [], categoryIds: [] };

function expectPageContent(ui, text) {
  render(ui);
  expect(screen.queryByTestId("admin-dialog")).toBeNull();
  expect(screen.getByText(text)).toBeTruthy();
  cleanup();
}

describe("fluxos administrativos como páginas", () => {
  afterEach(() => cleanup());

  it("renderiza detalhes de produto, cliente, cupom e banner fora de modal", () => {
    expectPageContent(<ProductPreview page product={product} onClose={vi.fn()} onEdit={vi.fn()} />, "Detalhes");
    expectPageContent(<CustomerDetailPanel page customer={customer} storeId="store-1" onUpdated={vi.fn()} onClose={vi.fn()} onEdit={vi.fn()} />, "Informações");
    expectPageContent(<CouponViewer page coupon={coupon} onClose={vi.fn()} onEdit={vi.fn()} />, "Editar cupom");
    expectPageContent(<BannerViewer page banner={banner} onClose={vi.fn()} onEdit={vi.fn()} />, "Status");
  });

  it("renderiza a criação de categoria como página", () => {
    render(<CategoryManagerV2 route={{ key: "/products/categories/create", categoryAction: "create" }} onNavigate={vi.fn()} storeId="store-1" categories={[]} onUpdated={vi.fn()} />);
    expect(screen.queryByTestId("admin-dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "Nova categoria", level: 1 })).toBeTruthy();
  });
});
