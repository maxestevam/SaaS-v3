import { describe, expect, it } from "vitest";
import { normalizeStoreProfile } from "./api.js";

const fontOptions = [{ id: "inter" }, { id: "lora" }];

describe("perfil institucional da loja", () => {
  it("normaliza os dados permitidos para persistência por loja", () => {
    const result = normalizeStoreProfile({ fontFamily: "lora", contact: { email: "contato@exemplo.com", whatsapp: "11999999999" }, address: { country: "br", city: "São Paulo" }, socials: { instagram: "https://instagram.com/loja" }, about: { title: "Nossa história", body: "Texto institucional" } }, {}, fontOptions);
    expect(result.valid).toBe(true);
    expect(result.value).toMatchObject({ fontFamily: "lora", contact: { email: "contato@exemplo.com", whatsapp: "11999999999" }, address: { country: "BR", city: "São Paulo" }, socials: { instagram: "https://instagram.com/loja" }, about: { title: "Nossa história" } });
  });

  it("recusa fonte, e-mail e links sociais inválidos", () => {
    expect(normalizeStoreProfile({ fontFamily: "fonte-invalida" }, {}, fontOptions).valid).toBe(false);
    expect(normalizeStoreProfile({ contact: { email: "nao-e-email" } }, {}, fontOptions).valid).toBe(false);
    expect(normalizeStoreProfile({ socials: { instagram: "instagram.com/loja" } }, {}, fontOptions).valid).toBe(false);
  });
});
