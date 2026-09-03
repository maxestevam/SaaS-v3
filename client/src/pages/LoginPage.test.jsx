import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), login: vi.fn() }));
const messages = {
  "auth.loginEyebrow": "Acesso à operação", "auth.loginTitle": "Que bom ter você de volta.", "auth.loginDescription": "Entre para acompanhar a sua loja e seguir de onde parou.", "auth.noAccount": "Ainda não usa a Loja Descomplicada?", "auth.createAccount": "Criar minha conta", "auth.email": "Seu e-mail", "auth.emailPlaceholder": "voce@exemplo.com", "auth.password": "Sua senha", "auth.passwordPlaceholder": "Digite sua senha", "auth.forgotPassword": "Esqueci minha senha", "auth.showPassword": "Mostrar senha", "auth.hidePassword": "Ocultar senha", "auth.login": "Entrar na minha operação",
};

vi.mock("wouter", () => ({ Link: ({ children, ...props }) => <a {...props}>{children}</a>, useLocation: () => ["/login", mocks.navigate] }));
vi.mock("@/lib/api", () => ({ api: { login: mocks.login } }));
vi.mock("@/i18n", () => ({ useI18n: () => ({ t: (key) => messages[key] || key }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import LoginPage from "./LoginPage.jsx";

describe("tela de acesso", () => {
  beforeEach(() => { mocks.login.mockReset(); mocks.navigate.mockReset(); });
  afterEach(() => cleanup());

  it("preserva os campos e alterna a visibilidade da senha", () => {
    render(<LoginPage />);
    const password = screen.getByLabelText("Sua senha");
    expect(screen.getByRole("heading", { name: "Que bom ter você de volta." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Esqueci minha senha" }).getAttribute("href")).toBe("/forgot-password");
    expect(password.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(password.getAttribute("type")).toBe("text");
  });

  it("autentica e direciona uma conta já concluída ao painel", async () => {
    mocks.login.mockResolvedValue({ token: "session-test", user: { id: "user-1", onboardingComplete: true } });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Seu e-mail"), { target: { value: "contato@loja.com" } });
    fireEvent.change(screen.getByLabelText("Sua senha"), { target: { value: "SenhaSegura8" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar na minha operação/i }));
    await vi.waitFor(() => expect(mocks.login).toHaveBeenCalledWith({ email: "contato@loja.com", password: "SenhaSegura8" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard");
  });
});
