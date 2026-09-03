/** Testes unitários de segurança para as credenciais persistidas. */
import { describe, expect, it } from "vitest";
import { hashPassword, signSession, verifyPassword, verifySession } from "./auth.js";

describe("credenciais da Loja Descomplicada", () => {
  it("gera e confere hash de senha sem preservar o texto original", async () => {
    const hash = await hashPassword("segredo-seguro-123");
    expect(hash).not.toContain("segredo-seguro-123");
    await expect(verifyPassword("segredo-seguro-123", hash)).resolves.toBe(true);
    await expect(verifyPassword("senha-errada", hash)).resolves.toBe(false);
  });

  it("assina e verifica uma sessão com usuário persistente", async () => {
    const user = { id: "0e5ccb7d-62b8-4976-a0ec-e9e1cfd45d7f", name: "Ana", email: "ana@exemplo.com" };
    const token = await signSession(user, "chave-secreta-minima-para-teste");
    await expect(verifySession(token, "chave-secreta-minima-para-teste")).resolves.toMatchObject({ ...user, issuedAt: expect.any(Number) });
  });
});
