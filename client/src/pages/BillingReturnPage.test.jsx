/** Valida a transição visual do retorno de teste para o painel usando a tela real. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillingReturnPage from "./BillingReturnPage";

const { navigate, getSubscription } = vi.hoisted(() => ({ navigate: vi.fn(), getSubscription: vi.fn() }));

vi.mock("@/lib/api", () => ({ api: { getSubscription } }));
vi.mock("wouter", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useLocation: () => ["/billing/return", navigate],
}));

describe("retorno de cobrança", () => {
  beforeEach(() => {
    navigate.mockReset();
    getSubscription.mockResolvedValue({ store: { id: "loja-1", name: "Casa", color: "#FF644F" }, subscription: { status: "trial" } });
    window.history.pushState({}, "", "/billing/return?store_id=loja-1");
    sessionStorage.clear();
  });

  it("mostra a confirmação e direciona para o painel quando o teste está ativo", async () => {
    const user = userEvent.setup();
    render(<BillingReturnPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: /entrar no painel/i })).toBeTruthy());
    expect(sessionStorage.getItem("ld_store")).toContain("loja-1");
    await user.click(screen.getByRole("button", { name: /entrar no painel/i }));
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });
});
