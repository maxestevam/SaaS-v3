import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/BannersPage", () => ({ default: () => <div>Detalhe administrativo de banner</div> }));
vi.mock("@/pages/CouponsPage", () => ({ default: () => <div>Gestão administrativa de cupons</div> }));
vi.mock("@/pages/PublicStorefrontPage", () => ({ default: ({ screen }) => <div>Vitrine pública: {screen}</div> }));
vi.mock("sonner", () => ({ Toaster: () => null }));

import { cleanup, render, screen } from "@testing-library/react";
import App from "./App";

describe("isolamento entre rotas públicas e administrativas", () => {
  afterEach(() => { cleanup(); window.history.pushState({}, "", "/"); });

  it("mantém o detalhe administrativo de banner após adicionar a família pública com @", () => {
    window.history.pushState({}, "", "/banners/banner-1");
    render(<App />);
    expect(screen.getByText("Detalhe administrativo de banner")).toBeTruthy();
  });

  it("resolve as páginas base de banners e cupons", () => {
    window.history.pushState({}, "", "/banners");
    const banners = render(<App />);
    expect(screen.getByText("Detalhe administrativo de banner")).toBeTruthy();
    banners.unmount();

    window.history.pushState({}, "", "/coupons");
    render(<App />);
    expect(screen.getByText("Gestão administrativa de cupons")).toBeTruthy();
  });

  it("encaminha a URL pública com @ para a vitrine sem capturar rotas administrativas", () => {
    window.history.pushState({}, "", "/@loja-hq");
    render(<App />);
    expect(screen.getByText("Vitrine pública: home")).toBeTruthy();
  });

  it("resolve reload direto para categoria, produto, busca e página da mesma loja", () => {
    const cases = [
      ["/@loja-hq/categoria/ofertas", "category"],
      ["/@loja-hq/produto/camisa-linho", "product"],
      ["/@loja-hq/busca?q=linho", "search"],
      ["/@loja-hq/pagina/entregas", "page"],
    ];
    for (const [path, screenName] of cases) {
      window.history.pushState({}, "", path);
      const view = render(<App />);
      expect(screen.getByText(`Vitrine pública: ${screenName}`)).toBeTruthy();
      view.unmount();
    }
  });
});
