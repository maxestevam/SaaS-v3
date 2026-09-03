import { describe, expect, it } from "vitest";
import { ptBR, resolveTranslation } from "../client/src/i18n/pt-BR";

describe("catálogo pt-BR", () => {
  it("mantém as chaves críticas de navegação, conta, lojas, autenticação e cobrança", () => {
    ["nav.home", "nav.switchStore", "account.title", "store.edit", "auth.loginTitle", "auth.resetEmailSent", "onboarding.storeTitle", "plan.title", "billing.title", "billing.qrAlt", "billingReturn.successTitle", "dashboard.overview", "notFound.title"].forEach((key) => expect(resolveTranslation(key)).not.toBe(key));
  });

  it("preserva valores estruturados para as listas de recursos dos planos", () => {
    expect(ptBR.plan.essentialFeatures).toEqual(["1 loja ativa", "Catálogo essencial", "Suporte por e-mail"]);
    expect(ptBR.plan.growFeatures).toHaveLength(3);
  });
});
