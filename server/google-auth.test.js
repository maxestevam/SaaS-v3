import { describe, expect, it } from "vitest";
import { googleAuthStatus } from "./modules/auth/google.js";

describe("login com Google", () => {
  it("mantém o provedor oculto enquanto a variável de ativação está desabilitada", () => {
    const previous = process.env.GOOGLE_AUTH_ENABLED;
    process.env.GOOGLE_AUTH_ENABLED = "false";
    expect(googleAuthStatus()).toEqual({ enabled: false });
    process.env.GOOGLE_AUTH_ENABLED = previous;
  });
});
