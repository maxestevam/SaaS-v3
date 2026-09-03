import { describe, expect, it } from "vitest";
import { AccountValidationError, parseAccountProfile, parsePasswordChange, requiredPassword } from "./modules/account/validation.js";

describe("validação de conta", () => {
  it("rejeita perfil e credenciais ausentes ou inválidos", () => {
    expect(() => parseAccountProfile({ name: "A", email: "invalido" })).toThrow(AccountValidationError);
    expect(() => parsePasswordChange({ currentPassword: "", newPassword: "12345678" })).toThrow(AccountValidationError);
    expect(() => requiredPassword("", "Confirme a senha.")).toThrow(AccountValidationError);
  });
  it("normaliza uma alteração válida de credenciais", () => {
    expect(parseAccountProfile({ name: "Ana", email: " ANA@EXEMPLO.COM " })).toEqual({ name: "Ana", email: "ana@exemplo.com" });
    expect(parsePasswordChange({ currentPassword: "atual", newPassword: "novaSenha8" })).toEqual({ currentPassword: "atual", newPassword: "novaSenha8" });
  });
});
