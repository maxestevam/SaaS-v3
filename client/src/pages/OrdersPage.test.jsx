import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), api: { getStoreOrders: vi.fn() } }));
vi.mock("@/components/AppShell", () => ({ AppShell: ({ children }) => <>{children}</> }));
vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja de teste" } }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("wouter", () => ({ useLocation: () => ["/orders", mocks.navigate] }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { OrdersContent } from "./OrdersPage.jsx";

describe("gestão administrativa de pedidos", () => {
  afterEach(() => cleanup());

  it("consulta pedidos somente da loja ativa e apresenta o estado vazio", async () => {
    mocks.api.getStoreOrders.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }, summary: { totalCents: 0 } });
    render(<OrdersContent />);
    expect(await screen.findByRole("heading", { name: "Pedidos" })).toBeTruthy();
    expect(await screen.findByText("Nenhum pedido encontrado")).toBeTruthy();
    expect(mocks.api.getStoreOrders).toHaveBeenCalledWith("store-1", expect.objectContaining({ page: 1, limit: 20 }));
  });
});
