import { describe, expect, it } from "vitest";
import { parseStoreIdentity, StoreValidationError } from "./modules/stores/validation.js";

describe("validação de identidade da loja", () => {
  it("aplica defaults apenas a campos omitidos", () => {
    expect(parseStoreIdentity({})).toEqual({ color: "#FF32B2", addressMode: "slug", storeCategory: "" });
    expect(parseStoreIdentity({}, { color: "#123456", address_mode: "custom_domain" })).toEqual({ color: "#123456", addressMode: "custom_domain", storeCategory: "" });
  });
  it("rejeita cor e modo de endereço explicitamente inválidos", () => {
    expect(() => parseStoreIdentity({ color: "rosa" })).toThrow(StoreValidationError);
    expect(() => parseStoreIdentity({ addressMode: "subdominio" })).toThrow(StoreValidationError);
  });
});
