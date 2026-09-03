import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ api: { getCoupons: vi.fn(), getCoupon: vi.fn(), createCoupon: vi.fn(), updateCoupon: vi.fn(), deleteCoupon: vi.fn() } }));
vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja de teste" } }), ActiveStoreContext: { Provider: ({ children }) => children } }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }) => <section>{children}</section> }));
vi.mock("@/components/ui/drawer", () => ({ Drawer: ({ children }) => <section>{children}</section>, DrawerContent: ({ children }) => <section>{children}</section>, DrawerHeader: ({ children }) => <header>{children}</header>, DrawerTitle: ({ children }) => <h2>{children}</h2>, DrawerFooter: ({ children }) => <footer>{children}</footer> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CouponsContent } from "./CouponsPage.jsx";

describe("formulário de cupons", () => {
  beforeEach(() => { window.history.pushState({}, "", "/coupons"); window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); mocks.api.getCoupons.mockReset(); mocks.api.getCoupon.mockReset(); mocks.api.createCoupon.mockReset(); mocks.api.updateCoupon.mockReset(); mocks.api.deleteCoupon.mockReset(); mocks.api.getCoupons.mockResolvedValue({ data: [], summary: { total: 0, active: 0, freeShipping: 0, uses: 0 }, pagination: { page: 1, limit: 20, totalPages: 1 } }); mocks.api.createCoupon.mockResolvedValue({ coupon: { id: "coupon-1" } }); });
  afterEach(() => cleanup());

  it("cria cupom de frete grátis com múltiplos estados selecionados", async () => {
    render(<CouponsContent />);
    await screen.findByText("Nenhum cupom encontrado");
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(screen.getByPlaceholderText("EX.: BEMVINDO10"), { target: { value: "frete sp" } });
    fireEvent.click(screen.getByRole("button", { name: "Frete grátis" }));
    fireEvent.click(screen.getByRole("button", { name: "Seleção de estados" }));
    fireEvent.click(screen.getByRole("option", { name: "SP São Paulo" }));
    fireEvent.click(screen.getByRole("option", { name: "RJ Rio de Janeiro" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar cupom" }));
    await waitFor(() => expect(mocks.api.createCoupon).toHaveBeenCalledWith("store-1", expect.objectContaining({ code: "FRETE SP", discountType: "free_shipping", freeShippingStates: ["SP", "RJ"] })));
  });

  it("apresenta os três benefícios em linha, com ícones e rótulos compactos", async () => {
    render(<CouponsContent />);
    await screen.findByText("Nenhum cupom encontrado");
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    const choices = ["Porcentagem", "Valor fixo", "Frete grátis"].map((name) => screen.getByRole("button", { name }));
    expect(choices).toHaveLength(3);
    const grid = screen.getByText("Tipo de benefício").parentElement.querySelector(".grid.grid-cols-3");
    expect(grid).toBeTruthy();
    choices.forEach((choice) => {
      expect(choice.className).toContain("flex-col");
      expect(choice.className).toContain("items-center");
      expect(choice.querySelector("svg").className.baseVal).toContain("size-7");
      expect(choice.querySelector("span").className).toContain("text-xs");
    });
  });

  it("lista o cupom retornado no escopo da loja ativa", async () => {
    mocks.api.getCoupons.mockResolvedValue({ data: [{ id: "coupon-1", code: "FRETE-SP", discountType: "free_shipping", percentageOff: null, amountOffCents: null, minimumOrderCents: 0, expiresAt: null, usageLimit: null, usageCount: 0, freeShippingStates: ["SP", "RJ"], active: true }], summary: { total: 1, active: 1, freeShipping: 1, uses: 0 }, pagination: { page: 1, totalPages: 1 } });
    render(<CouponsContent />);
    await screen.findByText("FRETE-SP");
    expect(screen.getByText("Frete grátis: SP, RJ")).toBeTruthy();
    expect(mocks.api.getCoupons).toHaveBeenCalledWith("store-1", expect.objectContaining({ page: 1 }));
  });

  it("edita e exclui um cupom da loja ativa", async () => {
    const coupon = { id: "coupon-1", code: "BEMVINDO10", discountType: "percentage", percentageOff: 10, amountOffCents: null, minimumOrderCents: 0, expiresAt: null, usageLimit: null, usageCount: 0, freeShippingStates: [], active: true };
    mocks.api.getCoupons.mockResolvedValue({ data: [coupon], summary: { total: 1, active: 1, freeShipping: 0, uses: 0 }, pagination: { page: 1, limit: 20, totalPages: 1 } }); mocks.api.getCoupon.mockResolvedValue({ coupon }); mocks.api.updateCoupon.mockResolvedValue({ coupon }); mocks.api.deleteCoupon.mockResolvedValue({ ok: true }); vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CouponsContent />);
    await screen.findByText("BEMVINDO10");
    fireEvent.click(screen.getByRole("button", { name: "Editar cupom" }));
    await waitFor(() => expect(mocks.api.getCoupon).toHaveBeenCalledWith("store-1", "coupon-1"));
    await screen.findByDisplayValue("BEMVINDO10");
    fireEvent.change(screen.getByPlaceholderText("EX.: BEMVINDO10"), { target: { value: "bemvindo15" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cupom" }));
    await waitFor(() => expect(mocks.api.updateCoupon).toHaveBeenCalledWith("store-1", "coupon-1", expect.objectContaining({ code: "BEMVINDO15" })));
    fireEvent.click(screen.getByRole("button", { name: "Excluir cupom" }));
    await waitFor(() => expect(mocks.api.deleteCoupon).toHaveBeenCalledWith("store-1", "coupon-1"));
  });

  it("cria, edita e exclui o mesmo cupom sem sair da página", async () => {
    let coupons = [];
    mocks.api.getCoupons.mockImplementation(async () => ({ data: coupons, summary: { total: coupons.length, active: coupons.length, freeShipping: 0, uses: 0 }, pagination: { page: 1, limit: 20, total: coupons.length, totalPages: 1 } }));
    mocks.api.getCoupon.mockImplementation(async (_storeId, id) => ({ coupon: coupons.find((coupon) => coupon.id === id) }));
    mocks.api.createCoupon.mockImplementation(async (_storeId, input) => { const coupon = { id: "coupon-flow", code: input.code, discountType: input.discountType, percentageOff: input.percentageOff, amountOffCents: null, minimumOrderCents: 0, expiresAt: null, usageLimit: null, usageCount: 0, freeShippingStates: [], active: true }; coupons = [coupon]; return { coupon }; });
    mocks.api.updateCoupon.mockImplementation(async (_storeId, id, input) => { coupons = coupons.map((coupon) => coupon.id === id ? { ...coupon, ...input } : coupon); return { coupon: coupons[0] }; });
    mocks.api.deleteCoupon.mockImplementation(async (_storeId, id) => { coupons = coupons.filter((coupon) => coupon.id !== id); return { ok: true }; });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CouponsContent />);
    await screen.findByText("Nenhum cupom encontrado");
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(screen.getByPlaceholderText("EX.: BEMVINDO10"), { target: { value: "fluxo10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cupom" }));
    await screen.findByText("FLUXO10");
    fireEvent.click(screen.getByRole("button", { name: "Editar cupom" }));
    await waitFor(() => expect(mocks.api.getCoupon).toHaveBeenCalledWith("store-1", "coupon-flow"));
    await screen.findByDisplayValue("FLUXO10");
    fireEvent.change(screen.getByPlaceholderText("EX.: BEMVINDO10"), { target: { value: "fluxo15" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cupom" }));
    await screen.findByText("FLUXO15");
    fireEvent.click(screen.getByRole("button", { name: "Excluir cupom" }));
    await screen.findByText("Nenhum cupom encontrado");
    expect(mocks.api.createCoupon).toHaveBeenCalledWith("store-1", expect.objectContaining({ code: "FLUXO10" }));
    expect(mocks.api.updateCoupon).toHaveBeenCalledWith("store-1", "coupon-flow", expect.objectContaining({ code: "FLUXO15" }));
    expect(mocks.api.deleteCoupon).toHaveBeenCalledWith("store-1", "coupon-flow");
  });
});
