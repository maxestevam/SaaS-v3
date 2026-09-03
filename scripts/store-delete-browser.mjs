/** Confere o modal de exclusão de loja sem disparar a ação destrutiva no navegador. */
import { chromium } from "playwright-core";
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `store-delete-${Date.now()}@loja-descomplicada.invalid`;
const password = "ExcluirLoja!2026";
let browser;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registration = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Teste exclusão", email, password }) });
  const session = { Authorization: `Bearer ${registration.token}` };
  const created = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja para excluir", slug: "loja-para-excluir", color: "#FF32B2" }) });
  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ token, store }) => { localStorage.setItem("ld_token", token); sessionStorage.setItem("ld_store", JSON.stringify(store)); }, { token: registration.token, store: created.store });
  await page.goto(`${baseUrl}/stores/${created.store.id}/edit`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Excluir loja" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByText("Excluir esta loja?").waitFor();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  await page.screenshot({ path: "/home/ubuntu/screenshots/store-delete-confirmation.png", fullPage: true });
  console.log("Modal de exclusão de loja validado sem executar a exclusão no navegador.");
} finally {
  await browser?.close();
  if (process.env.DATABASE_URL) {
    const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}
