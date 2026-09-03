import { chromium } from "playwright-core";

const baseUrl = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const email = `products-list-${Date.now()}@example.invalid`;
const password = "ProdutosLista8!";
let token = "";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} retornou ${response.status}: ${body.error || "sem detalhe"}`);
  return body;
}

try {
  const registration = await request("/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Validação de produtos", email, password }),
  });
  token = registration.token;
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  await request("/v1/stores", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Loja de produtos", slug: `loja-produtos-${Date.now()}`, description: "Validação temporária", color: "#FF32B2", addressMode: "slug" }),
  });

  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const productResponses = [];
    const errors = [];
    page.on("response", (response) => { if (response.url().includes("/v1/stores/") && response.url().includes("/products?")) productResponses.push(response.status()); });
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`${baseUrl}/products`, { waitUntil: "networkidle" });
    await page.evaluate((sessionToken) => localStorage.setItem("ld_token", sessionToken), token);
    productResponses.length = 0;
    errors.length = 0;
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Nenhum produto encontrado").waitFor({ timeout: 15_000 });
    if (!productResponses.includes(200)) throw new Error(`A listagem de produtos não retornou 200. Status recebidos: ${productResponses.join(", ") || "nenhum"}.`);
    if ((await page.locator("body").innerText()).includes("Informe uma ordenação de produtos válida.")) throw new Error("O toast de ordenação inválida ainda foi exibido.");
    if (errors.length) throw new Error(`A página de produtos apresentou erro de console: ${errors.join(" | ")}`);
    console.log("product_list_recent_sort=ok");
  } finally {
    await browser.close();
  }
} finally {
  if (token) await fetch(`${baseUrl}/v1/account`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => undefined);
}
