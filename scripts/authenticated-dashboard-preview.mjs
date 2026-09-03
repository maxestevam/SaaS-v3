import { chromium } from "playwright-core";

import { readFileSync } from "node:fs";

const baseUrl = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const email = `preview-auth-${Date.now()}@example.invalid`;
const password = "PreviewSegura8!";
let token = "";
const cleanupResources = [];
const routes = ["/dashboard", "/products", "/customers", "/coupons", "/banners", "/settings"];
const modalRoutes = [
  { route: "/products/create", title: "Adicionar produto" },
  { route: "/customers/create", title: "Novo cliente" },
  { route: "/coupons/create", title: "Criar cupom" },
  { route: "/banners/create", title: "Criar banner" },
  { route: "/products/categories/create", title: "Nova categoria" },
];
const viewports = [{ label: "desktop", width: 1280, height: 720 }, { label: "mobile", width: 375, height: 812 }];

try {
  const registration = await fetch(`${baseUrl}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Preview Autenticado", email, password }),
  });
  if (!registration.ok) throw new Error(`Cadastro falhou com status ${registration.status}`);
  ({ token } = await registration.json());

  const store = await fetch(`${baseUrl}/v1/stores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: "Loja Preview",
      slug: `loja-preview-${Date.now()}`,
      description: "Validação temporária do dashboard online",
      color: "#FF32B2",
      addressMode: "slug",
    }),
  });
  if (!store.ok) throw new Error(`Criação de loja falhou com status ${store.status}`);
  const { store: createdStore } = await store.json();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const customerResponse = await fetch(`${baseUrl}/v1/stores/${createdStore.id}/customers`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Cliente de prévia", status: "active", phones: [], addresses: [], favoriteProductIds: [] }),
  });
  if (!customerResponse.ok) throw new Error(`Criação de cliente temporário falhou com status ${customerResponse.status}`);
  const { customer } = await customerResponse.json();
  const couponResponse = await fetch(`${baseUrl}/v1/stores/${createdStore.id}/coupons`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ code: `PREVIEW-${Date.now()}`, discountType: "percentage", percentageOff: 10, minimumOrderCents: 0, active: true, newUsersOnly: false }),
  });
  if (!couponResponse.ok) throw new Error(`Criação de cupom temporário falhou com status ${couponResponse.status}`);
  const { coupon } = await couponResponse.json();
  const categoryResponse = await fetch(`${baseUrl}/v1/stores/${createdStore.id}/categories`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Categoria de prévia", description: "", active: true, cropAspect: "1:1" }),
  });
  if (!categoryResponse.ok) throw new Error(`Criação de categoria temporária falhou com status ${categoryResponse.status}`);
  const { category } = await categoryResponse.json();
  const imageBytes = readFileSync("/tmp/saas-preview-fullscreen.png");
  const productDraftId = crypto.randomUUID();
  const productUploadForm = new FormData();
  productUploadForm.append("draftId", productDraftId);
  productUploadForm.append("file", new Blob([imageBytes], { type: "image/png" }), "preview-product.png");
  const productUploadResponse = await fetch(`${baseUrl}/v1/stores/${createdStore.id}/products/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: productUploadForm });
  if (!productUploadResponse.ok) throw new Error(`Upload temporário de produto falhou com status ${productUploadResponse.status}`);
  const { media: productMedia } = await productUploadResponse.json();
  const productResponse = await fetch(`${baseUrl}/v1/stores/${createdStore.id}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Produto de prévia", description: "", categoryId: category.id, priceCents: 1000, status: "active", draftId: productDraftId, uploadIds: [productMedia.id] }),
  });
  if (!productResponse.ok) throw new Error(`Criação de produto temporário falhou com status ${productResponse.status}`);
  const { product } = await productResponse.json();
  const bannerDraftId = crypto.randomUUID();
  const bannerUploadForm = new FormData();
  bannerUploadForm.append("draftId", bannerDraftId);
  bannerUploadForm.append("breakpoint", "desktop");
  bannerUploadForm.append("cropX", "50"); bannerUploadForm.append("cropY", "50"); bannerUploadForm.append("cropZoom", "1");
  bannerUploadForm.append("file", new Blob([imageBytes], { type: "image/png" }), "preview-banner.png");
  const bannerUploadResponse = await fetch(`${baseUrl}/v1/stores/${createdStore.id}/banners/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: bannerUploadForm });
  if (!bannerUploadResponse.ok) throw new Error(`Upload temporário de banner falhou com status ${bannerUploadResponse.status}`);
  const { image: bannerImage } = await bannerUploadResponse.json();
  const bannerResponse = await fetch(`${baseUrl}/v1/stores/${createdStore.id}/banners`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ title: "Banner de prévia", pages: ["home"], categoryIds: [], position: "top", active: true, draftId: bannerDraftId, uploadIds: [bannerImage.id] }),
  });
  if (!bannerResponse.ok) throw new Error(`Criação de banner temporário falhou com status ${bannerResponse.status}`);
  const { banner } = await bannerResponse.json();
  cleanupResources.push(
    `/v1/stores/${createdStore.id}/products/${product.id}`,
    `/v1/stores/${createdStore.id}/banners/${banner.id}`,
    `/v1/stores/${createdStore.id}/customers/${customer.id}`,
    `/v1/stores/${createdStore.id}/coupons/${coupon.id}`,
  );
  const detailRoutes = [
    { route: `/products/${product.id}`, title: product.name },
    { route: `/customers/${customer.id}`, title: customer.name },
    { route: `/coupons/${coupon.id}`, title: coupon.code },
    { route: `/banners/${banner.id}`, title: banner.title },
  ];

  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
      await page.evaluate((sessionToken) => localStorage.setItem("ld_token", sessionToken), token);
      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        await page.locator("h1").waitFor({ state: "visible", timeout: 10_000 });
        await page.keyboard.press("Tab");
        const keyboardTarget = await page.evaluate(() => document.activeElement?.tagName || "");
        if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(keyboardTarget)) throw new Error(`A rota ${route} não expôs um alvo de teclado inicial.`);
        const unlabeledInputs = await page.locator("input").evaluateAll((inputs) => inputs.filter((input) => !(input.labels?.length || input.getAttribute("aria-label") || input.getAttribute("aria-labelledby"))).length);
        if (unlabeledInputs) throw new Error(`A rota ${route} contém campos sem nome acessível.`);
        console.log(`authenticated_${viewport.label}_${route.slice(1)}=${await page.locator("h1").innerText()}`);
      }
      for (const modalRoute of modalRoutes) {
        await page.goto(`${baseUrl}${modalRoute.route}`, { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: modalRoute.title, level: 1 }).waitFor({ state: "visible", timeout: 10_000 });
        const isNormalPage = await page.evaluate(() => !document.querySelector("[role='dialog']") && document.getElementById("root")?.inert !== true);
        if (!isNormalPage) throw new Error(`A página ${modalRoute.title} ainda está sendo apresentada como modal.`);
        await page.screenshot({ path: `/tmp/saas-normal-page-${viewport.label}-${modalRoute.route.slice(1).replaceAll("/", "_")}.png`, fullPage: true });
        console.log(`authenticated_${viewport.label}_page_${modalRoute.route.slice(1).replaceAll("/", "_")}=normal`);
      }
      for (const detailRoute of detailRoutes) {
        await page.goto(`${baseUrl}${detailRoute.route}`, { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: detailRoute.title, level: 1 }).waitFor({ state: "visible", timeout: 10_000 });
        const isNormalPage = await page.evaluate(() => !document.querySelector("[role='dialog']") && document.getElementById("root")?.inert !== true);
        if (!isNormalPage) throw new Error(`O detalhe ${detailRoute.title} ainda está sendo apresentado como modal.`);
        console.log(`authenticated_${viewport.label}_detail_${detailRoute.route.slice(1).replaceAll("/", "_")}=normal`);
      }
      await page.screenshot({ path: `/tmp/saas-multi-loja-authenticated-${viewport.label}.png`, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  if (token) await Promise.allSettled(cleanupResources.map((path) => fetch(`${baseUrl}${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" })));
  if (process.env.DATABASE_URL) {
    const mysql = await import("mysql2/promise");
    const pool = await mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}

process.exit(0);
