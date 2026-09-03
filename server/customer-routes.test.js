import { describe, expect, it } from "vitest";
import { buildCustomerFilters, parseCustomerInput, parsePurchaseInput } from "./modules/customers/routes.js";

describe("CRM de clientes por loja", () => {
  it("normaliza cadastro com telefones, endereços e favoritos", () => {
    const parsed = parseCustomerInput({ name: "Ana Lima", email: "ANA@EXEMPLO.COM", phones: [{ label: "WhatsApp", phone: "+55 11 99999-0000" }, { label: "Trabalho", phone: "+55 11 3333-0000" }], addresses: [{ label: "Casa", street: "Rua das Flores", city: "São Paulo", state: "SP", country: "br", observation: "Portão azul" }], favoriteProductIds: ["d2719ffb-7bc5-4d91-940d-df9c308efa8f"] });
    expect(parsed.valid).toBe(true);
    expect(parsed.value.email).toBe("ana@exemplo.com");
    expect(parsed.value.phones).toHaveLength(2);
    expect(parsed.value.addresses[0].country).toBe("BR");
    expect(parsed.value.addresses[0].observation).toBe("Portão azul");
  });

  it("limita o cadastro a três telefones e quatro endereços", () => {
    const address = { label: "Casa", street: "Rua A", city: "São Paulo", state: "SP", country: "BR" };
    expect(parseCustomerInput({ name: "Ana Lima", phones: [{ phone: "11111" }, { phone: "22222" }, { phone: "33333" }, { phone: "44444" }] })).toMatchObject({ valid: false, error: "Cada cliente pode ter no máximo três telefones." });
    expect(parseCustomerInput({ name: "Ana Lima", addresses: [address, address, address, address, address] })).toMatchObject({ valid: false, error: "Cada cliente pode ter no máximo quatro endereços." });
  });

  it("restringe a busca ao escopo da loja e inclui pesquisa por contato", () => {
    const filters = buildCustomerFilters("store-1", { search: "Ana", status: "active", favorites: "yes" });
    expect(filters.where).toContain("customers.store_id = ?");
    expect(filters.where).toContain("ld_customer_phones");
    expect(filters.where).toContain("ld_customer_favorites");
    expect(filters.params[0]).toBe("store-1");
  });

  it("valida registros de compra para o cliente no contexto da loja", () => {
    expect(parsePurchaseInput({ amountCents: 12990, reference: "PED-100", purchasedAt: 1787420000000 })).toMatchObject({ valid: true, value: { amountCents: 12990, reference: "PED-100" } });
    expect(parsePurchaseInput({ amountCents: 0 })).toMatchObject({ valid: false });
  });
});
