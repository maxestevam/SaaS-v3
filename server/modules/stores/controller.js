import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { one, query, transaction } from "../../db.js";
import { cancelMercadoPagoSubscription } from "../billing/service.js";
import { publicStore } from "../shared/presenters.js";
import { ensureStoreProfile, getStoresForUser, listStoreFontOptions, normalizeStorefrontAdmin, normalizeStoreProfile, storeWithProfileForUser } from "./service.js";
import { StoreValidationError, parseStoreIdentity } from "./validation.js";
import { normalizeSlug, validText } from "../shared/validation.js";
import { getProductStorage, storeMediaKey, storeMediaPrefix } from "../storage/media-storage.js";
import { StoreDeletionError, confirmStoreDeletion, requestStoreDeletion } from "./deletion-service.js";
import { storeContractKey, syncStoreContractToR2 } from "../store-contract/r2-sync.js";

const router = Router();
const publicDeletionRouter = Router();
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 4 * 1024 * 1024 } });
const logoFormats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

router.post("/stores", async (req, res, next) => {
  try {
    const name = validText(req.body?.name, 2, 120);
    const description = validText(req.body?.description || "", 0, 240);
    const { color, addressMode, storeCategory } = parseStoreIdentity(req.body);
    const slug = normalizeSlug(req.body?.slug === undefined ? name : req.body.slug);

    if (!name) return res.status(422).json({ error: "Dê um nome para a sua loja." });
    if (!slug) return res.status(422).json({ error: "Escolha um slug válido para a loja." });
    if (await one("SELECT id FROM ld_stores WHERE slug = ?", [slug])) {
      return res.status(409).json({ error: "Este slug já está em uso." });
    }

    const store = { id: randomUUID(), userId: req.user.id, name, slug, addressMode, description, storeCategory, color, status: 2 };
    const timestamp = Date.now();
    await query(
      "INSERT INTO ld_stores (id, user_id, name, slug, address_mode, description, store_category, color, status, status_changed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [store.id, store.userId, store.name, store.slug, store.addressMode, store.description, store.storeCategory || null, store.color, store.status, timestamp, timestamp, timestamp],
    );
    await ensureStoreProfile(store.id);
    await syncStoreContractToR2({ storeId: store.id, userId: req.user.id });
    return res.status(201).json({ store: publicStore(await storeWithProfileForUser(store.id, req.user.id)) });
  } catch (error) {
    if (error instanceof StoreValidationError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.get("/stores", async (req, res, next) => {
  try {
    const [stores, fontOptions] = await Promise.all([getStoresForUser(req.user.id), listStoreFontOptions()]);
    return res.json({ stores: stores.map(publicStore), fontOptions: fontOptions.map((font) => ({ id: font.id, label: font.label, description: font.description, family: font.css_family })) });
  } catch (error) {
    return next(error);
  }
});

router.post("/stores/:storeId/deletion-requests", async (req, res, next) => {
  try {
    const result = await requestStoreDeletion({
      storeId: req.params.storeId,
      userId: req.user.id,
      password: req.body?.password,
      resources: req.body?.resources,
      deleteStore: req.body?.deleteStore,
      origin: `${req.protocol}://${req.get("host")}`,
    });
    return res.status(202).json(result);
  } catch (error) {
    if (error instanceof StoreDeletionError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/stores/:storeId/logo", logoUpload.single("file"), async (req, res, next) => {
  try {
    const store = await one("SELECT id, logo_storage_key FROM ld_stores WHERE id = ? AND user_id = ?", [req.params.storeId, req.user.id]);
    if (!store) return res.status(404).json({ error: "Loja não encontrada." });
    const extension = logoFormats[req.file?.mimetype];
    if (!extension || !validImageSignature(req.file?.buffer, req.file?.mimetype)) return res.status(422).json({ error: "Envie uma logo JPG, PNG ou WebP válida." });
    const stored = await getProductStorage().put({ key: storeMediaKey({ accountId: req.user.id, storeId: store.id, kind: "logo", assetId: randomUUID(), extension }), body: req.file.buffer, contentType: req.file.mimetype });
    try {
      await query("UPDATE ld_stores SET logo_storage_key = ?, logo_url = ?, updated_at = ? WHERE id = ?", [stored.key, stored.url, Date.now(), store.id]);
    } catch (error) {
      await getProductStorage().remove(stored.key).catch(() => undefined);
      throw error;
    }
    if (store.logo_storage_key) await getProductStorage().remove(store.logo_storage_key);
    await syncStoreContractToR2({ storeId: store.id, userId: req.user.id });
    return res.status(201).json({ store: publicStore(await storeWithProfileForUser(store.id, req.user.id)) });
  } catch (error) { return next(error); }
});

router.delete("/stores/:storeId/logo", async (req, res, next) => {
  try {
    const store = await one("SELECT id, logo_storage_key FROM ld_stores WHERE id = ? AND user_id = ?", [req.params.storeId, req.user.id]);
    if (!store) return res.status(404).json({ error: "Loja não encontrada." });
    await query("UPDATE ld_stores SET logo_storage_key = NULL, logo_url = NULL, updated_at = ? WHERE id = ?", [Date.now(), store.id]);
    if (store.logo_storage_key) await getProductStorage().remove(store.logo_storage_key);
    await syncStoreContractToR2({ storeId: store.id, userId: req.user.id });
    return res.json({ store: publicStore(await storeWithProfileForUser(store.id, req.user.id)) });
  } catch (error) { return next(error); }
});

router.patch("/stores/:storeId", async (req, res, next) => {
  try {
    const existing = await storeWithProfileForUser(req.params.storeId, req.user.id);
    if (!existing) return res.status(404).json({ error: "Loja não encontrada." });

    const name = validText(req.body?.name === undefined ? existing.name : req.body.name, 2, 120);
    const description = validText(req.body?.description === undefined ? existing.description : req.body.description, 0, 240);
    const slug = normalizeSlug(req.body?.slug === undefined ? existing.slug : req.body.slug);
    const { color, addressMode, storeCategory } = parseStoreIdentity(req.body, existing);

    if (!name || !slug) return res.status(422).json({ error: "Informe nome e slug válidos." });
    if (await one("SELECT id FROM ld_stores WHERE slug = ? AND id <> ?", [slug, existing.id])) {
      return res.status(409).json({ error: "Este slug já está em uso." });
    }

    const profile = normalizeStoreProfile(req.body, existing, await listStoreFontOptions());
    if (!profile.valid) return res.status(422).json({ error: profile.error });
    const storefront = normalizeStorefrontAdmin(req.body, existing);
    if (!storefront.valid) return res.status(422).json({ error: storefront.error });

    const previousKey = storeContractKey(existing);
    const updated = await transaction(async (tx) => {
      const timestamp = Date.now();
      await tx.query(
        "UPDATE ld_stores SET name = ?, description = ?, store_category = ?, slug = ?, address_mode = ?, color = ?, maintenance = ?, maintenance_message = ?, currency = ?, locale = ?, timezone = ?, template = ?, theme_secondary_color = ?, theme_accent_color = ?, theme_background_color = ?, theme_text_color = ?, updated_at = ? WHERE id = ?",
        [name, description, storeCategory || null, slug, addressMode, color, storefront.value.maintenance ? 1 : 0, storefront.value.maintenanceMessage, storefront.value.currency, storefront.value.locale, storefront.value.timezone, storefront.value.template, storefront.value.theme.secondaryColor, storefront.value.theme.accentColor, storefront.value.theme.backgroundColor, storefront.value.theme.textColor, timestamp, existing.id],
      );
      await tx.query(
        "INSERT INTO ld_store_profiles (store_id, font_family, contact_email, contact_phone, whatsapp_phone, support_hours, address_postal_code, address_street, address_number, address_complement, address_observation, address_district, address_city, address_state, address_country, instagram_url, facebook_url, tiktok_url, youtube_url, pinterest_url, twitter_url, favicon_url, settings_json, payment_methods_json, shipping_methods_json, about_title, about_body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE font_family=VALUES(font_family), contact_email=VALUES(contact_email), contact_phone=VALUES(contact_phone), whatsapp_phone=VALUES(whatsapp_phone), support_hours=VALUES(support_hours), address_postal_code=VALUES(address_postal_code), address_street=VALUES(address_street), address_number=VALUES(address_number), address_complement=VALUES(address_complement), address_observation=VALUES(address_observation), address_district=VALUES(address_district), address_city=VALUES(address_city), address_state=VALUES(address_state), address_country=VALUES(address_country), instagram_url=VALUES(instagram_url), facebook_url=VALUES(facebook_url), tiktok_url=VALUES(tiktok_url), youtube_url=VALUES(youtube_url), pinterest_url=VALUES(pinterest_url), twitter_url=VALUES(twitter_url), favicon_url=VALUES(favicon_url), settings_json=VALUES(settings_json), payment_methods_json=VALUES(payment_methods_json), shipping_methods_json=VALUES(shipping_methods_json), about_title=VALUES(about_title), about_body=VALUES(about_body), updated_at=VALUES(updated_at)",
        [
          existing.id,
          profile.value.fontFamily,
          profile.value.contact.email,
          profile.value.contact.phone,
          profile.value.contact.whatsapp,
          profile.value.contact.hours,
          profile.value.address.postalCode,
          profile.value.address.street,
          profile.value.address.number,
          profile.value.address.complement,
          profile.value.address.observation,
          profile.value.address.district,
          profile.value.address.city,
          profile.value.address.state,
          profile.value.address.country,
          profile.value.socials.instagram,
          profile.value.socials.facebook,
          profile.value.socials.tiktok,
          profile.value.socials.youtube,
          profile.value.socials.pinterest,
          profile.value.socials.twitter,
          storefront.value.faviconUrl,
          JSON.stringify(storefront.value.settings),
          JSON.stringify(storefront.value.paymentMethods),
          JSON.stringify(storefront.value.shippingMethods),
          profile.value.about.title,
          profile.value.about.body,
          timestamp,
          timestamp,
        ],
      );
      return tx.one(
        "SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.support_hours, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_observation, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json, profiles.about_title, profiles.about_body FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id=stores.id WHERE stores.id=? AND stores.user_id=?",
        [existing.id, req.user.id],
      );
    });

    await syncStoreContractToR2({ storeId: existing.id, userId: req.user.id, previousKeys: [previousKey] });
    return res.json({ store: publicStore(updated) });
  } catch (error) {
    if (error instanceof StoreValidationError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.delete("/stores/:storeId", (_req, res) => res.status(405).json({ error: "Solicite a exclusão e confirme pelo link enviado ao seu e-mail." }));

router.get("/stores/slug/:slug", async (req, res, next) => {
  try {
    const store = await one(
      "SELECT id, name, slug, description, color, logo_url, status, address_mode FROM ld_stores WHERE slug = ? AND user_id = ?",
      [normalizeSlug(req.params.slug), req.user.id],
    );
    if (!store) return res.status(404).json({ error: "Loja não encontrada." });
    return res.json({ store: publicStore(store) });
  } catch (error) {
    return next(error);
  }
});

publicDeletionRouter.get("/public/store-deletion/confirm", async (req, res) => {
  try {
    const result = await confirmStoreDeletion(req.query?.token);
    return res.status(200).type("html").send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exclusão confirmada</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;font-family:Arial,sans-serif;color:#18181b"><main style="max-width:560px;padding:32px"><h1 style="color:#ff32b2">Exclusão confirmada</h1><p>A ação solicitada para <strong>${escapeHtml(result.storeName)}</strong> foi concluída.</p><p>Você já pode fechar esta página.</p></main></body></html>`);
  } catch (error) {
    const status = error instanceof StoreDeletionError ? error.status : 500;
    const message = error instanceof StoreDeletionError ? error.message : "Não foi possível confirmar esta exclusão agora.";
    return res.status(status).type("html").send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmação indisponível</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;font-family:Arial,sans-serif;color:#18181b"><main style="max-width:560px;padding:32px"><h1 style="color:#e11d48">Não foi possível concluir</h1><p>${escapeHtml(message)}</p></main></body></html>`);
  }
});

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 422).json({ error: error.code === "LIMIT_FILE_SIZE" ? "A logo excede o tamanho máximo de 4 MB." : "Não foi possível processar a logo." });
  return next(error);
});

function validImageSignature(buffer, mime) {
  if (!buffer) return false;
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return mime === "image/webp" && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
}

function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }

export default router;
export { publicDeletionRouter as publicStoreDeletionRouter };
