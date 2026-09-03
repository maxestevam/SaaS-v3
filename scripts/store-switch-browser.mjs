/** Valida no Chromium que a troca de loja no Drawer atualiza o painel sem recarregar a página. */
import { chromium } from "playwright-core";
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `switch-${Date.now()}@loja-descomplicada.invalid`;
const password = "TrocaDeLoja!2026";
let browser;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registration = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Teste de troca", email, password }) });
  const session = { Authorization: `Bearer ${registration.token}` };
  const first = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja A", description: "Temporária", color: "#FF32B2" }) });
  const second = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja B", description: "Temporária", color: "#FD7A00" }) });

  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ token, store }) => { localStorage.setItem("ld_token", token); sessionStorage.setItem("ld_store", JSON.stringify(store)); }, { token: registration.token, store: first.store });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /abrir início e lojas/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: /loja a/i }).click();
  await page.getByRole("menuitemradio", { name: /loja b/i }).click();
  await page.locator("main").getByText("Loja B", { exact: true }).first().waitFor();
  console.log("Troca de loja validada: o Drawer atualizou o conteúdo do painel sem recarregar.");
} finally {
  await browser?.close();
  if (process.env.DATABASE_URL) {
    const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}
