/** Valida a navegação desktop: DropdownMenu de lojas, perfil, tema e edição. */
import { chromium } from "playwright-core";
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `desktop-${Date.now()}@loja-descomplicada.invalid`;
const password = "NavegacaoDesktop!2026";
let browser;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registration = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Teste desktop", email, password }) });
  const session = { Authorization: `Bearer ${registration.token}` };
  const first = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja Desktop A", slug: "loja-desktop-a", color: "#FF32B2" }) });
  const second = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja Desktop B", slug: "loja-desktop-b", color: "#FD7A00" }) });
  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ token, store }) => { localStorage.setItem("ld_token", token); sessionStorage.setItem("ld_store", JSON.stringify(store)); }, { token: registration.token, store: first.store });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await page.locator("header").getByRole("button", { name: /loja desktop a/i }).click();
  await page.getByRole("menuitemradio", { name: /loja desktop b/i }).click();
  await page.locator("main").getByText("Loja Desktop B", { exact: true }).first().waitFor();
  if (await page.getByRole("button", { name: "Editar loja" }).count() !== 1) throw new Error("O botão desktop de edição da loja não foi encontrado.");
  await page.getByRole("button", { name: "Abrir menu de perfil" }).click();
  await page.getByRole("menuitem", { name: "Editar conta" }).waitFor();
  await page.getByRole("menuitem", { name: "Alterar senha" }).waitFor();
  await page.getByRole("menuitem", { name: "Sair" }).waitFor();
  await page.screenshot({ path: "/home/ubuntu/screenshots/desktop-navigation.png", fullPage: true });
  console.log("Navegação desktop validada: lojas, edição, perfil e tema estão disponíveis.");
} finally {
  await browser?.close();
  if (process.env.DATABASE_URL) {
    const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}
