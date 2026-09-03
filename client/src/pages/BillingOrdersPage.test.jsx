import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  api: { getSubscriptions: vi.fn(), getBillingOrders: vi.fn(), getPlans: vi.fn(), changePlan: vi.fn(), createPixPayment: vi.fn() },
}));

vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja teste" } }) }));
vi.mock("@/i18n", () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/billing/TransparentPaymentDrawer", () => ({ TransparentPaymentDrawer: () => null }));

import { BillingOrdersContent, getTrialCountdown } from "./BillingOrdersPage.jsx";

describe("assinaturas", () => {
  beforeEach(() => {
    mocks.api.getSubscriptions.mockResolvedValue({ subscriptions: [{ id: "subscription-1", planId: "pro", status: "trial", trialEndsAt: Date.now() + 26 * 60 * 60 * 1000, renewalDueAt: null }] });
    mocks.api.getBillingOrders.mockResolvedValue({ orders: [] });
    mocks.api.getPlans.mockResolvedValue({ plans: [{ id: "starter", name: "Inicial", description: "Para começar", amountCents: 2990, features: ["Catálogo"], featured: false }, { id: "pro", name: "Profissional", description: "Para crescer", amountCents: 5990, features: ["Catálogo", "Cupons"], featured: true }] });
  });
  afterEach(() => cleanup());

  it("destaca o período de teste com contagem regressiva e mostra planos em cartões inline", async () => {
    render(<BillingOrdersContent />);
    const countdown = await screen.findByTestId("trial-countdown");
    expect(countdown.textContent).toContain("billing.trialActive");
    expect(countdown.textContent).toContain("billing.trialRemaining");
    const cards = screen.getByTestId("billing-plan-cards");
    expect(cards.className).toContain("flex-nowrap");
    expect(screen.getByText("Inicial")).toBeTruthy();
    expect(screen.getAllByText("Profissional")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "billing.currentPlan" })).toBeTruthy();
  });

  it("calcula uma contagem legível para um teste ainda vigente", () => {
    expect(getTrialCountdown(26 * 60 * 60 * 1000, 0)).toEqual(expect.objectContaining({ active: true, time: "1 dia · 2 horas · 0 minutos" }));
  });
});
