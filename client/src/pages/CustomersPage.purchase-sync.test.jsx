import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const initialCustomer = { id: "customer-1", name: "Cliente CRM", email: "cliente@exemplo.com", document: "", status: "active", primaryPhone: "", favoritesCount: 0, totalOrders: 0, totalSpentCents: 0 };
  const updatedCustomer = { ...initialCustomer, totalOrders: 1, totalSpentCents: 7550, purchases: [{ id: "purchase-1", reference: "PED-1", amountCents: 7550, purchasedAt: 1787426000000 }] };
  const result = (customer) => ({ data: [customer], summary: { total: 1, active: 1, inactive: 0, orders: customer.totalOrders, totalSpentCents: customer.totalSpentCents }, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  return { initialCustomer, updatedCustomer, result, api: { getCustomers: vi.fn(), getCustomer: vi.fn(), deleteCustomer: vi.fn() } };
});

vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Minha loja" } }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/CustomerDetailPanel", () => ({ CustomerDetailPanel: ({ onUpdated }) => <div><button onClick={() => onUpdated(mocks.updatedCustomer)}>Simular compra</button><button onClick={() => onUpdated(mocks.initialCustomer)}>Simular exclusão</button></div> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { CustomersContent } from "./CustomersPage.jsx";

function ordersMetric() { return screen.getAllByText("Pedidos").find((node) => node.tagName === "SMALL").parentElement; }

describe("sincronização do histórico no CRM", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/customers");
    mocks.api.getCustomers.mockReset(); mocks.api.getCustomer.mockReset();
    mocks.api.getCustomers.mockResolvedValue(mocks.result(mocks.initialCustomer));
    mocks.api.getCustomer.mockResolvedValue({ customer: mocks.initialCustomer });
  });
  afterEach(() => cleanup());

  it("mantém a rota de detalhe disponível após registrar uma compra", async () => {
    render(<CustomersContent />);
    await screen.findAllByText("Cliente CRM");
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    await screen.findByRole("button", { name: "Simular compra" });
    fireEvent.click(screen.getByRole("button", { name: "Simular compra" }));
    expect(screen.getByRole("button", { name: "Simular compra" })).toBeTruthy();
  });

  it("mantém a rota de detalhe disponível após excluir uma compra", async () => {
    mocks.api.getCustomers.mockResolvedValue(mocks.result(mocks.updatedCustomer));
    mocks.api.getCustomer.mockResolvedValue({ customer: mocks.updatedCustomer });
    render(<CustomersContent />);
    await screen.findAllByText("Cliente CRM");
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    await screen.findByRole("button", { name: "Simular exclusão" });
    fireEvent.click(screen.getByRole("button", { name: "Simular exclusão" }));
    expect(screen.getByRole("button", { name: "Simular exclusão" })).toBeTruthy();
  });
});
