import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), api: { getStores: vi.fn(), updateStore: vi.fn(), getStorefrontCapabilities: vi.fn(), deleteStore: vi.fn(), requestStoreDeletion: vi.fn() } }));
vi.mock("wouter", () => ({ useLocation: () => ["/stores/store-1/edit", mocks.navigate] }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/i18n", () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { extractLogoPalette, StoreEditContent } from "./StoreEditPage.jsx";

const store = { id: "store-1", name: "Loja de teste", slug: "loja-de-teste", description: "Descrição", color: "#FF32B2", fontFamily: "inter", contact: {}, address: {}, socials: {}, about: {} };
const fontOptions = [
  ["inter", "Inter", "Contemporânea e direta", "Inter, sans-serif"], ["manrope", "Manrope", "Sofisticada e geométrica", "Manrope, sans-serif"], ["lora", "Lora", "Editorial e acolhedora", "Lora, serif"], ["playfair_display", "Playfair Display", "Clássica e expressiva", "'Playfair Display', serif"], ["dm_sans", "DM Sans", "Leve e contemporânea", "'DM Sans', sans-serif"], ["montserrat", "Montserrat", "Marcante e versátil", "Montserrat, sans-serif"], ["nunito_sans", "Nunito Sans", "Amigável e clara", "'Nunito Sans', sans-serif"], ["poppins", "Poppins", "Moderna e geométrica", "Poppins, sans-serif"],
].map(([id, label, description, family]) => ({ id, label, description, family }));

describe("edição de loja guiada", () => {
  beforeEach(() => { globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; mocks.api.getStores.mockReset(); mocks.api.updateStore.mockReset(); mocks.api.getStorefrontCapabilities.mockReset(); mocks.api.requestStoreDeletion.mockReset(); mocks.api.getStores.mockResolvedValue({ stores: [store], fontOptions }); mocks.api.updateStore.mockResolvedValue({ store }); mocks.api.getStorefrontCapabilities.mockResolvedValue({ payments: { connected: false, available: false, options: [] }, shipping: { connected: false, available: false, options: [] } }); mocks.api.requestStoreDeletion.mockResolvedValue({ ok: true }); });
  afterEach(() => cleanup());

  it("organiza a configuração por domínios claros e preserva os dados institucionais ao salvar", async () => {
    render(<StoreEditContent storeId="store-1" />);
    await screen.findByDisplayValue("Loja de teste");
    expect(screen.getByText("Deixe sua loja pronta para vender")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Salvar alterações" }).parentElement.parentElement.className).toContain("bottom-[calc(9.25rem+env(safe-area-inset-bottom))]");
    expect(screen.getAllByRole("button", { name: /identidade|template e aparência|operação da loja|vendas e entrega|atendimento|área avançada/i })).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Fonte da loja" }));
    expect(screen.getAllByRole("button", { name: /contemporânea|sofisticada|editorial|clássica|leve|marcante|amigável|moderna/i })).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "Lora Editorial e acolhedora" }));
    fireEvent.click(screen.getByRole("button", { name: /atendimento/i }));
    fireEvent.change(screen.getByPlaceholderText("contato@sualoja.com.br"), { target: { value: "contato@loja.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Redes sociais" }));
    fireEvent.change(screen.getByPlaceholderText("https://instagram.com/sualoja"), { target: { value: "https://instagram.com/loja" } });
    fireEvent.click(screen.getByRole("button", { name: "Sobre a loja" }));
    fireEvent.change(screen.getByPlaceholderText("Nossa história"), { target: { value: "Nossa loja" } });
    fireEvent.click(screen.getByRole("button", { name: /template e aparência/i }));
    expect(screen.getByRole("button", { name: /loja padrão ativo/i })).toBeTruthy();
    expect(screen.getAllByText("Em breve")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /operação da loja/i }));
    fireEvent.click(screen.getByRole("button", { name: /real brasileiro/i }));
    fireEvent.change(screen.getByPlaceholderText("Busque uma moeda"), { target: { value: "dólar" } });
    fireEvent.click(screen.getByRole("button", { name: /dólar americano/i }));
    fireEvent.click(screen.getByRole("button", { name: /vendas e entrega/i }));
    fireEvent.change(screen.getByLabelText("Frete grátis a partir de"), { target: { value: "123456" } });
    expect(screen.getByLabelText("Frete grátis a partir de").value).toBe("1.234,56");
    fireEvent.click(screen.getByRole("switch", { name: "Exibir estoque" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await vi.waitFor(() => expect(mocks.api.updateStore).toHaveBeenCalledWith("store-1", expect.objectContaining({ fontFamily: "lora", storefront: expect.objectContaining({ currency: "USD" }), settings: expect.objectContaining({ freeShippingMinValue: 1234.56, showStock: false }), contact: expect.objectContaining({ email: "contato@loja.com" }), socials: expect.objectContaining({ instagram: "https://instagram.com/loja" }), about: expect.objectContaining({ title: "Nossa loja" }) })));
  });

  it("oferece slug, HEX e exclusão por switches com senha e confirmação por e-mail", async () => {
    render(<StoreEditContent storeId="store-1" />);
    await screen.findByDisplayValue("Loja de teste");
    fireEvent.click(screen.getByRole("button", { name: "Endereço público" }));
    expect(screen.getByText("Endereço público")).toBeTruthy();
    expect(screen.getByLabelText("Slug da loja").value).toBe("loja-de-teste");
    expect(screen.getByText("Domínio próprio").closest("label").querySelector('input[type="radio"]').disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cor de destaque" }));
    fireEvent.change(screen.getByLabelText("Cor hexadecimal"), { target: { value: "#123456" } });
    expect(screen.getByLabelText("Cor hexadecimal").value).toBe("#123456");
    fireEvent.click(screen.getByRole("button", { name: /área avançada/i }));
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(5);
    fireEvent.click(screen.getByRole("switch", { name: "Excluir todos os produtos" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    fireEvent.change(screen.getByPlaceholderText("Digite sua senha"), { target: { value: "senha-segura" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de confirmação" }));
    await vi.waitFor(() => expect(mocks.api.requestStoreDeletion).toHaveBeenCalledWith("store-1", { password: "senha-segura", resources: ["products"], deleteStore: false }));
  });

  it("extrai de duas a seis sugestões de cores quando a logo pode ser lida", async () => {
    const pixels = new Uint8ClampedArray(48 * 48 * 4);
    for (let index = 0; index < pixels.length; index += 16) {
      const [red, green, blue] = (index / 16) % 2 ? [32, 96, 224] : [224, 32, 64];
      [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]] = [red, green, blue, 255];
    }
    const originalCreateElement = document.createElement.bind(document);
    const OriginalImage = globalThis.Image;
    vi.spyOn(document, "createElement").mockImplementation((tagName, options) => tagName === "canvas" ? ({ getContext: () => ({ drawImage: vi.fn(), getImageData: () => ({ data: pixels }) }) }) : originalCreateElement(tagName, options));
    globalThis.Image = class { set src(_value) { queueMicrotask(() => this.onload()); } };
    await expect(extractLogoPalette("https://cdn.exemplo/logo.png")).resolves.toSatisfy((colors) => colors.length >= 2 && colors.length <= 6);
    globalThis.Image = OriginalImage;
  });

  it("exibe sugestões de paleta no cartão de cor quando a logo é processável", async () => {
    const pixels = new Uint8ClampedArray(48 * 48 * 4);
    for (let index = 0; index < pixels.length; index += 16) {
      const [red, green, blue] = (index / 16) % 2 ? [32, 96, 224] : [224, 32, 64];
      [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]] = [red, green, blue, 255];
    }
    const originalCreateElement = document.createElement.bind(document);
    const OriginalImage = globalThis.Image;
    vi.spyOn(document, "createElement").mockImplementation((tagName, options) => tagName === "canvas" ? ({ getContext: () => ({ drawImage: vi.fn(), getImageData: () => ({ data: pixels }) }) }) : originalCreateElement(tagName, options));
    globalThis.Image = class { set src(_value) { queueMicrotask(() => this.onload()); } };
    mocks.api.getStores.mockResolvedValue({ stores: [{ ...store, logoUrl: "https://cdn.exemplo/logo.png" }], fontOptions });
    render(<StoreEditContent storeId="store-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Cor de destaque" }));
    await screen.findByText("Sugestões da sua logo");
    expect(screen.getAllByRole("button", { name: /Usar a cor #/ })).toHaveLength(10);
    globalThis.Image = OriginalImage;
  });
});
