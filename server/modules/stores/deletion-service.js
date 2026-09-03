import { randomUUID } from "node:crypto";
import { createResetToken, hashToken, verifyPassword } from "../../auth.js";
import { one, query, transaction } from "../../db.js";
import { cancelMercadoPagoSubscription } from "../billing/service.js";
import { getProductStorage, storeMediaPrefix } from "../storage/media-storage.js";
import { removeStoreContractFromR2, storeContractKey, syncStoreContractToR2 } from "../store-contract/r2-sync.js";

const RESOURCE_KEYS = new Set(["products", "coupons", "banners", "customers", "orders"]);
const REQUEST_TTL_MS = 30 * 60 * 1000;

export class StoreDeletionError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function requestStoreDeletion({ storeId, userId, password, resources, deleteStore, origin }) {
  const selectedResources = normalizeResources(resources);
  const removingStore = Boolean(deleteStore);
  if (!removingStore && !selectedResources.length) throw new StoreDeletionError(422, "Selecione ao menos um grupo de dados para excluir.");

  const [user, store] = await Promise.all([
    one("SELECT id, name, email, password_hash FROM ld_users WHERE id = ?", [userId]),
    one("SELECT id, name FROM ld_stores WHERE id = ? AND user_id = ?", [storeId, userId]),
  ]);
  if (!store) throw new StoreDeletionError(404, "Loja não encontrada.");
  if (!user?.password_hash || !(await verifyPassword(String(password || ""), user.password_hash))) {
    throw new StoreDeletionError(401, "Confirme sua senha para solicitar a exclusão.");
  }
  if (!user.email) throw new StoreDeletionError(422, "Cadastre um e-mail válido na sua conta antes de solicitar esta exclusão.");

  const timestamp = Date.now();
  const rawToken = createResetToken();
  const request = {
    id: randomUUID(),
    storeId: store.id,
    userId,
    actionType: removingStore ? "store" : "resources",
    payload: { resources: selectedResources },
    tokenHash: hashToken(rawToken),
    expiresAt: timestamp + REQUEST_TTL_MS,
    createdAt: timestamp,
  };
  await query("UPDATE ld_store_deletion_requests SET used_at = ? WHERE store_id = ? AND user_id = ? AND used_at IS NULL", [timestamp, store.id, userId]);
  await query("INSERT INTO ld_store_deletion_requests (id, store_id, user_id, action_type, payload_json, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [request.id, request.storeId, request.userId, request.actionType, JSON.stringify(request.payload), request.tokenHash, request.expiresAt, request.createdAt]);
  try {
    await sendStoreDeletionEmail({ user, store, rawToken, origin, actionType: request.actionType, resources: selectedResources });
  } catch (error) {
    await query("UPDATE ld_store_deletion_requests SET used_at = ? WHERE id = ? AND used_at IS NULL", [Date.now(), request.id]);
    throw error;
  }
  return { ok: true, expiresAt: request.expiresAt };
}

export async function confirmStoreDeletion(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) throw new StoreDeletionError(422, "Link de confirmação inválido.");
  const request = await one("SELECT * FROM ld_store_deletion_requests WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?", [hashToken(token), Date.now()]);
  if (!request) throw new StoreDeletionError(400, "Este link expirou, já foi utilizado ou não é mais válido.");
  const payload = parsePayload(request.payload_json);
  const resources = normalizeResources(payload.resources);
  const store = await one("SELECT id, name, slug, custom_domain FROM ld_stores WHERE id = ? AND user_id = ?", [request.store_id, request.user_id]);
  if (!store) throw new StoreDeletionError(404, "A loja desta solicitação não está mais disponível.");

  const storage = getProductStorage();
  const keys = request.action_type === "store"
    ? await storage.listPrefix(storeMediaPrefix({ accountId: request.user_id, storeId: store.id }))
    : await listMediaKeys({ storeId: store.id, resources });
  await storage.removeMany(keys);

  if (request.action_type === "store") {
    const subscriptions = await query("SELECT provider_subscription_id FROM ld_subscriptions WHERE store_id = ? AND provider_subscription_id IS NOT NULL AND status NOT IN ('cancelled', 'canceled')", [store.id]);
    for (const subscription of subscriptions) await cancelMercadoPagoSubscription(subscription.provider_subscription_id);
  }

  await transaction(async (tx) => {
    if (request.action_type === "store") {
      await tx.query("DELETE FROM ld_stores WHERE id = ? AND user_id = ?", [store.id, request.user_id]);
    } else {
      await deleteSelectedResources(tx, { storeId: store.id, resources });
    }
    await tx.query("UPDATE ld_store_deletion_requests SET used_at = ? WHERE id = ? AND used_at IS NULL", [Date.now(), request.id]);
  });
  if (request.action_type === "store") await removeStoreContractFromR2({ key: storeContractKey(store) });
  else await syncStoreContractToR2({ storeId: store.id, userId: request.user_id });
  return { storeName: store.name, actionType: request.action_type, resources };
}

async function listMediaKeys({ storeId, resources }) {
  const keys = [];
  if (resources.includes("products")) {
    const [attached, staged] = await Promise.all([
      query("SELECT media.storage_key FROM ld_product_media AS media JOIN ld_products AS products ON products.id = media.product_id WHERE products.store_id = ?", [storeId]),
      query("SELECT storage_key FROM ld_product_uploads WHERE store_id = ?", [storeId]),
    ]);
    keys.push(...attached.map((item) => item.storage_key), ...staged.map((item) => item.storage_key));
  }
  if (resources.includes("banners")) {
    const [attached, staged] = await Promise.all([
      query("SELECT images.storage_key FROM ld_banner_images AS images JOIN ld_banners AS banners ON banners.id = images.banner_id WHERE banners.store_id = ?", [storeId]),
      query("SELECT storage_key FROM ld_banner_uploads WHERE store_id = ?", [storeId]),
    ]);
    keys.push(...attached.map((item) => item.storage_key), ...staged.map((item) => item.storage_key));
  }
  return keys;
}

async function deleteSelectedResources(tx, { storeId, resources }) {
  if (resources.includes("products")) {
    await tx.query("DELETE FROM ld_product_uploads WHERE store_id = ?", [storeId]);
    await tx.query("DELETE FROM ld_products WHERE store_id = ?", [storeId]);
  }
  if (resources.includes("coupons")) await tx.query("DELETE FROM ld_coupons WHERE store_id = ?", [storeId]);
  if (resources.includes("banners")) {
    await tx.query("DELETE FROM ld_banner_uploads WHERE store_id = ?", [storeId]);
    await tx.query("DELETE FROM ld_banners WHERE store_id = ?", [storeId]);
  }
  if (resources.includes("customers")) await tx.query("DELETE FROM ld_customers WHERE store_id = ?", [storeId]);
  if (resources.includes("orders")) await tx.query("DELETE FROM ld_billing_orders WHERE store_id = ?", [storeId]);
}

function normalizeResources(source) {
  return [...new Set(Array.isArray(source) ? source.map((value) => String(value || "").trim()) : [])].filter((value) => RESOURCE_KEYS.has(value));
}

function parsePayload(value) {
  try { return JSON.parse(String(value || "{}")); } catch { return {}; }
}

async function sendStoreDeletionEmail({ user, store, rawToken, origin, actionType, resources }) {
  if (!process.env.RESEND_API_KEY) throw new StoreDeletionError(503, "O envio de e-mail ainda não foi configurado.");
  const base = String(origin || process.env.APP_URL || "").replace(/\/$/, "");
  if (!/^https?:\/\//.test(base)) throw new StoreDeletionError(500, "Não foi possível preparar o link de confirmação.");
  const confirmationUrl = `${base}/v1/public/store-deletion/confirm?token=${encodeURIComponent(rawToken)}`;
  const scope = actionType === "store" ? "apagar a loja e todos os seus dados" : `excluir: ${resources.map(resourceLabel).join(", ")}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Loja Descomplicada <onboarding@resend.dev>",
      to: [user.email],
      subject: `Confirme a exclusão solicitada — ${store.name}`,
      html: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5;max-width:620px;margin:0 auto;padding:24px"><h1 style="color:#ff32b2">Confirmação necessária</h1><p>Olá, ${escapeHtml(user.name)}.</p><p>Você solicitou ${escapeHtml(scope)} na loja <strong>${escapeHtml(store.name)}</strong>.</p><p>Ao confirmar, as mídias relacionadas serão removidas do armazenamento e os dados selecionados serão excluídos. Este link vale por 30 minutos e só pode ser utilizado uma vez.</p><p><a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(45deg,#ff32b2,#fd7a00);color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar exclusão</a></p><p>Se não foi você, ignore esta mensagem.</p></main>`,
    }),
  });
  if (!response.ok) throw new StoreDeletionError(502, "Não foi possível enviar o e-mail de confirmação.");
}

function resourceLabel(resource) { return ({ products: "produtos", coupons: "cupons", banners: "banners", customers: "clientes", orders: "pedidos" })[resource] || resource; }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
