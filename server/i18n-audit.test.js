import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const auditedFiles = [
  "client/src/components/AppShell.jsx",
  "client/src/pages/DashboardPage.jsx",
  "client/src/pages/LoginPage.jsx",
  "client/src/pages/RegisterPage.jsx",
  "client/src/pages/ForgotPasswordPage.jsx",
  "client/src/pages/ResetPasswordPage.jsx",
  "client/src/pages/StoreOnboardingPage.jsx",
  "client/src/pages/PlanOnboardingPage.jsx",
  "client/src/pages/StoreEditPage.jsx",
  "client/src/pages/AccountPage.jsx",
  "client/src/pages/BillingOrdersPage.jsx",
  "client/src/pages/BillingReturnPage.jsx",
  "client/src/pages/NotFound.jsx",
];

function visibleHardcodes(source) {
  const content = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const jsxText = [...content.matchAll(/>([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^<{]{2,})</g)].map((match) => match[1].trim());
  const accessibleAttributes = [...content.matchAll(/(?:alt|aria-label|placeholder)="([A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇ][^"]{2,})"/g)].map((match) => match[1].trim());
  return [...jsxText, ...accessibleAttributes].filter((value) => !value.startsWith("http"));
}

describe("auditoria de i18n nas telas principais", () => {
  it("não mantém textos JSX ou atributos acessíveis visíveis hardcoded", () => {
    const findings = auditedFiles.flatMap((relativePath) => {
      const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
      return visibleHardcodes(source).map((value) => `${relativePath}: ${value}`);
    });
    expect(findings).toEqual([]);
  });
});
