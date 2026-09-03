import crypto from "node:crypto";
import { deflateSync } from "node:zlib";
import { chromium } from "playwright-core";

const baseUrl = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const email = `upload-ui-${Date.now()}@example.invalid`;
const password = "UploadInterface8!";
let token = "";

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function png(width, height) {
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    pixels[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 50;
      pixels[offset + 2] = 178;
      pixels[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(pixels)), pngChunk("IEND", Buffer.alloc(0))]);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} retornou ${response.status}: ${body.error || "sem detalhe"}`);
  return body;
}

async function waitFor(condition, message, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

async function expectUnavailable(url, label) {
  const response = await fetch(`${url}?replaced_at=${Date.now()}`, { cache: "no-store" });
  if (response.ok) throw new Error(`${label} continua acessível após a substituição.`);
}

try {
  const account = await request("/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Upload UI", email, password }) });
  token = account.token;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  await request("/v1/stores", { method: "POST", headers, body: JSON.stringify({ name: "Loja UI", slug: `loja-ui-${Date.now()}`, description: "Validação temporária", color: "#FF32B2", addressMode: "slug" }) });

  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const uploadResponses = [];
    const productUploadUrls = [];
    const failedResponses = [];
    const browserErrors = [];
    page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("response", async (response) => {
      if (response.url().includes("/products/media") || response.url().includes("/banners/media")) uploadResponses.push(`${response.request().method()} ${response.url()} ${response.status()}`);
      if (response.url().includes("/products/media") && response.status() === 201) {
        const body = await response.json().catch(() => null);
        if (body?.media?.url) productUploadUrls.push(body.media.url);
      }
      if (response.url().includes("/v1/stores/") && response.status() >= 400) failedResponses.push(`${response.request().method()} ${response.url()} ${response.status()} ${await response.text().catch(() => "")}`);
    });
    await page.goto(`${baseUrl}/products`, { waitUntil: "networkidle" });
    await page.evaluate((sessionToken) => localStorage.setItem("ld_token", sessionToken), token);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Adicionar produto" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "produto.png", mimeType: "image/png", buffer: png(24, 24) });
    try {
      await page.getByText("✓ Enviada").waitFor({ timeout: 15_000 });
    } catch (error) {
      await page.screenshot({ path: "/tmp/product-upload-ui-failure.png", fullPage: true });
      console.error(`product_upload_responses=${uploadResponses.join(" | ") || "nenhuma"}`);
      console.error((await page.locator("body").innerText()).slice(-1600));
      throw error;
    }
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar edição" }).click();
    await page.getByText("✓ Enviada").waitFor({ timeout: 15_000 });
    if (uploadResponses.filter((entry) => entry.includes("/products/media") && entry.endsWith(" 201")).length < 2) throw new Error("O recorte da imagem não reenviou a mídia de produto ao armazenamento.");
    await waitFor(() => productUploadUrls.length >= 2, "Não foi possível obter as URLs de produto antes e depois do recorte.");
    await expectUnavailable(productUploadUrls[0], "A mídia de produto anterior ao recorte");

    await page.goto(`${baseUrl}/banners`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Novo banner" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: png(1280, 360) });
    await page.getByText("1280 × 360px").waitFor({ timeout: 15_000 });
    await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.includes("Salvar banner") && !(button instanceof HTMLButtonElement) === false && !button.disabled));
    await page.locator('input[placeholder="Ex.: campanha de inverno"]').fill("Banner de validação");
    const saveButton = page.getByRole("button", { name: "Salvar banner" });
    console.log(`banner_save_disabled=${await saveButton.isDisabled()}`);
    await saveButton.click();
    try {
      await page.getByText("Banner criado.").waitFor({ timeout: 15_000 });
      await page.getByText("Banner de validação").waitFor({ timeout: 15_000 });
    } catch (error) {
      await page.screenshot({ path: "/tmp/banner-save-ui-failure.png", fullPage: true });
      console.error(`banner_upload_responses=${uploadResponses.join(" | ") || "nenhuma"}`);
      console.error(`banner_failed_responses=${failedResponses.join(" | ") || "nenhuma"}`);
      console.error(`banner_browser_errors=${browserErrors.join(" | ") || "nenhum"}`);
      console.error((await page.locator("body").innerText()).slice(-1800));
      throw error;
    }
    console.log("product_ui_immediate_upload=ok");
    console.log("product_ui_replacement_cleanup=ok");
    console.log("banner_ui_immediate_upload=ok");
  } finally {
    await browser.close();
  }
} finally {
  if (token) await fetch(`${baseUrl}/v1/account`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => undefined);
}
