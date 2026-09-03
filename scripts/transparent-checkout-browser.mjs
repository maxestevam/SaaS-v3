/** Verifica visualmente o checkout interno sem solicitar geração de Pix ou pagamento de cartão. */
import { chromium } from "playwright-core";
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `transparent-${Date.now()}@loja-descomplicada.invalid`;
const password = "FluxoTransparente!2026";
let browser;
let pool;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registered = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Validação Checkout Transparente", email, password }) });
  const session = { Authorization: `Bearer ${registered.token}` };
  const store = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja checkout interno", slug: `checkout-${Date.now()}`, description: "Validação visual", color: "#FF32B2" }) });
  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ token, persistedStore }) => { localStorage.setItem("ld_token", token); sessionStorage.setItem("ld_store", JSON.stringify(persistedStore)); }, { token: registered.token, persistedStore: store.store });
  await page.goto(`${baseUrl}/onboarding/plan`, { waitUntil: "networkidle" });
  await page.getByText("R$ 0,50").waitFor();
  await page.getByText("R$ 0,60").waitFor();
  await page.getByRole("button", { name: /escolher forma de pagamento/i }).click();
  await page.getByRole("button", { name: /gerar pix/i }).waitFor();
  if (!page.url().endsWith("/onboarding/plan")) throw new Error(`O onboarding redirecionou indevidamente para ${page.url()}.`);
  await page.getByText(/você pode gerar um qr code pix ou pagar com cartão/i).waitFor();
  await page.screenshot({ path: "/home/ubuntu/screenshots/transparent-checkout-onboarding.png", fullPage: true });
  console.log("Fluxo visual validado: a escolha do plano abre Pix e cartão dentro do site sem criar uma cobrança.");
} finally {
  await browser?.close();
  if (process.env.DATABASE_URL) {
    pool = mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}
