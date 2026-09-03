var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";
import { createServer } from "http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createAdminRouter } from "./admin-router.js";
import { createActivityTracker } from "./activity-tracker.js";
import { getActiveStorePlanLimits, getStorePlanUsage, maxNewMedia, normalizePlanLimits, planLimitsFromRow, planLimitsSqlColumns, requirePlanQuota } from "./plan-limits.js";

// server/api.js
import { Router as Router16 } from "express";

// server/modules/auth/controller.js
import { Router } from "express";

// server/modules/auth/service.js
import { randomUUID } from "node:crypto";

// server/auth.js
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
var scrypt = promisify(scryptCallback);
var encoder = new TextEncoder();
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}
async function verifyPassword(password, storedHash) {
  const [algorithm, salt, expected] = String(storedHash).split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const derived = await scrypt(password, salt, 64);
  const actual = Buffer.from(derived).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
async function signSession(user, secret) {
  return new SignJWT({ email: user.email, name: user.name }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(encoder.encode(secret));
}
async function verifySession(token2, secret) {
  const result = await jwtVerify(token2, encoder.encode(secret));
  return { id: result.payload.sub, email: result.payload.email, name: result.payload.name, issuedAt: Number(result.payload.iat || 0) };
}
function hashToken(token2) {
  return createHash("sha256").update(token2).digest("hex");
}
function createResetToken() {
  return randomBytes(32).toString("hex");
}

// server/modules/shared/presenters.js
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, onboardingComplete: Boolean(user.onboarding_completed_at) };
}
function publicStore(store) {
  return { id: store.id, name: store.name, slug: store.slug, addressMode: store.address_mode || store.addressMode || "slug", customDomain: store.custom_domain || null, description: store.description, storeCategory: store.store_category || store.storeCategory || "", color: store.color, logoUrl: store.logo_url || store.logoUrl || null, fontFamily: store.font_family || store.fontFamily || "inter", contact: { email: store.contact_email || "", phone: store.contact_phone || "", whatsapp: store.whatsapp_phone || "", hours: store.support_hours || "" }, address: { postalCode: store.address_postal_code || "", street: store.address_street || "", number: store.address_number || "", complement: store.address_complement || "", observation: store.address_observation || "", district: store.address_district || "", city: store.address_city || "", state: store.address_state || "", country: store.address_country || "BR" }, socials: { instagram: store.instagram_url || "", facebook: store.facebook_url || "", tiktok: store.tiktok_url || "", youtube: store.youtube_url || "", pinterest: store.pinterest_url || "", twitter: store.twitter_url || "" }, about: { title: store.about_title || "", body: store.about_body || "" }, status: Number(store.status ?? 2), createdAt: store.created_at || store.createdAt, subscription: store.subscription_plan_id ? { planId: store.subscription_plan_id, status: store.subscription_status, trialEndsAt: store.subscription_trial_ends_at } : null, catalog: publicCatalogMetrics(store.catalog), storefront: { maintenance: Boolean(store.maintenance), maintenanceMessage: store.maintenance_message || "", currency: store.currency || "BRL", locale: store.locale || "pt-BR", timezone: store.timezone || "America/Sao_Paulo", template: store.template || "default", faviconUrl: store.favicon_url || null, theme: { primaryColor: store.color || "#FF32B2", secondaryColor: store.theme_secondary_color || null, accentColor: store.theme_accent_color || null, backgroundColor: store.theme_background_color || null, textColor: store.theme_text_color || null } }, settings: parseJson(store.settings_json, {}), paymentMethods: parseJson(store.payment_methods_json, []), shippingMethods: parseJson(store.shipping_methods_json, []) };
}
function parseJson(value, fallback) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
function publicCatalogMetrics(catalog = {}) {
  return { totalProducts: Number(catalog.totalProducts || 0), activeProducts: Number(catalog.activeProducts || 0), draftProducts: Number(catalog.draftProducts || 0), archivedProducts: Number(catalog.archivedProducts || 0), categoriesWithProducts: Number(catalog.categoriesWithProducts || 0), inventoryUnits: Number(catalog.inventoryUnits || 0), outOfStockProducts: Number(catalog.outOfStockProducts || 0), lowStockProducts: Number(catalog.lowStockProducts || 0), newProductsLast30Days: Number(catalog.newProductsLast30Days || 0) };
}
function publicSubscription(item) {
  return { id: item.id, storeId: item.store_id, planId: item.plan_id, status: item.status, amountCents: Number(item.amount_cents || 0), trialEndsAt: item.trial_ends_at, currentPeriodEndsAt: item.current_period_ends_at, renewalDueAt: item.renewal_due_at, graceEndsAt: item.grace_ends_at };
}
function publicOrder(item) {
  return { id: item.id, storeId: item.store_id, subscriptionId: item.subscription_id, kind: item.kind, status: item.status, amountCents: item.amount_cents, currency: item.currency, dueAt: item.due_at, paidAt: item.paid_at, initPoint: item.checkout_init_point, pixQrCode: item.pix_qr_code, pixQrCodeBase64: item.pix_qr_code_base64, createdAt: item.created_at };
}
function publicPlan(item) {
  let features = [];
  try {
    features = Array.isArray(item.features_json) ? item.features_json : JSON.parse(item.features_json || "[]");
  } catch {
    features = [];
  }
  return { id: item.id, name: item.name, description: item.description, features, limits: planLimitsFromRow(item), amountCents: Number(item.amount_cents), featured: Boolean(item.is_featured) };
}

// server/db.js
import mysql from "mysql2/promise";
var pool;
function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL n\xE3o est\xE1 dispon\xEDvel.");
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 8,
      enableKeepAlive: true
    });
  }
  return pool;
}
async function query(sql, params = []) {
  const [rows] = await getDatabase().execute(sql, params);
  return rows;
}
async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}
async function transaction(callback) {
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const tx = {
      query: async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      },
      one: async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows[0] || null;
      }
    };
    const result = await callback(tx);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => void 0);
    throw error;
  } finally {
    connection.release();
  }
}

// server/modules/auth/repository.js
async function findUserByEmail(email) {
  return one(
    "SELECT id, name, email, password_hash, onboarding_completed_at FROM ld_users WHERE email = ?",
    [email]
  );
}
async function findPasswordResetUserByEmail(email) {
  return one("SELECT id, name, email FROM ld_users WHERE email = ?", [email]);
}
async function findUserSessionPolicy(userId) {
  return one("SELECT users.session_invalid_before, COALESCE(controls.status, 'active') AS account_status FROM ld_users users LEFT JOIN ld_admin_account_controls controls ON controls.user_id = users.id WHERE users.id = ?", [userId]);
}
async function createUser(user) {
  await query(
    "INSERT INTO ld_users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [user.id, user.name, user.email, user.passwordHash, user.createdAt, user.updatedAt]
  );
}
async function invalidateUnusedPasswordResets(userId, timestamp2) {
  await query(
    "UPDATE ld_password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
    [timestamp2, userId]
  );
}
async function createPasswordResetToken(record) {
  await query(
    "INSERT INTO ld_password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    [record.id, record.userId, record.tokenHash, record.expiresAt, record.createdAt]
  );
}
async function findActivePasswordReset(tokenHash, timestamp2) {
  return one(
    "SELECT id, user_id FROM ld_password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
    [tokenHash, timestamp2]
  );
}
async function updateUserPassword(userId, passwordHash, timestamp2) {
  await query(
    "UPDATE ld_users SET password_hash = ?, updated_at = ? WHERE id = ?",
    [passwordHash, timestamp2, userId]
  );
}
async function consumePasswordReset(id, timestamp2) {
  await query("UPDATE ld_password_reset_tokens SET used_at = ? WHERE id = ?", [timestamp2, id]);
}

// server/modules/shared/validation.js
function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function normalizeSlug(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
function validText(value, min, max) {
  const text4 = String(value || "").trim();
  return text4.length >= min && text4.length <= max ? text4 : "";
}
function optionalEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function optionalUrl(value) {
  const text4 = String(value || "").trim();
  if (!text4) return "";
  try {
    const url = new URL(text4);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

// server/modules/auth/validation.js
var AuthValidationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function parseRegistration(source = {}) {
  const name = validText(source.name, 2, 120);
  const email = normalizeEmail2(source.email);
  const password = String(source.password || "");
  if (!name || !email || password.length < 8) {
    throw new AuthValidationError(422, "Informe nome, e-mail v\xE1lido e senha com ao menos 8 caracteres.");
  }
  return { name, email, password };
}
function parseLogin(source = {}) {
  const email = normalizeEmail2(source.email);
  const password = String(source.password || "");
  if (!email || !password) {
    throw new AuthValidationError(401, "E-mail ou senha inv\xE1lidos.");
  }
  return { email, password };
}
function parsePasswordReset(source = {}) {
  const token2 = String(source.token || "");
  const password = String(source.password || "");
  if (!token2 || password.length < 8) {
    throw new AuthValidationError(422, "Link ou senha inv\xE1lidos.");
  }
  return { token: token2, password };
}
function normalizeEmail2(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

// server/modules/auth/email.js
async function sendResetEmail(user, rawToken, appUrl) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("O envio de e-mail ainda n\xE3o foi configurado.");
  }
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Loja Descomplicada <onboarding@resend.dev>",
      to: [user.email],
      subject: "Redefina a sua senha da Loja Descomplicada",
      html: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5"><h1 style="color:#ff32b2">Uma nova senha para sua opera\xE7\xE3o</h1><p>Ol\xE1, ${escapeHtml(user.name)}.</p><p>Este link \xE9 v\xE1lido por 30 minutos.</p><p><a href="${resetUrl}" style="display:inline-block;background:linear-gradient(45deg,#ff32b2,#fd7a00);color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p>Se n\xE3o foi voc\xEA, ignore esta mensagem.</p></main>`
    })
  });
  if (!response.ok) {
    throw new Error("N\xE3o foi poss\xEDvel enviar o e-mail de recupera\xE7\xE3o.");
  }
}
function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

// server/modules/auth/service.js
var AuthDomainError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function registerAccount(input) {
  if (await findUserByEmail(input.email)) {
    throw new AuthDomainError(409, "J\xE1 existe uma conta com este e-mail.");
  }
  const timestamp2 = Date.now();
  const user = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    createdAt: timestamp2,
    updatedAt: timestamp2
  };
  await createUser(user);
  return sessionPayload(user);
}
async function loginAccount(input) {
  const user = await findUserByEmail(input.email);
  if (!user || !await verifyPassword(input.password, user.password_hash)) {
    throw new AuthDomainError(401, "E-mail ou senha inv\xE1lidos.");
  }
  return sessionPayload(user);
}
async function requestPasswordReset(email, origin) {
  const user = await findPasswordResetUserByEmail(email);
  if (!user) return;
  const timestamp2 = Date.now();
  const rawToken = createResetToken();
  await invalidateUnusedPasswordResets(user.id, timestamp2);
  await createPasswordResetToken({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: timestamp2 + 30 * 60 * 1e3,
    createdAt: timestamp2
  });
  await sendResetEmail(user, rawToken, origin);
}
async function resetPassword(input) {
  const timestamp2 = Date.now();
  const token2 = await findActivePasswordReset(hashToken(input.token), timestamp2);
  if (!token2) {
    throw new AuthDomainError(400, "Este link expirou ou j\xE1 foi utilizado.");
  }
  await updateUserPassword(token2.user_id, await hashPassword(input.password), timestamp2);
  await consumePasswordReset(token2.id, timestamp2);
}
async function isSessionValid(user) {
  const account = await findUserSessionPolicy(user.id);
  return Boolean(account && account.account_status === "active" && (!account.session_invalid_before || user.issuedAt > Number(account.session_invalid_before)));
}
async function sessionPayload(user) {
  return {
    token: await signSession(user, process.env.JWT_SECRET),
    user: publicUser(user)
  };
}

// server/modules/auth/google.js
import { randomBytes as randomBytes2, randomUUID as randomUUID2 } from "node:crypto";
var pendingStates = /* @__PURE__ */ new Map();
var GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
function googleAuthStatus() {
  const enabled = process.env.GOOGLE_AUTH_ENABLED === "true";
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return { enabled: enabled && configured };
}
function startGoogleAuth(appUrl) {
  if (!googleAuthStatus().enabled) throw Object.assign(new Error("O login com Google n\xE3o est\xE1 habilitado."), { status: 404 });
  const state = randomBytes2(24).toString("base64url");
  pendingStates.set(state, { appUrl, expiresAt: Date.now() + 10 * 60 * 1e3 });
  const redirectUri = `${appUrl.replace(/\/$/, "")}/v1/auth/google/callback`;
  const query3 = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
  return `${GOOGLE_AUTHORIZE_URL}?${query3}`;
}
async function finishGoogleAuth({ code, state }) {
  const pending = pendingStates.get(state);
  pendingStates.delete(state);
  if (!pending || pending.expiresAt < Date.now()) throw Object.assign(new Error("A solicita\xE7\xE3o de login expirou. Tente novamente."), { status: 400 });
  const redirectUri = `${pending.appUrl.replace(/\/$/, "")}/v1/auth/google/callback`;
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
  if (!tokenResponse.ok) throw Object.assign(new Error("N\xE3o foi poss\xEDvel validar o acesso com Google."), { status: 401 });
  const tokens = await tokenResponse.json();
  const profileResponse = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) throw Object.assign(new Error("N\xE3o foi poss\xEDvel obter os dados da conta Google."), { status: 401 });
  const profile = await profileResponse.json();
  if (!profile.email || profile.email_verified === false) throw Object.assign(new Error("A conta Google precisa ter um e-mail verificado."), { status: 422 });
  let user = await findUserByEmail(String(profile.email).trim().toLowerCase());
  if (!user) {
    const timestamp2 = Date.now();
    user = { id: randomUUID2(), name: String(profile.name || profile.email).slice(0, 120), email: String(profile.email).trim().toLowerCase(), passwordHash: await hashPassword(randomBytes2(32).toString("base64url")), createdAt: timestamp2, updatedAt: timestamp2 };
    await createUser(user);
  }
  return { token: await signSession(user, process.env.JWT_SECRET), user: publicUser(user), appUrl: pending.appUrl };
}

// server/modules/auth/controller.js
var router = Router();
var route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
router.post("/auth/register", route(async (req, res) => {
  return res.status(201).json(await registerAccount(parseRegistration(req.body)));
}));
router.post("/auth/login", route(async (req, res) => {
  return res.json(await loginAccount(parseLogin(req.body)));
}));
router.get("/auth/google/status", (_req, res) => res.json(googleAuthStatus()));
router.get("/auth/google", route(async (req, res) => {
  const appUrl = String(process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return res.redirect(startGoogleAuth(appUrl));
}));
router.get("/auth/google/callback", route(async (req, res) => {
  const result = await finishGoogleAuth({ code: String(req.query.code || ""), state: String(req.query.state || "") });
  const loginUrl = new URL("/login", result.appUrl);
  loginUrl.searchParams.set("google_token", result.token);
  return res.redirect(loginUrl.toString());
}));
router.post("/auth/forgot-password", route(async (req, res) => {
  await requestPasswordReset(normalizeEmail2(req.body?.email), `${req.protocol}://${req.get("host")}`);
  return res.json({ ok: true });
}));
router.post("/auth/reset-password", route(async (req, res) => {
  await resetPassword(parsePasswordReset(req.body));
  return res.json({ ok: true });
}));
router.use((error, _req, res, next) => {
  if (error instanceof AuthValidationError || error instanceof AuthDomainError) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
});
var controller_default = router;

// server/modules/account/controller.js
import { Router as Router2 } from "express";

// server/modules/storage/media-storage.js
import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
var R2_PROVIDER = "r2";
function getProductStorage() {
  const provider = String(process.env.STORAGE_PROVIDER || R2_PROVIDER).trim().toLowerCase();
  if (provider === R2_PROVIDER) return r2Storage;
  throw new Error("O armazenamento de m\xEDdia deve usar Cloudflare R2.");
}
function getContractStorage() {
  return contractStorage;
}
function isSafeStorageKey(key) {
  return /^[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{1,128}\/(?:products\/[A-Za-z0-9_-]{1,128}\/(?:images|video)\/[A-Za-z0-9_-]{1,128}\.(?:jpe?g|png|webp|mp4|webm)|banners\/[A-Za-z0-9_-]{1,128}\/(?:desktop|mobile)\/[A-Za-z0-9_-]{1,128}\.(?:jpe?g|png|webp)|store\/(?:logo|images)\/[A-Za-z0-9_-]{1,128}\.(?:jpe?g|png|webp))$/i.test(String(key || ""));
}
function segment(value, label) {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalized)) throw new Error(`${label} de m\xEDdia inv\xE1lido.`);
  return normalized;
}
function productMediaKey({ accountId, storeId: storeId2, draftId, folder, assetId, extension }) {
  return `${segment(accountId, "Conta")}/${segment(storeId2, "Loja")}/products/${segment(draftId, "Rascunho")}/${segment(folder, "Pasta")}/${segment(assetId, "Arquivo")}.${segment(extension, "Extens\xE3o")}`;
}
function bannerMediaKey({ accountId, storeId: storeId2, bannerId, breakpoint, assetId, extension }) {
  return `${segment(accountId, "Conta")}/${segment(storeId2, "Loja")}/banners/${segment(bannerId, "Banner")}/${segment(breakpoint, "Vers\xE3o")}/${segment(assetId, "Arquivo")}.${segment(extension, "Extens\xE3o")}`;
}
function storeMediaKey({ accountId, storeId: storeId2, kind = "logo", assetId, extension }) {
  return `${segment(accountId, "Conta")}/${segment(storeId2, "Loja")}/store/${segment(kind, "Tipo")}/${segment(assetId, "Arquivo")}.${segment(extension, "Extens\xE3o")}`;
}
function storeMediaPrefix({ accountId, storeId: storeId2 }) {
  return `${segment(accountId, "Conta")}/${segment(storeId2, "Loja")}/`;
}
var r2Storage = {
  async put({ key, body, contentType }) {
    if (!isSafeStorageKey(key)) throw new Error("Chave de armazenamento inv\xE1lida.");
    const client = getR2Client();
    const bucket = requiredEnv("R2_BUCKET");
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    const publicBase = requiredEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
    return { key, url: `${publicBase}/${key}` };
  },
  async remove(key) {
    if (!isSafeStorageKey(key)) return;
    await getR2Client().send(new DeleteObjectCommand({ Bucket: requiredEnv("R2_BUCKET"), Key: key }));
  },
  async removeMany(keys) {
    const uniqueKeys = [...new Set((keys || []).filter(isSafeStorageKey))];
    if (!uniqueKeys.length) return;
    const client = getR2Client();
    const bucket = requiredEnv("R2_BUCKET");
    for (let index = 0; index < uniqueKeys.length; index += 1e3) {
      const objects = uniqueKeys.slice(index, index + 1e3).map((Key) => ({ Key }));
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
    }
  },
  async listPrefix(prefix) {
    if (!isSafeStoragePrefix(prefix)) return [];
    const client = getR2Client();
    const bucket = requiredEnv("R2_BUCKET");
    const keys = [];
    let continuationToken;
    do {
      const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }));
      keys.push(...(listed.Contents || []).map((item) => item.Key).filter(isSafeStorageKey));
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : void 0;
    } while (continuationToken);
    return keys;
  },
  async removePrefix(prefix) {
    await this.removeMany(await this.listPrefix(prefix));
  }
};
var contractStorage = {
  async putJson({ key, value }) {
    if (!isSafeContractKey(key)) throw new Error("Chave de contrato inv\xE1lida.");
    await getR2Client().send(new PutObjectCommand({ Bucket: requiredEnv("R2_BUCKET"), Key: key, Body: JSON.stringify(value, null, 2), ContentType: "application/json; charset=utf-8", CacheControl: "no-cache" }));
    return { key };
  },
  async remove(key) {
    if (!isSafeContractKey(key)) return;
    await getR2Client().send(new DeleteObjectCommand({ Bucket: requiredEnv("R2_BUCKET"), Key: key }));
  },
  async removeMany(keys) {
    await Promise.all([...new Set(keys || [])].filter(isSafeContractKey).map((key) => this.remove(key)));
  }
};
function isSafeStoragePrefix(prefix) {
  return /^[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{1,128}\/$/.test(String(prefix || ""));
}
function isSafeContractKey(key) {
  return /^stores\/[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.json$/i.test(String(key || ""));
}
var r2Client;
function getR2Client() {
  if (r2Client) return r2Client;
  const endpoint = process.env.R2_ENDPOINT || `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"), secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY") }
  });
  return r2Client;
}
function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`A configura\xE7\xE3o ${name} \xE9 obrigat\xF3ria para este provider.`);
  return value;
}

// server/modules/account/validation.js
var AccountValidationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function parseAccountProfile(source = {}) {
  const name = validText(source.name, 2, 120);
  const email = normalizeEmail(source.email);
  if (!name || !email) {
    throw new AccountValidationError(422, "Informe nome e e-mail v\xE1lidos.");
  }
  return { name, email };
}
function requiredPassword(value, message) {
  const password = String(value || "");
  if (!password) {
    throw new AccountValidationError(422, message);
  }
  return password;
}
function parsePasswordChange(source = {}) {
  const currentPassword = requiredPassword(source.currentPassword, "Informe a senha atual.");
  const newPassword = requiredPassword(source.newPassword, "Informe a nova senha.");
  if (newPassword.length < 8) {
    throw new AccountValidationError(422, "A nova senha precisa ter pelo menos 8 caracteres.");
  }
  return { currentPassword, newPassword };
}

// server/modules/account/controller.js
var router2 = Router2();
router2.get("/account", async (req, res, next) => {
  try {
    const user = await one(
      "SELECT id, name, email, onboarding_completed_at, created_at FROM ld_users WHERE id = ?",
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: "Conta n\xE3o encontrada." });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});
router2.patch("/account", async (req, res, next) => {
  try {
    const { name, email } = parseAccountProfile(req.body);
    if (await one("SELECT id FROM ld_users WHERE email = ? AND id <> ?", [email, req.user.id])) {
      return res.status(409).json({ error: "Este e-mail j\xE1 est\xE1 em uso." });
    }
    const timestamp2 = Date.now();
    await query("UPDATE ld_users SET name = ?, email = ?, updated_at = ? WHERE id = ?", [name, email, timestamp2, req.user.id]);
    const user = {
      id: req.user.id,
      name,
      email,
      onboarding_completed_at: req.user.onboardingComplete ? timestamp2 : null
    };
    return res.json({ user: publicUser(user), token: await signSession(user, process.env.JWT_SECRET) });
  } catch (error) {
    if (error instanceof AccountValidationError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});
router2.post("/account/change-password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = parsePasswordChange(req.body);
    const user = await one("SELECT password_hash FROM ld_users WHERE id = ?", [req.user.id]);
    if (!user || !await verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "A senha atual est\xE1 incorreta." });
    }
    await query("UPDATE ld_users SET password_hash = ?, updated_at = ? WHERE id = ?", [await hashPassword(newPassword), Date.now(), req.user.id]);
    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountValidationError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});
router2.delete("/account", async (req, res, next) => {
  try {
    const password = requiredPassword(req.body?.password, "Confirme sua senha para excluir a conta.");
    const user = await one("SELECT password_hash FROM ld_users WHERE id = ?", [req.user.id]);
    if (!user || !await verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Confirme sua senha para excluir a conta." });
    }
    const stores = await query("SELECT id FROM ld_stores WHERE user_id = ?", [req.user.id]);
    await query("DELETE FROM ld_users WHERE id = ?", [req.user.id]);
    await Promise.all(stores.map((store) => getProductStorage().removePrefix(storeMediaPrefix({ accountId: req.user.id, storeId: store.id }))));
    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountValidationError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});
var controller_default2 = router2;

// server/modules/stores/controller.js
import { Router as Router3 } from "express";
import { randomUUID as randomUUID5 } from "node:crypto";
import multer from "multer";

// server/modules/billing/service.js
import { createHash as createHash2, createHmac, randomUUID as randomUUID3, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
var collectorEmailCache = { value: "", expiresAt: 0 };
var now = () => Date.now();
function billingLifecycle(daysLate) {
  if (daysLate >= 15) return { kind: "inactive", storeStatus: 0, daysUntilInactivation: 0 };
  if (daysLate >= 3) return { kind: "overdue", storeStatus: 4, daysUntilInactivation: 15 - daysLate };
  return { kind: "grace", storeStatus: null, daysUntilInactivation: 15 - Math.max(0, daysLate) };
}
function isCollectorPayer(payerEmail, collectorEmail) {
  return Boolean(payerEmail && collectorEmail && String(payerEmail).trim().toLowerCase() === String(collectorEmail).trim().toLowerCase());
}
function trialEndsAtFrom(timestamp2, days = 7) {
  return Number(timestamp2) + Number(days) * 864e5;
}
async function getActivePlan(planId) {
  const plan = await one(`SELECT plans.id, plans.name, plans.description, plans.features_json, plans.amount_cents, plans.is_featured, ${planLimitsSqlColumns()} FROM ld_plans plans LEFT JOIN ld_plan_limits limits ON limits.plan_id = plans.id WHERE plans.id = ? AND plans.active = 1`, [planId]);
  return plan ? publicPlan(plan) : null;
}
async function ownedPendingOrder(orderId, userId, storeId2) {
  return one("SELECT * FROM ld_billing_orders WHERE id = ? AND user_id = ? AND store_id = ? AND status IN ('pending', 'rejected', 'in_process')", [orderId, userId, storeId2]);
}
async function cancelMercadoPagoSubscription(subscriptionId) {
  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, { method: "PUT", headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }), signal: AbortSignal.timeout(15e3) });
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) {
    console.error("[Mercado Pago subscription cancellation]", { subscriptionId, error: String(error?.message || error) });
    throw new Error("N\xE3o foi poss\xEDvel encerrar a assinatura no Mercado Pago. Tente novamente em instantes.");
  }
}
async function getMercadoPagoCollectorEmail() {
  if (collectorEmailCache.expiresAt > now()) return collectorEmailCache.value;
  try {
    const response = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(5e3) });
    const profile = await response.json().catch(() => ({}));
    const email = response.ok ? String(profile.email || "").trim().toLowerCase() : "";
    collectorEmailCache = { value: email, expiresAt: now() + 3e5 };
    return email;
  } catch {
    return "";
  }
}
function buildMercadoPagoOrderPayload({ order, email, name, method, token: token2, paymentMethodId, installments, issuerId }) {
  const amount = (Number(order.amount_cents) / 100).toFixed(2);
  const paymentMethod = method === "pix" ? { id: "pix", type: "bank_transfer" } : { id: paymentMethodId, type: "credit_card", token: token2, installments, issuer_id: issuerId || void 0 };
  const payment = { amount, payment_method: paymentMethod };
  if (method === "pix") payment.expiration_time = "P1D";
  const payer = { email };
  const firstName = validText(name, 2, 80).split(/\s+/)[0];
  if (method === "pix" && firstName) payer.first_name = firstName;
  return { type: "online", processing_mode: "automatic", total_amount: amount, external_reference: order.id, payer, transactions: { payments: [payment] } };
}
function providerIssueSummary(value) {
  const safe = String(value || "").replace(/[^a-zA-Z0-9 .,:;_\-/]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  return !safe || safe.toLowerCase() === "unknown" ? "" : safe;
}
function mercadoPagoOrderFailure(status, providerOrder = {}) {
  const providerCode = String(providerOrder.code || providerOrder.error || providerOrder.errors?.[0]?.code || providerOrder.cause?.[0]?.code || "").toLowerCase();
  const detail = providerIssueSummary(providerOrder.message || providerOrder.errors?.[0]?.description || providerOrder.errors?.[0]?.message || providerOrder.cause?.[0]?.description);
  if (status === 401 || status === 403 || providerCode.includes("credential") || providerCode.includes("forbidden")) return { status: 503, code: "MERCADO_PAGO_CREDENTIALS", providerCode, publicMessage: "O checkout est\xE1 temporariamente indispon\xEDvel. Tente novamente em instantes." };
  if (providerCode.includes("payer") || providerCode.includes("email") || detail.toLowerCase().includes("payer") || detail.toLowerCase().includes("email")) return { status: 422, code: "MERCADO_PAGO_PAYER_REJECTED", providerCode, publicMessage: "O Mercado Pago recusou os dados do pagador. Confirme o e-mail da conta e tente novamente." };
  if (providerCode.includes("idempotency")) return { status: 409, code: "MERCADO_PAGO_IDEMPOTENCY", providerCode, publicMessage: "Este pagamento j\xE1 est\xE1 sendo processado. Aguarde alguns segundos e atualize a p\xE1gina." };
  return { status: 502, code: "MERCADO_PAGO_ORDER_REJECTED", providerCode, publicMessage: "N\xE3o foi poss\xEDvel gerar o PIX agora. Atualize a p\xE1gina e tente novamente." };
}
var MercadoPagoOrderError = class extends Error {
  constructor({ status, code, providerCode, publicMessage }) {
    super(publicMessage);
    this.status = status;
    this.code = code;
    this.providerCode = providerCode;
    this.publicMessage = publicMessage;
  }
};
function paymentStatus(status) {
  return { processed: "approved", approved: "approved", action_required: "pending", pending: "pending", rejected: "rejected", cancelled: "cancelled", canceled: "cancelled" }[String(status)] || "in_process";
}
async function createMercadoPagoPayment({ order, email, name, method, token: token2, paymentMethodId, installments, issuerId }) {
  let response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/orders", { method: "POST", headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Idempotency-Key": method === "pix" ? `${order.id}-pix-v2` : `${order.id}-card-${randomUUID3()}` }, body: JSON.stringify(buildMercadoPagoOrderPayload({ order, email, name, method, token: token2, paymentMethodId, installments, issuerId })), signal: AbortSignal.timeout(15e3) });
  } catch {
    throw new MercadoPagoOrderError({ status: 503, code: "MERCADO_PAGO_TIMEOUT", publicMessage: "O Mercado Pago n\xE3o respondeu a tempo. Tente gerar o PIX novamente em instantes." });
  }
  const providerOrder = await response.json().catch(() => ({}));
  const transaction3 = providerOrder.transactions?.payments?.[0];
  if (!response.ok || !transaction3?.id) throw new MercadoPagoOrderError(mercadoPagoOrderFailure(response.status, providerOrder));
  return { id: transaction3.id, providerOrderId: providerOrder.id, status: paymentStatus(transaction3.status || providerOrder.status), qrCode: transaction3.payment_method?.qr_code || null, qrCodeBase64: transaction3.payment_method?.qr_code_base64 || null };
}
async function persistPaymentForOrder(order, payment) {
  const timestamp2 = now();
  const status = paymentStatus(payment.status || "in_process");
  await query("UPDATE ld_billing_orders SET provider_payment_id = ?, provider_preference_id = ?, status = ?, paid_at = ?, pix_qr_code = ?, pix_qr_code_base64 = ?, updated_at = ? WHERE id = ?", [String(payment.id), payment.providerOrderId || null, status, status === "approved" ? timestamp2 : null, payment.qrCode || null, payment.qrCodeBase64 || null, timestamp2, order.id]);
  if (status !== "approved") return;
  const metadata = parseMetadata(order.metadata_json);
  const plan = metadata.planId ? await getActivePlan(metadata.planId) : null;
  const planId = plan?.id;
  const amount = plan?.amountCents || Number(order.amount_cents);
  if (planId) await query("UPDATE ld_subscriptions SET plan_id = ?, amount_cents = ?, status = 'active', last_payment_at = ?, current_period_ends_at = ?, renewal_due_at = ?, updated_at = ? WHERE id = ?", [planId, amount, timestamp2, timestamp2 + 2592e6, timestamp2 + 2592e6, timestamp2, order.subscription_id]);
  else await query("UPDATE ld_subscriptions SET status = 'active', last_payment_at = ?, current_period_ends_at = ?, renewal_due_at = ?, updated_at = ? WHERE id = ?", [timestamp2, timestamp2 + 2592e6, timestamp2 + 2592e6, timestamp2, order.subscription_id]);
  await query("UPDATE ld_stores SET status = 3, status_changed_at = ?, updated_at = ? WHERE id = ?", [timestamp2, timestamp2, order.store_id]);
  await query("UPDATE ld_users SET onboarding_completed_at = COALESCE(onboarding_completed_at, ?), updated_at = ? WHERE id = (SELECT user_id FROM ld_billing_orders WHERE id = ?)", [timestamp2, timestamp2, order.id]);
}
function parseMetadata(value) {
  try {
    return typeof value === "object" && value ? value : JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
async function syncMercadoPagoSubscription(subscription) {
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`, { headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` } });
  if (!response.ok) throw new Error("N\xE3o foi poss\xEDvel consultar a assinatura no Mercado Pago.");
  const remote = await response.json();
  const status = String(remote.status || subscription.status);
  const periodEnd = remote.next_payment_date ? new Date(remote.next_payment_date).getTime() : null;
  await query("UPDATE ld_subscriptions SET status = ?, current_period_ends_at = ?, updated_at = ? WHERE id = ?", [status, periodEnd, now(), subscription.id]);
  return { ...subscription, status, current_period_ends_at: periodEnd };
}
async function syncMercadoPagoPayment(resourceId) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(resourceId)}`, { headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` } });
  if (!response.ok) return;
  const payment = await response.json();
  const order = await one("SELECT * FROM ld_billing_orders WHERE id = ? OR provider_payment_id = ?", [String(payment.external_reference || payment.metadata?.billing_order_id || ""), String(payment.id)]);
  if (order) await persistPaymentForOrder(order, payment);
}
async function syncMercadoPagoOrder(resourceId) {
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(resourceId)}`, { headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` } });
  if (!response.ok) return;
  const remote = await response.json();
  const transaction3 = remote.transactions?.payments?.[0];
  if (!transaction3?.id) return;
  const order = await one("SELECT * FROM ld_billing_orders WHERE provider_preference_id = ? OR provider_payment_id = ?", [String(remote.id), String(transaction3.id)]);
  if (order) await persistPaymentForOrder(order, { id: transaction3.id, providerOrderId: remote.id, status: paymentStatus(transaction3.status || remote.status), qrCode: transaction3.payment_method?.qr_code || null, qrCodeBase64: transaction3.payment_method?.qr_code_base64 || null });
}
function verifyMercadoPagoSignature({ signature, requestId, resourceId, secret }) {
  if (!signature || !requestId || !resourceId || !secret) return false;
  const fields = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=").map((item) => item.trim())));
  if (!fields.ts || !fields.v1) return false;
  const expected = createHmac("sha256", secret).update(`id:${String(resourceId).toLowerCase()};request-id:${requestId};ts:${fields.ts};`).digest("hex");
  return expected.length === fields.v1.length && timingSafeEqual2(Buffer.from(expected), Buffer.from(fields.v1));
}
async function reconcileStoresForUser(userId) {
  const timestamp2 = now();
  const alerts = [];
  await createDueRenewalOrders(userId, timestamp2);
  const stores = await query("SELECT id, name, status FROM ld_stores WHERE user_id = ?", [userId]);
  for (const store of stores) {
    const control = await one("SELECT status FROM ld_admin_store_controls WHERE store_id = ?", [store.id]);
    if (control?.status === "suspended") {
      if (Number(store.status) !== 2) await query("UPDATE ld_stores SET status = 2, status_changed_at = ?, updated_at = ? WHERE id = ?", [timestamp2, timestamp2, store.id]);
      continue;
    }
    const overdue = await one("SELECT id, due_at FROM ld_billing_orders WHERE store_id = ? AND status IN ('pending', 'rejected', 'in_process') AND due_at IS NOT NULL AND due_at < ? ORDER BY due_at ASC LIMIT 1", [store.id, timestamp2]);
    if (overdue) {
      const daysLate = Math.max(1, Math.floor((timestamp2 - overdue.due_at) / 864e5));
      const lifecycle = billingLifecycle(daysLate);
      const target = lifecycle.storeStatus ?? Number(store.status);
      if (Number(store.status) !== target) await query("UPDATE ld_stores SET status = ?, status_changed_at = ?, updated_at = ? WHERE id = ?", [target, timestamp2, timestamp2, store.id]);
      if (lifecycle.kind === "inactive") alerts.push({ type: "store_inactive", storeId: store.id, title: `${store.name} foi desativada`, description: "A ordem ficou em aberto por mais de 15 dias. Regularize o pagamento para reativar a loja.", href: "/billing/orders" });
      else if (lifecycle.kind === "overdue") alerts.push({ type: "payment_overdue", storeId: store.id, title: `Pagamento em atraso h\xE1 ${daysLate} dia${daysLate === 1 ? "" : "s"}`, description: `Em ${lifecycle.daysUntilInactivation} dia${lifecycle.daysUntilInactivation === 1 ? "" : "s"}, a loja ficar\xE1 fora do ar se a ordem n\xE3o for paga.`, href: "/billing/orders" });
      continue;
    }
    const subscription = await one("SELECT id, status, trial_ends_at, current_period_ends_at, renewal_due_at FROM ld_subscriptions WHERE store_id = ? AND status NOT IN ('cancelled', 'canceled') ORDER BY created_at DESC LIMIT 1", [store.id]);
    const dueAt = subscription && (subscription.renewal_due_at || subscription.current_period_ends_at || subscription.trial_ends_at);
    if (dueAt && dueAt - timestamp2 <= 6048e5 && dueAt >= timestamp2) alerts.push({ type: "renewal_due", storeId: store.id, title: `Renova\xE7\xE3o de ${store.name} pr\xF3xima`, description: "Faltam at\xE9 7 dias para o vencimento da assinatura. Revise ou pague a ordem para manter a loja ativa.", href: "/billing/orders" });
    if (subscription && Number(store.status) === 2 && ["trial", "authorized", "active"].includes(subscription.status)) await query("UPDATE ld_stores SET status = 3, status_changed_at = ?, updated_at = ? WHERE id = ?", [timestamp2, timestamp2, store.id]);
  }
  return alerts;
}
async function createDueRenewalOrders(userId, timestamp2) {
  const trials = await query("SELECT subscriptions.* FROM ld_subscriptions AS subscriptions JOIN ld_stores AS stores ON stores.id = subscriptions.store_id WHERE stores.user_id = ? AND subscriptions.status = 'trial' AND subscriptions.trial_ends_at IS NOT NULL AND subscriptions.trial_ends_at <= ?", [userId, timestamp2]);
  for (const sub of trials) {
    const existing = await one("SELECT id FROM ld_billing_orders WHERE subscription_id = ? AND kind = 'trial_conversion' AND status IN ('pending', 'rejected', 'in_process') ORDER BY created_at DESC LIMIT 1", [sub.id]);
    await query("UPDATE ld_subscriptions SET status = 'pending', renewal_due_at = ?, updated_at = ? WHERE id = ?", [timestamp2, timestamp2, sub.id]);
    if (!existing) await query("INSERT INTO ld_billing_orders (id, store_id, subscription_id, user_id, kind, status, amount_cents, due_at, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'trial_conversion', 'pending', ?, ?, ?, ?, ?)", [randomUUID3(), sub.store_id, sub.id, userId, sub.amount_cents, timestamp2, JSON.stringify({ planId: sub.plan_id, source: "trial_conversion" }), timestamp2, timestamp2]);
  }
  const renewals = await query("SELECT subscriptions.* FROM ld_subscriptions AS subscriptions JOIN ld_stores AS stores ON stores.id = subscriptions.store_id WHERE stores.user_id = ? AND subscriptions.provider_subscription_id IS NULL AND subscriptions.status = 'active' AND COALESCE(subscriptions.renewal_due_at, subscriptions.current_period_ends_at) <= ?", [userId, timestamp2]);
  for (const sub of renewals) {
    if (await one("SELECT id FROM ld_billing_orders WHERE subscription_id = ? AND kind = 'renewal' AND status IN ('pending', 'rejected', 'in_process') ORDER BY created_at DESC LIMIT 1", [sub.id])) continue;
    await query("INSERT INTO ld_billing_orders (id, store_id, subscription_id, user_id, kind, status, amount_cents, due_at, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'renewal', 'pending', ?, ?, ?, ?, ?)", [randomUUID3(), sub.store_id, sub.id, userId, sub.amount_cents, timestamp2, JSON.stringify({ planId: sub.plan_id, source: "transparent_renewal" }), timestamp2, timestamp2]);
  }
}
async function reconcileAllStores() {
  const users2 = await query("SELECT id FROM ld_users");
  const alerts = await Promise.all(users2.map((user) => reconcileStoresForUser(user.id)));
  return { reconciledUsers: users2.length, alerts: alerts.flat().length };
}

// server/modules/stores/service.js
var BRAZILIAN_STATES = /* @__PURE__ */ new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);
async function listStoreFontOptions() {
  return query("SELECT id, label, description, css_family FROM ld_store_font_options WHERE active = 1 ORDER BY sort_order ASC, label ASC");
}
async function getStoresForUser(userId) {
  return query(
    "SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.support_hours, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_observation, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json, profiles.about_title, profiles.about_body, subscriptions.plan_id AS subscription_plan_id, subscriptions.status AS subscription_status, subscriptions.trial_ends_at AS subscription_trial_ends_at FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id LEFT JOIN (SELECT store_id, MAX(created_at) AS latest_created_at FROM ld_subscriptions GROUP BY store_id) AS latest_subscription ON latest_subscription.store_id = stores.id LEFT JOIN ld_subscriptions AS subscriptions ON subscriptions.store_id = latest_subscription.store_id AND subscriptions.created_at = latest_subscription.latest_created_at WHERE stores.user_id = ? ORDER BY stores.created_at DESC",
    [userId]
  );
}
async function storeWithProfileForUser(storeId2, userId) {
  return one(
    "SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.support_hours, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_observation, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json, profiles.about_title, profiles.about_body FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id WHERE stores.id = ? AND stores.user_id = ?",
    [storeId2, userId]
  );
}
async function ensureStoreProfile(storeId2) {
  const timestamp2 = Date.now();
  await query(
    "INSERT IGNORE INTO ld_store_profiles (store_id, about_body, created_at, updated_at) VALUES (?, '', ?, ?)",
    [storeId2, timestamp2, timestamp2]
  );
}
async function ownedStoreForUser(storeId2, userId) {
  return one("SELECT id, name FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId]);
}
function normalizeStoreProfile(source, existing = {}, fontOptions = []) {
  const requestedFont = String(source?.fontFamily || existing?.font_family || existing?.fontFamily || "inter");
  const fontFamily = fontOptions.some((font) => font.id === requestedFont) ? requestedFont : "";
  const contact = source?.contact || {};
  const address = source?.address || {};
  const socials = source?.socials || {};
  const about = source?.about || {};
  const email = optionalEmail(contact.email ?? existing.contact_email);
  const emailInput = String(contact.email ?? existing.contact_email ?? "").trim();
  const country = String(address.country ?? existing.address_country ?? "BR").trim().toUpperCase();
  const state = String(address.state ?? existing.address_state ?? "").trim().toUpperCase();
  const links = {
    instagram: optionalUrl(socials.instagram ?? existing.instagram_url),
    facebook: optionalUrl(socials.facebook ?? existing.facebook_url),
    tiktok: optionalUrl(socials.tiktok ?? existing.tiktok_url),
    youtube: optionalUrl(socials.youtube ?? existing.youtube_url),
    pinterest: optionalUrl(socials.pinterest ?? existing.pinterest_url),
    twitter: optionalUrl(socials.twitter ?? existing.twitter_url)
  };
  const originals = [
    socials.instagram ?? existing.instagram_url,
    socials.facebook ?? existing.facebook_url,
    socials.tiktok ?? existing.tiktok_url,
    socials.youtube ?? existing.youtube_url,
    socials.pinterest ?? existing.pinterest_url,
    socials.twitter ?? existing.twitter_url
  ];
  if (!fontFamily) return { valid: false, error: "Selecione uma fonte visual dispon\xEDvel." };
  if (emailInput && !email) return { valid: false, error: "Informe um e-mail de contato v\xE1lido ou deixe o campo em branco." };
  if (!/^[A-Z]{2}$/.test(country)) return { valid: false, error: "Informe um pa\xEDs v\xE1lido com duas letras." };
  if (state && !BRAZILIAN_STATES.has(state)) return { valid: false, error: "Selecione uma UF brasileira v\xE1lida." };
  if (originals.some((value, index) => String(value || "").trim() && !Object.values(links)[index])) {
    return { valid: false, error: "Informe links v\xE1lidos com http:// ou https:// nas redes sociais." };
  }
  const text4 = (value, max) => validText(value || "", 0, max);
  return {
    valid: true,
    value: {
      fontFamily,
      contact: {
        email,
        phone: text4(contact.phone ?? existing.contact_phone, 40),
        whatsapp: text4(contact.whatsapp ?? existing.whatsapp_phone, 40),
        hours: text4(contact.hours ?? existing.support_hours, 160)
      },
      address: {
        postalCode: text4(address.postalCode ?? existing.address_postal_code, 20),
        street: text4(address.street ?? existing.address_street, 180),
        number: text4(address.number ?? existing.address_number, 30),
        complement: text4(address.complement ?? existing.address_complement, 120),
        observation: text4(address.observation ?? existing.address_observation, 80),
        district: text4(address.district ?? existing.address_district, 120),
        city: text4(address.city ?? existing.address_city, 120),
        state,
        country
      },
      socials: links,
      about: {
        title: text4(about.title ?? existing.about_title, 160),
        body: text4(about.body ?? existing.about_body, 5e3)
      }
    }
  };
}
function normalizeStorefrontAdmin(source, existing = {}) {
  const storefront = source?.storefront || {};
  const theme = storefront.theme || {};
  const maintenance = storefront.maintenance ?? Boolean(existing.maintenance);
  const currency = String(storefront.currency ?? existing.currency ?? "BRL").trim().toUpperCase();
  const locale = String(storefront.locale ?? existing.locale ?? "pt-BR").trim();
  const timezone = String(storefront.timezone ?? existing.timezone ?? "America/Sao_Paulo").trim();
  const template = String(storefront.template ?? existing.template ?? "default").trim();
  const colors = ["secondaryColor", "accentColor", "backgroundColor", "textColor"].reduce((result, key) => ({ ...result, [key]: normalizeOptionalColor(theme[key] ?? existing[`theme_${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`]) }), {});
  const faviconUrl = optionalUrl(storefront.faviconUrl ?? existing.favicon_url);
  const rawFavicon = storefront.faviconUrl ?? existing.favicon_url;
  const settings = safeJson(source?.settings ?? existing.settings_json, {});
  const paymentMethods = safeJson(source?.paymentMethods ?? existing.payment_methods_json, []);
  const shippingMethods = safeJson(source?.shippingMethods ?? existing.shipping_methods_json, []);
  if (!/^[A-Z]{3}$/.test(currency)) return { valid: false, error: "Informe uma moeda v\xE1lida com tr\xEAs letras." };
  if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(locale)) return { valid: false, error: "Informe um locale v\xE1lido, como pt-BR." };
  if (!timezone || timezone.length > 80) return { valid: false, error: "Informe um fuso hor\xE1rio v\xE1lido." };
  if (!/^[a-z0-9_-]{1,40}$/i.test(template)) return { valid: false, error: "Informe um template v\xE1lido." };
  if (rawFavicon && !faviconUrl) return { valid: false, error: "Informe uma URL v\xE1lida para o favicon ou deixe o campo vazio." };
  if (Object.values(colors).some((color) => color === false)) return { valid: false, error: "Use cores hexadecimais v\xE1lidas no tema." };
  if (settings === false || paymentMethods === false || shippingMethods === false || !isPlainObject(settings) || !Array.isArray(paymentMethods) || !Array.isArray(shippingMethods)) return { valid: false, error: "Revise as configura\xE7\xF5es comerciais da loja." };
  return { valid: true, value: { maintenance: Boolean(maintenance), maintenanceMessage: validText(storefront.maintenanceMessage ?? existing.maintenance_message ?? "", 0, 500), currency, locale, timezone, template, theme: colors, faviconUrl, settings, paymentMethods, shippingMethods } };
}
function normalizeOptionalColor(value) {
  if (value === null || value === void 0 || value === "") return null;
  const normalized = String(value).trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : false;
}
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function safeJson(value, fallback) {
  if (value === null || value === void 0 || value === "") return fallback;
  const candidate = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return false;
    }
  })() : value;
  try {
    return JSON.stringify(candidate).length <= 12e3 ? candidate : false;
  } catch {
    return false;
  }
}

// server/modules/stores/validation.js
var StoreValidationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function parseStoreIdentity(source = {}, existing = {}) {
  const suppliedColor = source.color;
  const suppliedAddressMode = source.addressMode;
  const color = suppliedColor === void 0 ? existing.color || "#FF32B2" : String(suppliedColor).toUpperCase();
  const addressMode = suppliedAddressMode === void 0 ? existing.address_mode || existing.addressMode || "slug" : String(suppliedAddressMode);
  if (!/^#[0-9A-F]{6}$/.test(color)) {
    throw new StoreValidationError(422, "Informe uma cor hexadecimal v\xE1lida.");
  }
  if (!["slug", "custom_domain"].includes(addressMode)) {
    throw new StoreValidationError(422, "Informe um modo de endere\xE7o v\xE1lido.");
  }
  const suppliedCategory = source.storeCategory;
  const storeCategory = suppliedCategory === void 0 ? existing.store_category || existing.storeCategory || "" : String(suppliedCategory || "").trim().slice(0, 80);
  return { color, addressMode, storeCategory };
}

// server/modules/stores/deletion-service.js
import { randomUUID as randomUUID4 } from "node:crypto";

// server/modules/store-contract/repository.js
var repository_exports = {};
__export(repository_exports, {
  findPublicStoreBySlug: () => findPublicStoreBySlug,
  findStoreForUser: () => findStoreForUser,
  loadStoreContractData: () => loadStoreContractData
});
function findStoreForUser(storeId2, userId) {
  return one("SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id WHERE stores.id = ? AND stores.user_id = ?", [storeId2, userId]);
}
function findPublicStoreBySlug(slug) {
  return one("SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id WHERE stores.slug = ? AND stores.status = 3", [slug]);
}
async function loadStoreContractData(storeId2) {
  const now3 = Date.now();
  const [categories, products, media, variants, banners, bannerImages, coupons] = await Promise.all([
    query("SELECT categories.*, COUNT(CASE WHEN products.status = 'active' THEN products.id END) AS product_count FROM ld_product_categories AS categories LEFT JOIN ld_products AS products ON products.category_id = categories.id WHERE categories.store_id = ? AND categories.active = 1 GROUP BY categories.id ORDER BY categories.parent_category_id IS NOT NULL, categories.name ASC", [storeId2]),
    query("SELECT products.*, categories.parent_category_id AS category_parent_id FROM ld_products AS products JOIN ld_product_categories AS categories ON categories.id = products.category_id WHERE products.store_id = ? AND products.status = 'active' AND categories.active = 1 ORDER BY products.name ASC", [storeId2]),
    query("SELECT media.* FROM ld_product_media AS media JOIN ld_products AS products ON products.id = media.product_id WHERE products.store_id = ? AND products.status = 'active' AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC", [storeId2]),
    query("SELECT variants.* FROM ld_product_variants AS variants JOIN ld_products AS products ON products.id = variants.product_id WHERE products.store_id = ? AND products.status = 'active' ORDER BY variants.sort_order ASC, variants.created_at ASC", [storeId2]),
    query("SELECT * FROM ld_banners WHERE store_id = ? AND active = 1 ORDER BY display_position ASC, created_at ASC", [storeId2]),
    query("SELECT images.* FROM ld_banner_images AS images JOIN ld_banners AS banners ON banners.id = images.banner_id WHERE banners.store_id = ? AND banners.active = 1 AND images.active = 1 ORDER BY images.breakpoint ASC, images.sort_order ASC", [storeId2]),
    query("SELECT * FROM ld_coupons WHERE store_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at >= ?) ORDER BY created_at DESC", [storeId2, now3])
  ]);
  return { categories, products, media, variants, banners, bannerImages, coupons };
}

// shared/store-contract/schema.js
var STORE_CONTRACT_VERSION = "1.0";
var StoreContractValidationError = class extends Error {
  constructor(issues) {
    super("O contrato p\xFAblico da loja n\xE3o corresponde ao schema.");
    this.name = "StoreContractValidationError";
    this.issues = issues;
  }
};
function validateStoreContract(value) {
  const issues = [];
  const requiredObject = (target, key, path2) => {
    if (!target || typeof target !== "object" || Array.isArray(target) || !(key in target) || !target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
      issues.push({ path: `${path2}.${key}`, message: "Objeto obrigat\xF3rio ausente ou inv\xE1lido." });
      return {};
    }
    return target[key];
  };
  const requiredArray = (target, key, path2) => {
    if (!target || !(key in target) || !Array.isArray(target[key])) {
      issues.push({ path: `${path2}.${key}`, message: "Lista obrigat\xF3ria ausente ou inv\xE1lida." });
      return [];
    }
    return target[key];
  };
  const requiredString = (target, key, path2) => {
    if (!target || typeof target[key] !== "string" || !target[key].trim()) issues.push({ path: `${path2}.${key}`, message: "Texto obrigat\xF3rio ausente ou inv\xE1lido." });
  };
  const nullableString = (target, key, path2) => {
    if (target && key in target && target[key] !== null && typeof target[key] !== "string") issues.push({ path: `${path2}.${key}`, message: "Campo opcional deve ser texto ou nulo." });
  };
  const nullableNumber2 = (target, key, path2) => {
    if (target && key in target && target[key] !== null && !Number.isFinite(target[key])) issues.push({ path: `${path2}.${key}`, message: "Campo opcional deve ser n\xFAmero ou nulo." });
  };
  const nullableBoolean = (target, key, path2) => {
    if (target && key in target && target[key] !== null && typeof target[key] !== "boolean") issues.push({ path: `${path2}.${key}`, message: "Campo opcional deve ser booleano ou nulo." });
  };
  const objectOrNull = (target, key, path2) => {
    if (target && key in target && target[key] !== null && (typeof target[key] !== "object" || Array.isArray(target[key]))) issues.push({ path: `${path2}.${key}`, message: "Campo opcional deve ser objeto ou nulo." });
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { success: false, issues: [{ path: "$", message: "O contrato deve ser um objeto." }] };
  requiredString(value, "contractVersion", "$");
  requiredString(value, "generatedAt", "$");
  const store = requiredObject(value, "store", "$");
  ["id", "name", "slug", "status"].forEach((key) => requiredString(store, key, "$.store"));
  ["description", "logo", "favicon", "maintenanceMessage", "currency", "currencySymbol", "locale", "timezone", "template"].forEach((key) => nullableString(store, key, "$.store"));
  nullableBoolean(store, "maintenance", "$.store");
  const contact = requiredObject(store, "contact", "$.store");
  ["email", "phone", "whatsapp"].forEach((key) => nullableString(contact, key, "$.store.contact"));
  const address = requiredObject(contact, "address", "$.store.contact");
  ["street", "neighborhood", "city", "state", "zipCode", "country"].forEach((key) => nullableString(address, key, "$.store.contact.address"));
  const social = requiredObject(store, "social", "$.store");
  ["instagram", "facebook", "tiktok", "youtube", "pinterest", "twitter"].forEach((key) => nullableString(social, key, "$.store.social"));
  const seo = requiredObject(store, "seo", "$.store");
  ["title", "description", "ogImage"].forEach((key) => nullableString(seo, key, "$.store.seo"));
  requiredArray(seo, "keywords", "$.store.seo").forEach((item, index) => {
    if (typeof item !== "string") issues.push({ path: `$.store.seo.keywords[${index}]`, message: "Palavra-chave deve ser texto." });
  });
  const settings = requiredObject(store, "settings", "$.store");
  ["freeShippingMinValue", "maxInstallments", "minInstallmentValue"].forEach((key) => nullableNumber2(settings, key, "$.store.settings"));
  ["showPriceFrom", "showStock", "showSoldCount", "allowGuestCheckout", "requireCpf", "requirePhone"].forEach((key) => nullableBoolean(settings, key, "$.store.settings"));
  const theme = requiredObject(store, "theme", "$.store");
  ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor", "fontFamily"].forEach((key) => nullableString(theme, key, "$.store.theme"));
  requiredArray(store, "paymentMethods", "$.store").forEach((item, index) => validatePaymentMethod(item, `$.store.paymentMethods[${index}]`, { requiredString, nullableString, nullableNumber: nullableNumber2, nullableBoolean, issues }));
  requiredArray(store, "shippingMethods", "$.store").forEach((item, index) => validateShippingMethod(item, `$.store.shippingMethods[${index}]`, { requiredString, nullableString, nullableNumber: nullableNumber2, nullableBoolean, issues }));
  requiredArray(value, "banners", "$").forEach((item, index) => validateBanner(item, `$.banners[${index}]`, { requiredString, nullableString, nullableNumber: nullableNumber2, nullableBoolean, issues }));
  requiredArray(value, "miniBanners", "$").forEach((item, index) => validateMiniBanner(item, `$.miniBanners[${index}]`, { requiredString, nullableString, nullableBoolean, issues }));
  requiredArray(value, "categories", "$").forEach((item, index) => validateCategory(item, `$.categories[${index}]`, { requiredString, nullableString, nullableNumber: nullableNumber2, nullableBoolean, requiredArray, issues }));
  requiredArray(value, "products", "$").forEach((item, index) => validateProduct(item, `$.products[${index}]`, { requiredString, nullableString, nullableNumber: nullableNumber2, nullableBoolean, requiredArray, objectOrNull, issues }));
  requiredArray(value, "coupons", "$").forEach((item, index) => validateCoupon(item, `$.coupons[${index}]`, { requiredString, nullableString, nullableNumber: nullableNumber2, nullableBoolean, requiredArray, issues }));
  requiredArray(value, "pages", "$").forEach((item, index) => validatePage(item, `$.pages[${index}]`, { requiredString, nullableString, nullableBoolean, objectOrNull, issues }));
  requiredArray(value, "orders", "$").forEach((item, index) => validateOrder(item, `$.orders[${index}]`, { requiredString, nullableString, nullableNumber: nullableNumber2, nullableBoolean, requiredArray, objectOrNull, issues }));
  return { success: issues.length === 0, issues };
}
function assertValidStoreContract(value) {
  const result = validateStoreContract(value);
  if (!result.success) throw new StoreContractValidationError(result.issues);
  return value;
}
function validatePaymentMethod(item, path2, tools) {
  tools.requiredString(item, "id", path2);
  tools.requiredString(item, "name", path2);
  tools.nullableString(item, "icon", path2);
  tools.nullableBoolean(item, "enabled", path2);
  tools.nullableNumber(item, "installments", path2);
  tools.nullableNumber(item, "minInstallmentValue", path2);
  tools.nullableNumber(item, "discount", path2);
  tools.nullableNumber(item, "daysToExpire", path2);
}
function validateShippingMethod(item, path2, tools) {
  tools.requiredString(item, "id", path2);
  tools.requiredString(item, "name", path2);
  tools.nullableString(item, "description", path2);
  tools.nullableNumber(item, "minDays", path2);
  tools.nullableNumber(item, "maxDays", path2);
  tools.nullableNumber(item, "price", path2);
  tools.nullableBoolean(item, "enabled", path2);
}
function validateBanner(item, path2, tools) {
  tools.requiredString(item, "id", path2);
  tools.requiredString(item, "title", path2);
  ["subtitle", "image", "imageMobile", "link", "buttonText"].forEach((key) => tools.nullableString(item, key, path2));
  tools.nullableNumber(item, "position", path2);
  tools.nullableBoolean(item, "active", path2);
}
function validateMiniBanner(item, path2, tools) {
  tools.requiredString(item, "id", path2);
  tools.requiredString(item, "title", path2);
  ["image", "link"].forEach((key) => tools.nullableString(item, key, path2));
  tools.nullableBoolean(item, "active", path2);
}
function validateCategory(item, path2, tools) {
  tools.requiredString(item, "id", path2);
  tools.requiredString(item, "name", path2);
  tools.requiredString(item, "slug", path2);
  ["description", "image", "banner", "parentId"].forEach((key) => tools.nullableString(item, key, path2));
  tools.nullableNumber(item, "position", path2);
  tools.nullableBoolean(item, "active", path2);
  tools.nullableNumber(item, "productCount", path2);
  tools.requiredArray(item, "subcategories", path2).forEach((child, index) => validateCategory({ ...child, subcategories: child?.subcategories || [] }, `${path2}.subcategories[${index}]`, tools));
}
function validateProduct(item, path2, tools) {
  ["id", "name", "slug", "categoryId", "categorySlug"].forEach((key) => tools.requiredString(item, key, path2));
  ["sku", "description", "shortDescription", "thumbnail", "subcategoryId", "brand", "createdAt", "updatedAt"].forEach((key) => tools.nullableString(item, key, path2));
  ["price", "priceFrom", "stock", "weight"].forEach((key) => tools.nullableNumber(item, key, path2));
  ["featured", "isNew", "isBestSeller", "active"].forEach((key) => tools.nullableBoolean(item, key, path2));
  tools.requiredArray(item, "images", path2);
  tools.requiredArray(item, "tags", path2);
  tools.requiredArray(item, "variants", path2).forEach((variant, index) => {
    const variantPath = `${path2}.variants[${index}]`;
    tools.requiredString(variant, "id", variantPath);
    ["name", "sku"].forEach((key) => tools.nullableString(variant, key, variantPath));
    ["price", "stock"].forEach((key) => tools.nullableNumber(variant, key, variantPath));
    tools.objectOrNull(variant, "attributes", variantPath);
  });
  tools.objectOrNull(item, "attributes", path2);
  tools.objectOrNull(item, "dimensions", path2);
  tools.objectOrNull(item, "seo", path2);
}
function validateCoupon(item, path2, tools) {
  ["id", "code", "type"].forEach((key) => tools.requiredString(item, key, path2));
  ["description", "startDate", "endDate"].forEach((key) => tools.nullableString(item, key, path2));
  ["value", "minValue", "maxDiscount", "usageLimit", "usageCount", "userLimit"].forEach((key) => tools.nullableNumber(item, key, path2));
  tools.nullableBoolean(item, "active", path2);
  tools.requiredArray(item, "categories", path2);
  tools.requiredArray(item, "products", path2);
}
function validatePage(item, path2, tools) {
  ["id", "title", "slug"].forEach((key) => tools.requiredString(item, key, path2));
  tools.nullableString(item, "content", path2);
  tools.objectOrNull(item, "seo", path2);
  tools.nullableBoolean(item, "active", path2);
}
function validateOrder(item, path2, tools) {
  ["id", "number", "status"].forEach((key) => tools.requiredString(item, key, path2));
  ["statusLabel", "createdAt", "updatedAt", "paymentMethod", "paymentMethodLabel", "cancelReason"].forEach((key) => tools.nullableString(item, key, path2));
  ["subtotal", "shipping", "discount", "total", "installments"].forEach((key) => tools.nullableNumber(item, key, path2));
  tools.requiredArray(item, "items", path2);
  tools.objectOrNull(item, "shippingAddress", path2);
  tools.objectOrNull(item, "tracking", path2);
}

// shared/store-contract/normalizers.js
function decimalToCents(value) {
  if (value === null || value === void 0 || value === "") return null;
  const normalized = String(value).trim().replace(",", ".");
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new TypeError("Valor monet\xE1rio inv\xE1lido.");
  const sign = match[1] === "-" ? -1 : 1;
  const units = Number(match[2]);
  const decimals = Number((match[3] || "").padEnd(2, "0"));
  const cents = sign * (units * 100 + decimals);
  if (!Number.isSafeInteger(cents)) throw new TypeError("Valor monet\xE1rio fora do limite seguro.");
  return cents;
}
function isoToTimestamp(value) {
  if (value === null || value === void 0 || value === "") return null;
  const timestamp2 = Date.parse(String(value));
  if (!Number.isFinite(timestamp2)) throw new TypeError("Data ISO inv\xE1lida.");
  return timestamp2;
}

// shared/store-contract/money.js
var MoneyError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MoneyError";
  }
};
function assertCents(value, label = "Valor") {
  if (!Number.isSafeInteger(value)) throw new MoneyError(`${label} deve ser um inteiro seguro em centavos.`);
  return value;
}
function addCents(...values) {
  return values.reduce((total, value) => assertCents(total + assertCents(value)), 0);
}
function subtractCents(left, right) {
  return assertCents(assertCents(left) - assertCents(right));
}
function multiplyCents(value, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new MoneyError("Quantidade inv\xE1lida.");
  return assertCents(assertCents(value) * quantity);
}
function clampCents(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  return Math.min(Math.max(assertCents(value), assertCents(minimum)), assertCents(maximum));
}
function percentageToBasisPoints(value) {
  const source = String(value ?? "").trim().replace(",", ".");
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(source);
  if (!match) throw new MoneyError("Percentual inv\xE1lido.");
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const fraction = Number((match[3] || "").padEnd(2, "0"));
  return assertCents(sign * (whole * 100 + fraction), "Percentual em pontos-base");
}
function percentageOfCents(value, percentage) {
  const basisPoints = percentageToBasisPoints(percentage);
  if (basisPoints < 0) throw new MoneyError("Percentual n\xE3o pode ser negativo.");
  return assertCents(Math.floor(assertCents(value) * basisPoints / 1e4));
}

// shared/store-contract/commercial.js
var CommercialRuleError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CommercialRuleError";
    this.code = code;
  }
};
function projectCommercialDomain(contract) {
  return {
    store: {
      id: String(contract.store.id),
      status: String(contract.store.status),
      locale: contract.store.locale || "pt-BR",
      currency: contract.store.currency || "BRL",
      settings: { freeShippingMinCents: decimalToCents(contract.store.settings?.freeShippingMinValue), maxInstallments: numberOrNull(contract.store.settings?.maxInstallments), minInstallmentCents: decimalToCents(contract.store.settings?.minInstallmentValue), showPriceFrom: booleanOrNull(contract.store.settings?.showPriceFrom) },
      paymentMethods: (contract.store.paymentMethods || []).map((method) => ({ id: String(method.id), name: String(method.name), enabled: method.enabled === true, installments: numberOrNull(method.installments), minInstallmentCents: decimalToCents(method.minInstallmentValue), discountPercent: numberOrNull(method.discount), daysToExpire: numberOrNull(method.daysToExpire) })),
      shippingMethods: (contract.store.shippingMethods || []).map((method) => ({ id: String(method.id), name: String(method.name), description: textOrNull(method.description), enabled: method.enabled === true, minDays: numberOrNull(method.minDays), maxDays: numberOrNull(method.maxDays), priceCents: decimalToCents(method.price) }))
    },
    products: (contract.products || []).map((product) => ({ id: String(product.id), categoryId: String(product.categoryId), active: product.active === true, priceCents: decimalToCents(product.price), priceFromCents: decimalToCents(product.priceFrom), stock: numberOrNull(product.stock), variants: (product.variants || []).map((variant) => ({ id: String(variant.id), priceCents: decimalToCents(variant.price), stock: numberOrNull(variant.stock) })) })),
    coupons: (contract.coupons || []).map((coupon) => ({ id: String(coupon.id), code: String(coupon.code).toUpperCase(), type: String(coupon.type), percentageOff: coupon.type === "percentage" ? numberOrNull(coupon.value) : null, valueCents: coupon.type === "fixed" ? decimalToCents(coupon.value) : null, minimumOrderCents: decimalToCents(coupon.minValue) || 0, maxDiscountCents: decimalToCents(coupon.maxDiscount), usageLimit: numberOrNull(coupon.usageLimit), usageCount: numberOrNull(coupon.usageCount) || 0, userLimit: numberOrNull(coupon.userLimit), startsAt: isoToTimestamp(coupon.startDate), expiresAt: isoToTimestamp(coupon.endDate), active: coupon.active === true, categoryIds: (coupon.categories || []).map(String), productIds: (coupon.products || []).map(String) }))
  };
}
function buildCommercialPreview(domain, input = {}, now3 = Date.now()) {
  if (domain.store.status !== "active") throw new CommercialRuleError("STORE_UNAVAILABLE", "Esta loja n\xE3o est\xE1 dispon\xEDvel para consulta comercial.");
  const items = normalizeItems(input.items);
  const lines = items.map((item) => resolveLine(domain.products, item));
  const subtotalCents = addCents(...lines.map((line) => line.lineTotalCents));
  const coupon = resolveCoupon(domain.coupons, input.couponCode, lines, subtotalCents, now3);
  const merchandiseTotalCents = subtractCents(subtotalCents, coupon.discountCents);
  const shipping = resolveShipping(domain.store, input.shippingMethodId, subtotalCents, coupon);
  const payment = resolvePayment(domain.store, input.paymentMethodId);
  const totalCents = shipping.priceCents === null ? null : addCents(merchandiseTotalCents, shipping.priceCents);
  return { storeId: domain.store.id, currency: domain.store.currency, locale: domain.store.locale, lines, subtotalCents, discountCents: coupon.discountCents, merchandiseTotalCents, shipping, payment, totalCents, finalization: { supported: false, reason: "Esta pr\xE9-valida\xE7\xE3o n\xE3o cria pedido, reserva estoque, pagamento ou checkout." }, warnings: [...coupon.warnings, ...shipping.warnings, ...payment.warnings] };
}
function describeAvailability(stock) {
  return stock === null ? { status: "unknown", available: null } : stock > 0 ? { status: "available", available: true } : { status: "out_of_stock", available: false };
}
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new CommercialRuleError("ITEMS_REQUIRED", "Informe ao menos um produto para a pr\xE9-valida\xE7\xE3o.");
  const grouped = /* @__PURE__ */ new Map();
  for (const item of items) {
    const productId = String(item?.productId || "").trim();
    const variantId = item?.variantId == null || item.variantId === "" ? null : String(item.variantId);
    const quantity = Number(item?.quantity);
    if (!productId || !Number.isSafeInteger(quantity) || quantity < 1) throw new CommercialRuleError("INVALID_QUANTITY", "Cada item deve possuir produto e quantidade inteira positiva.");
    const key = `${productId}:${variantId || "product"}`;
    grouped.set(key, { productId, variantId, quantity: (grouped.get(key)?.quantity || 0) + quantity });
  }
  return [...grouped.values()];
}
function resolveLine(products, item) {
  const product = products.find((candidate) => candidate.id === item.productId);
  if (!product || !product.active) throw new CommercialRuleError("PRODUCT_UNAVAILABLE", "Um produto solicitado n\xE3o est\xE1 dispon\xEDvel.");
  if (product.variants.length && !item.variantId) throw new CommercialRuleError("VARIANT_REQUIRED", "Selecione uma variante v\xE1lida para este produto.");
  const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId) : null;
  if (item.variantId && !variant) throw new CommercialRuleError("INVALID_VARIANT", "A variante selecionada n\xE3o pertence ao produto.");
  const stock = variant?.stock ?? product.stock;
  if (stock !== null && stock <= 0) throw new CommercialRuleError("OUT_OF_STOCK", "Um produto solicitado est\xE1 sem estoque.");
  if (stock !== null && item.quantity > stock) throw new CommercialRuleError("INSUFFICIENT_STOCK", "A quantidade solicitada excede o estoque dispon\xEDvel.");
  const unitPriceCents = variant?.priceCents ?? product.priceCents;
  if (unitPriceCents === null) throw new CommercialRuleError("PRICE_UNAVAILABLE", "Um produto solicitado n\xE3o possui pre\xE7o dispon\xEDvel.");
  return { productId: product.id, variantId: variant?.id || null, quantity: item.quantity, unitPriceCents, lineTotalCents: multiplyCents(unitPriceCents, item.quantity), stock: describeAvailability(stock) };
}
function resolveCoupon(coupons, code, lines, subtotalCents, now3) {
  if (!code || !String(code).trim()) return { code: null, type: null, discountCents: 0, freeShippingRequested: false, warnings: [] };
  const coupon = coupons.find((candidate) => candidate.code === String(code).trim().toUpperCase());
  if (!coupon || !coupon.active) throw new CommercialRuleError("COUPON_INVALID", "Este cupom n\xE3o est\xE1 dispon\xEDvel.");
  if (coupon.startsAt !== null && coupon.startsAt > now3) throw new CommercialRuleError("COUPON_NOT_STARTED", "Este cupom ainda n\xE3o est\xE1 dispon\xEDvel.");
  if (coupon.expiresAt !== null && coupon.expiresAt < now3) throw new CommercialRuleError("COUPON_EXPIRED", "Este cupom expirou.");
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) throw new CommercialRuleError("COUPON_LIMIT_REACHED", "Este cupom atingiu o limite de uso.");
  if (subtotalCents < coupon.minimumOrderCents) throw new CommercialRuleError("COUPON_MINIMUM_NOT_REACHED", "O valor m\xEDnimo deste cupom n\xE3o foi atingido.");
  if (coupon.userLimit !== null || coupon.categoryIds.length || coupon.productIds.length) throw new CommercialRuleError("COUPON_SCOPE_REQUIRES_CONFIRMATION", "A elegibilidade deste cupom requer valida\xE7\xE3o comercial adicional.");
  if (coupon.type === "percentage") {
    const uncapped = percentageOfCents(subtotalCents, coupon.percentageOff);
    return { code: coupon.code, type: coupon.type, discountCents: coupon.maxDiscountCents === null ? uncapped : Math.min(uncapped, coupon.maxDiscountCents), freeShippingRequested: false, warnings: [] };
  }
  if (coupon.type === "fixed") return { code: coupon.code, type: coupon.type, discountCents: clampCents(coupon.valueCents, 0, subtotalCents), freeShippingRequested: false, warnings: [] };
  if (coupon.type === "free_shipping") return { code: coupon.code, type: coupon.type, discountCents: 0, freeShippingRequested: true, warnings: ["A elegibilidade de frete gr\xE1tis ser\xE1 confirmada quando houver c\xE1lculo de entrega."] };
  throw new CommercialRuleError("COUPON_TYPE_UNSUPPORTED", "O tipo de cupom n\xE3o \xE9 suportado.");
}
function resolveShipping(store, shippingMethodId, subtotalCents, coupon) {
  const warnings = [];
  if (!shippingMethodId) return { methodId: null, methodName: null, priceCents: null, status: "not_selected", minDays: null, maxDays: null, freeShippingApplied: false, warnings };
  const method = store.shippingMethods.find((candidate) => candidate.id === String(shippingMethodId));
  if (!method || !method.enabled) throw new CommercialRuleError("SHIPPING_UNAVAILABLE", "O m\xE9todo de frete n\xE3o est\xE1 dispon\xEDvel.");
  if (method.priceCents === null) return { methodId: method.id, methodName: method.name, priceCents: null, status: "requires_quote", minDays: method.minDays, maxDays: method.maxDays, freeShippingApplied: false, warnings: ["Este frete precisa de cota\xE7\xE3o antes da confirma\xE7\xE3o.", ...warnings] };
  const freeShippingApplied = store.settings.freeShippingMinCents !== null && subtotalCents >= store.settings.freeShippingMinCents;
  if (coupon.freeShippingRequested) warnings.push("O cupom de frete gr\xE1tis precisa de confirma\xE7\xE3o de elegibilidade para esta entrega.");
  return { methodId: method.id, methodName: method.name, priceCents: freeShippingApplied ? 0 : method.priceCents, status: "quoted", minDays: method.minDays, maxDays: method.maxDays, freeShippingApplied, warnings };
}
function resolvePayment(store, paymentMethodId) {
  if (!paymentMethodId) return { methodId: null, methodName: null, enabled: null, maxInstallments: null, minInstallmentCents: null, warnings: [] };
  const method = store.paymentMethods.find((candidate) => candidate.id === String(paymentMethodId));
  if (!method || !method.enabled) throw new CommercialRuleError("PAYMENT_UNAVAILABLE", "O m\xE9todo de pagamento n\xE3o est\xE1 dispon\xEDvel.");
  return { methodId: method.id, methodName: method.name, enabled: true, maxInstallments: method.installments ?? store.settings.maxInstallments, minInstallmentCents: method.minInstallmentCents ?? store.settings.minInstallmentCents, warnings: method.discountPercent !== null ? ["O desconto do m\xE9todo de pagamento depende de confirma\xE7\xE3o comercial antes da finaliza\xE7\xE3o."] : [] };
}
function textOrNull(value) {
  const result = String(value ?? "").trim();
  return result || null;
}
function numberOrNull(value) {
  return value === null || value === void 0 || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
}
function booleanOrNull(value) {
  return value === null || value === void 0 ? null : Boolean(value);
}

// server/modules/store-contract/service.js
var StoreContractError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function getStoreContract({ storeId: storeId2, userId, dataSource = repository_exports }) {
  const store = await dataSource.findStoreForUser(storeId2, userId);
  if (!store) throw new StoreContractError(404, "Loja n\xE3o encontrada.");
  return buildValidatedContract(store, await dataSource.loadStoreContractData(store.id));
}
async function getPublicStoreContract({ slug, dataSource = repository_exports }) {
  const store = await dataSource.findPublicStoreBySlug(normalizeSlug2(slug));
  if (!store) throw new StoreContractError(404, "Loja p\xFAblica n\xE3o encontrada ou indispon\xEDvel.");
  return buildValidatedContract(store, await dataSource.loadStoreContractData(store.id));
}
async function getPublicCommercialPreview({ slug, input, dataSource = repository_exports, now: now3 = Date.now() }) {
  const contract = await getPublicStoreContract({ slug, dataSource });
  return buildCommercialPreview(projectCommercialDomain(contract), input, now3);
}
function buildStoreContract(store, data = {}) {
  const categoryRecords = mapCategories(data.categories || []);
  const categoryById = new Map(categoryRecords.flat.map((category) => [category.id, category]));
  const mediaByProduct = groupBy(data.media || [], (item) => item.product_id);
  const variantsByProduct = groupBy(data.variants || [], (item) => item.product_id);
  const imagesByBanner = groupBy(data.bannerImages || [], (item) => item.banner_id);
  const banners = mapBanners(data.banners || [], imagesByBanner);
  return {
    contractVersion: STORE_CONTRACT_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    store: mapStore(store),
    banners: banners.filter((banner) => banner.kind === "hero").map(({ kind, ...banner }) => banner),
    miniBanners: banners.filter((banner) => banner.kind === "mini").map(({ kind, ...banner }) => banner),
    categories: categoryRecords.roots,
    products: (data.products || []).map((product) => mapProduct(product, categoryById, mediaByProduct.get(product.id) || [], variantsByProduct.get(product.id) || [])),
    coupons: (data.coupons || []).map(mapCoupon),
    pages: [],
    orders: []
  };
}
function buildValidatedContract(store, data) {
  const contract = buildStoreContract(store, data);
  assertValidStoreContract(contract);
  return contract;
}
function mapStore(store) {
  const name = textOrNull2(store.name);
  const description = textOrNull2(store.description);
  return {
    id: String(store.id),
    name,
    slug: normalizeSlug2(store.slug),
    description,
    logo: textOrNull2(store.logo_url || store.logoUrl),
    favicon: textOrNull2(store.favicon_url),
    status: publicStoreStatus(store.status),
    maintenance: Boolean(store.maintenance),
    maintenanceMessage: textOrNull2(store.maintenance_message),
    currency: textOrNull2(store.currency),
    currencySymbol: currencySymbol(store.currency),
    locale: textOrNull2(store.locale),
    timezone: textOrNull2(store.timezone),
    contact: {
      email: textOrNull2(store.contact_email),
      phone: textOrNull2(store.contact_phone),
      whatsapp: textOrNull2(store.whatsapp_phone),
      address: {
        street: joinAddress(store.address_street, store.address_number),
        neighborhood: textOrNull2(store.address_district),
        city: textOrNull2(store.address_city),
        state: textOrNull2(store.address_state),
        zipCode: textOrNull2(store.address_postal_code),
        country: textOrNull2(store.address_country)
      }
    },
    social: {
      instagram: textOrNull2(store.instagram_url),
      facebook: textOrNull2(store.facebook_url),
      tiktok: textOrNull2(store.tiktok_url),
      youtube: textOrNull2(store.youtube_url),
      pinterest: textOrNull2(store.pinterest_url),
      twitter: textOrNull2(store.twitter_url)
    },
    seo: { title: name, description, keywords: [], ogImage: textOrNull2(store.logo_url || store.logoUrl) },
    settings: mapSettings(store.settings_json),
    paymentMethods: mapMethods(store.payment_methods_json),
    shippingMethods: mapMethods(store.shipping_methods_json),
    template: textOrNull2(store.template),
    theme: { primaryColor: textOrNull2(store.color), secondaryColor: textOrNull2(store.theme_secondary_color), accentColor: textOrNull2(store.theme_accent_color), backgroundColor: textOrNull2(store.theme_background_color), textColor: textOrNull2(store.theme_text_color), fontFamily: textOrNull2(store.font_family) }
  };
}
function mapCategories(rows) {
  const flat = rows.map((row, index) => ({ id: String(row.id), name: String(row.name), slug: normalizeSlug2(row.name) || String(row.id), description: textOrNull2(row.description), image: textOrNull2(row.card_image_url), banner: textOrNull2(row.hero_image_url), parentId: textOrNull2(row.parent_category_id), position: index + 1, active: Boolean(row.active), productCount: Number(row.product_count || 0), subcategories: [] }));
  const byId = new Map(flat.map((item) => [item.id, item]));
  const roots = [];
  for (const item of flat) {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId).subcategories.push(item);
    else roots.push(item);
  }
  roots.forEach((root, rootIndex) => {
    root.position = rootIndex + 1;
    root.subcategories.forEach((child, childIndex) => {
      child.position = childIndex + 1;
    });
  });
  return { roots, flat };
}
function mapProduct(product, categoryById, media, variants) {
  const assignedCategory = categoryById.get(String(product.category_id));
  const rootCategory = assignedCategory?.parentId ? categoryById.get(assignedCategory.parentId) || assignedCategory : assignedCategory;
  const images = media.map((item) => item.url).filter(Boolean);
  const primary = media.find((item) => Boolean(item.is_primary)) || media[0];
  const description = textOrNull2(product.description);
  return {
    id: String(product.id),
    sku: textOrNull2(product.sku),
    name: String(product.name),
    slug: normalizeSlug2(product.name) || String(product.id),
    description,
    shortDescription: textOrNull2(product.short_description) || shorten(description),
    price: centsToValue(product.price_cents),
    priceFrom: centsToValue(product.compare_at_price_cents),
    images,
    thumbnail: textOrNull2(primary?.url),
    categoryId: String(rootCategory?.id || product.category_id),
    categorySlug: String(rootCategory?.slug || normalizeSlug2(product.category_id) || product.category_id),
    subcategoryId: assignedCategory?.parentId ? assignedCategory.id : null,
    brand: textOrNull2(product.brand),
    tags: jsonArray(product.tags_json),
    featured: null,
    isNew: null,
    isBestSeller: null,
    active: product.status === "active",
    stock: Number.isInteger(Number(product.stock_quantity)) ? Number(product.stock_quantity) : null,
    weight: product.weight_grams == null ? null : Number(product.weight_grams) / 1e3,
    dimensions: product.width_mm == null && product.height_mm == null && product.depth_mm == null ? null : { width: Number(product.width_mm || 0) / 10, height: Number(product.height_mm || 0) / 10, depth: Number(product.depth_mm || 0) / 10 },
    variants: variants.map((variant) => ({ id: String(variant.id), name: String(variant.name), sku: textOrNull2(variant.sku), price: centsToValue(variant.price_cents) ?? centsToValue(product.price_cents), stock: Number(variant.stock_quantity || 0), attributes: {} })),
    attributes: {},
    seo: { title: String(product.name), description, keywords: [] },
    createdAt: toIso(product.created_at),
    updatedAt: toIso(product.updated_at)
  };
}
function mapBanners(rows, imagesByBanner) {
  const rank = { top: 1, middle: 2, after_row_1: 3, after_row_2: 4, after_row_3: 5, after_row_4: 6, final: 7 };
  return [...rows].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0) || (rank[left.display_position] || 99) - (rank[right.display_position] || 99)).map((banner, index) => {
    const images = imagesByBanner.get(banner.id) || [];
    const desktop = images.find((item) => item.breakpoint === "desktop");
    const mobile = images.find((item) => item.breakpoint === "mobile");
    return { kind: banner.banner_kind || "hero", id: String(banner.id), title: String(banner.title), subtitle: textOrNull2(banner.subtitle), image: textOrNull2(desktop?.url || mobile?.url), imageMobile: textOrNull2(mobile?.url || desktop?.url), link: textOrNull2(banner.target_url), buttonText: textOrNull2(banner.button_text), position: Number(banner.sort_order || index + 1), active: Boolean(banner.active) };
  });
}
function mapCoupon(coupon) {
  const value = coupon.discount_type === "percentage" ? Number(coupon.percentage_off) : coupon.discount_type === "fixed" ? centsToValue(coupon.amount_off_cents) : 0;
  return { id: String(coupon.id), code: String(coupon.code), description: null, type: String(coupon.discount_type), value, minValue: centsToValue(coupon.minimum_order_cents), maxDiscount: null, usageLimit: coupon.usage_limit == null ? null : Number(coupon.usage_limit), usageCount: Number(coupon.usage_count || 0), userLimit: null, startDate: null, endDate: toIso(coupon.expires_at), active: Boolean(coupon.active), categories: [], products: [] };
}
function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const groupKey = key(item);
    const current = groups.get(groupKey) || [];
    current.push(item);
    groups.set(groupKey, current);
    return groups;
  }, /* @__PURE__ */ new Map());
}
function textOrNull2(value) {
  const text4 = String(value || "").trim();
  return text4 || null;
}
function centsToValue(value) {
  return value == null || value === "" ? null : Number((Number(value) / 100).toFixed(2));
}
function currencySymbol(currency) {
  return String(currency || "").toUpperCase() === "BRL" ? "R$" : null;
}
function jsonArray(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
function mapSettings(value) {
  const source = parseJson2(value, {});
  return { freeShippingMinValue: finiteOrNull(source.freeShippingMinValue), maxInstallments: integerOrNull(source.maxInstallments), minInstallmentValue: finiteOrNull(source.minInstallmentValue), showPriceFrom: booleanOrNull2(source.showPriceFrom), showStock: booleanOrNull2(source.showStock), showSoldCount: booleanOrNull2(source.showSoldCount), allowGuestCheckout: booleanOrNull2(source.allowGuestCheckout), requireCpf: booleanOrNull2(source.requireCpf), requirePhone: booleanOrNull2(source.requirePhone) };
}
function mapMethods(value) {
  const source = parseJson2(value, []);
  return Array.isArray(source) ? source.filter((item) => item && typeof item === "object").slice(0, 20) : [];
}
function parseJson2(value, fallback) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
function integerOrNull(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
function booleanOrNull2(value) {
  return typeof value === "boolean" ? value : null;
}
function toIso(value) {
  const timestamp2 = Number(value);
  return Number.isSafeInteger(timestamp2) && timestamp2 > 0 ? new Date(timestamp2).toISOString() : null;
}
function shorten(value) {
  return value ? value.slice(0, 180) : null;
}
function joinAddress(street, number) {
  const first = textOrNull2(street);
  const second = textOrNull2(number);
  return first && second ? `${first}, ${second}` : first || second;
}
function normalizeSlug2(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function publicStoreStatus(value) {
  return Number(value) === 3 ? "active" : Number(value) === 0 ? "inactive" : "pending";
}

// server/modules/store-contract/r2-sync.js
async function syncStoreContractToR2({ storeId: storeId2, userId, previousKeys = [] }) {
  const contract = await getStoreContract({ storeId: storeId2, userId, dataSource: repository_exports });
  const key = storeContractKey(contract.store);
  await getContractStorage().putJson({ key, value: contract });
  const obsolete = [...new Set(previousKeys.filter((item) => item && item !== key))];
  if (obsolete.length) await getContractStorage().removeMany(obsolete);
  return { key, contract };
}
async function removeStoreContractFromR2({ key }) {
  if (key) await getContractStorage().remove(key);
}
function storeContractKey(store) {
  const domain = String(store?.customDomain || store?.custom_domain || "").trim().toLowerCase();
  const slug = String(store?.slug || "").trim().toLowerCase();
  const basename = domain || slug;
  if (!/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(basename)) throw new Error("Slug ou dom\xEDnio inv\xE1lido para gerar o JSON da loja.");
  return `stores/${basename}.json`;
}

// server/modules/stores/deletion-service.js
var RESOURCE_KEYS = /* @__PURE__ */ new Set(["products", "coupons", "banners", "customers", "orders"]);
var REQUEST_TTL_MS = 30 * 60 * 1e3;
var StoreDeletionError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function requestStoreDeletion({ storeId: storeId2, userId, password, resources, deleteStore, origin }) {
  const selectedResources = normalizeResources(resources);
  const removingStore = Boolean(deleteStore);
  if (!removingStore && !selectedResources.length) throw new StoreDeletionError(422, "Selecione ao menos um grupo de dados para excluir.");
  const [user, store] = await Promise.all([
    one("SELECT id, name, email, password_hash FROM ld_users WHERE id = ?", [userId]),
    one("SELECT id, name FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId])
  ]);
  if (!store) throw new StoreDeletionError(404, "Loja n\xE3o encontrada.");
  if (!user?.password_hash || !await verifyPassword(String(password || ""), user.password_hash)) {
    throw new StoreDeletionError(401, "Confirme sua senha para solicitar a exclus\xE3o.");
  }
  if (!user.email) throw new StoreDeletionError(422, "Cadastre um e-mail v\xE1lido na sua conta antes de solicitar esta exclus\xE3o.");
  const timestamp2 = Date.now();
  const rawToken = createResetToken();
  const request = {
    id: randomUUID4(),
    storeId: store.id,
    userId,
    actionType: removingStore ? "store" : "resources",
    payload: { resources: selectedResources },
    tokenHash: hashToken(rawToken),
    expiresAt: timestamp2 + REQUEST_TTL_MS,
    createdAt: timestamp2
  };
  await query("UPDATE ld_store_deletion_requests SET used_at = ? WHERE store_id = ? AND user_id = ? AND used_at IS NULL", [timestamp2, store.id, userId]);
  await query("INSERT INTO ld_store_deletion_requests (id, store_id, user_id, action_type, payload_json, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [request.id, request.storeId, request.userId, request.actionType, JSON.stringify(request.payload), request.tokenHash, request.expiresAt, request.createdAt]);
  try {
    await sendStoreDeletionEmail({ user, store, rawToken, origin, actionType: request.actionType, resources: selectedResources });
  } catch (error) {
    await query("UPDATE ld_store_deletion_requests SET used_at = ? WHERE id = ? AND used_at IS NULL", [Date.now(), request.id]);
    throw error;
  }
  return { ok: true, expiresAt: request.expiresAt };
}
async function confirmStoreDeletion(rawToken) {
  const token2 = String(rawToken || "").trim();
  if (!token2) throw new StoreDeletionError(422, "Link de confirma\xE7\xE3o inv\xE1lido.");
  const request = await one("SELECT * FROM ld_store_deletion_requests WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?", [hashToken(token2), Date.now()]);
  if (!request) throw new StoreDeletionError(400, "Este link expirou, j\xE1 foi utilizado ou n\xE3o \xE9 mais v\xE1lido.");
  const payload = parsePayload(request.payload_json);
  const resources = normalizeResources(payload.resources);
  const store = await one("SELECT id, name, slug, custom_domain FROM ld_stores WHERE id = ? AND user_id = ?", [request.store_id, request.user_id]);
  if (!store) throw new StoreDeletionError(404, "A loja desta solicita\xE7\xE3o n\xE3o est\xE1 mais dispon\xEDvel.");
  const storage = getProductStorage();
  const keys = request.action_type === "store" ? await storage.listPrefix(storeMediaPrefix({ accountId: request.user_id, storeId: store.id })) : await listMediaKeys({ storeId: store.id, resources });
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
async function listMediaKeys({ storeId: storeId2, resources }) {
  const keys = [];
  if (resources.includes("products")) {
    const [attached, staged] = await Promise.all([
      query("SELECT media.storage_key FROM ld_product_media AS media JOIN ld_products AS products ON products.id = media.product_id WHERE products.store_id = ?", [storeId2]),
      query("SELECT storage_key FROM ld_product_uploads WHERE store_id = ?", [storeId2])
    ]);
    keys.push(...attached.map((item) => item.storage_key), ...staged.map((item) => item.storage_key));
  }
  if (resources.includes("banners")) {
    const [attached, staged] = await Promise.all([
      query("SELECT images.storage_key FROM ld_banner_images AS images JOIN ld_banners AS banners ON banners.id = images.banner_id WHERE banners.store_id = ?", [storeId2]),
      query("SELECT storage_key FROM ld_banner_uploads WHERE store_id = ?", [storeId2])
    ]);
    keys.push(...attached.map((item) => item.storage_key), ...staged.map((item) => item.storage_key));
  }
  return keys;
}
async function deleteSelectedResources(tx, { storeId: storeId2, resources }) {
  if (resources.includes("products")) {
    await tx.query("DELETE FROM ld_product_uploads WHERE store_id = ?", [storeId2]);
    await tx.query("DELETE FROM ld_products WHERE store_id = ?", [storeId2]);
  }
  if (resources.includes("coupons")) await tx.query("DELETE FROM ld_coupons WHERE store_id = ?", [storeId2]);
  if (resources.includes("banners")) {
    await tx.query("DELETE FROM ld_banner_uploads WHERE store_id = ?", [storeId2]);
    await tx.query("DELETE FROM ld_banners WHERE store_id = ?", [storeId2]);
  }
  if (resources.includes("customers")) await tx.query("DELETE FROM ld_customers WHERE store_id = ?", [storeId2]);
  if (resources.includes("orders")) await tx.query("DELETE FROM ld_billing_orders WHERE store_id = ?", [storeId2]);
}
function normalizeResources(source) {
  return [...new Set(Array.isArray(source) ? source.map((value) => String(value || "").trim()) : [])].filter((value) => RESOURCE_KEYS.has(value));
}
function parsePayload(value) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return {};
  }
}
async function sendStoreDeletionEmail({ user, store, rawToken, origin, actionType, resources }) {
  if (!process.env.RESEND_API_KEY) throw new StoreDeletionError(503, "O envio de e-mail ainda n\xE3o foi configurado.");
  const base = String(origin || process.env.APP_URL || "").replace(/\/$/, "");
  if (!/^https?:\/\//.test(base)) throw new StoreDeletionError(500, "N\xE3o foi poss\xEDvel preparar o link de confirma\xE7\xE3o.");
  const confirmationUrl = `${base}/v1/public/store-deletion/confirm?token=${encodeURIComponent(rawToken)}`;
  const scope = actionType === "store" ? "apagar a loja e todos os seus dados" : `excluir: ${resources.map(resourceLabel).join(", ")}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Loja Descomplicada <onboarding@resend.dev>",
      to: [user.email],
      subject: `Confirme a exclus\xE3o solicitada \u2014 ${store.name}`,
      html: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5;max-width:620px;margin:0 auto;padding:24px"><h1 style="color:#ff32b2">Confirma\xE7\xE3o necess\xE1ria</h1><p>Ol\xE1, ${escapeHtml2(user.name)}.</p><p>Voc\xEA solicitou ${escapeHtml2(scope)} na loja <strong>${escapeHtml2(store.name)}</strong>.</p><p>Ao confirmar, as m\xEDdias relacionadas ser\xE3o removidas do armazenamento e os dados selecionados ser\xE3o exclu\xEDdos. Este link vale por 30 minutos e s\xF3 pode ser utilizado uma vez.</p><p><a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(45deg,#ff32b2,#fd7a00);color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar exclus\xE3o</a></p><p>Se n\xE3o foi voc\xEA, ignore esta mensagem.</p></main>`
    })
  });
  if (!response.ok) throw new StoreDeletionError(502, "N\xE3o foi poss\xEDvel enviar o e-mail de confirma\xE7\xE3o.");
}
function resourceLabel(resource) {
  return { products: "produtos", coupons: "cupons", banners: "banners", customers: "clientes", orders: "pedidos" }[resource] || resource;
}
function escapeHtml2(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

// server/modules/stores/controller.js
var router3 = Router3();
var publicDeletionRouter = Router3();
var logoUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 4 * 1024 * 1024 } });
var logoFormats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
router3.post("/stores", async (req, res, next) => {
  try {
    const name = validText(req.body?.name, 2, 120);
    const description = validText(req.body?.description || "", 0, 240);
    const { color, addressMode, storeCategory } = parseStoreIdentity(req.body);
    const slug = normalizeSlug(req.body?.slug === void 0 ? name : req.body.slug);
    if (!name) return res.status(422).json({ error: "D\xEA um nome para a sua loja." });
    if (!slug) return res.status(422).json({ error: "Escolha um slug v\xE1lido para a loja." });
    if (await one("SELECT id FROM ld_stores WHERE slug = ?", [slug])) {
      return res.status(409).json({ error: "Este slug j\xE1 est\xE1 em uso." });
    }
    const store = { id: randomUUID5(), userId: req.user.id, name, slug, addressMode, description, storeCategory, color, status: 2 };
    const timestamp2 = Date.now();
    await query(
      "INSERT INTO ld_stores (id, user_id, name, slug, address_mode, description, store_category, color, status, status_changed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [store.id, store.userId, store.name, store.slug, store.addressMode, store.description, store.storeCategory || null, store.color, store.status, timestamp2, timestamp2, timestamp2]
    );
    await ensureStoreProfile(store.id);
    await syncStoreContractToR2({ storeId: store.id, userId: req.user.id });
    return res.status(201).json({ store: publicStore(await storeWithProfileForUser(store.id, req.user.id)) });
  } catch (error) {
    if (error instanceof StoreValidationError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});
router3.get("/stores", async (req, res, next) => {
  try {
    const [stores, fontOptions] = await Promise.all([getStoresForUser(req.user.id), listStoreFontOptions()]);
    return res.json({ stores: stores.map(publicStore), fontOptions: fontOptions.map((font) => ({ id: font.id, label: font.label, description: font.description, family: font.css_family })) });
  } catch (error) {
    return next(error);
  }
});
router3.post("/stores/:storeId/deletion-requests", async (req, res, next) => {
  try {
    const result = await requestStoreDeletion({
      storeId: req.params.storeId,
      userId: req.user.id,
      password: req.body?.password,
      resources: req.body?.resources,
      deleteStore: req.body?.deleteStore,
      origin: `${req.protocol}://${req.get("host")}`
    });
    return res.status(202).json(result);
  } catch (error) {
    if (error instanceof StoreDeletionError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});
router3.post("/stores/:storeId/logo", logoUpload.single("file"), async (req, res, next) => {
  try {
    const store = await one("SELECT id, logo_storage_key FROM ld_stores WHERE id = ? AND user_id = ?", [req.params.storeId, req.user.id]);
    if (!store) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    const extension = logoFormats[req.file?.mimetype];
    if (!extension || !validImageSignature(req.file?.buffer, req.file?.mimetype)) return res.status(422).json({ error: "Envie uma logo JPG, PNG ou WebP v\xE1lida." });
    const stored = await getProductStorage().put({ key: storeMediaKey({ accountId: req.user.id, storeId: store.id, kind: "logo", assetId: randomUUID5(), extension }), body: req.file.buffer, contentType: req.file.mimetype });
    try {
      await query("UPDATE ld_stores SET logo_storage_key = ?, logo_url = ?, updated_at = ? WHERE id = ?", [stored.key, stored.url, Date.now(), store.id]);
    } catch (error) {
      await getProductStorage().remove(stored.key).catch(() => void 0);
      throw error;
    }
    if (store.logo_storage_key) await getProductStorage().remove(store.logo_storage_key);
    await syncStoreContractToR2({ storeId: store.id, userId: req.user.id });
    return res.status(201).json({ store: publicStore(await storeWithProfileForUser(store.id, req.user.id)) });
  } catch (error) {
    return next(error);
  }
});
router3.delete("/stores/:storeId/logo", async (req, res, next) => {
  try {
    const store = await one("SELECT id, logo_storage_key FROM ld_stores WHERE id = ? AND user_id = ?", [req.params.storeId, req.user.id]);
    if (!store) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    await query("UPDATE ld_stores SET logo_storage_key = NULL, logo_url = NULL, updated_at = ? WHERE id = ?", [Date.now(), store.id]);
    if (store.logo_storage_key) await getProductStorage().remove(store.logo_storage_key);
    await syncStoreContractToR2({ storeId: store.id, userId: req.user.id });
    return res.json({ store: publicStore(await storeWithProfileForUser(store.id, req.user.id)) });
  } catch (error) {
    return next(error);
  }
});
router3.patch("/stores/:storeId", async (req, res, next) => {
  try {
    const existing = await storeWithProfileForUser(req.params.storeId, req.user.id);
    if (!existing) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    const name = validText(req.body?.name === void 0 ? existing.name : req.body.name, 2, 120);
    const description = validText(req.body?.description === void 0 ? existing.description : req.body.description, 0, 240);
    const slug = normalizeSlug(req.body?.slug === void 0 ? existing.slug : req.body.slug);
    const { color, addressMode, storeCategory } = parseStoreIdentity(req.body, existing);
    if (!name || !slug) return res.status(422).json({ error: "Informe nome e slug v\xE1lidos." });
    if (await one("SELECT id FROM ld_stores WHERE slug = ? AND id <> ?", [slug, existing.id])) {
      return res.status(409).json({ error: "Este slug j\xE1 est\xE1 em uso." });
    }
    const profile = normalizeStoreProfile(req.body, existing, await listStoreFontOptions());
    if (!profile.valid) return res.status(422).json({ error: profile.error });
    const storefront = normalizeStorefrontAdmin(req.body, existing);
    if (!storefront.valid) return res.status(422).json({ error: storefront.error });
    const previousKey = storeContractKey(existing);
    const updated = await transaction(async (tx) => {
      const timestamp2 = Date.now();
      await tx.query(
        "UPDATE ld_stores SET name = ?, description = ?, store_category = ?, slug = ?, address_mode = ?, color = ?, maintenance = ?, maintenance_message = ?, currency = ?, locale = ?, timezone = ?, template = ?, theme_secondary_color = ?, theme_accent_color = ?, theme_background_color = ?, theme_text_color = ?, updated_at = ? WHERE id = ?",
        [name, description, storeCategory || null, slug, addressMode, color, storefront.value.maintenance ? 1 : 0, storefront.value.maintenanceMessage, storefront.value.currency, storefront.value.locale, storefront.value.timezone, storefront.value.template, storefront.value.theme.secondaryColor, storefront.value.theme.accentColor, storefront.value.theme.backgroundColor, storefront.value.theme.textColor, timestamp2, existing.id]
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
          timestamp2,
          timestamp2
        ]
      );
      return tx.one(
        "SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.support_hours, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_observation, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json, profiles.about_title, profiles.about_body FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id=stores.id WHERE stores.id=? AND stores.user_id=?",
        [existing.id, req.user.id]
      );
    });
    await syncStoreContractToR2({ storeId: existing.id, userId: req.user.id, previousKeys: [previousKey] });
    return res.json({ store: publicStore(updated) });
  } catch (error) {
    if (error instanceof StoreValidationError) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});
router3.delete("/stores/:storeId", (_req, res) => res.status(405).json({ error: "Solicite a exclus\xE3o e confirme pelo link enviado ao seu e-mail." }));
router3.get("/stores/slug/:slug", async (req, res, next) => {
  try {
    const store = await one(
      "SELECT id, name, slug, description, color, logo_url, status, address_mode FROM ld_stores WHERE slug = ? AND user_id = ?",
      [normalizeSlug(req.params.slug), req.user.id]
    );
    if (!store) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    return res.json({ store: publicStore(store) });
  } catch (error) {
    return next(error);
  }
});
publicDeletionRouter.get("/public/store-deletion/confirm", async (req, res) => {
  try {
    const result = await confirmStoreDeletion(req.query?.token);
    return res.status(200).type("html").send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exclus\xE3o confirmada</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;font-family:Arial,sans-serif;color:#18181b"><main style="max-width:560px;padding:32px"><h1 style="color:#ff32b2">Exclus\xE3o confirmada</h1><p>A a\xE7\xE3o solicitada para <strong>${escapeHtml3(result.storeName)}</strong> foi conclu\xEDda.</p><p>Voc\xEA j\xE1 pode fechar esta p\xE1gina.</p></main></body></html>`);
  } catch (error) {
    const status = error instanceof StoreDeletionError ? error.status : 500;
    const message = error instanceof StoreDeletionError ? error.message : "N\xE3o foi poss\xEDvel confirmar esta exclus\xE3o agora.";
    return res.status(status).type("html").send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirma\xE7\xE3o indispon\xEDvel</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;font-family:Arial,sans-serif;color:#18181b"><main style="max-width:560px;padding:32px"><h1 style="color:#e11d48">N\xE3o foi poss\xEDvel concluir</h1><p>${escapeHtml3(message)}</p></main></body></html>`);
  }
});
router3.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 422).json({ error: error.code === "LIMIT_FILE_SIZE" ? "A logo excede o tamanho m\xE1ximo de 4 MB." : "N\xE3o foi poss\xEDvel processar a logo." });
  return next(error);
});
function validImageSignature(buffer, mime) {
  if (!buffer) return false;
  if (mime === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return mime === "image/webp" && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
}
function escapeHtml3(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
var controller_default3 = router3;

// server/modules/billing/controller.js
import { Router as Router4 } from "express";
import { randomUUID as randomUUID6 } from "node:crypto";

// server/modules/shared/http.js
var RequestError = class extends Error {
  constructor(status, message, code = "VALIDATION_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
};
var MAX_QUERY_KEYS = 16;
var MAX_QUERY_VALUE_LENGTH = 256;
var MAX_PARAM_LENGTH = 128;
var MAX_BODY_KEYS = 48;
var MAX_BODY_DEPTH = 6;
var MAX_BODY_ARRAY_ITEMS = 100;
var RATE_WINDOW_MS = 6e4;
var GENERAL_RATE_LIMIT = 180;
var AUTH_RATE_LIMIT = 20;
var rateBuckets = /* @__PURE__ */ new Map();
function enforceRequestLimits(req, _res, next) {
  try {
    if (Object.keys(req.query || {}).length > MAX_QUERY_KEYS) throw new RequestError(422, "Foram informados par\xE2metros de consulta demais.");
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key.length > 64 || serializedLength(value) > MAX_QUERY_VALUE_LENGTH) throw new RequestError(422, "Um par\xE2metro de consulta \xE9 inv\xE1lido ou excede o limite permitido.");
    }
    for (const [key, value] of Object.entries(req.params || {})) {
      if (String(value || "").length > MAX_PARAM_LENGTH) throw new RequestError(422, "Um identificador de rota excede o limite permitido.");
      if (key.toLowerCase().endsWith("id")) assertOpaqueId(value, key);
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.is("application/json")) validateBodyShape(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}
function enforceRateLimit(req, res, next) {
  const timestamp2 = Date.now();
  const kind = req.path.startsWith("/auth/") ? "auth" : "api";
  const maximum = kind === "auth" ? AUTH_RATE_LIMIT : GENERAL_RATE_LIMIT;
  const key = `${req.ip || "unknown"}:${kind}`;
  const current = rateBuckets.get(key);
  const bucket = !current || current.resetAt <= timestamp2 ? { count: 0, resetAt: timestamp2 + RATE_WINDOW_MS } : current;
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 1e4) {
    for (const [bucketKey, value] of rateBuckets) if (value.resetAt <= timestamp2) rateBuckets.delete(bucketKey);
  }
  res.setHeader("RateLimit-Limit", maximum);
  res.setHeader("RateLimit-Remaining", Math.max(0, maximum - bucket.count));
  res.setHeader("RateLimit-Reset", Math.ceil(bucket.resetAt / 1e3));
  if (bucket.count > maximum) return next(new RequestError(429, "Foram feitas requisi\xE7\xF5es demais. Aguarde um minuto antes de tentar novamente.", "RATE_LIMITED"));
  return next();
}
function boundedInteger(value, { min = 0, max = 100, fallback = min, label = "valor" } = {}) {
  if (value === void 0 || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new RequestError(422, `Informe ${label} entre ${min} e ${max}.`);
  return parsed;
}
function boundedPagination(query3, { defaultLimit = 20, maxLimit = 100, maxPage = 1e5 } = {}) {
  const page = boundedInteger(query3?.page, { min: 1, max: maxPage, fallback: 1, label: "uma p\xE1gina v\xE1lida" });
  const limit = boundedInteger(query3?.limit, { min: 1, max: maxLimit, fallback: defaultLimit, label: "um limite v\xE1lido" });
  return { page, limit, offset: (page - 1) * limit };
}
function assertOpaqueId(value, label = "identificador") {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{1,96}$/.test(id)) throw new RequestError(422, `Informe ${label} v\xE1lido.`);
  return id;
}
function validateBodyShape(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError(422, "O corpo da requisi\xE7\xE3o deve ser um objeto JSON v\xE1lido.");
  if (Object.keys(body).length > MAX_BODY_KEYS) throw new RequestError(422, "O corpo da requisi\xE7\xE3o cont\xE9m campos demais.");
  inspect(body, 0);
}
function inspect(value, depth) {
  if (depth > MAX_BODY_DEPTH) throw new RequestError(422, "A estrutura da requisi\xE7\xE3o excede a profundidade permitida.");
  if (Array.isArray(value)) {
    if (value.length > MAX_BODY_ARRAY_ITEMS) throw new RequestError(422, "Uma lista da requisi\xE7\xE3o excede o limite permitido.");
    for (const item of value) inspect(item, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    if (Object.keys(value).length > MAX_BODY_KEYS) throw new RequestError(422, "Um objeto da requisi\xE7\xE3o cont\xE9m campos demais.");
    for (const item of Object.values(value)) inspect(item, depth + 1);
  }
  if (typeof value === "string" && value.length > 1e4) throw new RequestError(422, "Um campo de texto excede o limite permitido.");
}
function serializedLength(value) {
  return Array.isArray(value) ? value.join(",").length : String(value || "").length;
}

// server/modules/billing/validation.js
var BillingValidationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function requiredStoreId(value, message = "Selecione uma loja para continuar.") {
  const storeId2 = String(value || "").trim();
  if (!storeId2) throw new BillingValidationError(422, message);
  return assertOpaqueId(storeId2, "storeId");
}
function requiredPlanId(value) {
  const planId = String(value || "").trim();
  if (!planId) throw new BillingValidationError(422, "Selecione um plano v\xE1lido.");
  return assertOpaqueId(planId, "planId");
}
function requiredSubscriptionId(value) {
  const subscriptionId = String(value || "").trim();
  if (!subscriptionId) throw new BillingValidationError(422, "Informe uma assinatura v\xE1lida.");
  return assertOpaqueId(subscriptionId, "subscriptionId");
}
function parseCheckoutStartInput(source = {}) {
  return { storeId: requiredStoreId(source.storeId, "Selecione uma loja para iniciar o checkout."), planId: requiredPlanId(source.planId) };
}
function parseTrialStartInput(source = {}) {
  return { storeId: requiredStoreId(source.storeId, "Selecione uma loja para iniciar o teste gr\xE1tis."), planId: requiredPlanId(source.planId) };
}
function parseStoreQuery(source = {}, message) {
  return { storeId: requiredStoreId(source.storeId, message) };
}
function parsePlanChangeInput(source = {}) {
  return { storeId: requiredStoreId(source.storeId, "Selecione uma loja para alterar o plano."), planId: requiredPlanId(source.planId) };
}
function parsePixPaymentInput(source = {}) {
  return { storeId: requiredStoreId(source.storeId, "Selecione uma loja para gerar o Pix.") };
}
function parseCardPaymentInput(source = {}) {
  const storeId2 = requiredStoreId(source.storeId, "Selecione uma loja para pagar a ordem.");
  const token2 = String(source.token || "").trim();
  const paymentMethodId = String(source.paymentMethodId || "").trim();
  const installments = source.installments === void 0 ? 1 : Number(source.installments);
  if (!token2 || !paymentMethodId) throw new BillingValidationError(422, "Informe os dados tokenizados do cart\xE3o.");
  if (!Number.isInteger(installments) || installments < 1 || installments > 12) throw new BillingValidationError(422, "Informe uma quantidade de parcelas entre 1 e 12.");
  return { storeId: storeId2, token: token2, paymentMethodId, installments, issuerId: source.issuerId || void 0 };
}

// server/modules/billing/controller.js
var router4 = Router4();
var now2 = () => Date.now();
router4.get("/plans", async (_req, res, next) => {
  try {
    const plans = await query(`SELECT plans.id, plans.name, plans.description, plans.features_json, plans.amount_cents, plans.is_featured, ${planLimitsSqlColumns()} FROM ld_plans plans LEFT JOIN ld_plan_limits limits ON limits.plan_id = plans.id WHERE plans.active = 1 ORDER BY plans.amount_cents ASC`);
    return res.json({ plans: plans.map(publicPlan) });
  } catch (error) {
    next(error);
  }
});
router4.post("/billing/start-checkout", async (req, res, next) => {
  try {
    const { storeId: storeId2, planId } = parseCheckoutStartInput(req.body);
    const plan = await getActivePlan(planId);
    if (!plan) return res.status(422).json({ error: "O plano selecionado n\xE3o \xE9 v\xE1lido." });
    const store = await ownedStoreForUser(storeId2, req.user.id);
    if (!store) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    const existing = await one("SELECT orders.* FROM ld_billing_orders AS orders JOIN ld_subscriptions AS subscriptions ON subscriptions.id=orders.subscription_id WHERE orders.store_id=? AND subscriptions.plan_id=? AND orders.status IN ('pending','rejected','in_process') ORDER BY orders.created_at DESC LIMIT 1", [storeId2, planId]);
    if (existing) return res.json({ order: publicOrder(existing), reused: true });
    if (await one("SELECT id FROM ld_subscriptions WHERE store_id=? AND status IN ('trial','authorized','active') ORDER BY created_at DESC LIMIT 1", [storeId2])) return res.status(409).json({ error: "Esta loja j\xE1 possui uma assinatura ativa. Para alterar o plano, use o gerenciamento de assinaturas." });
    const timestamp2 = now2();
    const subscriptionId = randomUUID6();
    const orderId = randomUUID6();
    await query("INSERT INTO ld_subscriptions (id, store_id, plan_id, status, amount_cents, renewal_due_at, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)", [subscriptionId, store.id, planId, plan.amountCents, timestamp2, timestamp2, timestamp2]);
    await query("INSERT INTO ld_billing_orders (id, store_id, subscription_id, user_id, kind, status, amount_cents, due_at, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'subscription', 'pending', ?, ?, ?, ?, ?)", [orderId, store.id, subscriptionId, req.user.id, plan.amountCents, timestamp2, JSON.stringify({ planId, source: "transparent_checkout" }), timestamp2, timestamp2]);
    return res.status(201).json({ order: publicOrder({ id: orderId, store_id: store.id, subscription_id: subscriptionId, kind: "subscription", status: "pending", amount_cents: plan.amountCents, currency: "BRL", due_at: timestamp2, created_at: timestamp2 }) });
  } catch (error) {
    if (error instanceof BillingValidationError) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});
router4.post("/billing/start-trial", async (req, res, next) => {
  try {
    const { storeId: storeId2, planId } = parseTrialStartInput(req.body);
    const plan = await getActivePlan(planId);
    if (!plan) return res.status(422).json({ error: "O plano selecionado n\xE3o \xE9 v\xE1lido." });
    const store = await ownedStoreForUser(storeId2, req.user.id);
    if (!store) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    const timestamp2 = now2();
    const active = await one("SELECT * FROM ld_subscriptions WHERE store_id=? AND status='trial' AND trial_ends_at>? ORDER BY created_at DESC LIMIT 1", [store.id, timestamp2]);
    if (active) return res.json({ subscription: publicSubscription(active), reused: true });
    if (await one("SELECT id FROM ld_subscriptions WHERE store_id=? AND status IN ('authorized','active') LIMIT 1", [store.id])) return res.status(409).json({ error: "Esta loja j\xE1 possui uma assinatura ativa. Para alterar o plano, use o gerenciamento desta loja." });
    if (await one("SELECT id FROM ld_subscriptions WHERE store_id=? AND trial_ends_at IS NOT NULL LIMIT 1", [store.id])) return res.status(409).json({ error: "Esta loja j\xE1 utilizou o per\xEDodo de teste gratuito." });
    const pending = await one("SELECT * FROM ld_subscriptions WHERE store_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1", [store.id]);
    const trialGrant = await one("SELECT id, trial_days FROM ld_merchant_invites WHERE user_id = ? AND trial_consumed_at IS NULL ORDER BY created_at DESC LIMIT 1", [req.user.id]);
    const end = trialEndsAtFrom(timestamp2, Number(trialGrant?.trial_days || 7));
    const id = pending?.id || randomUUID6();
    if (pending) {
      await query("UPDATE ld_subscriptions SET plan_id=?, amount_cents=?, status='trial', trial_ends_at=?, current_period_ends_at=NULL, renewal_due_at=?, updated_at=? WHERE id=?", [plan.id, plan.amountCents, end, end, timestamp2, id]);
      await query("UPDATE ld_billing_orders SET status='cancelled', updated_at=? WHERE subscription_id=? AND status IN ('pending','rejected','in_process')", [timestamp2, id]);
    } else await query("INSERT INTO ld_subscriptions (id, store_id, plan_id, status, amount_cents, trial_ends_at, renewal_due_at, created_at, updated_at) VALUES (?, ?, ?, 'trial', ?, ?, ?, ?, ?)", [id, store.id, plan.id, plan.amountCents, end, end, timestamp2, timestamp2]);
    if (trialGrant) await query("UPDATE ld_merchant_invites SET trial_consumed_at = ?, updated_at = ? WHERE id = ? AND trial_consumed_at IS NULL", [timestamp2, timestamp2, trialGrant.id]);
    await query("UPDATE ld_stores SET status=3,status_changed_at=?,updated_at=? WHERE id=?", [timestamp2, timestamp2, store.id]);
    await query("UPDATE ld_users SET onboarding_completed_at=COALESCE(onboarding_completed_at, ?),updated_at=? WHERE id=?", [timestamp2, timestamp2, req.user.id]);
    return res.status(201).json({ subscription: publicSubscription({ id, store_id: store.id, plan_id: plan.id, status: "trial", amount_cents: plan.amountCents, trial_ends_at: end, renewal_due_at: end }) });
  } catch (error) {
    if (error instanceof BillingValidationError) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});
router4.get("/billing/status", async (req, res, next) => {
  try {
    const { storeId: storeId2 } = parseStoreQuery(req.query, "Selecione uma loja para consultar o status de cobran\xE7a.");
    const store = await one("SELECT id,name,description,color FROM ld_stores WHERE id=? AND user_id=?", [storeId2, req.user.id]);
    if (!store) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    const subscription = await one("SELECT id,plan_id,provider_subscription_id,status,trial_ends_at,current_period_ends_at FROM ld_subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1", [store.id]);
    const synced = subscription?.provider_subscription_id ? await syncMercadoPagoSubscription(subscription).catch(() => subscription) : subscription;
    return res.json({ store: publicStore(store), subscription: synced ? publicSubscription(synced) : null });
  } catch (error) {
    next(error);
  }
});
router4.get("/subscriptions", async (req, res, next) => {
  try {
    const { storeId: storeId2 } = parseStoreQuery(req.query, "Selecione uma loja para consultar assinaturas.");
    if (!await ownedStoreForUser(storeId2, req.user.id)) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    const subscriptions = await query("SELECT subscriptions.*,stores.name AS store_name,stores.slug AS store_slug,stores.status AS store_status FROM ld_subscriptions AS subscriptions JOIN ld_stores AS stores ON stores.id=subscriptions.store_id WHERE stores.user_id=? AND stores.id=? ORDER BY subscriptions.created_at DESC LIMIT 250", [req.user.id, storeId2]);
    return res.json({ subscriptions: subscriptions.map((item) => ({ ...publicSubscription(item), storeName: item.store_name, storeSlug: item.store_slug, storeStatus: Number(item.store_status) })) });
  } catch (error) {
    next(error);
  }
});
router4.get("/billing/orders", async (req, res, next) => {
  try {
    const { storeId: storeId2 } = parseStoreQuery(req.query, "Selecione uma loja para consultar ordens de cobran\xE7a.");
    if (!await ownedStoreForUser(storeId2, req.user.id)) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    const orders = await query("SELECT orders.*,stores.name AS store_name,stores.slug AS store_slug,subscriptions.plan_id FROM ld_billing_orders AS orders JOIN ld_stores AS stores ON stores.id=orders.store_id LEFT JOIN ld_subscriptions AS subscriptions ON subscriptions.id=orders.subscription_id WHERE orders.user_id=? AND orders.store_id=? ORDER BY orders.created_at DESC LIMIT 250", [req.user.id, storeId2]);
    return res.json({ orders: orders.map((item) => ({ ...publicOrder(item), storeName: item.store_name, storeSlug: item.store_slug, planId: item.plan_id })) });
  } catch (error) {
    next(error);
  }
});
router4.post("/subscriptions/:subscriptionId/change-plan", async (req, res, next) => {
  try {
    const { storeId: storeId2, planId } = parsePlanChangeInput(req.body);
    const subscriptionId = requiredSubscriptionId(req.params.subscriptionId);
    const plan = await getActivePlan(planId);
    if (!plan) return res.status(422).json({ error: "O plano selecionado n\xE3o \xE9 v\xE1lido." });
    const subscription = await one("SELECT subscriptions.*,stores.user_id FROM ld_subscriptions AS subscriptions JOIN ld_stores AS stores ON stores.id=subscriptions.store_id WHERE subscriptions.id=? AND subscriptions.store_id=? AND stores.user_id=?", [subscriptionId, storeId2, req.user.id]);
    if (!subscription) return res.status(404).json({ error: "Assinatura n\xE3o encontrada." });
    if (subscription.provider_subscription_id) {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`, { method: "PUT", headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ reason: `Loja Descomplicada \u2014 Plano ${plan.name}`, auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.amountCents / 100, currency_id: "BRL" } }) });
      if (!response.ok) return res.status(502).json({ error: "N\xE3o foi poss\xEDvel atualizar o plano no Mercado Pago." });
    }
    const timestamp2 = now2();
    const dueAt = subscription.current_period_ends_at || subscription.renewal_due_at || timestamp2;
    if (subscription.provider_subscription_id) {
      await query("UPDATE ld_subscriptions SET plan_id=?,amount_cents=?,renewal_due_at=?,updated_at=? WHERE id=?", [planId, plan.amountCents, dueAt, timestamp2, subscription.id]);
      return res.json({ subscription: publicSubscription({ ...subscription, plan_id: planId, amount_cents: plan.amountCents, renewal_due_at: dueAt }) });
    }
    if (!await one("SELECT id FROM ld_billing_orders WHERE subscription_id=? AND kind='plan_change' AND status IN ('pending','rejected','in_process') ORDER BY created_at DESC LIMIT 1", [subscription.id])) await query("INSERT INTO ld_billing_orders (id,store_id,subscription_id,user_id,kind,status,amount_cents,due_at,metadata_json,created_at,updated_at) VALUES (?, ?, ?, ?, 'plan_change','pending', ?, ?, ?, ?, ?)", [randomUUID6(), subscription.store_id, subscription.id, req.user.id, plan.amountCents, dueAt, JSON.stringify({ planId, source: "transparent_plan_change" }), timestamp2, timestamp2]);
    return res.json({ subscription: publicSubscription(subscription) });
  } catch (error) {
    next(error);
  }
});
router4.post("/billing/orders/:orderId/pix", async (req, res, next) => {
  try {
    const { storeId: storeId2 } = parsePixPaymentInput(req.body);
    const order = await ownedPendingOrder(req.params.orderId, req.user.id, storeId2);
    if (!order) return res.status(404).json({ error: "Ordem pendente n\xE3o encontrada." });
    if (isCollectorPayer(req.user.email, await getMercadoPagoCollectorEmail())) return res.status(422).json({ error: "A conta Mercado Pago recebedora n\xE3o pode ser a mesma conta usada como pagadora. Use outro e-mail cadastrado na conta para continuar.", code: "PAYER_EQUALS_COLLECTOR" });
    const payment = await createMercadoPagoPayment({ order, email: req.user.email, name: req.user.name, method: "pix" });
    await persistPaymentForOrder(order, payment);
    return res.json({ order: publicOrder({ ...order, provider_payment_id: payment.id, status: payment.status, pix_qr_code: payment.qrCode, pix_qr_code_base64: payment.qrCodeBase64 }) });
  } catch (error) {
    if (error instanceof MercadoPagoOrderError) return res.status(error.status).json({ error: error.publicMessage, code: error.code });
    if (error instanceof BillingValidationError) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});
router4.post("/billing/orders/:orderId/card", async (req, res, next) => {
  try {
    const input = parseCardPaymentInput(req.body);
    const order = await ownedPendingOrder(req.params.orderId, req.user.id, input.storeId);
    if (!order) return res.status(404).json({ error: "Ordem pendente n\xE3o encontrada." });
    if (isCollectorPayer(req.user.email, await getMercadoPagoCollectorEmail())) return res.status(422).json({ error: "A conta Mercado Pago recebedora n\xE3o pode ser a mesma conta usada como pagadora. Use outro e-mail cadastrado na conta para continuar.", code: "PAYER_EQUALS_COLLECTOR" });
    const payment = await createMercadoPagoPayment({ order, email: req.user.email, name: req.user.name, method: "card", ...input });
    await persistPaymentForOrder(order, payment);
    return res.json({ order: publicOrder({ ...order, provider_payment_id: payment.id, status: payment.status, paid_at: payment.status === "approved" ? now2() : null }) });
  } catch (error) {
    if (error instanceof MercadoPagoOrderError) return res.status(error.status).json({ error: error.publicMessage, code: error.code });
    if (error instanceof BillingValidationError) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});
var controller_default4 = router4;

// server/modules/webhooks/controller.js
import { Router as Router5 } from "express";
import { randomUUID as randomUUID7 } from "node:crypto";
var router5 = Router5();
router5.post("/webhooks/mercado-pago", async (req, res, next) => {
  try {
    const resourceId = String(req.body?.data?.id || req.query["data.id"] || "");
    const requestId = req.header("x-request-id") || "";
    if (!resourceId || !verifyMercadoPagoSignature({ signature: req.header("x-signature") || "", requestId, resourceId, secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET })) return res.status(401).json({ error: "Assinatura de webhook inv\xE1lida." });
    const eventId = requestId || `${req.body?.type || "subscription"}:${resourceId}:${req.body?.action || "updated"}`;
    if (await one("SELECT id FROM ld_webhook_events WHERE provider_event_id = ?", [eventId])) return res.json({ ok: true, duplicate: true });
    const timestamp2 = Date.now();
    await query("INSERT INTO ld_webhook_events (id, provider, provider_event_id, event_type, payload_json, created_at) VALUES (?, 'mercado_pago', ?, ?, ?, ?)", [randomUUID7(), eventId, req.body?.type || "unknown", JSON.stringify(req.body || {}), timestamp2]);
    const subscription = await one("SELECT * FROM ld_subscriptions WHERE provider_subscription_id = ?", [resourceId]);
    if (subscription) await syncMercadoPagoSubscription(subscription);
    if (String(req.body?.type || "").startsWith("payment")) await syncMercadoPagoPayment(resourceId);
    if (String(req.body?.type || "").startsWith("order")) await syncMercadoPagoOrder(resourceId);
    await query("UPDATE ld_webhook_events SET processed_at = ? WHERE provider_event_id = ?", [Date.now(), eventId]);
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
var controller_default5 = router5;

// server/modules/dashboard/controller.js
import { Router as Router6 } from "express";

// server/modules/dashboard/repository.js
async function listCatalogMetricsForUser(userId, createdAfter) {
  return query(`SELECT stores.id AS store_id,
    COUNT(products.id) AS total_products,
    SUM(CASE WHEN products.status = 'active' THEN 1 ELSE 0 END) AS active_products,
    SUM(CASE WHEN products.status = 'draft' THEN 1 ELSE 0 END) AS draft_products,
    SUM(CASE WHEN products.status = 'archived' THEN 1 ELSE 0 END) AS archived_products,
    COUNT(DISTINCT products.category_id) AS categories_with_products,
    COALESCE(SUM(CASE WHEN products.status = 'active' THEN products.stock_quantity ELSE 0 END), 0) AS inventory_units,
    SUM(CASE WHEN products.status = 'active' AND products.stock_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock_products,
    SUM(CASE WHEN products.status = 'active' AND products.stock_quantity BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS low_stock_products,
    SUM(CASE WHEN products.created_at >= ? THEN 1 ELSE 0 END) AS new_products_last_30_days
    FROM ld_stores AS stores
    LEFT JOIN ld_products AS products ON products.store_id = stores.id
    WHERE stores.user_id = ?
    GROUP BY stores.id`, [createdAfter, userId]);
}

// server/modules/dashboard/service.js
async function getDashboardForUser(userId) {
  const [alerts, stores, metricRows, invite] = await Promise.all([reconcileStoresForUser(userId), getStoresForUser(userId), listCatalogMetricsForUser(userId, Date.now() - 30 * 24 * 60 * 60 * 1e3), one("SELECT trial_days FROM ld_merchant_invites WHERE user_id = ? AND trial_consumed_at IS NULL ORDER BY created_at DESC LIMIT 1", [userId])]);
  const metricsByStore = new Map(metricRows.map((row) => [row.store_id, catalogMetrics(row)]));
  const storesWithLimits = await Promise.all(stores.map(async (store) => {
    const activePlan = await getActiveStorePlanLimits({ storeId: store.id, one });
    const planUsage = activePlan ? await getStorePlanUsage({ storeId: store.id, one }) : null;
    return { ...publicStore({ ...store, catalog: metricsByStore.get(store.id) || catalogMetrics() }), planLimits: activePlan?.limits || null, planUsage };
  }));
  return { stores: storesWithLimits, alerts, trialDays: Number(invite?.trial_days || 7) };
}
function catalogMetrics(row = {}) {
  return { totalProducts: Number(row.total_products || 0), activeProducts: Number(row.active_products || 0), draftProducts: Number(row.draft_products || 0), archivedProducts: Number(row.archived_products || 0), categoriesWithProducts: Number(row.categories_with_products || 0), inventoryUnits: Number(row.inventory_units || 0), outOfStockProducts: Number(row.out_of_stock_products || 0), lowStockProducts: Number(row.low_stock_products || 0), newProductsLast30Days: Number(row.new_products_last_30_days || 0) };
}

// server/modules/dashboard/controller.js
var router6 = Router6();
router6.get("/dashboard", async (req, res, next) => {
  try {
    return res.json(await getDashboardForUser(req.user.id));
  } catch (error) {
    return next(error);
  }
});
var controller_default6 = router6;

// server/modules/products/controller.js
import { Router as Router7 } from "express";
import multer2 from "multer";

// server/modules/products/validation.js
var PAGE_SIZES = [10, 20, 50, 100];
var productMediaFormats = { "image/jpeg": { kind: "image", extension: "jpg" }, "image/png": { kind: "image", extension: "png" }, "image/webp": { kind: "image", extension: "webp" }, "video/mp4": { kind: "video", extension: "mp4" }, "video/webm": { kind: "video", extension: "webm" } };
var ProductValidationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function parseCategoryInput(source = {}) {
  const name = validText2(source.name, 2, 120);
  const description = validText2(source.description || "", 0, 500);
  const active = source.active === void 0 ? true : parseBoolean(source.active);
  const suppliedParent = source.parentCategoryId === void 0 ? source.parent_category_id : source.parentCategoryId;
  const parentCategoryId = suppliedParent === void 0 || suppliedParent === null || suppliedParent === "" ? null : validUuid(suppliedParent);
  const cropAspect = ["1:1", "9:16", "16:9"].includes(String(source.cropAspect || source.crop_aspect || "1:1")) ? String(source.cropAspect || source.crop_aspect || "1:1") : "";
  const cardImageUrl = optionalHttpUrl(source.cardImageUrl ?? source.card_image_url);
  const heroImageUrl = optionalHttpUrl(source.heroImageUrl ?? source.hero_image_url);
  if (!name) throw new ProductValidationError(422, "Informe um nome de categoria com ao menos 2 caracteres.");
  if (active === null) throw new ProductValidationError(422, "Informe se a categoria est\xE1 ativa.");
  if (!cropAspect) throw new ProductValidationError(422, "Selecione um padr\xE3o de recorte v\xE1lido.");
  if (cardImageUrl === false || heroImageUrl === false) throw new ProductValidationError(422, "Informe URLs HTTPS v\xE1lidas para as imagens da categoria.");
  if (suppliedParent !== void 0 && suppliedParent !== null && suppliedParent !== "" && !parentCategoryId) throw new ProductValidationError(422, "Selecione uma categoria principal v\xE1lida.");
  return { name, description, active, parentCategoryId, cropAspect, cardImageUrl, heroImageUrl };
}
function parseProductInput(source, { allowEmptyUploads = false } = {}) {
  const name = validText2(source?.name, 2, 160);
  const sku = optionalSku(source?.sku);
  const description = validText2(source?.description || "", 0, 1e4);
  const shortDescription = validText2(source?.shortDescription ?? source?.short_description ?? "", 0, 500);
  const categoryId = validUuid(source?.categoryId === void 0 ? source?.category_id : source.categoryId);
  const priceCents = Number(source?.priceCents === void 0 ? source?.price_cents : source.priceCents);
  const compareAtPriceCents = optionalCents(source?.compareAtPriceCents ?? source?.compare_at_price_cents);
  const costPriceCents = optionalCents(source?.costPriceCents ?? source?.cost_price_cents);
  const brand = validText2(source?.brand || "", 0, 120);
  const tags = parseTags(source?.tags ?? source?.tags_json);
  const stockQuantity = nonNegativeInteger(source?.stockQuantity ?? source?.stock_quantity ?? 0);
  const weightGrams = optionalMeasurement(source?.weightGrams ?? source?.weight_grams);
  const widthMm = optionalMeasurement(source?.widthMm ?? source?.width_mm);
  const heightMm = optionalMeasurement(source?.heightMm ?? source?.height_mm);
  const depthMm = optionalMeasurement(source?.depthMm ?? source?.depth_mm);
  const variants = parseVariants(source?.variants);
  const suppliedStatus = source?.status;
  const status = suppliedStatus === void 0 ? "active" : ["active", "draft", "archived"].includes(suppliedStatus) ? suppliedStatus : "";
  const draftId = validUuid(source?.draftId);
  const rawUploadIds = source?.uploadIds;
  const uploadIds = Array.isArray(rawUploadIds) ? [...new Set(rawUploadIds.map(validUuid).filter(Boolean))] : rawUploadIds === void 0 ? [] : null;
  if (!name) return invalid("Informe um nome de produto v\xE1lido.");
  if (source?.sku && sku === null) return invalid("Informe um SKU v\xE1lido.");
  if (!categoryId) return invalid("Selecione uma categoria v\xE1lida.");
  if (!status) return invalid("Selecione um status de produto v\xE1lido.");
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 2147483647) return invalid("Informe um pre\xE7o v\xE1lido.");
  if (compareAtPriceCents === false || costPriceCents === false) return invalid("Informe os pre\xE7os complementares em centavos v\xE1lidos.");
  if (!brand && source?.brand) return invalid("Informe uma marca v\xE1lida.");
  if (!Array.isArray(tags)) return invalid("Informe at\xE9 20 tags v\xE1lidas.");
  if (stockQuantity === null) return invalid("Informe um estoque v\xE1lido.");
  if ([weightGrams, widthMm, heightMm, depthMm].includes(false)) return invalid("Informe peso e dimens\xF5es v\xE1lidos.");
  if (!Array.isArray(variants)) return invalid("Revise as variantes do produto.");
  if (!Array.isArray(uploadIds)) return invalid("Informe uma lista v\xE1lida de m\xEDdias.");
  if (!allowEmptyUploads && (!draftId || !uploadIds.length)) return invalid("Adicione ao menos uma m\xEDdia antes de salvar.");
  if (uploadIds.length > 5) return invalid("Quantidade de m\xEDdias inv\xE1lida.");
  return { valid: true, value: { name, sku, description, shortDescription, categoryId, priceCents, compareAtPriceCents, costPriceCents, brand, tags, stockQuantity, weightGrams, widthMm, heightMm, depthMm, variants, status, draftId, uploadIds } };
}
function getProductListInput(source = {}) {
  if (source.limit !== void 0 && !PAGE_SIZES.includes(Number(source.limit))) throw new ProductValidationError(422, "Use um limite de 10, 20, 50 ou 100 produtos por p\xE1gina.");
  if (source.sort && !["recent", "oldest", "name", "price_low", "price_high"].includes(String(source.sort))) throw new ProductValidationError(422, "Informe uma ordena\xE7\xE3o de produtos v\xE1lida.");
  const pagination = boundedPagination(source, { defaultLimit: 20, maxLimit: 100, maxPage: 1e5 });
  if (!PAGE_SIZES.includes(pagination.limit)) throw new ProductValidationError(422, "Use um limite de 10, 20, 50 ou 100 produtos por p\xE1gina.");
  return { pagination, filters: buildProductFilters(String(source.storeId || ""), source), sort: sortClause(source.sort) };
}
function buildProductFilters(storeId2, source = {}) {
  const params = [storeId2];
  let where = "products.store_id = ?";
  const search = validText2(source.search || "", 0, 120);
  const categoryId = validUuid(source.categoryId);
  const dateFrom = validTimestamp(source.dateFrom);
  const dateTo = validTimestamp(source.dateTo);
  if (source.categoryId !== void 0 && !categoryId) throw new ProductValidationError(422, "Informe uma categoria v\xE1lida para filtrar produtos.");
  if (source.dateFrom !== void 0 && !dateFrom) throw new ProductValidationError(422, "Informe uma data inicial v\xE1lida para filtrar produtos.");
  if (source.dateTo !== void 0 && !dateTo) throw new ProductValidationError(422, "Informe uma data final v\xE1lida para filtrar produtos.");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new ProductValidationError(422, "A data inicial n\xE3o pode ser maior que a data final.");
  if (search) {
    where += " AND (products.name LIKE ? OR products.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoryId) {
    where += " AND products.category_id = ?";
    params.push(categoryId);
  }
  if (dateFrom) {
    where += " AND products.created_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    where += " AND products.created_at <= ?";
    params.push(dateTo);
  }
  return { where, params };
}
function assertValidProductInput(parsed) {
  if (!parsed.valid) throw new ProductValidationError(422, parsed.error);
  return parsed.value;
}
function getProductUploadInput(body, file) {
  const draftId = validUuid(body?.draftId);
  const format = productMediaFormats[file?.mimetype];
  if (!draftId || !file) throw new ProductValidationError(422, "Envie uma m\xEDdia e um identificador tempor\xE1rio v\xE1lido.");
  if (!format || !matchesMediaSignature(file.buffer, file.mimetype)) throw new ProductValidationError(422, "O tipo de arquivo enviado n\xE3o \xE9 permitido.");
  const maximum = format.kind === "image" ? 8 * 1024 * 1024 : 45 * 1024 * 1024;
  if (file.size > maximum) throw new ProductValidationError(413, "O arquivo excede o tamanho m\xE1ximo permitido.");
  return { draftId, format };
}
function matchesMediaSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mime === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (mime === "video/webm") return buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  if (mime === "video/mp4") return buffer.subarray(4, 8).toString() === "ftyp";
  return false;
}
function invalid(error) {
  return { valid: false, error };
}
function sortClause(sort) {
  return { recent: "products.created_at DESC", oldest: "products.created_at ASC", name: "products.name ASC", price_low: "products.price_cents ASC", price_high: "products.price_cents DESC" }[String(sort || "")] || "products.created_at DESC";
}
function parseBoolean(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}
function validText2(value, min, max) {
  const text4 = String(value || "").trim();
  return text4.length >= min && text4.length <= max ? text4 : "";
}
function validUuid(value) {
  const id = String(value || "").trim();
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id) ? id : "";
}
function validTimestamp(value) {
  const timestamp2 = Number(value);
  return Number.isSafeInteger(timestamp2) && timestamp2 > 0 ? timestamp2 : 0;
}
function optionalSku(value) {
  if (value === void 0 || value === null || String(value).trim() === "") return "";
  const sku = String(value).trim();
  return /^[a-z0-9][a-z0-9._/-]{0,119}$/i.test(sku) ? sku : null;
}
function optionalCents(value) {
  if (value === void 0 || value === null || value === "") return null;
  const cents = Number(value);
  return Number.isInteger(cents) && cents >= 0 && cents <= 2147483647 ? cents : false;
}
function nonNegativeInteger(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 0 && quantity <= 2147483647 ? quantity : null;
}
function optionalMeasurement(value) {
  if (value === void 0 || value === null || value === "") return null;
  const measurement = Number(value);
  return Number.isInteger(measurement) && measurement >= 0 && measurement <= 2147483647 ? measurement : false;
}
function optionalHttpUrl(value) {
  if (value === void 0 || value === null || value === "") return null;
  const url = String(value).trim();
  return /^https:\/\/.{1,780}$/i.test(url) ? url : false;
}
function parseTags(value) {
  const raw = value === void 0 || value === null || value === "" ? [] : typeof value === "string" ? safeJson2(value, []) : value;
  if (!Array.isArray(raw) || raw.length > 20) return null;
  const tags = [...new Set(raw.map((tag) => validText2(tag, 1, 60)).filter(Boolean))];
  return tags.length === raw.filter((tag) => String(tag || "").trim()).length ? tags : null;
}
function parseVariants(value) {
  const raw = value === void 0 || value === null || value === "" ? [] : value;
  if (!Array.isArray(raw) || raw.length > 100) return null;
  const seenSkus = /* @__PURE__ */ new Set();
  const variants = [];
  for (const item of raw) {
    const name = validText2(item?.name, 1, 160);
    const sku = optionalSku(item?.sku);
    const priceCents = optionalCents(item?.priceCents ?? item?.price_cents);
    const stockQuantity = nonNegativeInteger(item?.stockQuantity ?? item?.stock_quantity ?? 0);
    if (!name || sku === null || priceCents === false || stockQuantity === null || sku && seenSkus.has(sku.toLowerCase())) return null;
    if (sku) seenSkus.add(sku.toLowerCase());
    variants.push({ name, sku, priceCents, stockQuantity });
  }
  return variants;
}
function safeJson2(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// server/modules/products/service.js
import { randomUUID as randomUUID8 } from "node:crypto";

// server/modules/products/repository.js
var withinTransaction = transaction;
async function findStoreOwnedByUser(storeId2, userId) {
  return one("SELECT id, name FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId]);
}
async function findCategoryOwnedByUser(storeId2, categoryId, userId) {
  return one("SELECT categories.* FROM ld_product_categories AS categories JOIN ld_stores AS stores ON stores.id = categories.store_id WHERE categories.id = ? AND categories.store_id = ? AND stores.user_id = ?", [categoryId, storeId2, userId]);
}
async function findProductOwnedByUser(storeId2, productId, userId) {
  return one("SELECT products.*, categories.name AS category_name FROM ld_products AS products JOIN ld_stores AS stores ON stores.id = products.store_id JOIN ld_product_categories AS categories ON categories.id = products.category_id WHERE products.id = ? AND products.store_id = ? AND stores.user_id = ?", [productId, storeId2, userId]);
}
async function listCategories(storeId2, search) {
  const params = [storeId2];
  let where = "categories.store_id = ?";
  if (search) {
    where += " AND categories.name LIKE ?";
    params.push(`%${search}%`);
  }
  return query(`SELECT categories.id, categories.store_id, categories.parent_category_id, categories.name, categories.description, categories.crop_aspect, categories.card_image_url, categories.hero_image_url, categories.active, categories.created_at, categories.updated_at, COUNT(products.id) AS product_count FROM ld_product_categories AS categories LEFT JOIN ld_products AS products ON products.category_id = categories.id WHERE ${where} GROUP BY categories.id ORDER BY categories.parent_category_id IS NOT NULL, categories.active DESC, categories.name ASC LIMIT 500`, params);
}
async function findCategoryByName(storeId2, name, excludeId = null) {
  return excludeId ? one("SELECT id FROM ld_product_categories WHERE store_id = ? AND name = ? AND id <> ?", [storeId2, name, excludeId]) : one("SELECT id FROM ld_product_categories WHERE store_id = ? AND name = ?", [storeId2, name]);
}
async function insertCategory(category) {
  await query("INSERT INTO ld_product_categories (id, store_id, parent_category_id, name, description, crop_aspect, card_image_url, hero_image_url, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [category.id, category.storeId, category.parentCategoryId, category.name, category.description, category.cropAspect, category.cardImageUrl, category.heroImageUrl, category.active ? 1 : 0, category.createdAt, category.updatedAt]);
}
async function updateCategory(category, input, timestamp2) {
  await query("UPDATE ld_product_categories SET parent_category_id = ?, name = ?, description = ?, crop_aspect = ?, card_image_url = ?, hero_image_url = ?, active = ?, updated_at = ? WHERE id = ?", [input.parentCategoryId, input.name, input.description, input.cropAspect, input.cardImageUrl, input.heroImageUrl, input.active ? 1 : 0, timestamp2, category.id]);
}
async function findCategoryInStore(storeId2, categoryId) {
  return one("SELECT * FROM ld_product_categories WHERE id = ? AND store_id = ?", [categoryId, storeId2]);
}
async function listCategoryTree(storeId2, categoryId) {
  return query("SELECT id, parent_category_id FROM ld_product_categories WHERE store_id = ? AND (id = ? OR parent_category_id = ?)", [storeId2, categoryId, categoryId]);
}
async function hasProductsInCategories(categoryIds) {
  if (!categoryIds.length) return null;
  return one(`SELECT id FROM ld_products WHERE category_id IN (${categoryIds.map(() => "?").join(", ")}) LIMIT 1`, categoryIds);
}
async function deleteCategory(categoryId) {
  await query("DELETE FROM ld_product_categories WHERE id = ?", [categoryId]);
}
async function listCategoryProductStorageKeys(categoryIds) {
  if (!categoryIds.length) return [];
  return query(`SELECT media.storage_key FROM ld_product_media AS media JOIN ld_products AS products ON products.id = media.product_id WHERE products.category_id IN (${categoryIds.map(() => "?").join(", ")})`, categoryIds);
}
async function deleteProductsInCategories(tx, categoryIds) {
  if (categoryIds.length) await tx.query(`DELETE FROM ld_products WHERE category_id IN (${categoryIds.map(() => "?").join(", ")})`, categoryIds);
}
async function deleteCategoryTreeInTransaction(tx, rootCategoryId) {
  await tx.query("DELETE FROM ld_product_categories WHERE parent_category_id = ?", [rootCategoryId]);
  await tx.query("DELETE FROM ld_product_categories WHERE id = ?", [rootCategoryId]);
}
async function listProductPage({ filters, pagination, sort }) {
  const [count, rows] = await Promise.all([one(`SELECT COUNT(*) AS total FROM ld_products AS products WHERE ${filters.where}`, filters.params), query(`SELECT products.*, categories.name AS category_name, (SELECT media.url FROM ld_product_media AS media WHERE media.product_id = products.id AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC LIMIT 1) AS main_image_url, (SELECT COUNT(*) FROM ld_product_variants AS variants WHERE variants.product_id = products.id) AS variant_count FROM ld_products AS products JOIN ld_product_categories AS categories ON categories.id = products.category_id WHERE ${filters.where} ORDER BY ${sort} LIMIT ${pagination.limit} OFFSET ${pagination.offset}`, filters.params)]);
  return { count, rows };
}
async function listProductMedia(productId) {
  return query("SELECT * FROM ld_product_media WHERE product_id = ? ORDER BY kind ASC, sort_order ASC", [productId]);
}
async function listProductVariants(productId) {
  return query("SELECT * FROM ld_product_variants WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC", [productId]);
}
async function listProductMediaInTransaction(tx, productId) {
  return tx.query("SELECT * FROM ld_product_media WHERE product_id = ? ORDER BY kind ASC, sort_order ASC", [productId]);
}
async function listProductStorageKeys(productId) {
  return query("SELECT storage_key FROM ld_product_media WHERE product_id = ?", [productId]);
}
async function findProductMedia(productId, mediaId) {
  return one("SELECT * FROM ld_product_media WHERE id = ? AND product_id = ?", [mediaId, productId]);
}
async function findProductBySku(storeId2, sku, excludeId = null) {
  return excludeId ? one("SELECT id FROM ld_products WHERE store_id = ? AND sku = ? AND id <> ?", [storeId2, sku, excludeId]) : one("SELECT id FROM ld_products WHERE store_id = ? AND sku = ?", [storeId2, sku]);
}
async function deleteProduct(productId) {
  await query("DELETE FROM ld_products WHERE id = ?", [productId]);
}
async function deleteProductMedia(mediaId) {
  await query("DELETE FROM ld_product_media WHERE id = ?", [mediaId]);
}
async function normalizeImageOrder(productId) {
  const images = await query("SELECT id FROM ld_product_media WHERE product_id = ? AND kind = 'image' ORDER BY sort_order ASC, created_at ASC", [productId]);
  await Promise.all(images.map((item, index) => query("UPDATE ld_product_media SET sort_order = ?, is_primary = ? WHERE id = ?", [index, index === 0 ? 1 : 0, item.id])));
}
async function listStagedUploadKinds(storeId2, userId, draftId) {
  return query("SELECT kind FROM ld_product_uploads WHERE store_id = ? AND user_id = ? AND draft_id = ? AND status = 'staged'", [storeId2, userId, draftId]);
}
async function insertStagedUpload(media) {
  await query("INSERT INTO ld_product_uploads (id, store_id, user_id, draft_id, kind, storage_key, url, content_type, file_size, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'staged', ?, ?)", [media.id, media.storeId, media.userId, media.draftId, media.kind, media.storageKey, media.url, media.contentType, media.fileSize, media.createdAt, media.expiresAt]);
}
async function findStagedUpload(storeId2, userId, uploadId) {
  return one("SELECT * FROM ld_product_uploads WHERE id = ? AND store_id = ? AND user_id = ? AND status = 'staged'", [uploadId, storeId2, userId]);
}
async function deleteStagedUpload(uploadId) {
  await query("DELETE FROM ld_product_uploads WHERE id = ? AND status = 'staged'", [uploadId]);
}
async function findCategoryInStoreTx(tx, categoryId, storeId2) {
  return tx.one("SELECT id, name, active FROM ld_product_categories WHERE id = ? AND store_id = ?", [categoryId, storeId2]);
}
async function lockStagedUploads(tx, { storeId: storeId2, userId, draftId, uploadIds }) {
  const placeholders = uploadIds.map(() => "?").join(", ");
  return tx.query(`SELECT * FROM ld_product_uploads WHERE id IN (${placeholders}) AND store_id = ? AND user_id = ? AND draft_id = ? AND status = 'staged' AND expires_at > ? FOR UPDATE`, [...uploadIds, storeId2, userId, draftId, Date.now()]);
}
async function insertProduct(tx, product) {
  await tx.query("INSERT INTO ld_products (id, store_id, category_id, name, sku, description, short_description, price_cents, compare_at_price_cents, cost_price_cents, brand, tags_json, stock_quantity, weight_grams, width_mm, height_mm, depth_mm, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [product.id, product.storeId, product.categoryId, product.name, product.sku || null, product.description, product.shortDescription, product.priceCents, product.compareAtPriceCents, product.costPriceCents, product.brand, JSON.stringify(product.tags), product.stockQuantity, product.weightGrams, product.widthMm, product.heightMm, product.depthMm, product.status, product.createdAt, product.updatedAt]);
}
async function updateProduct(tx, product) {
  await tx.query("UPDATE ld_products SET category_id = ?, name = ?, sku = ?, description = ?, short_description = ?, price_cents = ?, compare_at_price_cents = ?, cost_price_cents = ?, brand = ?, tags_json = ?, stock_quantity = ?, weight_grams = ?, width_mm = ?, height_mm = ?, depth_mm = ?, status = ?, updated_at = ? WHERE id = ?", [product.categoryId, product.name, product.sku || null, product.description, product.shortDescription, product.priceCents, product.compareAtPriceCents, product.costPriceCents, product.brand, JSON.stringify(product.tags), product.stockQuantity, product.weightGrams, product.widthMm, product.heightMm, product.depthMm, product.status, product.updatedAt, product.id]);
}
async function replaceProductVariants(tx, productId, variants, timestamp2) {
  await tx.query("DELETE FROM ld_product_variants WHERE product_id = ?", [productId]);
  for (const [index, variant] of variants.entries()) await tx.query("INSERT INTO ld_product_variants (id, product_id, name, sku, price_cents, stock_quantity, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), productId, variant.name, variant.sku || null, variant.priceCents, variant.stockQuantity, index, timestamp2, timestamp2]);
}
async function attachUploads(tx, { productId, uploads, timestamp: timestamp2, startOrder }) {
  const images = uploads.filter((item) => item.kind === "image");
  const video = uploads.find((item) => item.kind === "video");
  for (const [index, item] of images.entries()) await tx.query("INSERT INTO ld_product_media (id, product_id, kind, storage_key, url, content_type, file_size, sort_order, is_primary, created_at, updated_at) VALUES (?, ?, 'image', ?, ?, ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), productId, item.storage_key, item.url, item.content_type, item.file_size, startOrder + index, startOrder + index === 0 ? 1 : 0, timestamp2, timestamp2]);
  if (video) await tx.query("INSERT INTO ld_product_media (id, product_id, kind, storage_key, url, content_type, file_size, sort_order, is_primary, created_at, updated_at) VALUES (?, ?, 'video', ?, ?, ?, ?, 0, 0, ?, ?)", [crypto.randomUUID(), productId, video.storage_key, video.url, video.content_type, video.file_size, timestamp2, timestamp2]);
  await tx.query(`UPDATE ld_product_uploads SET status = 'attached', attached_at = ? WHERE id IN (${uploads.map(() => "?").join(", ")})`, [timestamp2, ...uploads.map((item) => item.id)]);
}

// server/modules/products/presenters.js
function publicUpload(media) {
  return { id: media.id, draftId: media.draft_id || media.draftId, kind: media.kind, url: media.url, contentType: media.content_type || media.contentType, fileSize: Number(media.file_size ?? media.fileSize), status: media.status };
}
function publicMedia(media) {
  return { id: media.id, kind: media.kind, url: media.url, contentType: media.content_type || media.contentType, fileSize: Number(media.file_size ?? media.fileSize), sortOrder: Number(media.sort_order ?? media.sortOrder ?? 0), isPrimary: Boolean(media.is_primary ?? media.isPrimary), createdAt: Number(media.created_at ?? media.createdAt) };
}
function publicProductListItem(product) {
  return { id: product.id, storeId: product.store_id, categoryId: product.category_id, categoryName: product.category_name, name: product.name, sku: product.sku || "", description: product.description, shortDescription: product.short_description || "", priceCents: Number(product.price_cents), compareAtPriceCents: nullableNumber(product.compare_at_price_cents), costPriceCents: nullableNumber(product.cost_price_cents), brand: product.brand || "", tags: jsonArray2(product.tags_json), stockQuantity: Number(product.stock_quantity ?? 0), weightGrams: nullableNumber(product.weight_grams), dimensions: { widthMm: nullableNumber(product.width_mm), heightMm: nullableNumber(product.height_mm), depthMm: nullableNumber(product.depth_mm) }, variantCount: Number(product.variant_count ?? 0), status: product.status, mainImageUrl: product.main_image_url || null, createdAt: Number(product.created_at), updatedAt: Number(product.updated_at) };
}
function publicProduct(product, media = [], variants = []) {
  return { ...publicProductListItem(product), media: media.map(publicMedia), variants: variants.map(publicVariant) };
}
function publicCategory(category) {
  return { id: category.id, storeId: category.store_id || category.storeId, parentCategoryId: category.parent_category_id ?? category.parentCategoryId ?? null, name: category.name, description: category.description || "", cropAspect: category.crop_aspect || category.cropAspect || "1:1", cardImageUrl: category.card_image_url || category.cardImageUrl || null, heroImageUrl: category.hero_image_url || category.heroImageUrl || null, active: Boolean(category.active ?? true), productCount: Number(category.product_count ?? category.productCount ?? 0), createdAt: Number(category.created_at ?? category.createdAt ?? 0), updatedAt: Number(category.updated_at ?? category.updatedAt ?? 0) };
}
function mediaFromUpload(uploadItem, index) {
  return { id: uploadItem.id, kind: uploadItem.kind, url: uploadItem.url, content_type: uploadItem.content_type, file_size: uploadItem.file_size, sort_order: uploadItem.kind === "image" ? index : 0, is_primary: uploadItem.kind === "image" && index === 0, created_at: uploadItem.created_at };
}
function publicVariant(variant) {
  return { id: variant.id, name: variant.name, sku: variant.sku || "", priceCents: nullableNumber(variant.price_cents), stockQuantity: Number(variant.stock_quantity ?? 0), sortOrder: Number(variant.sort_order ?? 0) };
}
function nullableNumber(value) {
  return value === void 0 || value === null ? null : Number(value);
}
function jsonArray2(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// server/modules/products/service.js
var ProductDomainError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function listCategories2({ storeId: storeId2, userId, search }) {
  await requireStore(storeId2, userId);
  return (await listCategories(storeId2, String(search || "").trim().slice(0, 120))).map(publicCategory);
}
async function getCategoryData({ storeId: storeId2, categoryId, userId }) {
  return requireCategory(storeId2, categoryId, userId);
}
async function createCategory({ storeId: storeId2, userId, input }) {
  const store = await requireStore(storeId2, userId);
  await requireParentCategory(store.id, input.parentCategoryId);
  if (await findCategoryByName(store.id, input.name)) throw new ProductDomainError(409, "J\xE1 existe uma categoria com este nome nesta loja.");
  await requirePlanQuota({ storeId: store.id, field: input.parentCategoryId ? "subcategories" : "categories", countSql: input.parentCategoryId ? "SELECT COUNT(*) AS total FROM ld_product_categories WHERE store_id = ? AND parent_category_id IS NOT NULL" : "SELECT COUNT(*) AS total FROM ld_product_categories WHERE store_id = ? AND parent_category_id IS NULL", one, createError: (status, message) => new ProductDomainError(status, message) });
  const timestamp2 = Date.now();
  const category = { id: randomUUID8(), storeId: store.id, ...input, createdAt: timestamp2, updatedAt: timestamp2, productCount: 0 };
  await insertCategory(category);
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return publicCategory(category);
}
async function updateCategory2({ storeId: storeId2, categoryId, userId, input, existing = null }) {
  const category = existing || await requireCategory(storeId2, categoryId, userId);
  if (input.parentCategoryId === category.id) throw new ProductDomainError(422, "Uma categoria n\xE3o pode ser sua pr\xF3pria categoria principal.");
  await requireParentCategory(storeId2, input.parentCategoryId);
  if (await findCategoryByName(storeId2, input.name, category.id)) throw new ProductDomainError(409, "J\xE1 existe uma categoria com este nome nesta loja.");
  const currentKind = category.parent_category_id ? "subcategories" : "categories";
  const requestedKind = input.parentCategoryId ? "subcategories" : "categories";
  if (currentKind !== requestedKind) await requirePlanQuota({ storeId: storeId2, field: requestedKind, countSql: requestedKind === "subcategories" ? "SELECT COUNT(*) AS total FROM ld_product_categories WHERE store_id = ? AND parent_category_id IS NOT NULL" : "SELECT COUNT(*) AS total FROM ld_product_categories WHERE store_id = ? AND parent_category_id IS NULL", one, createError: (status, message) => new ProductDomainError(status, message) });
  const timestamp2 = Date.now();
  await updateCategory(category, input, timestamp2);
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return publicCategory({ ...category, ...input, updated_at: timestamp2 });
}
async function removeCategory({ storeId: storeId2, categoryId, userId, deleteProducts = false }) {
  const category = await requireCategory(storeId2, categoryId, userId);
  const tree = await listCategoryTree(storeId2, category.id);
  const categoryIds = tree.map((item) => item.id);
  const hasProducts = await hasProductsInCategories(categoryIds);
  const hasSubcategories = tree.some((item) => item.parent_category_id === category.id);
  if ((hasProducts || hasSubcategories) && !deleteProducts) throw new ProductDomainError(409, "Marque a confirma\xE7\xE3o para excluir as subcategorias e os produtos vinculados.");
  if (hasProducts || hasSubcategories) {
    const media = await listCategoryProductStorageKeys(categoryIds);
    await getProductStorage().removeMany(media.map((item) => item.storage_key));
    await withinTransaction(async (tx) => {
      await deleteProductsInCategories(tx, categoryIds);
      await deleteCategoryTreeInTransaction(tx, category.id);
    });
    await syncStoreContractToR2({ storeId: storeId2, userId });
    return;
  }
  await deleteCategory(category.id);
  await syncStoreContractToR2({ storeId: storeId2, userId });
}
async function listProducts({ storeId: storeId2, userId, listInput }) {
  await requireStore(storeId2, userId);
  const { count, rows } = await listProductPage(listInput);
  const total = Number(count?.total || 0);
  return { data: rows.map(publicProductListItem), pagination: { page: listInput.pagination.page, limit: listInput.pagination.limit, total, totalPages: Math.max(1, Math.ceil(total / listInput.pagination.limit)) } };
}
async function getProduct({ storeId: storeId2, productId, userId }) {
  const product = await requireProduct(storeId2, productId, userId);
  return publicProduct(product, await listProductMedia(product.id) || [], await listProductVariants(product.id) || []);
}
async function getProductData({ storeId: storeId2, productId, userId }) {
  const product = await requireProduct(storeId2, productId, userId);
  return { ...product, variants: await listProductVariants(product.id) || [] };
}
async function uploadProductMedia({ storeId: storeId2, userId, file, uploadInput }) {
  const store = await requireStore(storeId2, userId);
  const activePlan = await getActiveStorePlanLimits({ storeId: store.id, one });
  if (!activePlan) throw new ProductDomainError(402, "Escolha ou regularize um plano ativo para enviar mídias.");
  const existing = await listStagedUploadKinds(store.id, userId, uploadInput.draftId);
  const images = existing.filter((item) => item.kind === "image").length;
  const videos = existing.filter((item) => item.kind === "video").length;
  maxNewMedia({ limits: activePlan.limits, field: uploadInput.format.kind === "image" ? "productImages" : "productVideos", existing: uploadInput.format.kind === "image" ? images : videos, createError: (status, message) => new ProductDomainError(status, message) });
  const id = randomUUID8();
  const folder = uploadInput.format.kind === "image" ? "images" : "video";
  const stored = await getProductStorage().put({ key: productMediaKey({ accountId: userId, storeId: store.id, draftId: uploadInput.draftId, folder, assetId: id, extension: uploadInput.format.extension }), body: file.buffer, contentType: file.mimetype });
  const timestamp2 = Date.now();
  const media = { id, storeId: store.id, userId, draftId: uploadInput.draftId, kind: uploadInput.format.kind, storageKey: stored.key, url: stored.url, contentType: file.mimetype, fileSize: file.size, status: "staged", createdAt: timestamp2, expiresAt: timestamp2 + 864e5 };
  await insertStagedUpload(media);
  return publicUpload(media);
}
async function removeStagedProductUpload({ storeId: storeId2, uploadId, userId }) {
  await requireStore(storeId2, userId);
  const upload3 = await findStagedUpload(storeId2, userId, uploadId);
  if (!upload3) throw new ProductDomainError(404, "Upload tempor\xE1rio n\xE3o encontrado.");
  await deleteStagedUpload(upload3.id);
  await getProductStorage().remove(upload3.storage_key);
}
async function createProduct({ storeId: storeId2, userId, input }) {
  await requireStore(storeId2, userId);
  return persistProduct({ storeId: storeId2, userId, ...input });
}
async function updateProduct2({ storeId: storeId2, productId, userId, input, existing = null }) {
  const product = existing || await requireProduct(storeId2, productId, userId);
  return persistProduct({ storeId: storeId2, userId, productId: product.id, createdAt: product.created_at, currentCategoryId: product.category_id, ...input, updating: true });
}
async function removeProduct({ storeId: storeId2, productId, userId }) {
  const product = await requireProduct(storeId2, productId, userId);
  const media = await listProductStorageKeys(product.id);
  await deleteProduct(product.id);
  await Promise.all(media.map((item) => getProductStorage().remove(item.storage_key)));
  await syncStoreContractToR2({ storeId: storeId2, userId });
}
async function removeProductMedia({ storeId: storeId2, productId, mediaId, userId }) {
  const product = await requireProduct(storeId2, productId, userId);
  const media = await findProductMedia(product.id, mediaId);
  if (!media) throw new ProductDomainError(404, "M\xEDdia n\xE3o encontrada.");
  await deleteProductMedia(media.id);
  await getProductStorage().remove(media.storage_key);
  await normalizeImageOrder(product.id);
  await syncStoreContractToR2({ storeId: storeId2, userId });
}
async function persistProduct({ storeId: storeId2, userId, categoryId, name, sku, description, shortDescription, priceCents, compareAtPriceCents, costPriceCents, brand, tags, stockQuantity, weightGrams, widthMm, heightMm, depthMm, variants, status, draftId, uploadIds, productId = randomUUID8(), createdAt = null, currentCategoryId = null, updating = false }) {
  const timestamp2 = Date.now();
  const persisted = await withinTransaction(async (tx) => {
    const category = await findCategoryInStoreTx(tx, categoryId, storeId2);
    if (!category) throw new ProductDomainError(422, "A categoria selecionada n\xE3o pertence a esta loja.");
    if (!Boolean(category.active) && (!updating || categoryId !== currentCategoryId)) throw new ProductDomainError(422, "Ative a categoria selecionada antes de vincul\xE1-la a um produto.");
    if (sku && await findProductBySku(storeId2, sku, updating ? productId : null)) throw new ProductDomainError(409, "J\xE1 existe um produto com este SKU nesta loja.");
    const currentMedia = updating ? await listProductMediaInTransaction(tx, productId) : [];
    const uploads = uploadIds.length ? await lockStagedUploads(tx, { storeId: storeId2, userId, draftId, uploadIds }) : [];
    if (!updating && (!draftId || !uploadIds.length) || uploads.length !== uploadIds.length) throw new ProductDomainError(422, "Uma ou mais m\xEDdias n\xE3o est\xE3o mais dispon\xEDveis. Envie-as novamente.");
    const activePlan = await getActiveStorePlanLimits({ storeId: storeId2, one: tx.one });
    if (!activePlan) throw new ProductDomainError(402, "Escolha ou regularize um plano ativo para continuar esta operação.");
    if (!updating) await requirePlanQuota({ storeId: storeId2, field: "products", countSql: "SELECT COUNT(*) AS total FROM ld_products WHERE store_id = ?", one: tx.one, createError: (status, message) => new ProductDomainError(status, message) });
    validateMediaCounts([...currentMedia, ...uploads], activePlan.limits);
    const product = { id: productId, storeId: storeId2, categoryId, name, sku, description, shortDescription, priceCents, compareAtPriceCents, costPriceCents, brand, tags, stockQuantity, weightGrams, widthMm, heightMm, depthMm, status, createdAt: createdAt || timestamp2, updatedAt: timestamp2 };
    if (updating) await updateProduct(tx, product);
    else await insertProduct(tx, product);
    await replaceProductVariants(tx, productId, variants, timestamp2);
    if (uploads.length) await attachUploads(tx, { productId, uploads, timestamp: timestamp2, startOrder: currentMedia.filter((item) => item.kind === "image").length });
    return publicProduct({ id: productId, store_id: storeId2, category_id: categoryId, category_name: category.name, name, sku, description, short_description: shortDescription, price_cents: priceCents, compare_at_price_cents: compareAtPriceCents, cost_price_cents: costPriceCents, brand, tags_json: JSON.stringify(tags), stock_quantity: stockQuantity, weight_grams: weightGrams, width_mm: widthMm, height_mm: heightMm, depth_mm: depthMm, status, created_at: product.createdAt, updated_at: timestamp2 }, [...currentMedia, ...uploads.map((item, index) => mediaFromUpload(item, index))], variants.map((variant, index) => ({ id: `${productId}-${index}`, name: variant.name, sku: variant.sku, price_cents: variant.priceCents, stock_quantity: variant.stockQuantity, sort_order: index })));
  });
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return persisted;
}
function validateMediaCounts(media, limits) {
  const images = media.filter((item) => item.kind === "image").length;
  const videos = media.filter((item) => item.kind === "video").length;
  if (!images) throw new ProductDomainError(422, "Inclua ao menos uma imagem para o produto.");
  maxNewMedia({ limits, field: "productImages", existing: 0, incoming: images, createError: (status, message) => new ProductDomainError(status, message) });
  maxNewMedia({ limits, field: "productVideos", existing: 0, incoming: videos, createError: (status, message) => new ProductDomainError(status, message) });
}
async function requireStore(storeId2, userId) {
  const store = await findStoreOwnedByUser(storeId2, userId);
  if (!store) throw new ProductDomainError(404, "Loja n\xE3o encontrada.");
  return store;
}
async function requireCategory(storeId2, categoryId, userId) {
  const category = await findCategoryOwnedByUser(storeId2, categoryId, userId);
  if (!category) throw new ProductDomainError(404, "Categoria n\xE3o encontrada.");
  return category;
}
async function requireParentCategory(storeId2, parentCategoryId) {
  if (!parentCategoryId) return null;
  const parent = await findCategoryInStore(storeId2, parentCategoryId);
  if (!parent || parent.parent_category_id) throw new ProductDomainError(422, "Selecione uma categoria principal v\xE1lida desta loja.");
  return parent;
}
async function requireProduct(storeId2, productId, userId) {
  const product = await findProductOwnedByUser(storeId2, productId, userId);
  if (!product) throw new ProductDomainError(404, "Produto n\xE3o encontrado.");
  return product;
}

// server/modules/products/controller.js
var router7 = Router7();
var upload = multer2({ storage: multer2.memoryStorage(), limits: { files: 1, fileSize: 45 * 1024 * 1024 } });
var route2 = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
router7.get("/stores/:storeId/categories", route2(async (req, res) => res.json({ categories: await listCategories2({ storeId: req.params.storeId, userId: req.user.id, search: req.query.search }) })));
router7.post("/stores/:storeId/categories", route2(async (req, res) => res.status(201).json({ category: await createCategory({ storeId: req.params.storeId, userId: req.user.id, input: parseCategoryInput(req.body) }) })));
router7.patch("/stores/:storeId/categories/:categoryId", route2(async (req, res) => {
  const category = await getCategoryData({ storeId: req.params.storeId, categoryId: req.params.categoryId, userId: req.user.id });
  return res.json({ category: await updateCategory2({ storeId: req.params.storeId, categoryId: req.params.categoryId, userId: req.user.id, existing: category, input: parseCategoryInput({ ...category, ...req.body }) }) });
}));
router7.delete("/stores/:storeId/categories/:categoryId", route2(async (req, res) => {
  await removeCategory({ storeId: req.params.storeId, categoryId: req.params.categoryId, userId: req.user.id, deleteProducts: req.body?.deleteProducts === true });
  return res.json({ ok: true });
}));
router7.get("/stores/:storeId/products", route2(async (req, res) => res.json(await listProducts({ storeId: req.params.storeId, userId: req.user.id, listInput: getProductListInput({ ...req.query, storeId: req.params.storeId }) }))));
router7.get("/stores/:storeId/products/:productId", route2(async (req, res) => res.json({ product: await getProduct({ storeId: req.params.storeId, productId: req.params.productId, userId: req.user.id }) })));
router7.post("/stores/:storeId/products/media", upload.single("file"), route2(async (req, res) => res.status(201).json({ media: await uploadProductMedia({ storeId: req.params.storeId, userId: req.user.id, file: req.file, uploadInput: getProductUploadInput(req.body, req.file) }) })));
router7.delete("/stores/:storeId/products/media/:uploadId", route2(async (req, res) => {
  await removeStagedProductUpload({ storeId: req.params.storeId, uploadId: req.params.uploadId, userId: req.user.id });
  return res.json({ ok: true });
}));
router7.post("/stores/:storeId/products", route2(async (req, res) => res.status(201).json({ product: await createProduct({ storeId: req.params.storeId, userId: req.user.id, input: assertValidProductInput(parseProductInput(req.body)) }) })));
router7.patch("/stores/:storeId/products/:productId", route2(async (req, res) => {
  const existing = await getProductData({ storeId: req.params.storeId, productId: req.params.productId, userId: req.user.id });
  return res.json({ product: await updateProduct2({ storeId: req.params.storeId, productId: req.params.productId, userId: req.user.id, existing, input: assertValidProductInput(parseProductInput({ ...existing, ...req.body, uploadIds: req.body?.uploadIds === void 0 ? [] : req.body.uploadIds }, { allowEmptyUploads: true })) }) });
}));
router7.delete("/stores/:storeId/products/:productId", route2(async (req, res) => {
  await removeProduct({ storeId: req.params.storeId, productId: req.params.productId, userId: req.user.id });
  return res.json({ ok: true });
}));
router7.delete("/stores/:storeId/products/:productId/media/:mediaId", route2(async (req, res) => {
  await removeProductMedia({ storeId: req.params.storeId, productId: req.params.productId, mediaId: req.params.mediaId, userId: req.user.id });
  return res.json({ ok: true });
}));
router7.use((error, _req, res, next) => {
  if (error instanceof multer2.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 422).json({ error: error.code === "LIMIT_FILE_SIZE" ? "O arquivo excede o tamanho m\xE1ximo permitido." : "N\xE3o foi poss\xEDvel processar o upload." });
  if (error instanceof ProductValidationError || error instanceof ProductDomainError) return res.status(error.status).json({ error: error.message });
  return next(error);
});
var controller_default7 = router7;

// server/modules/customers/controller.js
import { Router as Router8 } from "express";

// server/modules/customers/validation.js
var PAGE_SIZES2 = [10, 20, 50, 100];
var BRAZILIAN_STATES2 = /* @__PURE__ */ new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);
var CustomerValidationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function parseCustomerInput(source) {
  const name = validText3(source?.name, 2, 160);
  const email = optionalEmail2(source?.email);
  const document = validText3(source?.document || "", 0, 40);
  const notes = validText3(source?.notes || "", 0, 5e3);
  const requestedStatus = source?.status === void 0 ? "active" : source.status;
  const status = ["active", "inactive"].includes(requestedStatus) ? requestedStatus : "";
  const phones = normalizePhones(source?.phones);
  const addresses = normalizeAddresses(source?.addresses);
  const favoriteProductIds = source?.favoriteProductIds === void 0 ? [] : Array.isArray(source.favoriteProductIds) ? [...new Set(source.favoriteProductIds.map(validUuid2).filter(Boolean))] : null;
  if (!name) return { valid: false, error: "Informe o nome completo do cliente." };
  if (source?.email && !email) return { valid: false, error: "Informe um e-mail v\xE1lido ou deixe o campo em branco." };
  if (!status) return { valid: false, error: "Selecione um status de cliente v\xE1lido." };
  if (!phones.valid) return { valid: false, error: phones.error };
  if (!addresses.valid) return { valid: false, error: addresses.error };
  if (!Array.isArray(favoriteProductIds)) return { valid: false, error: "Informe uma lista v\xE1lida de produtos favoritos." };
  return { valid: true, value: { name, email, document, notes, status, phones: phones.value, addresses: addresses.value, favoriteProductIds } };
}
function parsePurchaseInput(source) {
  const amountCents = Math.round(Number(source?.amountCents));
  const reference = validText3(source?.reference || "", 0, 120);
  const purchasedAt = source?.purchasedAt === void 0 ? Date.now() : Number(source.purchasedAt);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 2147483647) return { valid: false, error: "Informe um valor de compra v\xE1lido." };
  if (!Number.isSafeInteger(purchasedAt) || purchasedAt < 1) return { valid: false, error: "Informe uma data de compra v\xE1lida." };
  return { valid: true, value: { amountCents, reference, purchasedAt } };
}
function getCustomerListInput(source = {}) {
  if (source.status !== void 0 && !["active", "inactive"].includes(String(source.status))) throw new CustomerValidationError(422, "Informe um status de cliente v\xE1lido.");
  if (source.favorites !== void 0 && !["yes", "no"].includes(String(source.favorites))) throw new CustomerValidationError(422, "Informe um filtro de favoritos v\xE1lido.");
  if (source.sort !== void 0 && !["recent", "oldest", "name", "orders", "spend"].includes(String(source.sort))) throw new CustomerValidationError(422, "Informe uma ordena\xE7\xE3o v\xE1lida.");
  if (source.search !== void 0 && !validText3(source.search, 0, 120)) throw new CustomerValidationError(422, "Informe uma busca de clientes v\xE1lida.");
  const pagination = boundedPagination(source, { defaultLimit: 20, maxLimit: 100, maxPage: 1e5 });
  if (!PAGE_SIZES2.includes(pagination.limit)) throw new CustomerValidationError(422, "Use um limite de 10, 20, 50 ou 100 clientes por p\xE1gina.");
  return { pagination, filters: buildCustomerFilters(String(source.storeId || ""), source), sort: sortClause2(source.sort) };
}
function buildCustomerFilters(storeId2, source = {}) {
  const params = [storeId2];
  let where = "customers.store_id = ?";
  const search = validText3(source.search || "", 0, 120);
  const status = String(source.status || "");
  const favorites = String(source.favorites || "") === "yes";
  if (search) {
    where += " AND (customers.name LIKE ? OR customers.email LIKE ? OR customers.document LIKE ? OR EXISTS (SELECT 1 FROM ld_customer_phones AS phones WHERE phones.customer_id = customers.id AND phones.phone LIKE ?))";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += " AND customers.status = ?";
    params.push(status);
  }
  if (favorites) where += " AND EXISTS (SELECT 1 FROM ld_customer_favorites AS favorites WHERE favorites.customer_id = customers.id)";
  return { where, params };
}
function assertValidInput(parsed) {
  if (!parsed.valid) throw new CustomerValidationError(422, parsed.error);
  return parsed.value;
}
function sortClause2(sort) {
  return { oldest: "customers.created_at ASC", name: "customers.name ASC", orders: "customers.total_orders DESC, customers.name ASC", spend: "customers.total_spent_cents DESC, customers.name ASC" }[String(sort || "")] || "customers.created_at DESC";
}
function validText3(value, min, max) {
  const text4 = String(value || "").trim();
  return text4.length >= min && text4.length <= max ? text4 : "";
}
function optionalEmail2(value) {
  const email = String(value || "").trim().toLowerCase();
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function validUuid2(value) {
  const id = String(value || "").trim();
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id) ? id : "";
}
function normalizePhones(source) {
  if (source === void 0) return { valid: true, value: [] };
  if (!Array.isArray(source)) return { valid: false, error: "Informe uma lista v\xE1lida de telefones." };
  if (source.length > 3) return { valid: false, error: "Cada cliente pode ter no m\xE1ximo tr\xEAs telefones." };
  const values = source.map((item) => ({ label: validText3(item?.label || "Principal", 1, 40) || "Principal", phone: String(item?.phone || "").trim().replace(/\s+/g, " ") })).filter((item) => item.phone);
  if (values.some((item) => item.phone.length < 5 || item.phone.length > 40)) return { valid: false, error: "Informe n\xFAmeros de telefone v\xE1lidos." };
  if (new Set(values.map((item) => item.phone)).size !== values.length) return { valid: false, error: "N\xE3o repita o mesmo telefone." };
  return { valid: true, value: values };
}
function normalizeAddresses(source) {
  if (source === void 0) return { valid: true, value: [] };
  if (!Array.isArray(source)) return { valid: false, error: "Informe uma lista v\xE1lida de endere\xE7os." };
  if (source.length > 4) return { valid: false, error: "Cada cliente pode ter no m\xE1ximo quatro endere\xE7os." };
  const values = source.map((item) => ({ label: validText3(item?.label || "Principal", 1, 60) || "Principal", recipientName: validText3(item?.recipientName || "", 0, 160), postalCode: validText3(item?.postalCode || "", 0, 20), street: validText3(item?.street || "", 0, 180), number: validText3(item?.number || "", 0, 30), complement: validText3(item?.complement || "", 0, 120), observation: validText3(item?.observation || "", 0, 80), district: validText3(item?.district || "", 0, 120), city: validText3(item?.city || "", 0, 120), state: validText3(item?.state || "", 0, 2).toUpperCase(), country: /^[A-Za-z]{2}$/.test(String(item?.country || "BR")) ? String(item?.country || "BR").toUpperCase() : "" })).filter((item) => item.street || item.city || item.postalCode);
  if (values.some((item) => !item.country)) return { valid: false, error: "Informe um pa\xEDs v\xE1lido nos endere\xE7os." };
  if (values.some((item) => item.state && !BRAZILIAN_STATES2.has(item.state))) return { valid: false, error: "Selecione uma UF brasileira v\xE1lida nos endere\xE7os." };
  return { valid: true, value: values };
}

// server/modules/customers/service.js
import { randomUUID as randomUUID9 } from "node:crypto";

// server/modules/customers/repository.js
var repository_exports3 = {};
__export(repository_exports3, {
  countFavoritesInStore: () => countFavoritesInStore,
  deleteCustomer: () => deleteCustomer,
  deletePurchase: () => deletePurchase,
  detailedCustomer: () => detailedCustomer,
  findCustomerInStore: () => findCustomerInStore,
  findCustomerOwnedByUser: () => findCustomerOwnedByUser,
  findPurchase: () => findPurchase,
  findStoreOwnedByUser: () => findStoreOwnedByUser2,
  insertPurchase: () => insertPurchase,
  listCustomerPage: () => listCustomerPage,
  one: () => one,
  query: () => query,
  refreshPurchaseMetrics: () => refreshPurchaseMetrics,
  upsertCustomer: () => upsertCustomer,
  withinTransaction: () => withinTransaction2
});
var withinTransaction2 = transaction;
async function findStoreOwnedByUser2(storeId2, userId) {
  return one("SELECT id, name FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId]);
}
async function findCustomerOwnedByUser(storeId2, customerId, userId) {
  return one("SELECT customers.* FROM ld_customers AS customers JOIN ld_stores AS stores ON stores.id = customers.store_id WHERE customers.id = ? AND customers.store_id = ? AND stores.user_id = ?", [customerId, storeId2, userId]);
}
async function listCustomerPage({ filters, pagination, sort }) {
  const [count, rows, summary] = await Promise.all([one(`SELECT COUNT(*) AS total FROM ld_customers AS customers WHERE ${filters.where}`, filters.params), query(`SELECT customers.*, (SELECT phone FROM ld_customer_phones AS phones WHERE phones.customer_id = customers.id ORDER BY phones.is_primary DESC, phones.created_at ASC LIMIT 1) AS primary_phone, (SELECT COUNT(*) FROM ld_customer_phones AS phones WHERE phones.customer_id = customers.id) AS phones_count, (SELECT COUNT(*) FROM ld_customer_addresses AS addresses WHERE addresses.customer_id = customers.id) AS addresses_count, (SELECT COUNT(*) FROM ld_customer_favorites AS favorites WHERE favorites.customer_id = customers.id) AS favorites_count FROM ld_customers AS customers WHERE ${filters.where} ORDER BY ${sort} LIMIT ${pagination.limit} OFFSET ${pagination.offset}`, filters.params), one(`SELECT COUNT(*) AS total, SUM(status = 'active') AS active, SUM(status = 'inactive') AS inactive, SUM(total_orders) AS orders, SUM(total_spent_cents) AS total_spent_cents FROM ld_customers AS customers WHERE ${filters.where}`, filters.params)]);
  return { count, rows, summary };
}
async function detailedCustomer(db, customerId, storeId2) {
  const [customer, phones, addresses, favorites, purchases] = await Promise.all([db.one("SELECT * FROM ld_customers WHERE id = ? AND store_id = ?", [customerId, storeId2]), db.query("SELECT * FROM ld_customer_phones WHERE customer_id = ? ORDER BY is_primary DESC, created_at ASC", [customerId]), db.query("SELECT * FROM ld_customer_addresses WHERE customer_id = ? ORDER BY is_primary DESC, created_at ASC", [customerId]), db.query("SELECT favorites.*, products.name AS product_name, products.price_cents, products.status AS product_status FROM ld_customer_favorites AS favorites JOIN ld_products AS products ON products.id = favorites.product_id WHERE favorites.customer_id = ? AND products.store_id = ? ORDER BY favorites.created_at DESC", [customerId, storeId2]), db.query("SELECT * FROM ld_customer_purchases WHERE customer_id = ? AND store_id = ? ORDER BY purchased_at DESC, created_at DESC", [customerId, storeId2])]);
  return { customer, phones, addresses, favorites, purchases };
}
async function countFavoritesInStore(tx, storeId2, productIds) {
  if (!productIds.length) return 0;
  const placeholders = productIds.map(() => "?").join(", ");
  const products = await tx.query(`SELECT id FROM ld_products WHERE store_id = ? AND id IN (${placeholders})`, [storeId2, ...productIds]);
  return products.length;
}
async function findCustomerInStore(tx, customerId, storeId2) {
  return tx.one("SELECT id FROM ld_customers WHERE id = ? AND store_id = ?", [customerId, storeId2]);
}
async function upsertCustomer(tx, { id, storeId: storeId2, input, timestamp: timestamp2, existing }) {
  if (existing) await tx.query("UPDATE ld_customers SET name = ?, email = ?, document = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?", [input.name, input.email || null, input.document || null, input.notes, input.status, timestamp2, id]);
  else await tx.query("INSERT INTO ld_customers (id, store_id, name, email, document, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, storeId2, input.name, input.email || null, input.document || null, input.notes, input.status, timestamp2, timestamp2]);
  await tx.query("DELETE FROM ld_customer_phones WHERE customer_id = ?", [id]);
  await tx.query("DELETE FROM ld_customer_addresses WHERE customer_id = ?", [id]);
  await tx.query("DELETE FROM ld_customer_favorites WHERE customer_id = ?", [id]);
  for (const [index, phone] of input.phones.entries()) await tx.query("INSERT INTO ld_customer_phones (id, customer_id, label, phone, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), id, phone.label, phone.phone, index === 0 ? 1 : 0, timestamp2, timestamp2]);
  for (const [index, address] of input.addresses.entries()) await tx.query("INSERT INTO ld_customer_addresses (id, customer_id, label, recipient_name, postal_code, street, number, complement, observation, district, city, state, country, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), id, address.label, address.recipientName, address.postalCode, address.street, address.number, address.complement, address.observation || "", address.district, address.city, address.state, address.country, index === 0 ? 1 : 0, timestamp2, timestamp2]);
  for (const productId of input.favoriteProductIds) await tx.query("INSERT INTO ld_customer_favorites (id, customer_id, product_id, created_at) VALUES (?, ?, ?, ?)", [crypto.randomUUID(), id, productId, timestamp2]);
}
async function deleteCustomer(customerId) {
  await query("DELETE FROM ld_customers WHERE id = ?", [customerId]);
}
async function insertPurchase(tx, purchase) {
  await tx.query("INSERT INTO ld_customer_purchases (id, store_id, customer_id, reference, amount_cents, purchased_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [purchase.id, purchase.storeId, purchase.customerId, purchase.reference, purchase.amountCents, purchase.purchasedAt, purchase.createdAt]);
}
async function findPurchase(tx, purchaseId, customerId, storeId2) {
  return tx.one("SELECT id FROM ld_customer_purchases WHERE id = ? AND customer_id = ? AND store_id = ?", [purchaseId, customerId, storeId2]);
}
async function deletePurchase(tx, purchaseId) {
  await tx.query("DELETE FROM ld_customer_purchases WHERE id = ?", [purchaseId]);
}
async function refreshPurchaseMetrics(tx, customerId) {
  const totals = await tx.one("SELECT COUNT(*) AS total_orders, COALESCE(SUM(amount_cents), 0) AS total_spent_cents, MAX(purchased_at) AS last_order_at FROM ld_customer_purchases WHERE customer_id = ?", [customerId]);
  await tx.query("UPDATE ld_customers SET total_orders = ?, total_spent_cents = ?, last_order_at = ?, updated_at = ? WHERE id = ?", [Number(totals?.total_orders || 0), Number(totals?.total_spent_cents || 0), totals?.last_order_at || null, Date.now(), customerId]);
}

// server/modules/customers/presenters.js
function publicCustomerList(customer) {
  return { id: customer.id, storeId: customer.store_id, name: customer.name, email: customer.email || "", document: customer.document || "", status: customer.status, primaryPhone: customer.primary_phone || "", phonesCount: Number(customer.phones_count || 0), addressesCount: Number(customer.addresses_count || 0), favoritesCount: Number(customer.favorites_count || 0), totalOrders: Number(customer.total_orders || 0), totalSpentCents: Number(customer.total_spent_cents || 0), lastOrderAt: customer.last_order_at, createdAt: Number(customer.created_at), updatedAt: Number(customer.updated_at) };
}
function publicCustomer(customer, phones = [], addresses = [], favorites = [], purchases = []) {
  return { ...publicCustomerList(customer), notes: customer.notes || "", phones: phones.map((phone) => ({ id: phone.id, label: phone.label, phone: phone.phone, isPrimary: Boolean(phone.is_primary) })), addresses: addresses.map((address) => ({ id: address.id, label: address.label, recipientName: address.recipient_name || "", postalCode: address.postal_code || "", street: address.street || "", number: address.number || "", complement: address.complement || "", district: address.district || "", city: address.city || "", state: address.state || "", country: address.country || "BR", isPrimary: Boolean(address.is_primary) })), favorites: favorites.map((favorite) => ({ id: favorite.id, productId: favorite.product_id, productName: favorite.product_name, priceCents: Number(favorite.price_cents || 0), productStatus: favorite.product_status })), purchases: purchases.map((purchase) => ({ id: purchase.id, reference: purchase.reference || "", amountCents: Number(purchase.amount_cents || 0), purchasedAt: Number(purchase.purchased_at), createdAt: Number(purchase.created_at) })) };
}

// server/modules/customers/service.js
var CustomerDomainError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function listCustomers({ storeId: storeId2, userId, listInput }) {
  await requireStore2(storeId2, userId);
  const { count, rows, summary } = await listCustomerPage(listInput);
  const total = Number(count?.total || 0);
  return { data: rows.map(publicCustomerList), pagination: { page: listInput.pagination.page, limit: listInput.pagination.limit, total, totalPages: Math.max(1, Math.ceil(total / listInput.pagination.limit)) }, summary: { total, active: Number(summary?.active || 0), inactive: Number(summary?.inactive || 0), orders: Number(summary?.orders || 0), totalSpentCents: Number(summary?.total_spent_cents || 0) } };
}
async function getCustomer({ storeId: storeId2, customerId, userId }) {
  const customer = await requireCustomer(storeId2, customerId, userId);
  return presentDetail(await detailedCustomer(repository_exports3, customer.id, storeId2));
}
async function createCustomer({ storeId: storeId2, userId, input }) {
  await requireStore2(storeId2, userId);
  return saveCustomer({ storeId: storeId2, input });
}
async function updateCustomer({ storeId: storeId2, customerId, userId, input }) {
  const current = await requireCustomer(storeId2, customerId, userId);
  return saveCustomer({ storeId: storeId2, customerId: current.id, input });
}
async function removeCustomer({ storeId: storeId2, customerId, userId }) {
  const customer = await requireCustomer(storeId2, customerId, userId);
  await deleteCustomer(customer.id);
}
async function addPurchase({ storeId: storeId2, customerId, userId, input }) {
  const customer = await requireCustomer(storeId2, customerId, userId);
  return withinTransaction2(async (tx) => {
    const timestamp2 = Date.now();
    await insertPurchase(tx, { id: randomUUID9(), storeId: storeId2, customerId: customer.id, reference: input.reference, amountCents: input.amountCents, purchasedAt: input.purchasedAt, createdAt: timestamp2 });
    await refreshPurchaseMetrics(tx, customer.id);
    return presentDetail(await detailedCustomer(tx, customer.id, storeId2));
  });
}
async function removePurchase({ storeId: storeId2, customerId, purchaseId, userId }) {
  const customer = await requireCustomer(storeId2, customerId, userId);
  return withinTransaction2(async (tx) => {
    const purchase = await findPurchase(tx, purchaseId, customer.id, storeId2);
    if (!purchase) throw new CustomerDomainError(404, "Compra n\xE3o encontrada.");
    await deletePurchase(tx, purchase.id);
    await refreshPurchaseMetrics(tx, customer.id);
    return presentDetail(await detailedCustomer(tx, customer.id, storeId2));
  });
}
async function saveCustomer({ storeId: storeId2, customerId, input }) {
  const id = customerId || randomUUID9();
  return withinTransaction2(async (tx) => {
    const timestamp2 = Date.now();
    if (await countFavoritesInStore(tx, storeId2, input.favoriteProductIds) !== input.favoriteProductIds.length) throw new CustomerDomainError(422, "Um ou mais favoritos n\xE3o pertencem a esta loja.");
    const existing = await findCustomerInStore(tx, id, storeId2);
    if (!existing) await requirePlanQuota({ storeId: storeId2, field: "customers", countSql: "SELECT COUNT(*) AS total FROM ld_customers WHERE store_id = ?", one: tx.one, createError: (status, message) => new CustomerDomainError(status, message) });
    await upsertCustomer(tx, { id, storeId: storeId2, input, timestamp: timestamp2, existing });
    return presentDetail(await detailedCustomer(tx, id, storeId2));
  });
}
async function requireStore2(storeId2, userId) {
  const store = await findStoreOwnedByUser2(storeId2, userId);
  if (!store) throw new CustomerDomainError(404, "Loja n\xE3o encontrada.");
  return store;
}
async function requireCustomer(storeId2, customerId, userId) {
  const customer = await findCustomerOwnedByUser(storeId2, customerId, userId);
  if (!customer) throw new CustomerDomainError(404, "Cliente n\xE3o encontrado.");
  return customer;
}
function presentDetail(detail) {
  return publicCustomer(detail.customer, detail.phones, detail.addresses, detail.favorites, detail.purchases);
}

// server/modules/customers/controller.js
var router8 = Router8();
var route3 = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
router8.get("/stores/:storeId/customers", route3(async (req, res) => {
  const listInput = getCustomerListInput({ ...req.query, storeId: req.params.storeId });
  return res.json(await listCustomers({ storeId: req.params.storeId, userId: req.user.id, listInput }));
}));
router8.get("/stores/:storeId/customers/:customerId", route3(async (req, res) => res.json({ customer: await getCustomer({ storeId: req.params.storeId, customerId: req.params.customerId, userId: req.user.id }) })));
router8.post("/stores/:storeId/customers", route3(async (req, res) => res.status(201).json({ customer: await createCustomer({ storeId: req.params.storeId, userId: req.user.id, input: assertValidInput(parseCustomerInput(req.body)) }) })));
router8.patch("/stores/:storeId/customers/:customerId", route3(async (req, res) => {
  const existing = await getCustomer({ storeId: req.params.storeId, customerId: req.params.customerId, userId: req.user.id });
  return res.json({ customer: await updateCustomer({ storeId: req.params.storeId, customerId: req.params.customerId, userId: req.user.id, input: assertValidInput(parseCustomerInput({ ...existing, ...req.body })) }) });
}));
router8.delete("/stores/:storeId/customers/:customerId", route3(async (req, res) => {
  await removeCustomer({ storeId: req.params.storeId, customerId: req.params.customerId, userId: req.user.id });
  return res.json({ ok: true });
}));
router8.post("/stores/:storeId/customers/:customerId/purchases", route3(async (req, res) => res.status(201).json({ customer: await addPurchase({ storeId: req.params.storeId, customerId: req.params.customerId, userId: req.user.id, input: assertValidInput(parsePurchaseInput(req.body)) }) })));
router8.delete("/stores/:storeId/customers/:customerId/purchases/:purchaseId", route3(async (req, res) => res.json({ customer: await removePurchase({ storeId: req.params.storeId, customerId: req.params.customerId, purchaseId: req.params.purchaseId, userId: req.user.id }) })));
router8.use((error, _req, res, next) => error instanceof CustomerValidationError || error instanceof CustomerDomainError ? res.status(error.status).json({ error: error.message }) : next(error));
var controller_default8 = router8;

// server/modules/coupons/controller.js
import { Router as Router9 } from "express";
import { randomUUID as randomUUID10 } from "node:crypto";

// server/modules/coupons/repository.js
async function assertCouponStore(storeId2, userId) {
  const store = await one("SELECT id FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId]);
  if (!store) throw new RequestError(404, "Loja n\xE3o encontrada.");
  return store;
}
async function listCouponRows(storeId2, filters, timestamp2) {
  const where = ["store_id = ?"];
  const params = [storeId2];
  if (filters.query) {
    where.push("code LIKE ?");
    params.push(`%${filters.query}%`);
  }
  if (filters.status === "active") where.push("active = 1");
  if (filters.status === "inactive") where.push("active = 0");
  if (filters.status === "expired") {
    where.push("expires_at IS NOT NULL AND expires_at < ?");
    params.push(timestamp2);
  }
  const predicate = where.join(" AND ");
  const [total, summary, rows] = await Promise.all([one(`SELECT COUNT(*) AS total FROM ld_coupons WHERE ${predicate}`, params), one("SELECT COUNT(*) AS total, SUM(active = 1) AS active, SUM(discount_type = 'free_shipping') AS free_shipping, SUM(usage_count) AS uses FROM ld_coupons WHERE store_id = ?", [storeId2]), query(`SELECT * FROM ld_coupons WHERE ${predicate} ORDER BY created_at DESC LIMIT ${filters.limit} OFFSET ${filters.offset}`, params)]);
  return { total: Number(total?.total || 0), summary, rows };
}
async function findCoupon(storeId2, couponId) {
  return one("SELECT * FROM ld_coupons WHERE id = ? AND store_id = ?", [couponId, storeId2]);
}
async function customerHasPurchases(storeId2, customerId) {
  return one("SELECT purchases.id FROM ld_customer_purchases AS purchases JOIN ld_customers AS customers ON customers.id = purchases.customer_id WHERE customers.store_id = ? AND customers.id = ? LIMIT 1", [storeId2, customerId]);
}
async function insertCoupon(coupon) {
  await query("INSERT INTO ld_coupons (id, store_id, code, discount_type, percentage_off, amount_off_cents, minimum_order_cents, expires_at, usage_limit, usage_count, free_shipping_states, active, new_users_only, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)", [coupon.id, coupon.storeId, coupon.code, coupon.discountType, coupon.percentageOff, coupon.amountOffCents, coupon.minimumOrderCents, coupon.expiresAt, coupon.usageLimit, JSON.stringify(coupon.freeShippingStates), coupon.active ? 1 : 0, coupon.newUsersOnly ? 1 : 0, coupon.createdAt, coupon.updatedAt]);
}
async function updateCoupon(storeId2, couponId, input, timestamp2) {
  await query("UPDATE ld_coupons SET code = ?, discount_type = ?, percentage_off = ?, amount_off_cents = ?, minimum_order_cents = ?, expires_at = ?, usage_limit = ?, free_shipping_states = ?, active = ?, new_users_only = ?, updated_at = ? WHERE id = ? AND store_id = ?", [input.code, input.discountType, input.percentageOff, input.amountOffCents, input.minimumOrderCents, input.expiresAt, input.usageLimit, JSON.stringify(input.freeShippingStates), input.active ? 1 : 0, input.newUsersOnly ? 1 : 0, timestamp2, couponId, storeId2]);
}
async function removeCoupon(storeId2, couponId) {
  const result = await query("DELETE FROM ld_coupons WHERE id = ? AND store_id = ?", [couponId, storeId2]);
  if (!result?.affectedRows) throw new RequestError(404, "Cupom n\xE3o encontrado.");
}

// server/modules/coupons/validation.js
var validStates = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
var types = ["percentage", "fixed", "free_shipping"];
function parseCouponFilters(source) {
  const { page, limit, offset } = boundedPagination(source, { defaultLimit: 20, maxLimit: 100, maxPage: 1e5 });
  const status = source?.status === void 0 ? "" : String(source.status);
  const query3 = source?.q === void 0 ? "" : String(source.q).trim().toUpperCase();
  if (status && !["active", "inactive", "expired"].includes(status)) throw new RequestError(422, "Informe um status de cupom v\xE1lido.");
  if (query3.length > 64) throw new RequestError(422, "Informe uma busca de cupons com at\xE9 64 caracteres.");
  return { page, limit, offset, query: query3, status };
}
function parseCouponInput(source = {}, existing = null) {
  const read = (key, fallback = "") => source[key] === void 0 ? fallback : source[key];
  const code = normalizeCode(read("code", existing?.code));
  const discountType = String(read("discountType", existing?.discount_type)).trim();
  const percentageOff = discountType === "percentage" ? parseAmount(read("percentageOff", existing?.percentage_off), 0.01, 100) : null;
  const amountOffCents = discountType === "fixed" ? parseInteger(read("amountOffCents", existing?.amount_off_cents), 1, 1e7) : null;
  const minimumOrderCents = parseInteger(read("minimumOrderCents", existing?.minimum_order_cents), 0, 1e8);
  const expiresAt = nullableTimestamp(read("expiresAt", existing?.expires_at));
  const usageLimit = nullableInteger(read("usageLimit", existing?.usage_limit), 1, 1e7);
  const freeShippingStates = parseStates(read("freeShippingStates", existing?.free_shipping_states));
  const active = parseBoolean2(read("active", existing?.active ?? true));
  const newUsersOnly = parseBoolean2(read("newUsersOnly", existing?.new_users_only ?? false));
  if (!code) throw new RequestError(422, "Informe um c\xF3digo de cupom com letras, n\xFAmeros, h\xEDfen ou sublinhado.");
  if (!types.includes(discountType)) throw new RequestError(422, "Selecione um tipo de benef\xEDcio v\xE1lido.");
  if (discountType === "percentage" && percentageOff === null) throw new RequestError(422, "Informe uma porcentagem entre 0,01% e 100%.");
  if (discountType === "fixed" && amountOffCents === null) throw new RequestError(422, "Informe um valor fixo de desconto v\xE1lido.");
  if (minimumOrderCents === null) throw new RequestError(422, "Informe um valor m\xEDnimo de compra v\xE1lido.");
  if (expiresAt === false) throw new RequestError(422, "Informe uma data de validade v\xE1lida.");
  if (usageLimit === false) throw new RequestError(422, "Informe uma quantidade m\xE1xima de usos v\xE1lida.");
  if (freeShippingStates === false) throw new RequestError(422, "Informe estados v\xE1lidos para o frete gr\xE1tis.");
  if (active === null) throw new RequestError(422, "Informe se o cupom est\xE1 ativo.");
  if (newUsersOnly === null) throw new RequestError(422, "Informe se o cupom \xE9 exclusivo para novos usu\xE1rios.");
  return { code, discountType, percentageOff, amountOffCents, minimumOrderCents, expiresAt, usageLimit, freeShippingStates: discountType === "free_shipping" ? freeShippingStates : [], active, newUsersOnly };
}
function publicCoupon(row) {
  return { id: row.id, storeId: row.store_id || row.storeId, code: row.code, discountType: row.discount_type || row.discountType, percentageOff: row.percentage_off == null ? null : Number(row.percentage_off), amountOffCents: row.amount_off_cents == null ? null : Number(row.amount_off_cents), minimumOrderCents: Number(row.minimum_order_cents || row.minimumOrderCents || 0), expiresAt: row.expires_at == null ? null : Number(row.expires_at), usageLimit: row.usage_limit == null ? null : Number(row.usage_limit), usageCount: Number(row.usage_count || row.usageCount || 0), freeShippingStates: uniqueStates(row.free_shipping_states || row.freeShippingStates), active: Boolean(row.active), newUsersOnly: Boolean(row.new_users_only ?? row.newUsersOnly), createdAt: Number(row.created_at || row.createdAt || 0), updatedAt: Number(row.updated_at || row.updatedAt || 0) };
}
function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9_-]/g, "").slice(0, 64);
}
function parseInteger(value, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}
function nullableInteger(value, min, max) {
  if (value == null || value === "") return null;
  const number = parseInteger(value, min, max);
  return number === null ? false : number;
}
function parseAmount(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? Number(number.toFixed(2)) : null;
}
function nullableTimestamp(value) {
  if (value == null || value === "") return null;
  const timestamp2 = Number(value);
  return Number.isFinite(timestamp2) && timestamp2 > 0 ? Math.floor(timestamp2) : false;
}
function parseBoolean2(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}
function parseStates(value) {
  if (value == null || value === "") return [];
  let source = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return false;
    }
  }
  if (!Array.isArray(source)) return false;
  const states = source.map((state) => String(state || "").trim().toUpperCase());
  return states.every((state) => validStates.includes(state)) ? [...new Set(states)] : false;
}
function uniqueStates(value) {
  let source = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }
  return [...new Set(Array.isArray(source) ? source.map((state) => String(state || "").trim().toUpperCase()).filter((state) => validStates.includes(state)) : [])];
}

// server/modules/coupons/controller.js
var router9 = Router9();
router9.get("/stores/:storeId/coupons", async (req, res, next) => {
  try {
    await assertCouponStore(req.params.storeId, req.user.id);
    const filters = parseCouponFilters(req.query);
    const result = await listCouponRows(req.params.storeId, filters, Date.now());
    return res.json({ data: result.rows.map(publicCoupon), summary: { total: Number(result.summary?.total || 0), active: Number(result.summary?.active || 0), freeShipping: Number(result.summary?.free_shipping || 0), uses: Number(result.summary?.uses || 0) }, pagination: { page: filters.page, limit: filters.limit, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / filters.limit)) } });
  } catch (error) {
    next(error);
  }
});
router9.get("/stores/:storeId/coupons/:couponId", async (req, res, next) => {
  try {
    await assertCouponStore(req.params.storeId, req.user.id);
    const coupon = await findCoupon(req.params.storeId, req.params.couponId);
    if (!coupon) throw new RequestError(404, "Cupom n\xE3o encontrado.");
    return res.json({ coupon: publicCoupon(coupon) });
  } catch (error) {
    next(error);
  }
});
router9.post("/stores/:storeId/coupons/:couponId/validate", async (req, res, next) => {
  try {
    await assertCouponStore(req.params.storeId, req.user.id);
    const coupon = await findCoupon(req.params.storeId, req.params.couponId);
    if (!coupon) throw new RequestError(404, "Cupom n\xE3o encontrado.");
    const now3 = Date.now();
    if (!coupon.active || coupon.expires_at && Number(coupon.expires_at) < now3 || coupon.usage_limit && Number(coupon.usage_count) >= Number(coupon.usage_limit)) throw new RequestError(422, "Este cupom n\xE3o est\xE1 dispon\xEDvel para uso.");
    if (coupon.new_users_only) {
      const customerId = String(req.body?.customerId || "").trim();
      if (!customerId) throw new RequestError(422, "Informe o cliente para validar este cupom exclusivo para novos usu\xE1rios.");
      if (await customerHasPurchases(req.params.storeId, customerId)) throw new RequestError(422, "Este cupom \xE9 exclusivo para novos usu\xE1rios sem compras anteriores.");
    }
    return res.json({ coupon: publicCoupon(coupon), eligible: true });
  } catch (error) {
    next(error);
  }
});
router9.post("/stores/:storeId/coupons", async (req, res, next) => {
  try {
    await assertCouponStore(req.params.storeId, req.user.id);
    await requirePlanQuota({ storeId: req.params.storeId, field: "coupons", countSql: "SELECT COUNT(*) AS total FROM ld_coupons WHERE store_id = ?", one, createError: (status, message) => new RequestError(status, message) });
    const input = parseCouponInput(req.body);
    const timestamp2 = Date.now();
    const coupon = { id: randomUUID10(), storeId: req.params.storeId, ...input, createdAt: timestamp2, updatedAt: timestamp2 };
    await insertCoupon(coupon);
    await syncStoreContractToR2({ storeId: req.params.storeId, userId: req.user.id });
    return res.status(201).json({ coupon: publicCoupon({ ...coupon, usage_count: 0, free_shipping_states: JSON.stringify(coupon.freeShippingStates), new_users_only: coupon.newUsersOnly ? 1 : 0 }) });
  } catch (error) {
    next(error);
  }
});
router9.patch("/stores/:storeId/coupons/:couponId", async (req, res, next) => {
  try {
    await assertCouponStore(req.params.storeId, req.user.id);
    const existing = await findCoupon(req.params.storeId, req.params.couponId);
    if (!existing) throw new RequestError(404, "Cupom n\xE3o encontrado.");
    const input = parseCouponInput(req.body, existing);
    const timestamp2 = Date.now();
    await updateCoupon(req.params.storeId, existing.id, input, timestamp2);
    await syncStoreContractToR2({ storeId: req.params.storeId, userId: req.user.id });
    return res.json({ coupon: publicCoupon({ ...existing, code: input.code, discount_type: input.discountType, percentage_off: input.percentageOff, amount_off_cents: input.amountOffCents, minimum_order_cents: input.minimumOrderCents, expires_at: input.expiresAt, usage_limit: input.usageLimit, free_shipping_states: JSON.stringify(input.freeShippingStates), active: input.active ? 1 : 0, new_users_only: input.newUsersOnly ? 1 : 0, updated_at: timestamp2 }) });
  } catch (error) {
    next(error);
  }
});
router9.delete("/stores/:storeId/coupons/:couponId", async (req, res, next) => {
  try {
    await assertCouponStore(req.params.storeId, req.user.id);
    await removeCoupon(req.params.storeId, req.params.couponId);
    await syncStoreContractToR2({ storeId: req.params.storeId, userId: req.user.id });
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
router9.use((error, _req, res, next) => {
  if (error instanceof RequestError) return res.status(error.status).json({ error: error.message, code: error.code });
  if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "J\xE1 existe um cupom com este c\xF3digo nesta loja." });
  return next(error);
});
var controller_default9 = router9;

// server/modules/banners/controller.js
import { Router as Router10 } from "express";
import multer3 from "multer";

// server/modules/banners/validation.js
var PAGES = ["home", "categories", "products"];
var POSITIONS = ["top", "middle", "after_row_1", "after_row_2", "after_row_3", "after_row_4", "final"];
var BREAKPOINTS = { desktop: { width: 1280, height: 360 }, mobile: { width: 750, height: 600 } };
var FORMATS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
var BannerValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.status = 422;
  }
};
function parseBannerInput(source = {}, existing = {}) {
  const title = cleanText(source.title === void 0 ? existing.title ?? "Banner" : source.title, 1, 160);
  const pages = parseUnique(source.pages === void 0 ? existing.pages : source.pages, PAGES);
  const categoryIds = parseUnique(source.categoryIds === void 0 ? existing.category_ids : source.categoryIds, null);
  const position = String(source.position === void 0 ? existing.display_position ?? "top" : source.position);
  const active = parseActive(source.active === void 0 ? existing.active ?? true : source.active);
  const bannerKind = String(source.bannerKind === void 0 ? existing.banner_kind ?? "hero" : source.bannerKind).trim();
  const subtitle = cleanText(source.subtitle === void 0 ? existing.subtitle ?? "" : source.subtitle, 0, 300);
  const targetUrl = cleanTargetUrl(source.targetUrl === void 0 ? existing.target_url ?? "" : source.targetUrl);
  const buttonText = cleanText(source.buttonText === void 0 ? existing.button_text ?? "" : source.buttonText, 0, 80);
  const sortOrder = parseSortOrder(source.sortOrder === void 0 ? existing.sort_order ?? 0 : source.sortOrder);
  const draftId = source.draftId === void 0 ? "" : String(source.draftId || "").trim();
  const uploadIds = source.uploadIds === void 0 ? [] : parseUnique(source.uploadIds, null);
  if (!title) throw new BannerValidationError("Informe um nome interno para o banner.");
  if (!Array.isArray(pages) || !Array.isArray(categoryIds)) throw new BannerValidationError("Informe p\xE1ginas e categorias v\xE1lidas para o banner.");
  if (!pages.length) throw new BannerValidationError("Selecione ao menos uma p\xE1gina para exibir o banner.");
  if (pages.includes("categories") && !categoryIds.length) throw new BannerValidationError("Selecione ao menos uma categoria para exibir o banner nessa p\xE1gina.");
  if (!POSITIONS.includes(position)) throw new BannerValidationError("Selecione uma posi\xE7\xE3o v\xE1lida para o banner.");
  if (active === null) throw new BannerValidationError("Informe se o banner est\xE1 ativo.");
  if (!["hero", "mini"].includes(bannerKind)) throw new BannerValidationError("Selecione um tipo de banner v\xE1lido.");
  if (targetUrl === false) throw new BannerValidationError("Informe um destino v\xE1lido, come\xE7ando por / ou https://.");
  if (sortOrder === null) throw new BannerValidationError("Informe uma ordem de vitrine v\xE1lida.");
  if (draftId && !isUuid(draftId)) throw new BannerValidationError("Rascunho de banner inv\xE1lido.");
  if (uploadIds === false) throw new BannerValidationError("Uploads de banner inv\xE1lidos.");
  const input = { title, subtitle, targetUrl, buttonText, bannerKind, sortOrder, pages, categoryIds: pages.includes("categories") ? categoryIds : [], position, active };
  if (draftId || uploadIds.length) Object.assign(input, { draftId, uploadIds });
  return input;
}
function cleanTargetUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("/") || /^https:\/\//i.test(normalized)) return normalized.slice(0, 600);
  return false;
}
function parseSortOrder(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 9999 ? parsed : null;
}
function parseBannerImagePatch(source = {}, existing = {}) {
  const crop = parseCrop(source, existing);
  const active = source.active === void 0 ? Boolean(existing.active ?? true) : parseActive(source.active);
  if (active === null) throw new BannerValidationError("Informe se a imagem do banner est\xE1 ativa.");
  return { crop, active };
}
function getBannerMediaInput(body, file) {
  const breakpoint = String(body?.breakpoint || "");
  const requirement = BREAKPOINTS[breakpoint];
  if (!requirement || !file) throw new BannerValidationError("Envie uma imagem e selecione a vers\xE3o desktop ou mobile.");
  const extension = FORMATS[file.mimetype];
  if (!extension || !validImageSignature2(file.buffer, file.mimetype)) throw new BannerValidationError("Envie uma imagem JPG, PNG ou WebP v\xE1lida.");
  return { breakpoint, requirement, extension, crop: parseCrop(body) };
}
function assertMinimumDimensions(dimensions, requirement, breakpoint) {
  if (!dimensions.width || !dimensions.height || dimensions.width < requirement.width || dimensions.height < requirement.height) {
    throw new BannerValidationError(`A imagem ${breakpoint === "desktop" ? "desktop" : "mobile"} deve ter no m\xEDnimo ${requirement.width}\xD7${requirement.height}px.`);
  }
}
function parseCrop(source = {}, existing = {}) {
  const number = (value, fallback, min, max) => {
    const parsed = value === void 0 ? Number(fallback) : value === null ? NaN : Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? Number(parsed.toFixed(2)) : null;
  };
  const x = number(source.cropX, existing.crop_x ?? 50, 0, 100);
  const y = number(source.cropY, existing.crop_y ?? 50, 0, 100);
  const zoom = number(source.cropZoom, existing.crop_zoom ?? 1, 1, 3);
  if (x === null || y === null || zoom === null) throw new BannerValidationError("Ajuste de recorte ou zoom inv\xE1lido.");
  return { x, y, zoom };
}
function validImageSignature2(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mime === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}
function parseUnique(value, allowed) {
  if (value === void 0 || value === null || value === "") return [];
  let input = value;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      return false;
    }
  }
  if (!Array.isArray(input)) return false;
  const values = input.map((item) => String(item || "").trim()).filter(Boolean);
  const valid = allowed ? (item) => allowed.includes(item) : isUuid;
  return values.every(valid) ? [...new Set(values)] : false;
}
function parseActive(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}
function cleanText(value, min, max) {
  const text4 = String(value || "").trim();
  return text4.length >= min && text4.length <= max ? text4 : "";
}
function isUuid(value) {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(String(value || ""));
}

// server/modules/banners/service.js
import { randomUUID as randomUUID12 } from "node:crypto";
import { imageSize } from "image-size";

// server/modules/banners/repository.js
import { randomUUID as randomUUID11 } from "node:crypto";
var withinTransaction3 = transaction;
function findStoreOwnedByUser3(storeId2, userId) {
  return one("SELECT id FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId]);
}
function findBannerInStore(storeId2, bannerId) {
  return one("SELECT * FROM ld_banners WHERE id = ? AND store_id = ?", [bannerId, storeId2]);
}
async function listBannersWithImages(storeId2) {
  const banners = await query("SELECT * FROM ld_banners WHERE store_id = ? ORDER BY banner_kind ASC, sort_order ASC, created_at DESC LIMIT 100", [storeId2]);
  if (!banners.length) return { banners, images: [] };
  const images = await query(`SELECT * FROM ld_banner_images WHERE banner_id IN (${banners.map(() => "?").join(",")}) ORDER BY breakpoint ASC, sort_order ASC`, banners.map((banner) => banner.id));
  return { banners, images };
}
function listBannerImages(bannerId, breakpoint = null) {
  return breakpoint ? query("SELECT * FROM ld_banner_images WHERE banner_id = ? AND breakpoint = ? ORDER BY sort_order ASC", [bannerId, breakpoint]) : query("SELECT * FROM ld_banner_images WHERE banner_id = ? ORDER BY breakpoint ASC, sort_order ASC", [bannerId]);
}
function findBannerImage(bannerId, imageId) {
  return one("SELECT * FROM ld_banner_images WHERE id = ? AND banner_id = ?", [imageId, bannerId]);
}
async function countExistingCategories(storeId2, categoryIds) {
  if (!categoryIds.length) return 0;
  const rows = await query(`SELECT id FROM ld_product_categories WHERE store_id = ? AND id IN (${categoryIds.map(() => "?").join(",")})`, [storeId2, ...categoryIds]);
  return rows.length;
}
function insertBanner(banner, executor = { query }) {
  return executor.query("INSERT INTO ld_banners (id, store_id, banner_kind, title, subtitle, target_url, button_text, pages, category_ids, display_position, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [banner.id, banner.storeId, banner.bannerKind, banner.title, banner.subtitle, banner.targetUrl, banner.buttonText, JSON.stringify(banner.pages), JSON.stringify(banner.categoryIds), banner.position, banner.sortOrder, banner.active ? 1 : 0, banner.createdAt, banner.updatedAt]);
}
function updateBanner(banner, input, timestamp2) {
  return query("UPDATE ld_banners SET banner_kind = ?, title = ?, subtitle = ?, target_url = ?, button_text = ?, pages = ?, category_ids = ?, display_position = ?, sort_order = ?, active = ?, updated_at = ? WHERE id = ? AND store_id = ?", [input.bannerKind, input.title, input.subtitle, input.targetUrl, input.buttonText, JSON.stringify(input.pages), JSON.stringify(input.categoryIds), input.position, input.sortOrder, input.active ? 1 : 0, timestamp2, banner.id, banner.store_id]);
}
function deleteBanner(bannerId, storeId2) {
  return query("DELETE FROM ld_banners WHERE id = ? AND store_id = ?", [bannerId, storeId2]);
}
function insertBannerImage(image) {
  return query("INSERT INTO ld_banner_images (id, banner_id, breakpoint, storage_key, url, content_type, file_size, width, height, crop_x, crop_y, crop_zoom, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [image.id, image.bannerId, image.breakpoint, image.storageKey, image.url, image.contentType, image.fileSize, image.width, image.height, image.cropX, image.cropY, image.cropZoom, image.sortOrder, image.active === false ? 0 : 1, image.createdAt, image.updatedAt]);
}
function updateBannerImage(imageId, patch, timestamp2) {
  return query("UPDATE ld_banner_images SET crop_x = ?, crop_y = ?, crop_zoom = ?, active = ?, updated_at = ? WHERE id = ?", [patch.crop.x, patch.crop.y, patch.crop.zoom, patch.active ? 1 : 0, timestamp2, imageId]);
}
function deleteBannerImage(imageId) {
  return query("DELETE FROM ld_banner_images WHERE id = ?", [imageId]);
}
function listStagedUploadBreakpoints(storeId2, userId, draftId) {
  return query("SELECT breakpoint FROM ld_banner_uploads WHERE store_id = ? AND user_id = ? AND draft_id = ? AND status = 'staged'", [storeId2, userId, draftId]);
}
function insertStagedUpload2(upload3) {
  return query("INSERT INTO ld_banner_uploads (id, store_id, user_id, draft_id, breakpoint, storage_key, url, content_type, file_size, width, height, crop_x, crop_y, crop_zoom, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'staged', ?, ?)", [upload3.id, upload3.storeId, upload3.userId, upload3.draftId, upload3.breakpoint, upload3.storageKey, upload3.url, upload3.contentType, upload3.fileSize, upload3.width, upload3.height, upload3.cropX, upload3.cropY, upload3.cropZoom, upload3.createdAt, upload3.expiresAt]);
}
function findStagedUpload2(storeId2, userId, uploadId) {
  return one("SELECT * FROM ld_banner_uploads WHERE id = ? AND store_id = ? AND user_id = ? AND status = 'staged'", [uploadId, storeId2, userId]);
}
function deleteStagedUpload2(uploadId) {
  return query("DELETE FROM ld_banner_uploads WHERE id = ? AND status = 'staged'", [uploadId]);
}
function lockStagedUploads2(tx, { storeId: storeId2, userId, draftId, uploadIds }) {
  if (!uploadIds.length) return [];
  return tx.query(`SELECT * FROM ld_banner_uploads WHERE id IN (${uploadIds.map(() => "?").join(", ")}) AND store_id = ? AND user_id = ? AND draft_id = ? AND status = 'staged' AND expires_at > ? FOR UPDATE`, [...uploadIds, storeId2, userId, draftId, Date.now()]);
}
function listBannerImagesInTransaction(tx, bannerId) {
  return tx.query("SELECT breakpoint FROM ld_banner_images WHERE banner_id = ?", [bannerId]);
}
async function attachStagedUploads(tx, { bannerId, uploads, timestamp: timestamp2, startOrders = {} }) {
  const orderByBreakpoint = { ...startOrders };
  const images = [];
  for (const upload3 of uploads) {
    const sortOrder = orderByBreakpoint[upload3.breakpoint] || 0;
    orderByBreakpoint[upload3.breakpoint] = sortOrder + 1;
    const image = { id: randomUUID11(), banner_id: bannerId, stagedUploadId: upload3.id, breakpoint: upload3.breakpoint, storage_key: upload3.storage_key, url: upload3.url, content_type: upload3.content_type, file_size: upload3.file_size, width: upload3.width, height: upload3.height, crop_x: upload3.crop_x, crop_y: upload3.crop_y, crop_zoom: upload3.crop_zoom, sort_order: sortOrder, active: 1, created_at: timestamp2, updated_at: timestamp2 };
    await tx.query("INSERT INTO ld_banner_images (id, banner_id, breakpoint, storage_key, url, content_type, file_size, width, height, crop_x, crop_y, crop_zoom, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [image.id, image.banner_id, image.breakpoint, image.storage_key, image.url, image.content_type, image.file_size, image.width, image.height, image.crop_x, image.crop_y, image.crop_zoom, image.sort_order, image.active, image.created_at, image.updated_at]);
    images.push(image);
  }
  await tx.query(`UPDATE ld_banner_uploads SET status = 'attached', attached_at = ? WHERE id IN (${uploads.map(() => "?").join(", ")})`, [timestamp2, ...uploads.map((upload3) => upload3.id)]);
  return images;
}

// server/modules/banners/presenters.js
var PAGES2 = ["home", "categories", "products"];
function publicImage(row) {
  return {
    id: row.id,
    bannerId: row.banner_id || row.bannerId,
    stagedUploadId: row.staged_upload_id || row.stagedUploadId || void 0,
    breakpoint: row.breakpoint,
    url: row.url,
    width: Number(row.width),
    height: Number(row.height),
    cropX: Number(row.crop_x ?? row.cropX ?? 50),
    cropY: Number(row.crop_y ?? row.cropY ?? 50),
    cropZoom: Number(row.crop_zoom ?? row.cropZoom ?? 1),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    active: row.active === void 0 || row.active === null ? true : Boolean(row.active),
    createdAt: Number(row.created_at ?? row.createdAt ?? 0)
  };
}
function publicBanner(row, images = []) {
  return {
    id: row.id,
    storeId: row.store_id || row.storeId,
    bannerKind: row.banner_kind || row.bannerKind || "hero",
    title: row.title,
    subtitle: row.subtitle || "",
    targetUrl: row.target_url || row.targetUrl || "",
    buttonText: row.button_text || row.buttonText || "",
    pages: unique(parseJson3(row.pages, []), PAGES2),
    categoryIds: unique(parseJson3(row.category_ids, []), null),
    position: row.display_position || row.position,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    active: Boolean(row.active),
    images: images.map(publicImage),
    createdAt: Number(row.created_at ?? row.createdAt ?? 0),
    updatedAt: Number(row.updated_at ?? row.updatedAt ?? 0)
  };
}
function parseJson3(value, fallback) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value || fallback;
  } catch {
    return fallback;
  }
}
function unique(value, allowed) {
  const values = Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const validUuid3 = (item) => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(item);
  return [...new Set(allowed ? values.filter((item) => allowed.includes(item)) : values.filter(validUuid3))];
}

// server/modules/banners/service.js
var BannerDomainError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function listBanners({ storeId: storeId2, userId }) {
  await requireStore3({ storeId: storeId2, userId });
  const { banners, images } = await listBannersWithImages(storeId2);
  return banners.map((banner) => publicBanner(banner, images.filter((image) => image.banner_id === banner.id)));
}
async function getBanner({ storeId: storeId2, bannerId, userId }) {
  const banner = await requireBanner({ storeId: storeId2, bannerId, userId });
  return publicBanner(banner, await listBannerImages(banner.id));
}
async function createBanner({ storeId: storeId2, userId, input }) {
  await requireStore3({ storeId: storeId2, userId });
  await assertCategoriesBelongToStore(storeId2, input.categoryIds);
  const timestamp2 = Date.now();
  const banner = { id: randomUUID12(), storeId: storeId2, ...input, createdAt: timestamp2, updatedAt: timestamp2 };
  const created = await withinTransaction3(async (tx) => {
    const activePlan = await getActiveStorePlanLimits({ storeId: storeId2, one: tx.one });
    if (!activePlan) throw new BannerDomainError(402, "Escolha ou regularize um plano ativo para continuar esta operação.");
    await requirePlanQuota({ storeId: storeId2, field: "banners", countSql: "SELECT COUNT(*) AS total FROM ld_banners WHERE store_id = ?", one: tx.one, createError: (status, message) => new BannerDomainError(status, message) });
    const uploadIds = input.uploadIds || [];
    const uploads = await lockStagedUploads2(tx, { storeId: storeId2, userId, draftId: input.draftId, uploadIds });
    if (uploads.length !== uploadIds.length) throw new BannerDomainError(422, "Uma ou mais imagens n\xE3o est\xE3o mais dispon\xEDveis. Envie-as novamente.");
    maxNewMedia({ limits: activePlan.limits, field: "bannerImages", existing: 0, incoming: uploads.length, createError: (status, message) => new BannerDomainError(status, message) });
    await insertBanner(banner, tx);
    const attached = uploads.length ? await attachStagedUploads(tx, { bannerId: banner.id, uploads, timestamp: timestamp2 }) : [];
    return publicBanner({ ...banner, banner_kind: banner.bannerKind, subtitle: banner.subtitle, target_url: banner.targetUrl, button_text: banner.buttonText, sort_order: banner.sortOrder, pages: JSON.stringify(banner.pages), category_ids: JSON.stringify(banner.categoryIds), display_position: banner.position }, attached);
  });
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return created;
}
async function updateBanner2({ storeId: storeId2, bannerId, userId, input }) {
  const existing = await requireBanner({ storeId: storeId2, bannerId, userId });
  await assertCategoriesBelongToStore(storeId2, input.categoryIds);
  const timestamp2 = Date.now();
  await updateBanner(existing, input, timestamp2);
  const images = await listBannerImages(existing.id);
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return publicBanner({ ...existing, banner_kind: input.bannerKind, title: input.title, subtitle: input.subtitle, target_url: input.targetUrl, button_text: input.buttonText, sort_order: input.sortOrder, pages: JSON.stringify(input.pages), category_ids: JSON.stringify(input.categoryIds), display_position: input.position, active: input.active ? 1 : 0, updated_at: timestamp2 }, images);
}
async function removeBanner({ storeId: storeId2, bannerId, userId }) {
  const banner = await requireBanner({ storeId: storeId2, bannerId, userId });
  const images = await listBannerImages(banner.id);
  await deleteBanner(banner.id, storeId2);
  await Promise.all(images.map((image) => getProductStorage().remove(image.storage_key)));
  await syncStoreContractToR2({ storeId: storeId2, userId });
}
async function addBannerImage({ storeId: storeId2, bannerId, userId, file, mediaInput }) {
  const banner = await requireBanner({ storeId: storeId2, bannerId, userId });
  const dimensions = imageSize(file.buffer);
  assertMinimumDimensions(dimensions, mediaInput.requirement, mediaInput.breakpoint);
  const allImages = await listBannerImages(banner.id);
  const existing = allImages.filter((image) => image.breakpoint === mediaInput.breakpoint);
  const activePlan = await getActiveStorePlanLimits({ storeId: storeId2, one });
  if (!activePlan) throw new BannerDomainError(402, "Escolha ou regularize um plano ativo para enviar mídias.");
  maxNewMedia({ limits: activePlan.limits, field: "bannerImages", existing: allImages.length, createError: (status, message) => new BannerDomainError(status, message) });
  const id = randomUUID12();
  const stored = await getProductStorage().put({ key: bannerMediaKey({ accountId: userId, storeId: storeId2, bannerId: banner.id, breakpoint: mediaInput.breakpoint, assetId: id, extension: mediaInput.extension }), body: file.buffer, contentType: file.mimetype });
  const timestamp2 = Date.now();
  const image = { id, bannerId: banner.id, breakpoint: mediaInput.breakpoint, storageKey: stored.key, url: stored.url, contentType: file.mimetype, fileSize: file.size, width: dimensions.width, height: dimensions.height, cropX: mediaInput.crop.x, cropY: mediaInput.crop.y, cropZoom: mediaInput.crop.zoom, sortOrder: existing.length, active: true, createdAt: timestamp2, updatedAt: timestamp2 };
  await insertBannerImage(image);
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return publicImage({ ...image, banner_id: image.bannerId, storage_key: image.storageKey, content_type: image.contentType, file_size: image.fileSize, crop_x: image.cropX, crop_y: image.cropY, crop_zoom: image.cropZoom, sort_order: image.sortOrder, created_at: timestamp2, updated_at: timestamp2 });
}
async function stageBannerImage({ storeId: storeId2, userId, file, mediaInput, draftId }) {
  await requireStore3({ storeId: storeId2, userId });
  const dimensions = imageSize(file.buffer);
  assertMinimumDimensions(dimensions, mediaInput.requirement, mediaInput.breakpoint);
  const existing = await listStagedUploadBreakpoints(storeId2, userId, draftId);
  const activePlan = await getActiveStorePlanLimits({ storeId: storeId2, one });
  if (!activePlan) throw new BannerDomainError(402, "Escolha ou regularize um plano ativo para enviar mídias.");
  maxNewMedia({ limits: activePlan.limits, field: "bannerImages", existing: existing.length, createError: (status, message) => new BannerDomainError(status, message) });
  const id = randomUUID12();
  const stored = await getProductStorage().put({ key: bannerMediaKey({ accountId: userId, storeId: storeId2, bannerId: draftId, breakpoint: mediaInput.breakpoint, assetId: id, extension: mediaInput.extension }), body: file.buffer, contentType: file.mimetype });
  const timestamp2 = Date.now();
  const upload3 = { id, storeId: storeId2, userId, draftId, breakpoint: mediaInput.breakpoint, storageKey: stored.key, url: stored.url, contentType: file.mimetype, fileSize: file.size, width: dimensions.width, height: dimensions.height, cropX: mediaInput.crop.x, cropY: mediaInput.crop.y, cropZoom: mediaInput.crop.zoom, createdAt: timestamp2, expiresAt: timestamp2 + 864e5 };
  await insertStagedUpload2(upload3);
  return publicImage({ ...upload3, banner_id: null, storage_key: upload3.storageKey, content_type: upload3.contentType, file_size: upload3.fileSize, crop_x: upload3.cropX, crop_y: upload3.cropY, crop_zoom: upload3.cropZoom, sort_order: 0, created_at: timestamp2 });
}
async function removeStagedBannerImage({ storeId: storeId2, uploadId, userId }) {
  await requireStore3({ storeId: storeId2, userId });
  const upload3 = await findStagedUpload2(storeId2, userId, uploadId);
  if (!upload3) throw new BannerDomainError(404, "Upload tempor\xE1rio n\xE3o encontrado.");
  await deleteStagedUpload2(upload3.id);
  await getProductStorage().remove(upload3.storage_key);
}
async function attachStagedBannerImages({ storeId: storeId2, bannerId, userId, draftId, uploadIds }) {
  const banner = await requireBanner({ storeId: storeId2, bannerId, userId });
  const attachedImages = await withinTransaction3(async (tx) => {
    const uploads = await lockStagedUploads2(tx, { storeId: storeId2, userId, draftId, uploadIds });
    if (uploads.length !== uploadIds.length) throw new BannerDomainError(422, "Uma ou mais imagens n\xE3o est\xE3o mais dispon\xEDveis. Envie-as novamente.");
    const current = await listBannerImagesInTransaction(tx, banner.id);
    const startOrders = current.reduce((result, image) => ({ ...result, [image.breakpoint]: (result[image.breakpoint] || 0) + 1 }), {});
    const activePlan = await getActiveStorePlanLimits({ storeId: storeId2, one: tx.one });
    if (!activePlan) throw new BannerDomainError(402, "Escolha ou regularize um plano ativo para continuar esta operação.");
    maxNewMedia({ limits: activePlan.limits, field: "bannerImages", existing: current.length, incoming: uploads.length, createError: (status, message) => new BannerDomainError(status, message) });
    const attached = await attachStagedUploads(tx, { bannerId: banner.id, uploads, timestamp: Date.now(), startOrders });
    return attached.map(publicImage);
  });
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return attachedImages;
}
async function changeBannerImage({ storeId: storeId2, bannerId, imageId, userId, patch }) {
  const banner = await requireBanner({ storeId: storeId2, bannerId, userId });
  const image = await findBannerImage(banner.id, imageId);
  if (!image) throw new BannerDomainError(404, "Imagem n\xE3o encontrada.");
  const timestamp2 = Date.now();
  await updateBannerImage(image.id, patch, timestamp2);
  await syncStoreContractToR2({ storeId: storeId2, userId });
  return publicImage({ ...image, crop_x: patch.crop.x, crop_y: patch.crop.y, crop_zoom: patch.crop.zoom, active: patch.active ? 1 : 0, updated_at: timestamp2 });
}
async function removeBannerImage({ storeId: storeId2, bannerId, imageId, userId }) {
  const banner = await requireBanner({ storeId: storeId2, bannerId, userId });
  const image = await findBannerImage(banner.id, imageId);
  if (!image) throw new BannerDomainError(404, "Imagem n\xE3o encontrada.");
  await deleteBannerImage(image.id);
  await getProductStorage().remove(image.storage_key);
  await syncStoreContractToR2({ storeId: storeId2, userId });
}
async function requireStore3({ storeId: storeId2, userId }) {
  const store = await findStoreOwnedByUser3(storeId2, userId);
  if (!store) throw new BannerDomainError(404, "Loja n\xE3o encontrada.");
  return store;
}
async function requireBanner({ storeId: storeId2, bannerId, userId }) {
  await requireStore3({ storeId: storeId2, userId });
  const banner = await findBannerInStore(storeId2, bannerId);
  if (!banner) throw new BannerDomainError(404, "Banner n\xE3o encontrado.");
  return banner;
}
async function assertCategoriesBelongToStore(storeId2, categoryIds) {
  if (!categoryIds.length) return;
  if (await countExistingCategories(storeId2, categoryIds) !== categoryIds.length) throw new BannerDomainError(422, "Uma ou mais categorias n\xE3o pertencem a esta loja.");
}

// server/modules/banners/controller.js
var router10 = Router10();
var upload2 = multer3({ storage: multer3.memoryStorage(), limits: { files: 1, fileSize: 8 * 1024 * 1024 } });
var route4 = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
router10.get("/stores/:storeId/banners", route4(async (req, res) => res.json({ banners: await listBanners({ storeId: req.params.storeId, userId: req.user.id }) })));
router10.get("/stores/:storeId/banners/:bannerId", route4(async (req, res) => res.json({ banner: await getBanner({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id }) })));
router10.post("/stores/:storeId/banners/media", upload2.single("file"), route4(async (req, res) => {
  const draftId = String(req.body?.draftId || "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(draftId)) throw new BannerValidationError("Rascunho de banner inv\xE1lido.");
  return res.status(201).json({ image: await stageBannerImage({ storeId: req.params.storeId, userId: req.user.id, file: req.file, draftId, mediaInput: getBannerMediaInput(req.body, req.file) }) });
}));
router10.delete("/stores/:storeId/banners/media/:uploadId", route4(async (req, res) => {
  await removeStagedBannerImage({ storeId: req.params.storeId, uploadId: req.params.uploadId, userId: req.user.id });
  return res.json({ ok: true });
}));
router10.post("/stores/:storeId/banners", route4(async (req, res) => res.status(201).json({ banner: await createBanner({ storeId: req.params.storeId, userId: req.user.id, input: parseBannerInput(req.body) }) })));
router10.post("/stores/:storeId/banners/:bannerId/media/attach", route4(async (req, res) => {
  const input = parseBannerInput({ ...req.body, title: "Rascunho de v\xEDnculo", pages: ["home"], categoryIds: [], position: "top", active: true });
  return res.json({ images: await attachStagedBannerImages({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id, draftId: input.draftId, uploadIds: input.uploadIds }) });
}));
router10.patch("/stores/:storeId/banners/:bannerId", route4(async (req, res) => res.json({ banner: await updateBanner2({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id, input: parseBannerInput(req.body) }) })));
router10.delete("/stores/:storeId/banners/:bannerId", route4(async (req, res) => {
  await removeBanner({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id });
  return res.json({ ok: true });
}));
router10.post("/stores/:storeId/banners/:bannerId/media", upload2.single("file"), route4(async (req, res) => res.status(201).json({ image: await addBannerImage({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id, file: req.file, mediaInput: getBannerMediaInput(req.body, req.file) }) })));
router10.patch("/stores/:storeId/banners/:bannerId/media/:imageId", route4(async (req, res) => {
  const banner = await getBanner({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id });
  const image = banner.images.find((item) => item.id === req.params.imageId);
  if (!image) throw new BannerDomainError(404, "Imagem n\xE3o encontrada.");
  return res.json({ image: await changeBannerImage({ storeId: req.params.storeId, bannerId: req.params.bannerId, imageId: req.params.imageId, userId: req.user.id, patch: parseBannerImagePatch(req.body, image) }) });
}));
router10.delete("/stores/:storeId/banners/:bannerId/media/:imageId", route4(async (req, res) => {
  await removeBannerImage({ storeId: req.params.storeId, bannerId: req.params.bannerId, imageId: req.params.imageId, userId: req.user.id });
  return res.json({ ok: true });
}));
router10.use((error, _req, res, next) => {
  if (error instanceof multer3.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 422).json({ error: error.code === "LIMIT_FILE_SIZE" ? "A imagem excede o tamanho m\xE1ximo de 8 MB." : "N\xE3o foi poss\xEDvel processar o upload." });
  if (error instanceof BannerValidationError || error instanceof BannerDomainError) return res.status(error.status).json({ error: error.message });
  return next(error);
});
var controller_default10 = router10;

// server/modules/integrations/controller.js
import { Router as Router11 } from "express";

// server/modules/integrations/validation.js
var IntegrationValidationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var integrationProviders = { mercadoPago: "mercado_pago", melhorEnvio: "melhor_envio", resend: "resend", smtp: "smtp" };
var emailEvents = ["purchase_paid", "order_completed", "payment_requested", "customer_password_reset"];
function requiredText(value, min, max, message) {
  const text4 = String(value || "").trim();
  if (text4.length < min || text4.length > max) throw new IntegrationValidationError(422, message);
  return text4;
}
function normalizeEmail3(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function normalizePostalCode(value) {
  const postalCode = String(value || "").replace(/\D/g, "");
  return /^\d{8}$/.test(postalCode) ? postalCode : "";
}
function parseMelhorEnvioInput(source = {}) {
  const accessToken = requiredText(source.accessToken, 20, 2e3, "Informe o token da API do Melhor Envio.");
  const environment = source.environment ?? "production";
  if (!["production", "sandbox"].includes(environment)) throw new IntegrationValidationError(422, "Informe um ambiente do Melhor Envio v\xE1lido.");
  return { accessToken, originPostalCode: normalizePostalCode(source.originPostalCode), environment };
}
function parseResendInput(source = {}) {
  return { apiKey: requiredText(source.apiKey, 8, 1e3, "Informe a chave de API do Resend.") };
}
function parseSmtpInput(source = {}) {
  const host = requiredText(source.host, 3, 255, "Informe o servidor SMTP.");
  const port = Number(source.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new IntegrationValidationError(422, "Informe uma porta SMTP v\xE1lida.");
  const username = requiredText(source.username, 1, 320, "Informe o usu\xE1rio SMTP.");
  const password = requiredText(source.password, 1, 2e3, "Informe a senha SMTP.");
  return { host, port, username, password, secure: Boolean(source.secure) };
}
function parseEmailSettingsInput(source = {}) {
  const provider = [integrationProviders.resend, integrationProviders.smtp].includes(source.provider) ? source.provider : "";
  const fromName = requiredText(source.fromName, 1, 120, "Informe o nome do remetente.");
  const fromEmail = normalizeEmail3(source.fromEmail);
  const replyTo = String(source.replyTo || "").trim() ? normalizeEmail3(source.replyTo) : "";
  if (!provider || !fromEmail || source.replyTo && !replyTo) throw new IntegrationValidationError(422, "Informe um remetente v\xE1lido, um provedor e, se houver, um e-mail de resposta v\xE1lido.");
  return { provider, fromName, fromEmail, replyTo };
}
function parseEmailTemplateInput(source = {}) {
  return { subject: requiredText(source.subject, 1, 200, "Informe o assunto do e-mail."), bodyHtml: requiredText(source.bodyHtml, 1, 3e4, "Informe o conte\xFAdo HTML do e-mail."), enabled: source.enabled === false ? 0 : 1 };
}
function parseFreightQuote(source, metadata) {
  const from = normalizePostalCode(source?.originPostalCode || metadata?.originPostalCode);
  const to = normalizePostalCode(source?.destinationPostalCode);
  const products = Array.isArray(source?.products) ? source.products.map((product) => ({ id: requiredText(product?.id, 1, 80, "Informe a identifica\xE7\xE3o do produto."), width: positiveNumber(product?.width, "Informe a largura do produto."), height: positiveNumber(product?.height, "Informe a altura do produto."), length: positiveNumber(product?.length, "Informe o comprimento do produto."), weight: positiveNumber(product?.weight, "Informe o peso do produto."), insurance_value: positiveNumber(product?.insuranceValue, "Informe o valor segurado do produto."), quantity: Math.max(1, Math.floor(positiveNumber(product?.quantity, "Informe a quantidade do produto."))) })) : [];
  if (!from || !to || !products.length) throw new IntegrationValidationError(422, "Informe CEP de origem, CEP de destino e pelo menos um produto com dimens\xF5es, peso, valor e quantidade.");
  return { from: { postal_code: from }, to: { postal_code: to }, products };
}
function positiveNumber(value, message) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new IntegrationValidationError(422, message);
  return number;
}

// server/modules/integrations/service.js
import { createCipheriv, createDecipheriv, createHash as createHash3, randomBytes as randomBytes3, randomUUID as randomUUID13 } from "node:crypto";

// server/modules/integrations/repository.js
var repository_exports5 = {};
__export(repository_exports5, {
  consumeOAuthState: () => consumeOAuthState,
  createOAuthState: () => createOAuthState,
  ensureEmailSettings: () => ensureEmailSettings,
  ensureEmailTemplates: () => ensureEmailTemplates,
  findActiveOAuthState: () => findActiveOAuthState,
  findConnectedIntegration: () => findConnectedIntegration,
  findEmailSettings: () => findEmailSettings,
  findEmailTemplate: () => findEmailTemplate,
  findIntegration: () => findIntegration,
  findOwnedStore: () => findOwnedStore,
  findStore: () => findStore,
  listEmailTemplates: () => listEmailTemplates,
  listIntegrations: () => listIntegrations,
  markIntegrationTest: () => markIntegrationTest,
  one: () => one,
  query: () => query,
  removePendingOAuthStates: () => removePendingOAuthStates,
  saveEmailSettings: () => saveEmailSettings,
  transaction: () => transaction,
  updateEmailTemplate: () => updateEmailTemplate,
  upsertIntegration: () => upsertIntegration,
  withinTransaction: () => withinTransaction4
});
var withinTransaction4 = transaction;
async function findOwnedStore(storeId2, userId) {
  return one("SELECT id, name FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId]);
}
async function findStore(storeId2) {
  return one("SELECT id, name FROM ld_stores WHERE id = ?", [storeId2]);
}
async function removePendingOAuthStates(storeId2, provider) {
  await query("DELETE FROM ld_store_integration_oauth_states WHERE store_id = ? AND provider = ? AND consumed_at IS NULL", [storeId2, provider]);
}
async function createOAuthState(record) {
  await query("INSERT INTO ld_store_integration_oauth_states (id, store_id, user_id, provider, state_hash, code_verifier_encrypted, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [record.id, record.storeId, record.userId, record.provider, record.stateHash, record.codeVerifierEncrypted, record.expiresAt, record.createdAt]);
}
async function findActiveOAuthState(provider, stateHash, timestamp2) {
  return one("SELECT * FROM ld_store_integration_oauth_states WHERE provider = ? AND state_hash = ? AND consumed_at IS NULL AND expires_at > ?", [provider, stateHash, timestamp2]);
}
async function consumeOAuthState(id, timestamp2, db = { query }) {
  await db.query("UPDATE ld_store_integration_oauth_states SET consumed_at = ? WHERE id = ?", [timestamp2, id]);
}
async function ensureEmailSettings(storeId2, timestamp2) {
  await query("INSERT IGNORE INTO ld_store_email_settings (store_id, created_at, updated_at) VALUES (?, ?, ?)", [storeId2, timestamp2, timestamp2]);
}
async function ensureEmailTemplates(storeId2, templates, timestamp2) {
  for (const [eventKey, template] of Object.entries(templates)) await query("INSERT IGNORE INTO ld_store_email_templates (id, store_id, event_key, subject, body_html, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)", [crypto.randomUUID(), storeId2, eventKey, template.subject, template.bodyHtml, timestamp2, timestamp2]);
}
async function listIntegrations(storeId2) {
  return query("SELECT * FROM ld_store_integrations WHERE store_id = ? ORDER BY provider", [storeId2]);
}
async function findIntegration(storeId2, provider) {
  return one("SELECT * FROM ld_store_integrations WHERE store_id = ? AND provider = ?", [storeId2, provider]);
}
async function findConnectedIntegration(storeId2, provider) {
  return one("SELECT * FROM ld_store_integrations WHERE store_id = ? AND provider = ? AND status = 'connected'", [storeId2, provider]);
}
async function upsertIntegration(record, db = { query }) {
  await db.query("INSERT INTO ld_store_integrations (id, store_id, provider, status, account_email, config_encrypted, metadata_json, connected_at, last_tested_at, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), account_email = VALUES(account_email), config_encrypted = VALUES(config_encrypted), metadata_json = VALUES(metadata_json), connected_at = VALUES(connected_at), last_error = NULL, updated_at = VALUES(updated_at)", [record.id, record.storeId, record.provider, record.status, record.accountEmail, record.configEncrypted, record.metadataJson, record.connectedAt, record.createdAt, record.updatedAt]);
}
async function markIntegrationTest(storeId2, provider, lastError, timestamp2) {
  await query("UPDATE ld_store_integrations SET last_tested_at = ?, last_error = ?, updated_at = ? WHERE store_id = ? AND provider = ?", [timestamp2, lastError, timestamp2, storeId2, provider]);
}
async function findEmailSettings(storeId2) {
  return one("SELECT provider, from_name, from_email, reply_to, updated_at FROM ld_store_email_settings WHERE store_id = ?", [storeId2]);
}
async function saveEmailSettings(storeId2, input, timestamp2) {
  await query("INSERT INTO ld_store_email_settings (store_id, provider, from_name, from_email, reply_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE provider = VALUES(provider), from_name = VALUES(from_name), from_email = VALUES(from_email), reply_to = VALUES(reply_to), updated_at = VALUES(updated_at)", [storeId2, input.provider, input.fromName, input.fromEmail, input.replyTo, timestamp2, timestamp2]);
}
async function listEmailTemplates(storeId2) {
  return query("SELECT event_key, subject, body_html, enabled, updated_at FROM ld_store_email_templates WHERE store_id = ? ORDER BY event_key", [storeId2]);
}
async function findEmailTemplate(storeId2, eventKey) {
  return one("SELECT event_key, subject, body_html, enabled, updated_at FROM ld_store_email_templates WHERE store_id = ? AND event_key = ?", [storeId2, eventKey]);
}
async function updateEmailTemplate(storeId2, eventKey, input, timestamp2) {
  await query("UPDATE ld_store_email_templates SET subject = ?, body_html = ?, enabled = ?, updated_at = ? WHERE store_id = ? AND event_key = ?", [input.subject, input.bodyHtml, input.enabled, timestamp2, storeId2, eventKey]);
}

// server/modules/integrations/providers.js
import nodemailer from "nodemailer";
async function melhorEnvioRequest(integration, path2, { contactEmail, method = "GET", body } = {}) {
  const base = integration.metadata.environment === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
  return fetch(`${base}${path2}`, { method, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${integration.config.accessToken}`, "User-Agent": `Loja Descomplicada (${normalizeEmail4(contactEmail) || "integracao@local"})` }, body: body ? JSON.stringify(body) : void 0, signal: AbortSignal.timeout(15e3) });
}
async function verifyResendApiKey(apiKey) {
  return fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(1e4) });
}
async function sendResendEmail({ apiKey, idempotencyKey, from, to, subject, html, replyTo }) {
  return fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo || void 0 }), signal: AbortSignal.timeout(15e3) });
}
function smtpTransport(config) {
  return nodemailer.createTransport({ host: config.host, port: Number(config.port), secure: Boolean(config.secure), auth: { user: config.username, pass: config.password }, connectionTimeout: 1e4, greetingTimeout: 1e4, socketTimeout: 15e3 });
}
function normalizeEmail4(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

// server/modules/integrations/catalog.js
var paymentTypeLabels = {
  account_money: "Saldo Mercado Pago",
  bank_transfer: "Transfer\xEAncia banc\xE1ria",
  credit_card: "Cart\xE3o de cr\xE9dito",
  debit_card: "Cart\xE3o de d\xE9bito",
  digital_currency: "Carteira digital",
  prepaid_card: "Cart\xE3o pr\xE9-pago",
  ticket: "Boleto e pagamento em dinheiro"
};
var shippingTypeLabels = {
  normal: "Entrega padr\xE3o",
  express: "Entrega expressa"
};
function sanitizeMercadoPagoMethods(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.filter((method) => method?.status === "active" && safeId(method.id) && safeText(method.name)).map((method) => ({
    id: `mercado_pago:${safeId(method.id)}`,
    provider: "mercado_pago",
    providerMethodId: safeId(method.id),
    name: safeText(method.name),
    description: paymentTypeLabels[safeId(method.payment_type_id)] || "Meio dispon\xEDvel no Mercado Pago",
    type: safeId(method.payment_type_id)
  })).slice(0, 80);
}
function sanitizeMelhorEnvioServices(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.filter((service) => Number.isInteger(Number(service?.id)) && safeText(service?.name)).map((service) => {
    const company = safeText(service.company?.name || service.company_name);
    const type = safeId(service.type);
    return {
      id: `melhor_envio:${Number(service.id)}`,
      provider: "melhor_envio",
      providerServiceId: Number(service.id),
      name: [company, safeText(service.name)].filter(Boolean).join(" \xB7 "),
      description: shippingTypeLabels[type] || "Servi\xE7o dispon\xEDvel no Melhor Envio",
      type
    };
  }).slice(0, 80);
}
function safeId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_:-]/g, "").slice(0, 80);
}
function safeText(value) {
  return String(value || "").replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

// server/modules/integrations/service.js
var { one: one2, query: query2, transaction: transaction2 } = repository_exports5;
var MERCADO_PAGO = "mercado_pago";
var MELHOR_ENVIO = "melhor_envio";
var RESEND = "resend";
var SMTP = "smtp";
var EMAIL_EVENTS = emailEvents;
var PROVIDERS = [MERCADO_PAGO, MELHOR_ENVIO, RESEND, SMTP];
var OAUTH_STATE_TTL_MS = 10 * 60 * 1e3;
var CANONICAL_APP_URL = "https://lojadescompl-8wmvnkfz.manus.space";
var defaultTemplates = {
  purchase_paid: {
    label: "Compra realizada com sucesso",
    subject: "Recebemos seu pagamento \u2014 {{storeName}}",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Pagamento confirmado</h1><p>Ol\xE1, {{customerName}}.</p><p>Recebemos o pagamento do seu pedido {{orderReference}}. Obrigado por comprar na {{storeName}}.</p><p>Valor: <strong>{{orderTotal}}</strong>.</p><p>Em breve voc\xEA receber\xE1 as pr\xF3ximas atualiza\xE7\xF5es do pedido.</p></main>`
  },
  order_completed: {
    label: "Compra finalizada",
    subject: "Seu pedido {{orderReference}} foi finalizado",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Pedido finalizado</h1><p>Ol\xE1, {{customerName}}.</p><p>Seu pedido {{orderReference}} foi finalizado pela {{storeName}}.</p><p>Se precisar de ajuda, responda a este e-mail.</p></main>`
  },
  payment_requested: {
    label: "Realizar pagamento",
    subject: "Conclua o pagamento do pedido {{orderReference}}",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Seu pagamento est\xE1 pendente</h1><p>Ol\xE1, {{customerName}}.</p><p>Para finalizar o pedido {{orderReference}} na {{storeName}}, conclua o pagamento de <strong>{{orderTotal}}</strong>.</p><p><a href="{{paymentUrl}}" style="display:inline-block;background:linear-gradient(45deg,#ff3f8f,#ff7a00);color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Realizar pagamento</a></p></main>`
  },
  customer_password_reset: {
    label: "Recupera\xE7\xE3o de senha do cliente",
    subject: "Redefina sua senha \u2014 {{storeName}}",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Redefini\xE7\xE3o de senha</h1><p>Ol\xE1, {{customerName}}.</p><p>Recebemos uma solicita\xE7\xE3o para redefinir sua senha na {{storeName}}.</p><p><a href="{{resetUrl}}" style="display:inline-block;background:linear-gradient(45deg,#ff3f8f,#ff7a00);color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Redefinir senha</a></p><p>Por seguran\xE7a, este link expira em 30 minutos. Se voc\xEA n\xE3o solicitou a altera\xE7\xE3o, ignore esta mensagem.</p></main>`
  }
};
async function getStoreSettings({ storeId: storeId2, userId }) {
  const store = await requireOwnedStore(storeId2, userId);
  await ensureStoreIntegrationDefaults(store.id);
  return { settings: await publicStoreSettings(store.id) };
}
async function getStorefrontIntegrationCapabilities({ storeId: storeId2, userId, contactEmail }) {
  const store = await requireOwnedStore(storeId2, userId);
  const [payments, shipping] = await Promise.all([
    mercadoPagoCapabilities(store.id),
    melhorEnvioCapabilities(store.id, contactEmail)
  ]);
  return { storeId: store.id, payments, shipping };
}
async function createMercadoPagoAuthorization({ storeId: storeId2, userId }) {
  const store = await requireOwnedStore(storeId2, userId);
  const clientId = requiredEnv2("MERCADO_PAGO_OAUTH_CLIENT_ID");
  requiredEnv2("MERCADO_PAGO_OAUTH_CLIENT_SECRET");
  const timestamp2 = Date.now();
  const state = randomBytes3(32).toString("base64url");
  const codeVerifier = randomBytes3(64).toString("base64url");
  const codeChallenge = createHash3("sha256").update(codeVerifier).digest("base64url");
  await removePendingOAuthStates(store.id, MERCADO_PAGO);
  await createOAuthState({ id: randomUUID13(), storeId: store.id, userId, provider: MERCADO_PAGO, stateHash: hashState(state), codeVerifierEncrypted: encryptConfig({ codeVerifier }), expiresAt: timestamp2 + OAUTH_STATE_TTL_MS, createdAt: timestamp2 });
  return { authorizationUrl: buildMercadoPagoAuthorizationUrl({ clientId, state, redirectUri: mercadoPagoCallbackUrl(), codeChallenge }) };
}
async function saveMelhorEnvioIntegration({ storeId: storeId2, userId, input }) {
  const store = await requireOwnedStore(storeId2, userId);
  const { accessToken, originPostalCode, environment } = input;
  await upsertIntegration2({ storeId: store.id, provider: MELHOR_ENVIO, status: "connected", config: { accessToken }, metadata: { environment, originPostalCode }, accountEmail: null });
  return { integration: await publicIntegration(store.id, MELHOR_ENVIO) };
}
async function testMelhorEnvioIntegration({ storeId: storeId2, userId, contactEmail }) {
  const store = await requireOwnedStore(storeId2, userId);
  const integration = await integrationWithConfig(store.id, MELHOR_ENVIO);
  if (!integration) throw new IntegrationError(422, "Conecte o Melhor Envio antes de testar.");
  const remote = await melhorEnvioRequest(integration, "/api/v2/me", { contactEmail });
  if (!remote.ok) throw new IntegrationError(422, "O Melhor Envio recusou a credencial. Revise o token e tente novamente.");
  await markIntegrationTest2(store.id, MELHOR_ENVIO, null);
  return { ok: true, message: "Integra\xE7\xE3o do Melhor Envio validada com sucesso." };
}
async function calculateFreight({ storeId: storeId2, userId, contactEmail, source }) {
  const store = await requireOwnedStore(storeId2, userId);
  const integration = await integrationWithConfig(store.id, MELHOR_ENVIO);
  if (!integration) throw new IntegrationError(422, "Conecte o Melhor Envio antes de calcular o frete.");
  const input = parseFreightQuote(source, integration.metadata);
  const remote = await melhorEnvioRequest(integration, "/api/v2/me/shipment/calculate", { contactEmail, method: "POST", body: input });
  const payload = await remote.json().catch(() => ({}));
  if (!remote.ok) throw new IntegrationError(422, safeProviderError(payload, "N\xE3o foi poss\xEDvel calcular o frete com estes dados."));
  await markIntegrationTest2(store.id, MELHOR_ENVIO, null);
  return { quotes: Array.isArray(payload) ? payload.map(publicFreightQuote) : [] };
}
async function saveResendIntegration({ storeId: storeId2, userId, input }) {
  const store = await requireOwnedStore(storeId2, userId);
  await upsertIntegration2({ storeId: store.id, provider: RESEND, status: "connected", config: { apiKey: input.apiKey }, metadata: {}, accountEmail: null });
  return { integration: await publicIntegration(store.id, RESEND) };
}
async function testResendIntegration({ storeId: storeId2, userId }) {
  const store = await requireOwnedStore(storeId2, userId);
  const integration = await integrationWithConfig(store.id, RESEND);
  if (!integration) throw new IntegrationError(422, "Salve a chave do Resend antes de testar.");
  const remote = await verifyResendApiKey(integration.config.apiKey);
  if (!remote.ok) throw new IntegrationError(422, "O Resend recusou a chave de API. Revise a configura\xE7\xE3o e tente novamente.");
  await markIntegrationTest2(store.id, RESEND, null);
  return { ok: true, message: "Chave do Resend validada. Confirme tamb\xE9m um dom\xEDnio verificado antes de enviar e-mails." };
}
async function saveSmtpIntegration({ storeId: storeId2, userId, input }) {
  const store = await requireOwnedStore(storeId2, userId);
  await upsertIntegration2({ storeId: store.id, provider: SMTP, status: "connected", config: input, metadata: {}, accountEmail: normalizeEmail3(input.username) || null });
  return { integration: await publicIntegration(store.id, SMTP) };
}
async function testSmtpIntegration({ storeId: storeId2, userId }) {
  const store = await requireOwnedStore(storeId2, userId);
  const integration = await integrationWithConfig(store.id, SMTP);
  if (!integration) throw new IntegrationError(422, "Salve os dados SMTP antes de testar.");
  try {
    await smtpTransport(integration.config).verify();
    await markIntegrationTest2(store.id, SMTP, null);
    return { ok: true, message: "Servidor SMTP validado com sucesso." };
  } catch {
    await markIntegrationTest2(store.id, SMTP, "N\xE3o foi poss\xEDvel autenticar no servidor SMTP.");
    throw new IntegrationError(422, "N\xE3o foi poss\xEDvel autenticar no servidor SMTP. Revise host, porta, seguran\xE7a e credenciais.");
  }
}
async function saveEmailSettings2({ storeId: storeId2, userId, input }) {
  const store = await requireOwnedStore(storeId2, userId);
  const integration = await publicIntegration(store.id, input.provider);
  if (!integration?.connected) throw new IntegrationError(422, "Conecte o provedor de e-mail escolhido antes de salv\xE1-lo como ativo.");
  await saveEmailSettings(store.id, input, Date.now());
  return { email: await publicEmailSettings(store.id) };
}
async function updateEmailTemplate2({ storeId: storeId2, userId, eventKey, input }) {
  const store = await requireOwnedStore(storeId2, userId);
  if (!EMAIL_EVENTS.includes(eventKey)) throw new IntegrationError(404, "Modelo de e-mail n\xE3o encontrado.");
  await ensureStoreIntegrationDefaults(store.id);
  await updateEmailTemplate(store.id, eventKey, input, Date.now());
  return { template: await publicEmailTemplate(store.id, eventKey) };
}
async function sendTestEmail({ storeId: storeId2, userId, recipient }) {
  const store = await requireOwnedStore(storeId2, userId);
  const result = await sendStoreTransactionalEmail({ storeId: store.id, eventKey: "purchase_paid", recipient, variables: { storeName: store.name, customerName: "Cliente de teste", orderReference: "TESTE-001", orderTotal: "R$ 0,00", paymentUrl: "#" } });
  return { ok: true, messageId: result.messageId };
}
async function handleMercadoPagoCallback({ state, code, providerError }) {
  const pending = state ? await findActiveOAuthState(MERCADO_PAGO, hashState(state), Date.now()) : null;
  if (!pending) return { redirectUrl: callbackRedirect("invalid_state") };
  if (providerError || !code) {
    await consumeOAuthState(pending.id, Date.now());
    return { redirectUrl: callbackRedirect("cancelled") };
  }
  const verifier = decryptConfig(pending.code_verifier_encrypted).codeVerifier;
  const response = await fetch("https://api.mercadopago.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: requiredEnv2("MERCADO_PAGO_OAUTH_CLIENT_ID"), client_secret: requiredEnv2("MERCADO_PAGO_OAUTH_CLIENT_SECRET"), code, grant_type: "authorization_code", redirect_uri: mercadoPagoCallbackUrl(), code_verifier: verifier }), signal: AbortSignal.timeout(15e3) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    await consumeOAuthState(pending.id, Date.now());
    return { redirectUrl: callbackRedirect("failed") };
  }
  const profileResponse = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${payload.access_token}` }, signal: AbortSignal.timeout(1e4) });
  const profile = await profileResponse.json().catch(() => ({}));
  const expiresAt = Number(payload.expires_in) > 0 ? Date.now() + Number(payload.expires_in) * 1e3 : null;
  await withinTransaction4(async (tx) => {
    await consumeOAuthState(pending.id, Date.now(), tx);
    await upsertIntegration2({ storeId: pending.store_id, provider: MERCADO_PAGO, status: "connected", config: { accessToken: payload.access_token, refreshToken: payload.refresh_token || "", expiresAt }, metadata: { accountId: profile.id || null, accountNickname: profile.nickname || "" }, accountEmail: normalizeEmail3(profile.email) || null, db: tx });
  });
  return { redirectUrl: callbackRedirect("success") };
}
async function sendStoreTransactionalEmail({ storeId: storeId2, eventKey, recipient, variables = {} }) {
  if (!EMAIL_EVENTS.includes(eventKey)) throw new IntegrationError(422, "Tipo de e-mail transacional inv\xE1lido.");
  const target = normalizeEmail5(recipient);
  if (!target) throw new IntegrationError(422, "Informe um destinat\xE1rio de e-mail v\xE1lido.");
  await ensureStoreIntegrationDefaults(storeId2);
  const [email, template, store] = await Promise.all([publicEmailSettings(storeId2), publicEmailTemplate(storeId2, eventKey), findStore(storeId2)]);
  if (!store || !template?.enabled) return { skipped: true, messageId: null };
  const integration = await integrationWithConfig(storeId2, email.provider);
  if (!integration) throw new IntegrationError(422, "Conecte e selecione um provedor de e-mail antes de enviar mensagens.");
  const values = { storeName: store.name, customerName: "Cliente", orderReference: "", orderTotal: "", paymentUrl: "", resetUrl: "", ...variables };
  const subject = renderTemplate(template.subject, values, false);
  const html = renderTemplate(template.bodyHtml, values, true);
  const from = formatFrom(email.fromName, email.fromEmail);
  if (email.provider === RESEND) {
    const response = await sendResendEmail({ apiKey: integration.config.apiKey, idempotencyKey: `store-${storeId2}-${eventKey}-${createHash3("sha256").update(`${target}:${subject}:${html}`).digest("hex").slice(0, 28)}`, from, to: target, subject, html, replyTo: email.replyTo });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new IntegrationError(502, safeProviderError(payload, "O Resend n\xE3o aceitou o envio deste e-mail."));
    return { skipped: false, messageId: payload.id || null };
  }
  try {
    const result = await smtpTransport(integration.config).sendMail({ from, to: target, subject, html, replyTo: email.replyTo || void 0 });
    return { skipped: false, messageId: result.messageId || null };
  } catch {
    throw new IntegrationError(502, "O provedor SMTP n\xE3o aceitou o envio deste e-mail.");
  }
}
async function getStoreMercadoPagoAccessToken(storeId2) {
  let integration = await integrationWithConfig(storeId2, MERCADO_PAGO);
  if (!integration?.config?.accessToken) throw new IntegrationError(422, "Esta loja ainda n\xE3o conectou uma conta Mercado Pago para receber pagamentos.");
  const expiresAt = Number(integration.config.expiresAt || 0);
  if (!expiresAt || expiresAt > Date.now() + 6e4) return integration.config.accessToken;
  const refreshToken = String(integration.config.refreshToken || "");
  if (!refreshToken) throw new IntegrationError(422, "A conex\xE3o Mercado Pago desta loja expirou. Pe\xE7a ao lojista para reconect\xE1-la no painel.");
  const response = await fetch("https://api.mercadopago.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: requiredEnv2("MERCADO_PAGO_OAUTH_CLIENT_ID"), client_secret: requiredEnv2("MERCADO_PAGO_OAUTH_CLIENT_SECRET"), grant_type: "refresh_token", refresh_token: refreshToken }), signal: AbortSignal.timeout(15e3) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new IntegrationError(502, "N\xE3o foi poss\xEDvel renovar a conex\xE3o Mercado Pago desta loja. Pe\xE7a ao lojista para reconect\xE1-la no painel.");
  const refreshed = { accessToken: payload.access_token, refreshToken: payload.refresh_token || refreshToken, expiresAt: Number(payload.expires_in) > 0 ? Date.now() + Number(payload.expires_in) * 1e3 : null };
  await upsertIntegration2({ storeId: storeId2, provider: MERCADO_PAGO, status: "connected", config: refreshed, metadata: integration.metadata, accountEmail: integration.account_email || null });
  integration = { ...integration, config: refreshed };
  return integration.config.accessToken;
}
async function mercadoPagoCapabilities(storeId2) {
  const integration = await integrationWithConfig(storeId2, MERCADO_PAGO);
  if (!integration?.config?.accessToken) return disconnectedCapability(MERCADO_PAGO);
  try {
    const accessToken = await getStoreMercadoPagoAccessToken(storeId2);
    const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15e3)
    });
    const payload = await response.json().catch(() => []);
    if (!response.ok) return unavailableCapability(MERCADO_PAGO, "N\xE3o foi poss\xEDvel atualizar os meios dispon\xEDveis no Mercado Pago.");
    return { provider: MERCADO_PAGO, connected: true, available: true, options: sanitizeMercadoPagoMethods(payload), error: "" };
  } catch {
    return unavailableCapability(MERCADO_PAGO, "N\xE3o foi poss\xEDvel atualizar os meios dispon\xEDveis no Mercado Pago.");
  }
}
async function melhorEnvioCapabilities(storeId2, contactEmail) {
  const integration = await integrationWithConfig(storeId2, MELHOR_ENVIO);
  if (!integration?.config?.accessToken) return disconnectedCapability(MELHOR_ENVIO);
  try {
    const response = await melhorEnvioRequest(integration, "/api/v2/me/shipment/services", { contactEmail });
    const payload = await response.json().catch(() => []);
    if (!response.ok) return unavailableCapability(MELHOR_ENVIO, "N\xE3o foi poss\xEDvel atualizar os servi\xE7os dispon\xEDveis no Melhor Envio.");
    return { provider: MELHOR_ENVIO, connected: true, available: true, options: sanitizeMelhorEnvioServices(payload), error: "" };
  } catch {
    return unavailableCapability(MELHOR_ENVIO, "N\xE3o foi poss\xEDvel atualizar os servi\xE7os dispon\xEDveis no Melhor Envio.");
  }
}
function disconnectedCapability(provider) {
  return { provider, connected: false, available: false, options: [], error: "" };
}
function unavailableCapability(provider, error) {
  return { provider, connected: true, available: false, options: [], error };
}
function encryptConfig(value, secret = process.env.JWT_SECRET) {
  if (!secret) throw new Error("Chave de criptografia de integra\xE7\xF5es indispon\xEDvel.");
  const iv = randomBytes3(12);
  const cipher = createCipheriv("aes-256-gcm", integrationKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
function decryptConfig(value, secret = process.env.JWT_SECRET) {
  const [version, ivText, tagText, payloadText] = String(value || "").split(".");
  if (version !== "v1" || !ivText || !tagText || !payloadText) throw new IntegrationError(500, "N\xE3o foi poss\xEDvel ler uma configura\xE7\xE3o protegida.");
  const decipher = createDecipheriv("aes-256-gcm", integrationKey(secret), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payloadText, "base64url")), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted);
}
function buildMercadoPagoAuthorizationUrl({ clientId, state, redirectUri, codeChallenge }) {
  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}
function renderTemplate(source, values, html = true) {
  return String(source || "").replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g, (_match, name) => html ? escapeHtml4(values?.[name] ?? "") : String(values?.[name] ?? ""));
}
function publicFreightQuote(quote) {
  return { id: Number(quote?.id || 0), carrier: String(quote?.company?.name || ""), service: String(quote?.name || ""), price: String(quote?.custom_price || quote?.price || ""), deliveryTime: Number(quote?.custom_delivery_time || quote?.delivery_time || 0), deliveryRange: quote?.custom_delivery_range || quote?.delivery_range || null };
}
async function ensureStoreIntegrationDefaults(storeId2) {
  const timestamp2 = Date.now();
  await ensureEmailSettings(storeId2, timestamp2);
  await ensureEmailTemplates(storeId2, defaultTemplates, timestamp2);
}
async function publicStoreSettings(storeId2) {
  const [integrations, email, templates] = await Promise.all([listIntegrations(storeId2), publicEmailSettings(storeId2), listEmailTemplates(storeId2)]);
  return { storeId: storeId2, integrations: PROVIDERS.map((provider) => publicIntegrationRow(integrations.find((item) => item.provider === provider), provider)), email, templates: templates.map(publicTemplateRow) };
}
async function publicEmailSettings(storeId2) {
  const row = await findEmailSettings(storeId2);
  return { provider: row?.provider || RESEND, fromName: row?.from_name || "", fromEmail: row?.from_email || "", replyTo: row?.reply_to || "", updatedAt: Number(row?.updated_at || 0) };
}
async function publicEmailTemplate(storeId2, eventKey) {
  const row = await findEmailTemplate(storeId2, eventKey);
  return row ? publicTemplateRow(row) : null;
}
async function publicIntegration(storeId2, provider) {
  const row = await findIntegration(storeId2, provider);
  return publicIntegrationRow(row, provider);
}
function publicIntegrationRow(row, provider) {
  const metadata = parseJson4(row?.metadata_json, {});
  return { provider, connected: row?.status === "connected", status: row?.status || "disconnected", accountEmail: row?.account_email || "", accountNickname: metadata.accountNickname || "", originPostalCode: metadata.originPostalCode || "", environment: metadata.environment || "production", connectedAt: Number(row?.connected_at || 0), lastTestedAt: Number(row?.last_tested_at || 0), lastError: row?.last_error || "" };
}
function publicTemplateRow(row) {
  return { eventKey: row.event_key, label: defaultTemplates[row.event_key]?.label || row.event_key, subject: row.subject, bodyHtml: row.body_html, enabled: Boolean(row.enabled), updatedAt: Number(row.updated_at || 0) };
}
async function upsertIntegration2({ storeId: storeId2, provider, status, config, metadata, accountEmail, db = { query: query2 } }) {
  const timestamp2 = Date.now();
  await upsertIntegration({ id: randomUUID13(), storeId: storeId2, provider, status, accountEmail, configEncrypted: encryptConfig(config), metadataJson: JSON.stringify(metadata || {}), connectedAt: status === "connected" ? timestamp2 : null, createdAt: timestamp2, updatedAt: timestamp2 }, db);
}
async function integrationWithConfig(storeId2, provider) {
  const row = await findConnectedIntegration(storeId2, provider);
  return row?.config_encrypted ? { ...row, config: decryptConfig(row.config_encrypted), metadata: parseJson4(row.metadata_json, {}) } : null;
}
async function markIntegrationTest2(storeId2, provider, lastError) {
  await markIntegrationTest(storeId2, provider, lastError, Date.now());
}
async function ownedStore(storeId2, userId) {
  return findOwnedStore(storeId2, userId);
}
async function requireOwnedStore(storeId2, userId) {
  const store = await ownedStore(storeId2, userId);
  if (!store) throw new IntegrationError(404, "Loja n\xE3o encontrada.");
  return store;
}
function mercadoPagoCallbackUrl() {
  return `${applicationUrl()}/v1/integrations/mercado-pago/callback`;
}
function callbackRedirect(status) {
  return `${applicationUrl()}/settings?integration=mercado-pago&connection=${status}`;
}
function applicationUrl() {
  const value = String(process.env.APP_URL || "").trim().replace(/\/$/, "");
  if (!/^https?:\/\/[^/]+/i.test(value)) throw new IntegrationError(503, "A URL pública da aplicação ainda não foi configurada neste ambiente.");
  return value;
}
function integrationKey(secret) {
  return createHash3("sha256").update(`loja-descomplicada:integration-config:${secret}`).digest();
}
function hashState(state) {
  return createHash3("sha256").update(String(state)).digest("hex");
}
function requiredEnv2(key) {
  const value = String(process.env[key] || "").trim();
  if (!value) throw new IntegrationError(503, "A conex\xE3o OAuth do Mercado Pago ainda n\xE3o foi configurada neste ambiente.");
  return value;
}
function normalizeEmail5(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function parseJson4(value, fallback) {
  try {
    return typeof value === "object" && value ? value : JSON.parse(value || "{}");
  } catch {
    return fallback;
  }
}
function formatFrom(name, email) {
  return `${String(name || "").replace(/[<>\r\n]/g, "").trim()} <${email}>`;
}
function escapeHtml4(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function safeProviderError(value, fallback) {
  const message = String(value?.message || value?.error || fallback).replace(/[^\p{L}\p{N} .,;:!()\-_/]/gu, " ").replace(/\s+/g, " ").trim();
  return message.slice(0, 300) || fallback;
}
var IntegrationError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};

// server/modules/integrations/controller.js
var integrationController = Router11();
var publicIntegrationRouter = Router11();
function protectedHandler(handler) {
  return async (req, res, next) => {
    try {
      return res.json(await handler(req));
    } catch (error) {
      return next(error);
    }
  };
}
integrationController.get("/stores/:storeId/settings", protectedHandler((req) => getStoreSettings({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.get("/stores/:storeId/storefront-capabilities", protectedHandler((req) => getStorefrontIntegrationCapabilities({ storeId: req.params.storeId, userId: req.user.id, contactEmail: req.user.email })));
integrationController.get("/stores/:storeId/integrations/mercado-pago/authorize", protectedHandler((req) => createMercadoPagoAuthorization({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.put("/stores/:storeId/integrations/melhor-envio", protectedHandler((req) => saveMelhorEnvioIntegration({ storeId: req.params.storeId, userId: req.user.id, input: parseMelhorEnvioInput(req.body) })));
integrationController.post("/stores/:storeId/integrations/melhor-envio/test", protectedHandler((req) => testMelhorEnvioIntegration({ storeId: req.params.storeId, userId: req.user.id, contactEmail: req.user.email })));
integrationController.post("/stores/:storeId/integrations/melhor-envio/calculate", protectedHandler((req) => calculateFreight({ storeId: req.params.storeId, userId: req.user.id, contactEmail: req.user.email, source: req.body })));
integrationController.put("/stores/:storeId/integrations/resend", protectedHandler((req) => saveResendIntegration({ storeId: req.params.storeId, userId: req.user.id, input: parseResendInput(req.body) })));
integrationController.post("/stores/:storeId/integrations/resend/test", protectedHandler((req) => testResendIntegration({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.put("/stores/:storeId/integrations/smtp", protectedHandler((req) => saveSmtpIntegration({ storeId: req.params.storeId, userId: req.user.id, input: parseSmtpInput(req.body) })));
integrationController.post("/stores/:storeId/integrations/smtp/test", protectedHandler((req) => testSmtpIntegration({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.put("/stores/:storeId/email-settings", protectedHandler((req) => saveEmailSettings2({ storeId: req.params.storeId, userId: req.user.id, input: parseEmailSettingsInput(req.body) })));
integrationController.put("/stores/:storeId/email-templates/:eventKey", protectedHandler((req) => updateEmailTemplate2({ storeId: req.params.storeId, userId: req.user.id, eventKey: String(req.params.eventKey || ""), input: parseEmailTemplateInput(req.body) })));
integrationController.post("/stores/:storeId/email/test", protectedHandler((req) => {
  const recipient = normalizeEmail3(req.body?.recipient);
  if (!recipient) throw new IntegrationValidationError(422, "Informe um e-mail de destino v\xE1lido para o teste.");
  return sendTestEmail({ storeId: req.params.storeId, userId: req.user.id, recipient });
}));
publicIntegrationRouter.get("/integrations/mercado-pago/callback", async (req, res, next) => {
  try {
    const result = await handleMercadoPagoCallback({ state: String(req.query?.state || ""), code: String(req.query?.code || ""), providerError: String(req.query?.error || "") });
    return res.redirect(result.redirectUrl);
  } catch (error) {
    return next(error);
  }
});
function integrationErrorHandler(error, _req, res, next) {
  if (error instanceof IntegrationError || error instanceof IntegrationValidationError) return res.status(error.status).json({ error: error.message });
  return next(error);
}
integrationController.use(integrationErrorHandler);
publicIntegrationRouter.use(integrationErrorHandler);
var controller_default11 = integrationController;

// server/modules/store-contract/controller.js
import { Router as Router12 } from "express";
var router11 = Router12();
var publicRouter = Router12();
var handle = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
router11.get("/stores/:storeId/contract", handle(async (req, res) => {
  const contract = await getStoreContract({ storeId: req.params.storeId, userId: req.user.id });
  return res.json({ contract });
}));
publicRouter.get("/public/stores/:slug/contract", handle(async (req, res) => {
  const contract = await getPublicStoreContract({ slug: req.params.slug });
  return res.json({ contract });
}));
publicRouter.post("/public/stores/:slug/commercial-preview", handle(async (req, res) => {
  const preview = await getPublicCommercialPreview({ slug: req.params.slug, input: req.body || {} });
  return res.json({ preview });
}));
var errorHandler = (error, _req, res, next) => error instanceof StoreContractError ? res.status(error.status).json({ error: error.message }) : error instanceof CommercialRuleError ? res.status(422).json({ error: error.message, code: error.code }) : next(error);
router11.use(errorHandler);
publicRouter.use(errorHandler);
var controller_default12 = router11;

// server/modules/address/routes.js
import { Router as Router13 } from "express";
var router12 = Router13();
var STATE_CODES = /* @__PURE__ */ new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);
router12.get("/public/address/cep/:cep", async (req, res, next) => {
  const cep = String(req.params.cep || "").replace(/\D/g, "");
  if (cep.length !== 8) return next(new RequestError(422, "Informe os oito d\xEDgitos do CEP.", "INVALID_CEP"));
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return res.status(502).json({ error: "N\xE3o foi poss\xEDvel consultar este CEP agora.", code: "ADDRESS_PROVIDER_UNAVAILABLE" });
    const data = await response.json();
    if (!data || data.erro) return res.status(404).json({ error: "CEP n\xE3o encontrado.", code: "CEP_NOT_FOUND" });
    return res.json({
      address: {
        postalCode: text(data.cep) || cep,
        street: text(data.logradouro) || "",
        complement: text(data.complemento) || "",
        district: text(data.bairro) || "",
        city: text(data.localidade) || "",
        state: STATE_CODES.has(data.uf) ? data.uf : "",
        country: "BR"
      }
    });
  } catch {
    return res.status(502).json({ error: "N\xE3o foi poss\xEDvel consultar este CEP agora.", code: "ADDRESS_PROVIDER_UNAVAILABLE" });
  }
});
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
var routes_default = router12;

// server/modules/storefront/controller.js
import { Router as Router14 } from "express";

// server/modules/storefront/service.js
import { randomBytes as randomBytes4, randomUUID as randomUUID14 } from "node:crypto";

// server/modules/storefront/repository.js
function findPublicStore(storeId2) {
  return one("SELECT id, name, slug, custom_domain FROM ld_stores WHERE id = ?", [storeId2]);
}
function findCustomerByEmail(storeId2, email) {
  return one("SELECT * FROM ld_customers WHERE store_id = ? AND email = ? AND deleted_at IS NULL LIMIT 1", [storeId2, email]);
}
function findCustomerById(storeId2, customerId) {
  return one("SELECT * FROM ld_customers WHERE store_id = ? AND id = ? AND deleted_at IS NULL LIMIT 1", [storeId2, customerId]);
}
function findCustomerProfile(storeId2, customerId) {
  return one("SELECT customers.*, (SELECT phones.phone FROM ld_customer_phones AS phones WHERE phones.customer_id = customers.id ORDER BY phones.is_primary DESC, phones.created_at ASC LIMIT 1) AS primary_phone FROM ld_customers AS customers WHERE customers.store_id = ? AND customers.id = ? AND customers.deleted_at IS NULL LIMIT 1", [storeId2, customerId]);
}
function findSession(tokenHash) {
  return one("SELECT sessions.*, customers.name, customers.email, customers.status, customers.deleted_at FROM ld_customer_sessions AS sessions JOIN ld_customers AS customers ON customers.id = sessions.customer_id WHERE sessions.token_hash = ? AND sessions.expires_at > ? LIMIT 1", [tokenHash, Date.now()]);
}
function createCustomer2(tx, customer) {
  return tx.query("INSERT INTO ld_customers (id, store_id, name, email, password_hash, document, notes, status, created_at, updated_at, account_updated_at) VALUES (?, ?, ?, ?, ?, NULL, '', 'active', ?, ?, ?)", [customer.id, customer.storeId, customer.name, customer.email, customer.passwordHash, customer.timestamp, customer.timestamp, customer.timestamp]);
}
function createSession(tx, session) {
  return tx.query("INSERT INTO ld_customer_sessions (id, store_id, customer_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [session.id, session.storeId, session.customerId, session.tokenHash, session.expiresAt, session.timestamp, session.timestamp]);
}
function deleteSession(tokenHash) {
  return query("DELETE FROM ld_customer_sessions WHERE token_hash = ?", [tokenHash]);
}
function deleteCustomerSessions(tx, customerId) {
  return tx.query("DELETE FROM ld_customer_sessions WHERE customer_id = ?", [customerId]);
}
function touchSession(tokenHash, timestamp2) {
  return query("UPDATE ld_customer_sessions SET last_seen_at = ? WHERE token_hash = ?", [timestamp2, tokenHash]);
}
function savePasswordReset(tx, reset) {
  return tx.query("INSERT INTO ld_customer_password_resets (id, store_id, customer_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)", [reset.id, reset.storeId, reset.customerId, reset.tokenHash, reset.expiresAt, reset.timestamp]);
}
function revokePasswordResets(tx, customerId) {
  return tx.query("UPDATE ld_customer_password_resets SET used_at = ? WHERE customer_id = ? AND used_at IS NULL", [Date.now(), customerId]);
}
function findPasswordReset(tokenHash) {
  return one("SELECT resets.*, customers.name, customers.email, customers.status, customers.deleted_at FROM ld_customer_password_resets AS resets JOIN ld_customers AS customers ON customers.id = resets.customer_id WHERE resets.token_hash = ? AND resets.used_at IS NULL AND resets.expires_at > ? LIMIT 1", [tokenHash, Date.now()]);
}
function finishPasswordReset(tx, { resetId, customerId, passwordHash, timestamp: timestamp2 }) {
  return Promise.all([
    tx.query("UPDATE ld_customer_password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL", [timestamp2, resetId]),
    tx.query("UPDATE ld_customers SET password_hash = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [passwordHash, timestamp2, timestamp2, customerId]),
    tx.query("DELETE FROM ld_customer_sessions WHERE customer_id = ?", [customerId])
  ]);
}
function updateCustomerProfile(tx, { customerId, name, timestamp: timestamp2 }) {
  return tx.query("UPDATE ld_customers SET name = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [name, timestamp2, timestamp2, customerId]);
}
async function replacePrimaryPhone(tx, { customerId, phone, timestamp: timestamp2 }) {
  await tx.query("DELETE FROM ld_customer_phones WHERE customer_id = ?", [customerId]);
  if (phone) await tx.query("INSERT INTO ld_customer_phones (id, customer_id, label, phone, is_primary, created_at, updated_at) VALUES (?, ?, 'Principal', ?, 1, ?, ?)", [crypto.randomUUID(), customerId, phone, timestamp2, timestamp2]);
}
function updateCustomerPassword(tx, { customerId, passwordHash, timestamp: timestamp2 }) {
  return tx.query("UPDATE ld_customers SET password_hash = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [passwordHash, timestamp2, timestamp2, customerId]);
}
function listAddresses(customerId) {
  return query("SELECT id, label, recipient_name, postal_code, street, number, complement, district, city, state, country, is_primary FROM ld_customer_addresses WHERE customer_id = ? ORDER BY is_primary DESC, created_at ASC", [customerId]);
}
function findAddress(customerId, addressId) {
  return one("SELECT * FROM ld_customer_addresses WHERE customer_id = ? AND id = ?", [customerId, addressId]);
}
function countAddressesForCustomer(tx, customerId) {
  return tx.one("SELECT COUNT(*) AS total FROM ld_customer_addresses WHERE customer_id = ? FOR UPDATE", [customerId]);
}
async function replacePrimaryAddress(tx, customerId, address) {
  const timestamp2 = Date.now();
  const currentPrimary = await tx.one("SELECT id FROM ld_customer_addresses WHERE customer_id = ? AND is_primary = 1 LIMIT 1", [customerId]);
  const shouldBePrimary = Boolean(address.isPrimary || !currentPrimary);
  if (shouldBePrimary) await tx.query("UPDATE ld_customer_addresses SET is_primary = 0, updated_at = ? WHERE customer_id = ?", [timestamp2, customerId]);
  if (address.id) return tx.query("UPDATE ld_customer_addresses SET label = ?, recipient_name = ?, postal_code = ?, street = ?, number = ?, complement = ?, district = ?, city = ?, state = ?, country = ?, is_primary = ?, updated_at = ? WHERE customer_id = ? AND id = ?", [address.label, address.recipientName, address.postalCode, address.street, address.number, address.complement, address.district, address.city, address.state, address.country, shouldBePrimary ? 1 : 0, timestamp2, customerId, address.id]);
  return tx.query("INSERT INTO ld_customer_addresses (id, customer_id, label, recipient_name, postal_code, street, number, complement, observation, district, city, state, country, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)", [address.newId, customerId, address.label, address.recipientName, address.postalCode, address.street, address.number, address.complement, address.district, address.city, address.state, address.country, shouldBePrimary ? 1 : 0, timestamp2, timestamp2]);
}
function deleteAddress(customerId, addressId) {
  return query("DELETE FROM ld_customer_addresses WHERE customer_id = ? AND id = ?", [customerId, addressId]);
}
function listFavorites(customerId, storeId2) {
  return query("SELECT products.id, products.name, products.price_cents, products.compare_at_price_cents, products.status, (SELECT media.url FROM ld_product_media AS media WHERE media.product_id = products.id AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC LIMIT 1) AS image_url FROM ld_customer_favorites AS favorites JOIN ld_products AS products ON products.id = favorites.product_id WHERE favorites.customer_id = ? AND products.store_id = ? AND products.status = 'active' ORDER BY favorites.created_at DESC", [customerId, storeId2]);
}
function productInStore(storeId2, productId) {
  return one("SELECT id FROM ld_products WHERE id = ? AND store_id = ? AND status = 'active'", [productId, storeId2]);
}
function addFavorite(tx, favorite) {
  return tx.query("INSERT IGNORE INTO ld_customer_favorites (id, customer_id, product_id, created_at) VALUES (?, ?, ?, ?)", [favorite.id, favorite.customerId, favorite.productId, favorite.timestamp]);
}
function removeFavorite(customerId, productId) {
  return query("DELETE FROM ld_customer_favorites WHERE customer_id = ? AND product_id = ?", [customerId, productId]);
}
function clearFavorites(customerId) {
  return query("DELETE FROM ld_customer_favorites WHERE customer_id = ?", [customerId]);
}
async function replaceFavorites(tx, { customerId, productIds, timestamp: timestamp2 }) {
  await tx.query("DELETE FROM ld_customer_favorites WHERE customer_id = ?", [customerId]);
  for (const productId of productIds) await tx.query("INSERT INTO ld_customer_favorites (id, customer_id, product_id, created_at) VALUES (?, ?, ?, ?)", [crypto.randomUUID(), customerId, productId, timestamp2]);
}
function listCart(storeId2, ownerKey) {
  return query("SELECT cart.product_id, cart.variant_key, cart.quantity, products.id, products.name, products.price_cents, products.compare_at_price_cents, products.status, (SELECT media.url FROM ld_product_media AS media WHERE media.product_id = products.id AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC LIMIT 1) AS image_url FROM ld_customer_cart_items AS cart JOIN ld_products AS products ON products.id = cart.product_id WHERE cart.store_id = ? AND cart.owner_key = ? AND cart.expires_at > ? AND products.status = 'active' ORDER BY cart.updated_at DESC", [storeId2, ownerKey, Date.now()]);
}
function replaceCart(tx, { customerId, browserId: browserId2, storeId: storeId2, ownerKey, guestOwnerKey, items, timestamp: timestamp2, expiresAt }) {
  return (async () => {
    await tx.query("DELETE FROM ld_customer_cart_items WHERE store_id = ? AND owner_key = ?", [storeId2, ownerKey]);
    if (guestOwnerKey && guestOwnerKey !== ownerKey) await tx.query("DELETE FROM ld_customer_cart_items WHERE store_id = ? AND owner_key = ?", [storeId2, guestOwnerKey]);
    for (const item of items) await tx.query("INSERT INTO ld_customer_cart_items (id, store_id, customer_id, browser_uuid, owner_key, product_id, variant_key, quantity, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), storeId2, customerId || null, browserId2, ownerKey, item.productId, item.variantKey, item.quantity, timestamp2, timestamp2, expiresAt]);
  })();
}
function cleanupExpiredCarts(timestamp2 = Date.now()) {
  return query("DELETE FROM ld_customer_cart_items WHERE expires_at <= ?", [timestamp2]);
}
function deactivateCustomer(tx, { customerId, timestamp: timestamp2 }) {
  return tx.query("UPDATE ld_customers SET status = 'inactive', deleted_at = ?, account_updated_at = ?, updated_at = ? WHERE id = ?", [timestamp2, timestamp2, timestamp2, customerId]);
}
function checkoutAddress(tx, customerId, addressId) {
  return tx.one("SELECT * FROM ld_customer_addresses WHERE customer_id = ? AND id = ?", [customerId, addressId]);
}
function checkoutCartItems(tx, storeId2, ownerKey) {
  return tx.query("SELECT product_id, variant_key, quantity FROM ld_customer_cart_items WHERE store_id = ? AND owner_key = ? AND expires_at > ? ORDER BY updated_at ASC FOR UPDATE", [storeId2, ownerKey, Date.now()]);
}
function lockCheckoutProduct(tx, storeId2, productId) {
  return tx.one("SELECT id, store_id, name, sku, price_cents, stock_quantity, status, (SELECT media.url FROM ld_product_media AS media WHERE media.product_id = ld_products.id AND media.kind = 'image' ORDER BY media.is_primary DESC, media.sort_order ASC LIMIT 1) AS image_url FROM ld_products WHERE id = ? AND store_id = ? FOR UPDATE", [productId, storeId2]);
}
function lockCheckoutVariant(tx, productId, variantKey) {
  return tx.one("SELECT id, product_id, name, sku, price_cents, stock_quantity FROM ld_product_variants WHERE product_id = ? AND (id = ? OR sku = ?) LIMIT 1 FOR UPDATE", [productId, variantKey, variantKey]);
}
function createConsumerOrder(tx, order) {
  return tx.query("INSERT INTO ld_consumer_orders (id, store_id, customer_id, reference, status, payment_status, payment_provider, currency, subtotal_cents, discount_cents, shipping_cents, total_cents, customer_email, customer_name, shipping_address_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending_payment', 'pending', 'mercado_pago', 'BRL', ?, 0, ?, ?, ?, ?, ?, ?, ?)", [order.id, order.storeId, order.customerId, order.reference, order.subtotalCents, order.shippingCents, order.totalCents, order.customerEmail, order.customerName, JSON.stringify(order.shippingAddress), order.timestamp, order.timestamp]);
}
function createConsumerOrderItem(tx, item) {
  return tx.query("INSERT INTO ld_consumer_order_items (id, order_id, product_id, variant_key, sku, name, unit_price_cents, quantity, total_cents, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [item.id, item.orderId, item.productId, item.variantKey, item.sku, item.name, item.unitPriceCents, item.quantity, item.totalCents, item.imageUrl, item.timestamp]);
}
function setOrderPreference(orderId, storeId2, preferenceId, timestamp2) {
  return query("UPDATE ld_consumer_orders SET provider_preference_id = ?, updated_at = ? WHERE id = ? AND store_id = ?", [preferenceId, timestamp2, orderId, storeId2]);
}
function markOrderCheckoutFailure(orderId, storeId2, timestamp2) {
  return query("UPDATE ld_consumer_orders SET payment_status = 'failed', updated_at = ? WHERE id = ? AND store_id = ? AND payment_status = 'pending'", [timestamp2, orderId, storeId2]);
}
function findConsumerOrder(storeId2, customerId, orderId) {
  return one("SELECT * FROM ld_consumer_orders WHERE id = ? AND store_id = ? AND customer_id = ?", [orderId, storeId2, customerId]);
}
function listConsumerOrders(storeId2, customerId) {
  return query("SELECT * FROM ld_consumer_orders WHERE store_id = ? AND customer_id = ? ORDER BY created_at DESC", [storeId2, customerId]);
}
function listConsumerOrderItems(orderId) {
  return query("SELECT * FROM ld_consumer_order_items WHERE order_id = ? ORDER BY created_at ASC", [orderId]);
}
function cancelConsumerOrder(storeId2, customerId, orderId, timestamp2) {
  return query("UPDATE ld_consumer_orders SET status = 'cancelled', payment_status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND store_id = ? AND customer_id = ? AND payment_status IN ('pending', 'rejected', 'failed')", [timestamp2, timestamp2, orderId, storeId2, customerId]);
}
function lockConsumerOrderById(tx, storeId2, orderId) {
  return tx.one("SELECT * FROM ld_consumer_orders WHERE id = ? AND store_id = ? FOR UPDATE", [orderId, storeId2]);
}
function lockConsumerOrderItems(tx, orderId) {
  return tx.query("SELECT * FROM ld_consumer_order_items WHERE order_id = ? FOR UPDATE", [orderId]);
}
function updateConsumerPayment(tx, order) {
  return tx.query("UPDATE ld_consumer_orders SET status = ?, payment_status = ?, provider_payment_id = ?, provider_payload_json = ?, paid_at = ?, updated_at = ? WHERE id = ?", [order.status, order.paymentStatus, order.providerPaymentId, JSON.stringify(order.providerPayload), order.paidAt, order.timestamp, order.id]);
}
function decrementProductStock(tx, productId, quantity) {
  return tx.query("UPDATE ld_products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ? AND stock_quantity >= ?", [quantity, Date.now(), productId, quantity]);
}
function decrementVariantStock(tx, variantKey, productId, quantity) {
  return tx.query("UPDATE ld_product_variants SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ? AND product_id = ? AND stock_quantity >= ?", [quantity, Date.now(), variantKey, productId, quantity]);
}
function addNotification(tx, notice) {
  return tx.query("INSERT INTO ld_customer_notifications (id, store_id, customer_id, order_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [notice.id, notice.storeId, notice.customerId, notice.orderId, notice.type, notice.title, notice.body, notice.timestamp]);
}

// server/modules/storefront/service.js
var SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var RESET_TTL_MS = 30 * 60 * 1e3;
var GUEST_CART_TTL_MS = 48 * 60 * 60 * 1e3;
var CUSTOMER_CART_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var StorefrontError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function registerCustomer({ storeId: storeId2, input }) {
  const store = await requireStore4(storeId2);
  const email = normalizeEmail6(input.email);
  const name = requiredText2(input.name, 2, 160, "Informe seu nome.");
  const password = validPassword(input.password);
  if (!email) throw new StorefrontError(422, "Informe um e-mail v\xE1lido.");
  if (await findCustomerByEmail(store.id, email)) throw new StorefrontError(409, "J\xE1 existe uma conta com este e-mail nesta loja.");
  const timestamp2 = Date.now();
  const customer = { id: randomUUID14(), storeId: store.id, name, email, passwordHash: await hashPassword(password), timestamp: timestamp2 };
  const session = await transaction(async (tx) => {
    await createCustomer2(tx, customer);
    return createSession2(tx, customer, timestamp2);
  });
  return { accessToken: session.accessToken, user: publicCustomer2(customer) };
}
async function loginCustomer({ storeId: storeId2, input }) {
  const store = await requireStore4(storeId2);
  const email = normalizeEmail6(input.email);
  const password = String(input.password || "");
  const customer = email ? await findCustomerByEmail(store.id, email) : null;
  if (!customer || customer.status !== "active" || !customer.password_hash || !await verifyPassword(password, customer.password_hash)) throw new StorefrontError(401, "E-mail ou senha inv\xE1lidos.");
  const session = await transaction((tx) => createSession2(tx, customer, Date.now()));
  return { accessToken: session.accessToken, user: publicCustomer2(customer) };
}
async function getCustomerSession(token2) {
  if (!token2) throw new StorefrontError(401, "Fa\xE7a login para continuar.");
  const session = await findSession(hashToken(token2));
  if (!session || session.status !== "active" || session.deleted_at) throw new StorefrontError(401, "Sua sess\xE3o expirou. Entre novamente.");
  void touchSession(hashToken(token2), Date.now());
  return { tokenHash: hashToken(token2), storeId: session.store_id, customer: publicCustomer2({ id: session.customer_id, name: session.name, email: session.email }) };
}
async function logoutCustomer(token2) {
  if (token2) await deleteSession(hashToken(token2));
}
async function getProfile(session) {
  const customer = await findCustomerProfile(session.storeId, session.customer.id);
  if (!customer) throw new StorefrontError(404, "Conta n\xE3o encontrada.");
  return publicCustomer2(customer);
}
async function updateProfile({ session, input }) {
  const name = requiredText2(input.name, 2, 160, "Informe seu nome.");
  const hasPhone = Object.prototype.hasOwnProperty.call(input, "phone");
  const phone = hasPhone ? normalizePhone(input.phone) : null;
  if (hasPhone && !phone) throw new StorefrontError(422, "Informe um telefone v\xE1lido com DDD.");
  const timestamp2 = Date.now();
  await transaction(async (tx) => {
    await updateCustomerProfile(tx, { customerId: session.customer.id, name, timestamp: timestamp2 });
    if (hasPhone) await replacePrimaryPhone(tx, { customerId: session.customer.id, phone, timestamp: timestamp2 });
  });
  return getProfile(session);
}
async function requestPasswordReset2({ storeId: storeId2, email }) {
  const store = await requireStore4(storeId2);
  const customer = await findCustomerByEmail(store.id, normalizeEmail6(email));
  if (!customer || customer.status !== "active" || !customer.password_hash) return { ok: true };
  const rawToken = randomBytes4(32).toString("base64url");
  const timestamp2 = Date.now();
  await transaction(async (tx) => {
    await revokePasswordResets(tx, customer.id);
    await savePasswordReset(tx, { id: randomUUID14(), storeId: store.id, customerId: customer.id, tokenHash: hashToken(rawToken), expiresAt: timestamp2 + RESET_TTL_MS, timestamp: timestamp2 });
  });
  const resetUrl = storefrontRoute(store, "/redefinir-senha", { token: rawToken });
  await sendStoreTransactionalEmail({ storeId: store.id, eventKey: "customer_password_reset", recipient: customer.email, variables: { customerName: customer.name, resetUrl } });
  return { ok: true };
}
async function resetPassword2({ token: token2, password }) {
  const reset = await findPasswordReset(hashToken(token2));
  if (!reset || reset.status !== "active" || reset.deleted_at) throw new StorefrontError(422, "O link de redefini\xE7\xE3o \xE9 inv\xE1lido ou expirou.");
  const timestamp2 = Date.now();
  const passwordHash = await hashPassword(validPassword(password));
  await transaction((tx) => finishPasswordReset(tx, { resetId: reset.id, customerId: reset.customer_id, passwordHash, timestamp: timestamp2 }));
  return { ok: true };
}
async function changePassword({ session, input }) {
  const customer = await findCustomerById(session.storeId, session.customer.id);
  if (!customer || !await verifyPassword(String(input.currentPassword || ""), customer.password_hash)) throw new StorefrontError(422, "A senha atual est\xE1 incorreta.");
  const timestamp2 = Date.now();
  await transaction(async (tx) => {
    await updateCustomerPassword(tx, { customerId: customer.id, passwordHash: await hashPassword(validPassword(input.newPassword)), timestamp: timestamp2 });
    await deleteCustomerSessions(tx, customer.id);
  });
  return { ok: true };
}
async function listAddresses2(session) {
  return (await listAddresses(session.customer.id)).map(publicAddress);
}
async function saveAddress({ session, addressId, input, setDefault = false }) {
  const address = parseAddress(input);
  if (addressId && !await findAddress(session.customer.id, addressId)) throw new StorefrontError(404, "Endere\xE7o n\xE3o encontrado.");
  const result = { ...address, id: addressId || null, newId: addressId ? null : randomUUID14(), isPrimary: Boolean(setDefault || input.isPrimary) };
  await transaction(async (tx) => {
    if (!addressId) {
      const count = await countAddressesForCustomer(tx, session.customer.id);
      if (Number(count?.total || 0) >= 4) throw new StorefrontError(409, "Voc\xEA pode cadastrar no m\xE1ximo quatro endere\xE7os.");
    }
    await replacePrimaryAddress(tx, session.customer.id, result);
  });
  const addresses = await listAddresses2(session);
  return { addresses, address: addresses.find((item) => item.id === (addressId || result.newId)) || null };
}
async function setDefaultAddress({ session, addressId }) {
  const address = await findAddress(session.customer.id, addressId);
  if (!address) throw new StorefrontError(404, "Endere\xE7o n\xE3o encontrado.");
  return saveAddress({ session, addressId, input: address, setDefault: true });
}
async function removeAddress({ session, addressId }) {
  await deleteAddress(session.customer.id, addressId);
}
async function listFavorites2(session) {
  return (await listFavorites(session.customer.id, session.storeId)).map(publicFavorite);
}
async function addFavorite2({ session, productId }) {
  if (!await productInStore(session.storeId, productId)) throw new StorefrontError(404, "Produto n\xE3o encontrado.");
  await transaction((tx) => addFavorite(tx, { id: randomUUID14(), customerId: session.customer.id, productId, timestamp: Date.now() }));
  return listFavorites2(session);
}
async function removeFavorite2({ session, productId }) {
  await removeFavorite(session.customer.id, productId);
  return listFavorites2(session);
}
async function mergeFavorites({ session, productIds }) {
  const unique2 = [...new Set(productIds.filter((id) => typeof id === "string" && id.length === 36))];
  await transaction(async (tx) => {
    for (const productId of unique2) if (await productInStore(session.storeId, productId)) await addFavorite(tx, { id: randomUUID14(), customerId: session.customer.id, productId, timestamp: Date.now() });
  });
  return listFavorites2(session);
}
async function syncFavorites({ session, productIds }) {
  const unique2 = [...new Set((Array.isArray(productIds) ? productIds : []).filter((id) => typeof id === "string" && id.length === 36))];
  const valid = [];
  for (const productId of unique2) if (await productInStore(session.storeId, productId)) valid.push(productId);
  await transaction((tx) => replaceFavorites(tx, { customerId: session.customer.id, productIds: valid, timestamp: Date.now() }));
  return listFavorites2(session);
}
async function clearFavorites2(session) {
  await clearFavorites(session.customer.id);
}
async function getCart({ storeId: storeId2, session, browserId: browserId2 }) {
  const identity = await resolveCartIdentity({ storeId: storeId2, session, browserId: browserId2 });
  await cleanupExpiredCarts();
  return { items: (await listCart(identity.storeId, identity.ownerKey)).map(publicCartItem) };
}
async function syncCart({ storeId: storeId2, session, browserId: browserId2, items }) {
  const identity = await resolveCartIdentity({ storeId: storeId2, session, browserId: browserId2 });
  const normalized = await normalizeCart(identity.storeId, items);
  const timestamp2 = Date.now();
  await transaction((tx) => replaceCart(tx, { ...identity, items: normalized, timestamp: timestamp2, expiresAt: timestamp2 + identity.ttlMs }));
  return getCart({ storeId: identity.storeId, session, browserId: identity.browserId });
}
async function cleanupExpiredCarts2() {
  const result = await cleanupExpiredCarts();
  return { deleted: Number(result?.affectedRows || 0) };
}
async function deleteAccount({ session, password }) {
  const customer = await findCustomerById(session.storeId, session.customer.id);
  if (!customer || !await verifyPassword(String(password || ""), customer.password_hash)) throw new StorefrontError(422, "Confirme sua senha para excluir a conta.");
  await transaction(async (tx) => {
    await deactivateCustomer(tx, { customerId: customer.id, timestamp: Date.now() });
    await deleteCustomerSessions(tx, customer.id);
  });
}
async function createConsumerCheckout({ session, input }) {
  const store = await requireStore4(session.storeId);
  const customer = await findCustomerById(session.storeId, session.customer.id);
  const addressId = String(input?.addressId || "");
  const cartIdentity = await resolveCartIdentity({ session, browserId: input?.browserId });
  if (!customer || !addressId) throw new StorefrontError(422, "Selecione um endere\xE7o de entrega antes de continuar.");
  await cleanupExpiredCarts();
  const created = await transaction(async (tx) => {
    const address = await checkoutAddress(tx, customer.id, addressId);
    if (!address) throw new StorefrontError(404, "Endere\xE7o de entrega n\xE3o encontrado.");
    const cartItems = await checkoutCartItems(tx, store.id, cartIdentity.ownerKey);
    if (!cartItems.length) throw new StorefrontError(422, "Seu carrinho est\xE1 vazio.");
    const items = [];
    for (const cartItem of cartItems) {
      const product = await lockCheckoutProduct(tx, store.id, cartItem.product_id);
      if (!product || product.status !== "active") throw new StorefrontError(422, "Um produto do carrinho n\xE3o est\xE1 mais dispon\xEDvel.");
      const variant = cartItem.variant_key ? await lockCheckoutVariant(tx, product.id, cartItem.variant_key) : null;
      if (cartItem.variant_key && !variant) throw new StorefrontError(422, `A varia\xE7\xE3o de ${product.name} n\xE3o est\xE1 mais dispon\xEDvel.`);
      const stock = Number(variant?.stock_quantity ?? product.stock_quantity);
      const quantity = Number(cartItem.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > stock) throw new StorefrontError(422, `O estoque de ${variant ? `${product.name} \u2014 ${variant.name}` : product.name} mudou. Revise seu carrinho.`);
      const unitPriceCents = Number(variant?.price_cents ?? product.price_cents);
      if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) throw new StorefrontError(422, "N\xE3o foi poss\xEDvel confirmar o pre\xE7o de um item do carrinho.");
      items.push({ productId: product.id, variantKey: variant?.id || "", sku: variant?.sku || product.sku || null, name: variant ? `${product.name} \u2014 ${variant.name}` : product.name, unitPriceCents, quantity, totalCents: unitPriceCents * quantity, imageUrl: product.image_url || "" });
    }
    const timestamp2 = Date.now();
    const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
    const order = { id: randomUUID14(), storeId: store.id, customerId: customer.id, reference: `PED-${randomUUID14().replace(/-/g, "").slice(0, 10).toUpperCase()}`, subtotalCents, shippingCents: 0, totalCents: subtotalCents, customerEmail: customer.email, customerName: customer.name, shippingAddress: publicAddress(address), timestamp: timestamp2 };
    await createConsumerOrder(tx, order);
    for (const item of items) await createConsumerOrderItem(tx, { id: randomUUID14(), orderId: order.id, ...item, timestamp: timestamp2 });
    return { order, items };
  });
  try {
    const preference = await createMercadoPagoPreference({ store, customer, order: created.order, items: created.items });
    await setOrderPreference(created.order.id, store.id, preference.preferenceId, Date.now());
    try {
      await sendStoreTransactionalEmail({ storeId: store.id, eventKey: "payment_requested", recipient: customer.email, variables: { customerName: customer.name, orderReference: created.order.reference, orderTotal: formatCurrency(created.order.totalCents), paymentUrl: preference.checkoutUrl } });
    } catch {
    }
    return { orderId: created.order.id, orderReference: created.order.reference, checkoutUrl: preference.checkoutUrl };
  } catch (error) {
    await markOrderCheckoutFailure(created.order.id, store.id, Date.now());
    if (error instanceof StorefrontError) throw error;
    throw new StorefrontError(502, "N\xE3o foi poss\xEDvel iniciar o pagamento Mercado Pago. Tente novamente em alguns instantes.");
  }
}
async function listOrders(session) {
  const orders = await listConsumerOrders(session.storeId, session.customer.id);
  return Promise.all(orders.map(async (order) => presentOrder(order, await listConsumerOrderItems(order.id))));
}
async function cancelOrder({ session, orderId }) {
  const order = await findConsumerOrder(session.storeId, session.customer.id, orderId);
  if (!order) throw new StorefrontError(404, "Pedido n\xE3o encontrado.");
  await cancelConsumerOrder(session.storeId, session.customer.id, orderId, Date.now());
  return { ok: true };
}
async function processConsumerMercadoPagoWebhook({ signature, requestId, paymentId, storeId: storeId2 }) {
  const secret = String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || "");
  if (!verifyMercadoPagoSignature({ signature, requestId, resourceId: paymentId, secret })) throw new StorefrontError(401, "Assinatura de webhook inv\xE1lida.");
  const store = await requireStore4(storeId2);
  const accessToken = await getStoreMercadoPagoAccessToken(store.id);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15e3) });
  if (!response.ok) throw new StorefrontError(502, "N\xE3o foi poss\xEDvel consultar o pagamento informado pelo Mercado Pago.");
  const payment = await response.json();
  const orderId = String(payment.external_reference || payment.metadata?.consumer_order_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { ignored: true };
  const email = await persistConsumerPayment({ store, payment, orderId });
  if (email) try {
    await sendStoreTransactionalEmail(email);
  } catch {
  }
  return { ignored: false };
}
async function createMercadoPagoPreference({ store, customer, order, items }) {
  const accessToken = await getStoreMercadoPagoAccessToken(store.id);
  const webhookUrl = `${requiredAppUrl()}/v1/consumer/mercado-pago/webhook?store_id=${encodeURIComponent(store.id)}`;
  const backUrl = (status) => storefrontRoute(store, status === "sucesso" ? "/pedido-confirmado" : "/checkout", { order: order.id, paymentStatus: status });
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": order.id }, body: JSON.stringify({ external_reference: order.id, metadata: { consumer_order_id: order.id, store_id: store.id }, payer: { email: customer.email, name: customer.name }, items: items.map((item) => ({ id: item.sku || item.productId, title: item.name, quantity: item.quantity, unit_price: Number((item.unitPriceCents / 100).toFixed(2)), currency_id: "BRL", picture_url: item.imageUrl || void 0 })), back_urls: { success: backUrl("sucesso"), failure: backUrl("falha"), pending: backUrl("pendente") }, auto_return: "approved", notification_url: webhookUrl }), signal: AbortSignal.timeout(2e4) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id || !(payload.init_point || payload.sandbox_init_point)) throw new StorefrontError(502, "O Mercado Pago n\xE3o aceitou a solicita\xE7\xE3o de checkout desta loja.");
  return { preferenceId: String(payload.id), checkoutUrl: String(payload.init_point || payload.sandbox_init_point) };
}
async function persistConsumerPayment({ store, payment, orderId }) {
  let email = null;
  await transaction(async (tx) => {
    const order = await lockConsumerOrderById(tx, store.id, orderId);
    if (!order || order.payment_status === "approved") return;
    const paymentStatus2 = normalizePaymentStatus(payment.status);
    let status = paymentStatus2 === "approved" ? "paid" : order.status;
    if (paymentStatus2 === "approved") {
      const items = await lockConsumerOrderItems(tx, order.id);
      let stockAvailable = true;
      for (const item of items) {
        const product = await lockCheckoutProduct(tx, store.id, item.product_id);
        const variant = item.variant_key ? await lockCheckoutVariant(tx, item.product_id, item.variant_key) : null;
        if (!product || item.variant_key && !variant || Number(variant?.stock_quantity ?? product.stock_quantity) < Number(item.quantity)) {
          stockAvailable = false;
          break;
        }
      }
      if (stockAvailable) for (const item of items) {
        const updated = item.variant_key ? await decrementVariantStock(tx, item.variant_key, item.product_id, Number(item.quantity)) : await decrementProductStock(tx, item.product_id, Number(item.quantity));
        if (Number(updated.affectedRows || 0) !== 1) {
          stockAvailable = false;
          break;
        }
      }
      status = stockAvailable ? "paid" : "paid_stock_exception";
      await addNotification(tx, { id: randomUUID14(), storeId: store.id, customerId: order.customer_id, orderId: order.id, type: stockAvailable ? "payment_approved" : "payment_stock_exception", title: stockAvailable ? "Pagamento confirmado" : "Pagamento confirmado; estoque ser\xE1 revisado", body: stockAvailable ? `O pagamento do pedido ${order.reference} foi confirmado.` : `O pagamento do pedido ${order.reference} foi confirmado, mas um item precisa de revis\xE3o de estoque.`, timestamp: Date.now() });
      if (stockAvailable) email = { storeId: store.id, eventKey: "purchase_paid", recipient: order.customer_email, variables: { customerName: order.customer_name, orderReference: order.reference, orderTotal: formatCurrency(Number(order.total_cents)) } };
    }
    await updateConsumerPayment(tx, { id: order.id, status, paymentStatus: paymentStatus2, providerPaymentId: String(payment.id), providerPayload: publicPaymentPayload(payment), paidAt: paymentStatus2 === "approved" ? Date.now() : null, timestamp: Date.now() });
  });
  return email;
}
async function createSession2(tx, customer, timestamp2) {
  const accessToken = randomBytes4(48).toString("base64url");
  await createSession(tx, { id: randomUUID14(), storeId: customer.store_id || customer.storeId, customerId: customer.id, tokenHash: hashToken(accessToken), expiresAt: timestamp2 + SESSION_TTL_MS, timestamp: timestamp2 });
  return { accessToken };
}
function storefrontRoute(store, pathname, params = {}) {
  const domain = String(store.custom_domain || "").trim().toLowerCase();
  const configured = String(process.env.STOREFRONT_APP_URL || "").replace(/\/$/, "");
  const temporaryHost = String(process.env.STOREFRONT_TEMP_HOST || "5173-ie4e817p10lgi0y7zw6he-b3e65758.us3.manus.computer").trim().toLowerCase();
  const usesCustomDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
  const base = usesCustomDomain ? `https://${domain}` : configured;
  if (!base.startsWith("https://")) throw new StorefrontError(503, "A URL p\xFAblica da vitrine ainda n\xE3o foi configurada para esta loja.");
  const baseUrl = new URL(base);
  const route7 = String(pathname || "/").startsWith("/") ? pathname : `/${pathname}`;
  const prefix = !usesCustomDomain && baseUrl.hostname.toLowerCase() === temporaryHost ? `/@${store.slug}` : "";
  const url = new URL(`${prefix}${route7}`, `${baseUrl.origin}/`);
  for (const [key, value] of Object.entries(params)) if (value != null) url.searchParams.set(key, String(value));
  return url.toString();
}
async function resolveCartIdentity({ storeId: storeId2, session, browserId: browserId2 }) {
  const resolvedStoreId = session?.storeId || String(storeId2 || "");
  const store = await requireStore4(resolvedStoreId);
  if (session && store.id !== session.storeId) throw new StorefrontError(403, "A sess\xE3o n\xE3o pertence a esta loja.");
  const normalizedBrowserId = normalizeBrowserId(browserId2);
  if (!normalizedBrowserId) throw new StorefrontError(422, "O identificador deste carrinho \xE9 inv\xE1lido.");
  const customerId = session?.customer?.id || null;
  return { storeId: store.id, customerId, browserId: normalizedBrowserId, ownerKey: customerId ? `customer:${customerId}:${normalizedBrowserId}` : `guest:${normalizedBrowserId}`, guestOwnerKey: customerId ? `guest:${normalizedBrowserId}` : null, ttlMs: customerId ? CUSTOMER_CART_TTL_MS : GUEST_CART_TTL_MS };
}
function requiredAppUrl() {
  const value = String(process.env.APP_URL || "").replace(/\/$/, "");
  if (!value.startsWith("https://")) throw new StorefrontError(503, "A URL HTTPS do servi\xE7o ainda n\xE3o foi configurada para receber pagamentos.");
  return value;
}
function normalizePaymentStatus(value) {
  const status = String(value || "").toLowerCase();
  return ["approved", "pending", "in_process", "rejected", "cancelled", "refunded", "charged_back"].includes(status) ? status : "pending";
}
function publicPaymentPayload(payment) {
  return { id: String(payment.id || ""), status: normalizePaymentStatus(payment.status), statusDetail: String(payment.status_detail || ""), paymentMethodId: String(payment.payment_method_id || ""), transactionAmount: Number(payment.transaction_amount || 0), externalReference: String(payment.external_reference || "") };
}
function formatCurrency(cents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100);
}
async function requireStore4(storeId2) {
  const store = storeId2 ? await findPublicStore(storeId2) : null;
  if (!store) throw new StorefrontError(404, "Loja n\xE3o encontrada.");
  return store;
}
async function normalizeCart(storeId2, items) {
  if (!Array.isArray(items) || items.length > 100) throw new StorefrontError(422, "Carrinho inv\xE1lido.");
  const result = [];
  for (const item of items) {
    const productId = String(item?.productId || item?.product?.id || "");
    const quantity = Math.floor(Number(item?.quantity));
    const variantKey = String(item?.variantKey || item?.variant?.id || item?.variant?.sku || "").slice(0, 80);
    if (!productId || quantity < 1 || quantity > 99 || !await productInStore(storeId2, productId)) continue;
    result.push({ productId, variantKey, quantity });
  }
  return result;
}
function validPassword(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 200) throw new StorefrontError(422, "A senha deve ter entre 8 e 200 caracteres.");
  return password;
}
function requiredText2(value, min, max, message) {
  const text4 = String(value || "").trim();
  if (text4.length < min || text4.length > max) throw new StorefrontError(422, message);
  return text4;
}
function normalizeEmail6(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13 ? digits : "";
}
function normalizeBrowserId(value) {
  const id = String(value || "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) ? id : "";
}
function parseAddress(input = {}) {
  return { label: requiredText2(input.label || "Principal", 1, 60, "Informe o r\xF3tulo do endere\xE7o."), recipientName: requiredText2(input.recipientName || input.recipient_name, 2, 160, "Informe quem receber\xE1 o pedido."), postalCode: String(input.postalCode || input.postal_code || "").replace(/\D/g, "").slice(0, 8), street: requiredText2(input.street, 2, 180, "Informe a rua."), number: requiredText2(input.number, 1, 30, "Informe o n\xFAmero."), complement: String(input.complement || "").slice(0, 120), district: requiredText2(input.district, 2, 120, "Informe o bairro."), city: requiredText2(input.city, 2, 120, "Informe a cidade."), state: requiredText2(input.state, 2, 80, "Informe o estado."), country: String(input.country || "BR").slice(0, 2).toUpperCase() };
}
function publicCustomer2(customer) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.primary_phone || "" };
}
function publicAddress(address) {
  return { id: address.id, label: address.label, recipientName: address.recipient_name, postalCode: address.postal_code, street: address.street, number: address.number, complement: address.complement || "", district: address.district, city: address.city, state: address.state, country: address.country, isPrimary: Boolean(address.is_primary) };
}
function publicFavorite(item) {
  return { id: item.id, name: item.name, slug: item.id, priceCents: Number(item.price_cents), compareAtPriceCents: item.compare_at_price_cents == null ? null : Number(item.compare_at_price_cents), imageUrl: item.image_url || "" };
}
function publicCartItem(item) {
  return { productId: item.product_id, variantKey: item.variant_key, quantity: Number(item.quantity), product: { id: item.id, name: item.name, slug: item.id, priceCents: Number(item.price_cents), compareAtPriceCents: item.compare_at_price_cents == null ? null : Number(item.compare_at_price_cents), imageUrl: item.image_url || "" } };
}
function presentOrder(order, items) {
  return { id: order.id, orderNumber: order.reference, status: order.status, paymentStatus: order.payment_status, totalCents: Number(order.total_cents), subtotalCents: Number(order.subtotal_cents), shippingCents: Number(order.shipping_cents), currency: order.currency, createdAt: Number(order.created_at), updatedAt: Number(order.updated_at), shippingAddress: parseJson5(order.shipping_address_json, null), items: items.map((item) => ({ id: item.id, productId: item.product_id, variantKey: item.variant_key, sku: item.sku, name: item.name, unitPriceCents: Number(item.unit_price_cents), quantity: Number(item.quantity), totalCents: Number(item.total_cents), imageUrl: item.image_url || "" })) };
}
function parseJson5(value, fallback) {
  try {
    return typeof value === "object" && value ? value : JSON.parse(value || "null");
  } catch {
    return fallback;
  }
}

// server/modules/storefront/controller.js
var router13 = Router14();
var route5 = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
var storeId = (req) => String(req.get("x-store-id") || req.body?.storeId || req.query?.storeId || "");
var token = (req) => String(req.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
var requireCustomer2 = async (req) => {
  const session = await getCustomerSession(token(req));
  if (storeId(req) && storeId(req) !== session.storeId) throw new StorefrontError(403, "A sess\xE3o n\xE3o pertence a esta loja.");
  return session;
};
var optionalCustomer = async (req) => token(req) ? requireCustomer2(req) : null;
var browserId = (req) => String(req.get("x-cart-id") || req.body?.browserId || req.query?.browserId || "");
router13.post("/customer/register", route5(async (req, res) => res.status(201).json(await registerCustomer({ storeId: storeId(req), input: req.body || {} }))));
router13.post("/customer/login", route5(async (req, res) => res.json(await loginCustomer({ storeId: storeId(req), input: req.body || {} }))));
router13.post("/customer/logout", route5(async (req, res) => {
  await logoutCustomer(token(req));
  res.json({ ok: true });
}));
router13.post("/customer/forgot-password", route5(async (req, res) => res.json(await requestPasswordReset2({ storeId: storeId(req), email: req.body?.email }))));
router13.post("/customer/reset-password", route5(async (req, res) => res.json(await resetPassword2({ token: req.body?.token, password: req.body?.password }))));
router13.get("/customer/profile", route5(async (req, res) => res.json({ user: await getProfile(await requireCustomer2(req)) })));
router13.put("/customer/profile", route5(async (req, res) => res.json({ user: await updateProfile({ session: await requireCustomer2(req), input: req.body || {} }) })));
router13.post("/customer/change-password", route5(async (req, res) => res.json(await changePassword({ session: await requireCustomer2(req), input: req.body || {} }))));
router13.delete("/customer/account", route5(async (req, res) => {
  await deleteAccount({ session: await requireCustomer2(req), password: req.body?.password });
  res.json({ ok: true });
}));
router13.get("/customer/addresses", route5(async (req, res) => res.json({ addresses: await listAddresses2(await requireCustomer2(req)) })));
router13.post("/customer/addresses", route5(async (req, res) => res.status(201).json(await saveAddress({ session: await requireCustomer2(req), input: req.body || {} }))));
router13.put("/customer/addresses/:addressId", route5(async (req, res) => res.json(await saveAddress({ session: await requireCustomer2(req), addressId: req.params.addressId, input: req.body || {} }))));
router13.post("/customer/addresses/:addressId/set-default", route5(async (req, res) => res.json(await setDefaultAddress({ session: await requireCustomer2(req), addressId: req.params.addressId }))));
router13.delete("/customer/addresses/:addressId", route5(async (req, res) => {
  await removeAddress({ session: await requireCustomer2(req), addressId: req.params.addressId });
  res.json({ ok: true });
}));
router13.get("/customer/favorites", route5(async (req, res) => res.json({ favorites: await listFavorites2(await requireCustomer2(req)) })));
router13.post("/customer/favorites", route5(async (req, res) => res.json({ favorites: await addFavorite2({ session: await requireCustomer2(req), productId: req.body?.productId }) })));
router13.post("/customer/favorites/merge", route5(async (req, res) => res.json({ favorites: await mergeFavorites({ session: await requireCustomer2(req), productIds: req.body?.productIds || [] }) })));
router13.post("/customer/favorites/sync", route5(async (req, res) => res.json({ favorites: await syncFavorites({ session: await requireCustomer2(req), productIds: req.body?.productIds || [] }) })));
router13.delete("/customer/favorites/:productId", route5(async (req, res) => res.json({ favorites: await removeFavorite2({ session: await requireCustomer2(req), productId: req.params.productId }) })));
router13.delete("/customer/favorites", route5(async (req, res) => {
  await clearFavorites2(await requireCustomer2(req));
  res.json({ ok: true });
}));
router13.get("/customer/cart", route5(async (req, res) => {
  const session = await optionalCustomer(req);
  res.json(await getCart({ storeId: storeId(req), session, browserId: browserId(req) }));
}));
router13.post("/customer/cart/sync", route5(async (req, res) => {
  const session = await optionalCustomer(req);
  res.json(await syncCart({ storeId: storeId(req), session, browserId: browserId(req), items: req.body?.items || [] }));
}));
router13.get("/customer/orders", route5(async (req, res) => res.json({ orders: await listOrders(await requireCustomer2(req)) })));
router13.post("/customer/orders/checkout", route5(async (req, res) => res.status(201).json(await createConsumerCheckout({ session: await requireCustomer2(req), input: req.body || {} }))));
router13.post("/customer/orders/:orderId/cancel", route5(async (req, res) => res.json(await cancelOrder({ session: await requireCustomer2(req), orderId: req.params.orderId }))));
router13.post("/consumer/mercado-pago/webhook", route5(async (req, res) => {
  const paymentId = String(req.query?.["data.id"] || req.body?.data?.id || "");
  if (!/^\d{1,32}$/.test(paymentId)) return res.status(200).json({ ignored: true });
  await processConsumerMercadoPagoWebhook({ signature: req.get("x-signature"), requestId: req.get("x-request-id"), paymentId, storeId: String(req.query?.store_id || "") });
  res.status(200).json({ ok: true });
}));
router13.use((error, _req, res, next) => error instanceof StorefrontError ? res.status(error.status).json({ error: error.message }) : next(error));
var controller_default13 = router13;

// server/modules/orders/controller.js
import { Router as Router15 } from "express";

// server/modules/orders/repository.js
var withinTransaction5 = transaction;
function findStoreOwnedByUser4(storeId2, userId) {
  return one("SELECT id, name, slug FROM ld_stores WHERE id = ? AND user_id = ?", [storeId2, userId]);
}
async function listOrderPage({ filters, pagination }) {
  const [count, rows, summary] = await Promise.all([
    one(`SELECT COUNT(*) AS total FROM ld_consumer_orders AS orders WHERE ${filters.where}`, filters.params),
    query(`SELECT orders.*, (SELECT COUNT(*) FROM ld_consumer_order_items AS items WHERE items.order_id = orders.id) AS items_count, (SELECT COALESCE(SUM(items.quantity), 0) FROM ld_consumer_order_items AS items WHERE items.order_id = orders.id) AS items_quantity FROM ld_consumer_orders AS orders WHERE ${filters.where} ORDER BY orders.created_at DESC LIMIT ${pagination.limit} OFFSET ${pagination.offset}`, filters.params),
    one(`SELECT COUNT(*) AS total, COALESCE(SUM(orders.total_cents), 0) AS total_cents, COALESCE(SUM(orders.status = 'pending_payment'), 0) AS pending_payment, COALESCE(SUM(orders.status = 'paid'), 0) AS paid, COALESCE(SUM(orders.status = 'processing'), 0) AS processing, COALESCE(SUM(orders.status = 'shipped'), 0) AS shipped, COALESCE(SUM(orders.status = 'delivered'), 0) AS delivered FROM ld_consumer_orders AS orders WHERE ${filters.where}`, filters.params)
  ]);
  return { count, rows, summary };
}
function findOrder(storeId2, orderId) {
  return one("SELECT orders.* FROM ld_consumer_orders AS orders WHERE orders.store_id = ? AND orders.id = ?", [storeId2, orderId]);
}
function findOrderItems(orderId) {
  return query("SELECT * FROM ld_consumer_order_items WHERE order_id = ? ORDER BY created_at ASC", [orderId]);
}
function lockOrder(tx, storeId2, orderId) {
  return tx.one("SELECT * FROM ld_consumer_orders WHERE store_id = ? AND id = ? FOR UPDATE", [storeId2, orderId]);
}
function updateFulfillmentStatus(tx, { storeId: storeId2, orderId, status, timestamp: timestamp2 }) {
  return tx.query("UPDATE ld_consumer_orders SET status = ?, updated_at = ? WHERE store_id = ? AND id = ?", [status, timestamp2, storeId2, orderId]);
}

// server/modules/orders/validation.js
var ORDER_STATUSES = /* @__PURE__ */ new Set(["pending_payment", "paid", "paid_stock_exception", "processing", "shipped", "delivered", "cancelled"]);
var PAYMENT_STATUSES = /* @__PURE__ */ new Set(["pending", "approved", "in_process", "rejected", "cancelled", "refunded", "charged_back", "failed"]);
var FULFILLMENT_STATUSES = /* @__PURE__ */ new Set(["processing", "shipped", "delivered"]);
var OrderValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.status = 422;
  }
};
function getOrderListInput(query3 = {}, storeId2) {
  const pagination = boundedPagination(query3, { defaultLimit: 20, maxLimit: 100 });
  const status = text2(query3.status);
  const paymentStatus2 = text2(query3.paymentStatus);
  const search = text2(query3.q, 100);
  if (status && !ORDER_STATUSES.has(status)) throw new OrderValidationError("O status do pedido informado \xE9 inv\xE1lido.");
  if (paymentStatus2 && !PAYMENT_STATUSES.has(paymentStatus2)) throw new OrderValidationError("O status de pagamento informado \xE9 inv\xE1lido.");
  const clauses = ["orders.store_id = ?"];
  const params = [storeId2];
  if (status) {
    clauses.push("orders.status = ?");
    params.push(status);
  }
  if (paymentStatus2) {
    clauses.push("orders.payment_status = ?");
    params.push(paymentStatus2);
  }
  if (search) {
    clauses.push("(orders.reference LIKE ? OR orders.customer_name LIKE ? OR orders.customer_email LIKE ?)");
    const value = `%${search}%`;
    params.push(value, value, value);
  }
  return { pagination, filters: { where: clauses.join(" AND "), params, status, paymentStatus: paymentStatus2, search } };
}
function parseOrderStatusInput(input = {}) {
  const status = text2(input.status, 40);
  if (!FULFILLMENT_STATUSES.has(status)) throw new OrderValidationError("Escolha um status de preparo ou entrega v\xE1lido.");
  return { status };
}
function text2(value, max = 128) {
  return String(value || "").trim().slice(0, max);
}

// server/modules/orders/service.js
var TRANSITIONS = {
  paid: /* @__PURE__ */ new Set(["processing"]),
  paid_stock_exception: /* @__PURE__ */ new Set(["processing"]),
  processing: /* @__PURE__ */ new Set(["shipped"]),
  shipped: /* @__PURE__ */ new Set(["delivered"])
};
var OrderDomainError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function listOrders2({ storeId: storeId2, userId, query: query3 }) {
  await requireStore5(storeId2, userId);
  const listInput = getOrderListInput(query3, storeId2);
  const result = await listOrderPage(listInput);
  const total = Number(result.count?.total || 0);
  return {
    data: result.rows.map(presentOrderList),
    pagination: { page: listInput.pagination.page, limit: listInput.pagination.limit, total, totalPages: Math.max(1, Math.ceil(total / listInput.pagination.limit)) },
    summary: presentSummary(result.summary)
  };
}
async function getOrder({ storeId: storeId2, orderId, userId }) {
  await requireStore5(storeId2, userId);
  const order = await findOrder(storeId2, orderId);
  if (!order) throw new OrderDomainError(404, "Pedido n\xE3o encontrado.");
  return presentOrder2(order, await findOrderItems(order.id));
}
async function updateOrderStatus({ storeId: storeId2, orderId, userId, status }) {
  await requireStore5(storeId2, userId);
  await withinTransaction5(async (tx) => {
    const order = await lockOrder(tx, storeId2, orderId);
    if (!order) throw new OrderDomainError(404, "Pedido n\xE3o encontrado.");
    if (!TRANSITIONS[order.status]?.has(status)) throw new OrderDomainError(409, statusTransitionMessage(order.status));
    await updateFulfillmentStatus(tx, { storeId: storeId2, orderId, status, timestamp: Date.now() });
  });
  return getOrder({ storeId: storeId2, orderId, userId });
}
async function requireStore5(storeId2, userId) {
  const store = await findStoreOwnedByUser4(storeId2, userId);
  if (!store) throw new OrderDomainError(404, "Loja n\xE3o encontrada.");
  return store;
}
function statusTransitionMessage(status) {
  if (["pending_payment", "cancelled"].includes(status)) return "Este pedido ainda n\xE3o pode avan\xE7ar no preparo. Aguarde um pagamento aprovado.";
  if (status === "delivered") return "Este pedido j\xE1 foi marcado como entregue.";
  return "O pedido n\xE3o pode avan\xE7ar para esse status agora.";
}
function presentOrderList(order) {
  return {
    id: order.id,
    orderNumber: order.reference,
    status: order.status,
    paymentStatus: order.payment_status,
    totalCents: Number(order.total_cents),
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    itemCount: Number(order.items_count || 0),
    quantity: Number(order.items_quantity || 0),
    createdAt: Number(order.created_at),
    updatedAt: Number(order.updated_at)
  };
}
function presentOrder2(order, items) {
  return {
    ...presentOrderList(order),
    subtotalCents: Number(order.subtotal_cents),
    discountCents: Number(order.discount_cents || 0),
    shippingCents: Number(order.shipping_cents),
    currency: order.currency || "BRL",
    paidAt: order.paid_at == null ? null : Number(order.paid_at),
    cancelledAt: order.cancelled_at == null ? null : Number(order.cancelled_at),
    shippingAddress: parseJson6(order.shipping_address_json, null),
    items: items.map((item) => ({ id: item.id, productId: item.product_id, variantKey: item.variant_key || "", sku: item.sku || "", name: item.name, unitPriceCents: Number(item.unit_price_cents), quantity: Number(item.quantity), totalCents: Number(item.total_cents), imageUrl: item.image_url || "" }))
  };
}
function presentSummary(summary) {
  return { total: Number(summary?.total || 0), totalCents: Number(summary?.total_cents || 0), pendingPayment: Number(summary?.pending_payment || 0), paid: Number(summary?.paid || 0), processing: Number(summary?.processing || 0), shipped: Number(summary?.shipped || 0), delivered: Number(summary?.delivered || 0) };
}
function parseJson6(value, fallback) {
  try {
    return typeof value === "object" && value ? value : JSON.parse(value || "null");
  } catch {
    return fallback;
  }
}

// server/modules/orders/controller.js
var router14 = Router15();
var route6 = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
router14.get("/stores/:storeId/orders", route6(async (req, res) => res.json(await listOrders2({ storeId: req.params.storeId, userId: req.user.id, query: req.query }))));
router14.get("/stores/:storeId/orders/:orderId", route6(async (req, res) => res.json({ order: await getOrder({ storeId: req.params.storeId, orderId: req.params.orderId, userId: req.user.id }) })));
router14.patch("/stores/:storeId/orders/:orderId/status", route6(async (req, res) => res.json({ order: await updateOrderStatus({ storeId: req.params.storeId, orderId: req.params.orderId, userId: req.user.id, ...parseOrderStatusInput(req.body) }) })));
router14.use((error, _req, res, next) => error instanceof OrderValidationError || error instanceof OrderDomainError ? res.status(error.status).json({ error: error.message }) : next(error));
var controller_default14 = router14;

// server/modules/auth/middleware.js
async function requireUser(req, res, next) {
  try {
    const authorization = req.header("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Autentica\xE7\xE3o necess\xE1ria." });
    }
    const user = await verifySession(authorization.slice(7), process.env.JWT_SECRET);
    if (!user.id) {
      return res.status(401).json({ error: "Sess\xE3o inv\xE1lida." });
    }
    if (!await isSessionValid(user)) {
      return res.status(401).json({ error: "Esta sess\xE3o foi revogada. Entre novamente para continuar." });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Sess\xE3o inv\xE1lida ou expirada." });
  }
}

// server/modules/shared/response.js
function apiErrorHandler(error, _req, res, next) {
  if (error instanceof RequestError) return res.status(error.status).json({ error: error.message, code: error.code });
  return next(error);
}

// server/api.js
var router15 = Router16();
router15.use(enforceRateLimit);
router15.use(enforceRequestLimits);
router15.use(controller_default);
router15.use(controller_default5);
router15.use(publicIntegrationRouter);
router15.use(publicDeletionRouter);
router15.use(publicRouter);
router15.use(controller_default13);
router15.use(routes_default);
router15.use(requireUser);
router15.use(createActivityTracker({ query }));
router15.use(async (req, _res, next) => {
  try {
    await reconcileStoresForUser(req.user.id);
    next();
  } catch (error) {
    next(error);
  }
});
router15.use(controller_default2);
router15.use(controller_default3);
router15.use(controller_default4);
router15.use(controller_default6);
router15.use(controller_default7);
router15.use(controller_default8);
router15.use(controller_default14);
router15.use(controller_default9);
router15.use(controller_default10);
router15.use(controller_default11);
router15.use(controller_default12);
router15.use(apiErrorHandler);
var api_default = router15;

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text as text3, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text3("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token2) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token2.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT2({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify2(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now3 = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now3,
    updatedAt: now3,
    lastSignedIn: now3,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/schedule-auth.ts
function isAuthorizedCron(actor) {
  return Boolean(actor?.isCron && typeof actor.taskUid === "string" && actor.taskUid.length > 0);
}

// server/index.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var projectRoot = path.resolve(__dirname, "..");
var app = express();
var server = createServer(app);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.get("/health", (_req, res) => res.json({ ok: true, service: "saas-multi-loja-novo" }));
async function requireCron(req, res, next) {
  try {
    const actor = await sdk.authenticateRequest(req);
    if (!isAuthorizedCron(actor)) return res.status(403).json({ error: "cron-only" });
    return next();
  } catch {
    return res.status(403).json({ error: "cron-only" });
  }
}
app.post("/api/scheduled/billing-reconciliation/verify", requireCron, (_req, res) => {
  return res.json({ ok: true, verified: "billing-reconciliation" });
});
app.post("/api/scheduled/billing-reconciliation", requireCron, async (req, res) => {
  try {
    const result = await reconcileAllStores();
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("[Billing reconciliation]", error);
    return res.status(500).json({
      error: String(error instanceof Error ? error.message : error),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      context: { url: req.originalUrl }
    });
  }
});
app.post("/api/scheduled/storefront-cart-cleanup", requireCron, async (req, res) => {
  try {
    return res.json({ ok: true, ...await cleanupExpiredCarts2() });
  } catch (error) {
    console.error("[Storefront cart cleanup]", error);
    return res.status(500).json({ error: String(error instanceof Error ? error.message : error), timestamp: (/* @__PURE__ */ new Date()).toISOString(), context: { url: req.originalUrl } });
  }
});
app.use("/v1", api_default);
app.use("/api/admin", createAdminRouter({ query, one }));
app.use("/v1", (_req, res) => res.status(404).json({ error: "Endpoint não encontrado." }));
app.use("/api/admin", (_req, res) => res.status(404).json({ error: "Endpoint administrativo não encontrado." }));
async function start() {
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    const adminStaticPath = path.resolve(__dirname, "admin");
    app.use("/admin", express.static(adminStaticPath));
    app.get("/admin/*", (_req, res) => res.sendFile(path.join(adminStaticPath, "index.html")));
    app.use(express.static(staticPath));
    app.use((_req, res) => res.sendFile(path.join(staticPath, "index.html")));
  } else {
    const adminStaticPath = path.resolve(projectRoot, "dist", "admin");
    app.use("/admin", express.static(adminStaticPath));
    app.get("/admin/*", (_req, res) => res.sendFile(path.join(adminStaticPath, "index.html")));
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.join(projectRoot, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      try {
        const template = await fs.readFile(path.join(projectRoot, "client", "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  }
  app.use((error, _req, res, _next) => {
    console.error("[Loja Descomplicada API]", error);
    if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") return res.status(413).json({ error: "A requisi\xE7\xE3o excede o tamanho m\xE1ximo permitido." });
    if (error && typeof error === "object" && "type" in error && error.type === "entity.parse.failed") return res.status(422).json({ error: "O corpo da requisi\xE7\xE3o deve ser um JSON v\xE1lido." });
    const status = Number(error?.status);
    if (Number.isInteger(status) && status >= 400 && status < 600) return res.status(status).json({ error: String(error?.message || "N\xE3o foi poss\xEDvel concluir esta a\xE7\xE3o agora.") });
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel concluir esta a\xE7\xE3o agora." });
  });
  const port = Number(process.env.PORT || 3e3);
  server.listen(port, () => console.log(`Loja Descomplicada dispon\xEDvel em http://localhost:${port}`));
}
start().catch((error) => {
  console.error(error);
  process.exit(1);
});
