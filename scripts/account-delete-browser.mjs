/** Confere o modal de exclusão da conta sem efetivar a ação destrutiva no navegador. */
import { chromium } from "playwright-core";
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `account-delete-${Date.now()}@loja-descomplicada.invalid`;
const password = "ExcluirConta!2026";
let browser;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registration = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Teste conta", email, password }) });
  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate((token) => localStorage.setItem("ld_token", token), registration.token);
  await page.goto(`${baseUrl}/account?tab=security`, { waitUntil: "networkidle" });
  await page.getByLabel("Confirme sua senha").fill(password);
  await page.getByRole("button", { name: "Excluir minha conta" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByText("Excluir sua conta?").waitFor();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  console.log("Modal de exclusão de conta validado sem executar a exclusão no navegador.");
} finally {
  await browser?.close();
  if (process.env.DATABASE_URL) {
    const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}
