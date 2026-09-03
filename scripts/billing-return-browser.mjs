/** Verificação visual autenticada: retorno de teste mostra sucesso e chega ao painel em Chromium real. */
import { chromium } from "playwright-core";
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `browser-${Date.now()}@lojauno.invalid`;
const password = "FluxoBrowser!2026";
let browser;
let pool;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registered = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Validação Browser", email, password }) });
  const session = { Authorization: `Bearer ${registered.token}` };
  const store = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja de navegador", description: "Validação temporária", color: "#FF32B2" }) });
  const checkout = await request("/v1/billing/start-checkout", { method: "POST", headers: session, body: JSON.stringify({ storeId: store.store.id, planId: "crescer" }) });

  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ token, persistedStore }) => {
    localStorage.setItem("ld_token", token);
    sessionStorage.setItem("ld_store", JSON.stringify(persistedStore));
  }, { token: registered.token, persistedStore: store.store });
  await page.goto(`${baseUrl}${checkout.initPoint}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /entrar no painel/i }).waitFor();
  await page.screenshot({ path: "/home/ubuntu/screenshots/billing-return-persisted.png", fullPage: true });
  await page.getByRole("button", { name: /entrar no painel/i }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByText(/bancada está livre/i).waitFor();
  console.log("Fluxo visual validado: retorno de cobrança autenticado exibiu sucesso e navegou para o painel.");
} finally {
  await browser?.close();
  if (process.env.DATABASE_URL) {
    pool = mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}
