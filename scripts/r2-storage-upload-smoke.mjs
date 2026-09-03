import crypto from "node:crypto";

const baseUrl = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const email = `storage-smoke-${Date.now()}@example.invalid`;
const password = "StorageSeguro8!";
let token = "";

function pngHeader(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 2;
  return buffer;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} retornou ${response.status}: ${body.error || "sem detalhe"}`);
  return body;
}

async function expectUnavailable(url, label) {
  const response = await fetch(`${url}?deleted_at=${Date.now()}`, { cache: "no-store" });
  if (response.ok) throw new Error(`${label} continua acessível após a exclusão no R2.`);
}

try {
  const registration = await request("/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Validação de Storage", email, password }),
  });
  token = registration.token;
  const accountId = registration.user.id;
  const authHeaders = { Authorization: `Bearer ${token}` };
  const store = await request("/v1/stores", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Loja Storage", slug: `loja-storage-${Date.now()}`, description: "Validação temporária", color: "#FF32B2", addressMode: "slug" }),
  });
  const productDraftId = crypto.randomUUID();
  const productForm = new FormData();
  productForm.append("draftId", productDraftId);
  productForm.append("file", new Blob([pngHeader(24, 24)], { type: "image/png" }), "produto.png");
  const productUpload = await request(`/v1/stores/${store.store.id}/products/media`, { method: "POST", headers: authHeaders, body: productForm });

  const bannerDraftId = crypto.randomUUID();
  const bannerForm = new FormData();
  bannerForm.append("draftId", bannerDraftId);
  bannerForm.append("breakpoint", "desktop");
  bannerForm.append("file", new Blob([pngHeader(1280, 360)], { type: "image/png" }), "banner.png");
  const bannerUpload = await request(`/v1/stores/${store.store.id}/banners/media`, { method: "POST", headers: authHeaders, body: bannerForm });
  const banner = await request(`/v1/stores/${store.store.id}/banners`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Banner de validação", pages: ["home"], categoryIds: [], position: "top", active: true, draftId: bannerDraftId, uploadIds: [bannerUpload.image.id] }),
  });
  if (banner.banner.images.length !== 1 || banner.banner.images[0].url !== bannerUpload.image.url) throw new Error("A imagem temporária não foi vinculada ao banner salvo.");

  const logoForm = new FormData();
  logoForm.append("file", new Blob([pngHeader(96, 96)], { type: "image/png" }), "logo.png");
  const logo = await request(`/v1/stores/${store.store.id}/logo`, { method: "POST", headers: authHeaders, body: logoForm });
  const publicBase = String(process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  const expectedPrefixes = [
    `${publicBase}/${accountId}/${store.store.id}/products/`,
    `${publicBase}/${accountId}/${store.store.id}/banners/`,
    `${publicBase}/${accountId}/${store.store.id}/store/logo/`,
  ];
  const urls = [productUpload.media.url, bannerUpload.image.url, logo.store.logoUrl];
  if (urls.some((url, index) => !String(url || "").startsWith(expectedPrefixes[index]))) throw new Error("Uma URL R2 não respeita o prefixo de conta e loja.");

  const productRead = await fetch(productUpload.media.url);
  const bannerRead = await fetch(bannerUpload.image.url);
  const logoRead = await fetch(logo.store.logoUrl);
  if ([productRead, bannerRead, logoRead].some((response) => !response.ok)) throw new Error("Uma URL pública R2 não ficou acessível após o upload.");

  const replacementLogoForm = new FormData();
  replacementLogoForm.append("file", new Blob([pngHeader(96, 96)], { type: "image/png" }), "logo-substituta.png");
  const replacementLogo = await request(`/v1/stores/${store.store.id}/logo`, { method: "POST", headers: authHeaders, body: replacementLogoForm });
  if (replacementLogo.store.logoUrl === logo.store.logoUrl) throw new Error("A substituição de logo não gerou uma nova URL R2.");
  await expectUnavailable(logo.store.logoUrl, "A logo anterior substituída");
  if (!(await fetch(replacementLogo.store.logoUrl)).ok) throw new Error("A nova logo não ficou acessível após a substituição.");
  await request(`/v1/stores/${store.store.id}/logo`, { method: "DELETE", headers: authHeaders, body: "{}" });
  await expectUnavailable(replacementLogo.store.logoUrl, "A logo");
  await request(`/v1/stores/${store.store.id}/banners/${banner.banner.id}`, { method: "DELETE", headers: authHeaders, body: "{}" });
  await expectUnavailable(bannerUpload.image.url, "A imagem do banner");
  await request(`/v1/stores/${store.store.id}/products/media/${productUpload.media.id}`, { method: "DELETE", headers: authHeaders, body: "{}" });
  await expectUnavailable(productUpload.media.url, "A mídia de produto");

  const prefixProductDraftId = crypto.randomUUID();
  const prefixProductForm = new FormData();
  prefixProductForm.append("draftId", prefixProductDraftId);
  prefixProductForm.append("file", new Blob([pngHeader(24, 24)], { type: "image/png" }), "produto-prefixo.png");
  const prefixProductUpload = await request(`/v1/stores/${store.store.id}/products/media`, { method: "POST", headers: authHeaders, body: prefixProductForm });

  const prefixBannerDraftId = crypto.randomUUID();
  const prefixBannerForm = new FormData();
  prefixBannerForm.append("draftId", prefixBannerDraftId);
  prefixBannerForm.append("breakpoint", "desktop");
  prefixBannerForm.append("file", new Blob([pngHeader(1280, 360)], { type: "image/png" }), "banner-prefixo.png");
  const prefixBannerUpload = await request(`/v1/stores/${store.store.id}/banners/media`, { method: "POST", headers: authHeaders, body: prefixBannerForm });
  await request(`/v1/stores/${store.store.id}/banners`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Banner para exclusão da loja", pages: ["home"], categoryIds: [], position: "top", active: true, draftId: prefixBannerDraftId, uploadIds: [prefixBannerUpload.image.id] }),
  });

  const prefixLogoForm = new FormData();
  prefixLogoForm.append("file", new Blob([pngHeader(96, 96)], { type: "image/png" }), "logo-prefixo.png");
  const prefixLogo = await request(`/v1/stores/${store.store.id}/logo`, { method: "POST", headers: authHeaders, body: prefixLogoForm });
  await request(`/v1/stores/${store.store.id}`, { method: "DELETE", headers: authHeaders, body: "{}" });
  await Promise.all([
    expectUnavailable(prefixProductUpload.media.url, "A mídia de produto após excluir a loja"),
    expectUnavailable(prefixBannerUpload.image.url, "A imagem de banner após excluir a loja"),
    expectUnavailable(prefixLogo.store.logoUrl, "A logo após excluir a loja"),
  ]);
  console.log("product_upload_to_r2=ok");
  console.log("banner_upload_to_r2=ok");
  console.log("store_logo_upload_to_r2=ok");
  console.log("banner_upload_attach=ok");
  console.log("r2_public_media_read=ok");
  console.log("r2_direct_media_cleanup=ok");
  console.log("r2_store_prefix_cleanup=ok");
} finally {
  if (token) {
    await fetch(`${baseUrl}/v1/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => undefined);
  }
}
