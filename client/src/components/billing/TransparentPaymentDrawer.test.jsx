import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransparentPaymentDrawer } from "./TransparentPaymentDrawer";

const mocks = vi.hoisted(() => ({ createPixPayment: vi.fn(), payOrderByCard: vi.fn() }));

vi.mock("@/lib/api", () => ({ api: mocks }));
vi.mock("@/i18n", () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }) => open ? <div>{children}</div> : null,
  DrawerContent: ({ children }) => <section>{children}</section>,
  DrawerDescription: ({ children }) => <p>{children}</p>,
  DrawerFooter: ({ children }) => <footer>{children}</footer>,
  DrawerHeader: ({ children }) => <header>{children}</header>,
  DrawerTitle: ({ children }) => <h2>{children}</h2>,
}));

describe("TransparentPaymentDrawer", () => {
  it("não renderiza sem uma ordem selecionada", () => {
    render(<TransparentPaymentDrawer order={null} />);
    expect(screen.queryByText("billing.payOrder")).toBeNull();
  });

  it("gera PIX para a ordem selecionada usando o contrato existente", async () => {
    mocks.createPixPayment.mockResolvedValueOnce({ order: { id: "order_1", storeId: "store_1", pixQrCode: "000201" } });
    render(<TransparentPaymentDrawer order={{ id: "order_1", storeId: "store_1", amountCents: 50, status: "pending" }} />);
    fireEvent.click(screen.getByRole("button", { name: "billing.generatePix" }));
    await waitFor(() => expect(mocks.createPixPayment).toHaveBeenCalledWith("order_1", "store_1"));
    expect(await screen.findByText("000201")).toBeTruthy();
  });

  it("envia ao contrato existente somente o cartão tokenizado pelo SDK público", async () => {
    let callbacks;
    const cardForm = vi.fn((config) => {
      callbacks = config.callbacks;
      return { getCardFormData: () => ({ token: "token_cartao", paymentMethodId: "visa", installments: "1", issuerId: "issuer_1" }), unmount: vi.fn() };
    });
    window.MercadoPago = vi.fn(() => ({ cardForm }));
    mocks.payOrderByCard.mockResolvedValueOnce({ order: { id: "order_2", storeId: "store_2", status: "pending" } });
    render(<TransparentPaymentDrawer order={{ id: "order_2", storeId: "store_2", amountCents: 60, status: "pending" }} />);
    fireEvent.click(screen.getByRole("button", { name: "billing.card" }));
    await waitFor(() => expect(cardForm).toHaveBeenCalled());
    await act(async () => { await callbacks.onSubmit({ preventDefault: vi.fn() }); });
    expect(mocks.payOrderByCard).toHaveBeenCalledWith("order_2", "store_2", { token: "token_cartao", paymentMethodId: "visa", installments: 1, issuerId: "issuer_1" });
    delete window.MercadoPago;
  });
});
