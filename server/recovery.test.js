/** Fluxo de recuperação: token de uso único, hash persistível e e-mail sem disparo externo durante testes. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createResetToken, hashToken } from "./auth.js";
import { sendResetEmail } from "./api.js";

afterEach(() => vi.unstubAllGlobals());

describe("recuperação de senha persistida", () => {
  it("gera um token não reversível para armazenamento e envia um link de redefinição ao e-mail", async () => {
    const token = createResetToken();
    const storedHash = hashToken(token);
    expect(storedHash).toHaveLength(64);
    expect(storedHash).not.toContain(token);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const previousKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test_key";

    await sendResetEmail({ name: "Ana", email: "ana@exemplo.com" }, token, "https://app.exemplo.com");

    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer re_test_key");
    expect(options.body).toContain(encodeURIComponent(token));
    process.env.RESEND_API_KEY = previousKey;
  });
});
