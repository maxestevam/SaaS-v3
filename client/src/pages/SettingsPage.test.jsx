import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ api: { getStoreSettings: vi.fn() } }));

vi.mock("@/contexts/ActiveStoreContext", () => ({ useActiveStore: () => ({ store: { id: "store-1", name: "Loja de teste" } }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { SettingsContent } from "./SettingsPage.jsx";

describe("abas de integrações por loja", () => {
  beforeEach(() => {
    mocks.api.getStoreSettings.mockReset();
    mocks.api.getStoreSettings.mockResolvedValue({ settings: { integrations: [], email: { provider: "resend", fromName: "", fromEmail: "", replyTo: "" }, templates: [
      { eventKey: "purchase_paid", subject: "Compra", bodyHtml: "<p>ok</p>", enabled: true },
      { eventKey: "order_completed", subject: "Finalizado", bodyHtml: "<p>ok</p>", enabled: true },
      { eventKey: "payment_requested", subject: "Pagamento", bodyHtml: "<p>ok</p>", enabled: true },
    ] } });
  });
  afterEach(() => cleanup());

  it("alterna entre pagamentos, frete e e-mails preservando o escopo da loja", async () => {
    render(<SettingsContent />);
    await screen.findByText("Mercado Pago");
    expect(screen.getAllByText("Loja de teste").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: "Frete" }));
    await screen.findByText("Melhor Envio");
    fireEvent.click(screen.getByRole("tab", { name: "E-mails" }));
    await screen.findByText("Modelos transacionais");
    expect(mocks.api.getStoreSettings).toHaveBeenCalledWith("store-1");
  });

  it("mantém as abas navegáveis em viewport móvel", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    render(<SettingsContent />);
    await screen.findByText("Mercado Pago");
    fireEvent.click(screen.getByRole("tab", { name: "Frete" }));
    await screen.findByText("Melhor Envio");
    fireEvent.click(screen.getByRole("tab", { name: "E-mails" }));
    expect(screen.getByRole("tab", { name: "E-mails" }).getAttribute("aria-selected")).toBe("true");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });

  it("exibe frete e e-mails em cartões diretos, sem collapses internos", async () => {
    render(<SettingsContent />);
    await screen.findByText("Mercado Pago");
    fireEvent.click(screen.getByRole("tab", { name: "Frete" }));
    await screen.findByText("Melhor Envio");
    expect(screen.getByText("Frete apenas para cotação")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "E-mails" }));
    await screen.findByText("Provedor e remetente");
    expect(screen.getByText("Modelos transacionais")).toBeTruthy();
  });
});
