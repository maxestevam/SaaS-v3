import { Router } from "express";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { normalizePlanLimits, planLimitsFromRow, planLimitsSqlColumns } from "./plan-limits.js";

const scrypt = promisify(scryptCallback);
const encoder = new TextEncoder();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicAdmin(row) { return { id: row.id, name: row.name, email: row.email, role: row.role }; }
function parseJson(value, fallback = []) { try { return typeof value === "string" ? JSON.parse(value) : value ?? fallback; } catch { return fallback; } }
function presentStatus(value) { return String(value || "pending").toLowerCase(); }
function hashAudit(value) { return createHash("sha256").update(String(value || "")).digest("hex"); }
function error(status, message) { return Object.assign(new Error(message), { status }); }

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${Buffer.from(await scrypt(password, salt, 64)).toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, expected] = String(storedHash || "").split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64)).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

async function signAdminSession(user) {
  return new SignJWT({ name: user.name, email: user.email, role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("8h").sign(encoder.encode(String(process.env.JWT_SECRET || "")));
}

async function sendPasswordLink(user, rawToken, req, kind, trialDays = null) {
  if (!process.env.RESEND_API_KEY) throw error(503, "O e-mail de redefinição não está configurado.");
  const requestBase = `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");
  const baseUrl = requestBase.startsWith("https://") ? requestBase : String(process.env.APP_URL || requestBase).replace(/\/$/, "");
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = kind === "invite" ? "Crie o acesso à Loja Descomplicada" : "Redefina sua senha da Loja Descomplicada";
  const validTrialDays = Number.isInteger(Number(trialDays)) && Number(trialDays) > 0 ? Number(trialDays) : 7;
  const text = kind === "invite" ? `Você foi escolhido para ter uma loja incrível por ${validTrialDays} ${validTrialDays === 1 ? "dia grátis" : "dias grátis"}. Crie sua senha pelo link enviado.` : "Um administrador solicitou a redefinição da sua senha.";
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM || "Loja Descomplicada <onboarding@resend.dev>", to: [user.email], subject, html: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5"><h1 style="color:#ff32b2">${subject}</h1><p>Olá, ${String(user.name || "").replace(/[&<>]/g, "")}.</p><p>${text}</p><p><a href="${link}" style="display:inline-block;background:linear-gradient(45deg,#ff32b2,#fd7a00);color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p>O link é válido por 30 minutos.</p></main>` }) });
  if (!response.ok) throw error(502, "Não foi possível enviar o e-mail de redefinição agora.");
}

export function createAdminRouter({ query, one }) {
  const router = Router();
  const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
  const audit = async (actor, action, entityType, entityId = null, metadata = null) => query("INSERT INTO ld_admin_audit_log (id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?)", [actor.id, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null, Date.now()]);
  const createMerchantInvite = async ({ name, email, trialDays, req, actor }) => {
    if (name.length < 2 || !EMAIL_RE.test(email)) throw error(422, "Informe nome e e-mail válidos.");
    if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 365) throw error(422, "Informe de 1 a 365 dias grátis.");
    if (await one("SELECT id FROM ld_users WHERE email = ?", [email])) throw error(409, "Já existe uma conta com esse e-mail.");
    const user = { id: randomUUID(), name, email, passwordHash: await hashPassword(randomBytes(32).toString("base64url")) };
    const now = Date.now();
    await query("INSERT INTO ld_users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [user.id, user.name, user.email, user.passwordHash, now, now]);
    try {
      await query("INSERT INTO ld_merchant_invites (id, user_id, email, trial_days, created_by, email_sent_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [randomUUID(), user.id, user.email, trialDays, actor.id, now, now, now]);
      const reset = await createReset(user.id);
      await sendPasswordLink(user, reset, req, "invite", trialDays);
    } catch (cause) {
      await query("DELETE FROM ld_users WHERE id = ?", [user.id]);
      throw cause;
    }
    await audit(actor, "merchant.invite_sent", "merchant", user.id, { emailHash: hashAudit(email).slice(0, 12), trialDays });
    return { id: user.id, name, email, role: "merchant", account_status: "active", trialDays };
  };
  const persistPlanLimits = async (planId, limits, timestamp) => query("INSERT INTO ld_plan_limits (plan_id, products_limit, categories_limit, subcategories_limit, customers_limit, coupons_limit, banners_limit, product_images_limit, product_videos_limit, banner_images_limit, unlimited_cap, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE products_limit=VALUES(products_limit), categories_limit=VALUES(categories_limit), subcategories_limit=VALUES(subcategories_limit), customers_limit=VALUES(customers_limit), coupons_limit=VALUES(coupons_limit), banners_limit=VALUES(banners_limit), product_images_limit=VALUES(product_images_limit), product_videos_limit=VALUES(product_videos_limit), banner_images_limit=VALUES(banner_images_limit), unlimited_cap=VALUES(unlimited_cap), updated_at=VALUES(updated_at)", [planId, limits.products, limits.categories, limits.subcategories, limits.customers, limits.coupons, limits.banners, limits.productImages, limits.productVideos, limits.bannerImages, limits.unlimitedCap, timestamp, timestamp]);
  const createReset = async (userId) => {
    const now = Date.now(); const rawToken = randomBytes(32).toString("hex");
    await query("UPDATE ld_password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL", [now, userId]);
    await query("INSERT INTO ld_password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)", [randomUUID(), userId, createHash("sha256").update(rawToken).digest("hex"), now + 30 * 60 * 1000, now]);
    return rawToken;
  };
  const bootstrapRole = async (user) => {
    const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
    if (!email || String(user.email || "").toLowerCase() !== email) return null;
    const now = Date.now();
    await query("INSERT INTO ld_admin_roles (user_id, role, active, created_at, updated_at) VALUES (?, 'super_admin', 1, ?, ?) ON DUPLICATE KEY UPDATE role = 'super_admin', active = 1, updated_at = VALUES(updated_at)", [user.id, now, now]);
    return "super_admin";
  };
  const requireAdmin = async (req, res, next) => {
    try {
      const token = String(req.get("authorization") || "").replace(/^Bearer\s+/i, ""); const secret = String(process.env.JWT_SECRET || "");
      if (!token || !secret) return res.status(401).json({ error: "Autenticação administrativa necessária." });
      const verified = await jwtVerify(token, encoder.encode(secret));
      const user = await one("SELECT users.id, users.name, users.email, users.session_invalid_before, roles.role, COALESCE(controls.status, 'active') AS account_status FROM ld_users users INNER JOIN ld_admin_roles roles ON roles.user_id = users.id LEFT JOIN ld_admin_account_controls controls ON controls.user_id = users.id WHERE users.id = ? AND roles.active = 1", [verified.payload.sub]);
      if (!user || user.account_status !== "active" || (user.session_invalid_before && Number(verified.payload.iat || 0) * 1000 <= Number(user.session_invalid_before))) return res.status(403).json({ error: "Acesso administrativo não autorizado." });
      req.admin = publicAdmin(user); return next();
    } catch { return res.status(401).json({ error: "Sua sessão administrativa expirou." }); }
  };
  const requireRole = (...roles) => (req, res, next) => roles.includes(req.admin?.role) ? next() : res.status(403).json({ error: "Esta ação exige permissão superior." });

  router.post("/auth/login", route(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase(); const password = String(req.body?.password || "");
    const user = email ? await one("SELECT id, name, email, password_hash FROM ld_users WHERE email = ?", [email]) : null;
    if (!user || !(await verifyPassword(password, user.password_hash))) return res.status(401).json({ error: "E-mail ou senha inválidos." });
    const control = await one("SELECT status FROM ld_admin_account_controls WHERE user_id = ?", [user.id]);
    if (control && control.status !== "active") return res.status(403).json({ error: "Esta conta está bloqueada para acesso." });
    const roleRow = await one("SELECT role FROM ld_admin_roles WHERE user_id = ? AND active = 1", [user.id]); const role = roleRow?.role || await bootstrapRole(user);
    if (!role) return res.status(403).json({ error: "Esta conta não possui acesso administrativo." });
    const account = { ...user, role }; const token = await signAdminSession(account); await audit(account, "admin.login", "session", user.id, { credential: hashAudit(email).slice(0, 12) });
    return res.json({ token, user: publicAdmin(account) });
  }));
  router.get("/auth/me", requireAdmin, (req, res) => res.json({ user: req.admin }));

  router.get("/dashboard", requireAdmin, route(async (req, res) => {
    const onlineSince = Date.now() - 2 * 60 * 1000;
    const activityPage = Math.max(1, Math.min(10_000, Number.parseInt(String(req.query?.activityPage || "1"), 10) || 1)); const activityPageSize = 10; const activityOffset = (activityPage - 1) * activityPageSize;
    const [totals, revenue, merchants, activity, activityTotal] = await Promise.all([
      one("SELECT (SELECT COUNT(*) FROM ld_users) AS merchants, (SELECT COUNT(*) FROM ld_stores WHERE status = 3) AS stores, (SELECT COUNT(*) FROM ld_subscriptions WHERE status IN ('active','trial')) AS active_subscriptions, (SELECT COUNT(*) FROM ld_billing_orders WHERE status = 'pending') AS pending_invoices, (SELECT COUNT(*) FROM ld_customers) AS customers, (SELECT COUNT(*) FROM ld_user_presence WHERE last_seen_at >= ?) AS online_merchants", [onlineSince]),
      one("SELECT COALESCE(SUM(amount_cents), 0) AS paid_cents FROM ld_billing_orders WHERE status IN ('paid','approved') AND paid_at >= ?", [Date.now() - 30 * 86_400_000]),
      query("SELECT users.id, users.name, users.email, users.created_at, COUNT(stores.id) AS store_count, COALESCE(controls.status, 'active') AS account_status, CASE WHEN presence.last_seen_at >= ? THEN 1 ELSE 0 END AS online FROM ld_users users LEFT JOIN ld_stores stores ON stores.user_id = users.id LEFT JOIN ld_admin_account_controls controls ON controls.user_id = users.id LEFT JOIN ld_user_presence presence ON presence.user_id = users.id GROUP BY users.id, users.name, users.email, users.created_at, controls.status, presence.last_seen_at ORDER BY users.created_at DESC LIMIT 8", [onlineSince]),
      query(`SELECT activity.event_type AS action, activity.route AS entity_type, activity.store_id AS entity_id, activity.created_at, users.name AS user_name FROM ld_user_activity_log activity INNER JOIN ld_users users ON users.id = activity.user_id WHERE activity.event_type NOT LIKE 'support_%' AND COALESCE(activity.route, '') NOT LIKE '/support/%' ORDER BY activity.created_at DESC LIMIT ${activityPageSize} OFFSET ${activityOffset}`),
      one("SELECT COUNT(*) AS total FROM ld_user_activity_log WHERE event_type NOT LIKE 'support_%' AND COALESCE(route, '') NOT LIKE '/support/%'"),
    ]);
    return res.json({ metrics: { ...totals, paidCents: Number(revenue?.paid_cents || 0) }, merchants, activity, activityPagination: { page: activityPage, pageSize: activityPageSize, total: Number(activityTotal?.total || 0) } });
  }));

  router.get("/merchants", requireAdmin, route(async (req, res) => {
    const search = String(req.query?.q || "").trim(); const like = `%${search}%`; const onlineSince = Date.now() - 2 * 60 * 1000;
    const merchants = await query("SELECT users.id, users.name, users.email, users.created_at, COUNT(DISTINCT stores.id) AS store_count, MAX(subscriptions.status) AS subscription_status, COALESCE(SUM(CASE WHEN orders.status IN ('paid','approved') THEN orders.amount_cents ELSE 0 END),0) AS paid_cents, COALESCE(roles.role, 'merchant') AS role, COALESCE(controls.status, 'active') AS account_status, CASE WHEN presence.last_seen_at >= ? THEN 1 ELSE 0 END AS online, presence.last_seen_at FROM ld_users users LEFT JOIN ld_stores stores ON stores.user_id = users.id LEFT JOIN ld_subscriptions subscriptions ON subscriptions.store_id = stores.id LEFT JOIN ld_billing_orders orders ON orders.store_id = stores.id LEFT JOIN ld_admin_roles roles ON roles.user_id = users.id AND roles.active = 1 LEFT JOIN ld_admin_account_controls controls ON controls.user_id = users.id LEFT JOIN ld_user_presence presence ON presence.user_id = users.id WHERE (? = '' OR users.name LIKE ? OR users.email LIKE ?) GROUP BY users.id, users.name, users.email, users.created_at, roles.role, controls.status, presence.last_seen_at ORDER BY users.created_at DESC LIMIT 250", [onlineSince, search, like, like]);
    return res.json({ merchants: merchants.map((row) => ({ ...row, paid_cents: Number(row.paid_cents || 0), subscription_status: presentStatus(row.subscription_status), online: Boolean(row.online) })) });
  }));
  router.get("/merchants/:id/details", requireAdmin, route(async (req, res) => {
    const onlineSince = Date.now() - 2 * 60 * 1000;
    const merchant = await one("SELECT users.id, users.name, users.email, users.created_at, users.onboarding_completed_at, COALESCE(roles.role, 'merchant') AS role, COALESCE(controls.status, 'active') AS account_status, controls.reason AS control_reason, presence.last_seen_at, CASE WHEN presence.last_seen_at >= ? THEN 1 ELSE 0 END AS online, invites.trial_days, invites.email_sent_at, invites.trial_consumed_at FROM ld_users users LEFT JOIN ld_admin_roles roles ON roles.user_id = users.id AND roles.active = 1 LEFT JOIN ld_admin_account_controls controls ON controls.user_id = users.id LEFT JOIN ld_user_presence presence ON presence.user_id = users.id LEFT JOIN ld_merchant_invites invites ON invites.user_id = users.id WHERE users.id = ?", [onlineSince, req.params.id]);
    if (!merchant) throw error(404, "Lojista não encontrado.");
    const stores = await query(`SELECT stores.id, stores.name, stores.slug, stores.status, stores.created_at, subscriptions.status AS subscription_status, subscriptions.trial_ends_at, subscriptions.current_period_ends_at, subscriptions.plan_id, plans.name AS plan_name, (SELECT COUNT(*) FROM ld_products products WHERE products.store_id = stores.id) AS products_count, (SELECT COUNT(*) FROM ld_customers customers WHERE customers.store_id = stores.id) AS customers_count, (SELECT COUNT(*) FROM ld_coupons coupons WHERE coupons.store_id = stores.id) AS coupons_count, (SELECT COUNT(*) FROM ld_banners banners WHERE banners.store_id = stores.id) AS banners_count, (SELECT COUNT(*) FROM ld_product_categories categories WHERE categories.store_id = stores.id AND categories.parent_category_id IS NULL) AS categories_count, (SELECT COUNT(*) FROM ld_product_categories categories WHERE categories.store_id = stores.id AND categories.parent_category_id IS NOT NULL) AS subcategories_count, (SELECT COUNT(*) FROM ld_consumer_orders orders WHERE orders.store_id = stores.id) AS orders_count, (SELECT COALESCE(SUM(orders.total_cents), 0) FROM ld_consumer_orders orders WHERE orders.store_id = stores.id AND orders.status IN ('paid','processing','shipped','delivered')) AS sales_cents, (COALESCE((SELECT SUM(media.file_size) FROM ld_product_media media INNER JOIN ld_products products ON products.id = media.product_id WHERE products.store_id = stores.id), 0) + COALESCE((SELECT SUM(images.file_size) FROM ld_banner_images images INNER JOIN ld_banners banners ON banners.id = images.banner_id WHERE banners.store_id = stores.id), 0)) AS media_bytes FROM ld_stores stores LEFT JOIN (SELECT store_id, MAX(created_at) AS latest_created_at FROM ld_subscriptions GROUP BY store_id) latest ON latest.store_id = stores.id LEFT JOIN ld_subscriptions subscriptions ON subscriptions.store_id = latest.store_id AND subscriptions.created_at = latest.latest_created_at LEFT JOIN ld_plans plans ON plans.id = subscriptions.plan_id WHERE stores.user_id = ? ORDER BY stores.created_at DESC`, [merchant.id]);
    return res.json({ merchant: { ...merchant, online: Boolean(merchant.online), trial_days: merchant.trial_days === null ? null : Number(merchant.trial_days), stores: stores.map((store) => ({ ...store, products_count: Number(store.products_count || 0), customers_count: Number(store.customers_count || 0), coupons_count: Number(store.coupons_count || 0), banners_count: Number(store.banners_count || 0), categories_count: Number(store.categories_count || 0), subcategories_count: Number(store.subcategories_count || 0), orders_count: Number(store.orders_count || 0), sales_cents: Number(store.sales_cents || 0), media_bytes: Number(store.media_bytes || 0), subscription_status: presentStatus(store.subscription_status) })) } });
  }));
  router.post("/merchants", requireAdmin, requireRole("super_admin"), route(async (req, res) => {
    const name = String(req.body?.name || "").trim().slice(0, 120); const email = String(req.body?.email || "").trim().toLowerCase(); const trialDays = Number(req.body?.trialDays ?? 7);
    const merchant = await createMerchantInvite({ name, email, trialDays, req, actor: req.admin });
    return res.status(201).json({ merchant });
  }));
  router.post("/merchants/invitations", requireAdmin, requireRole("super_admin"), route(async (req, res) => {
    const requested = Array.isArray(req.body?.invites) ? req.body.invites : null;
    if (!requested?.length || requested.length > 50) throw error(422, "Envie entre 1 e 50 convites.");
    const seen = new Set(); const results = [];
    for (let index = 0; index < requested.length; index += 1) {
      const item = requested[index] || {}; const name = String(item.name || "").trim().slice(0, 120); const email = String(item.email || "").trim().toLowerCase(); const trialDays = Number(item.trialDays ?? 7);
      try {
        if (email && seen.has(email)) throw error(422, "O e-mail está duplicado nesta lista de convites.");
        if (email) seen.add(email);
        const merchant = await createMerchantInvite({ name, email, trialDays, req, actor: req.admin });
        results.push({ index, email, status: "sent", merchant });
      } catch (cause) {
        results.push({ index, email, status: "failed", error: String(cause?.message || "Não foi possível enviar este convite.") });
      }
    }
    return res.status(201).json({ results, sent: results.filter((item) => item.status === "sent").length, failed: results.filter((item) => item.status === "failed").length });
  }));
  router.patch("/merchants/:id", requireAdmin, requireRole("super_admin"), route(async (req, res) => {
    const target = await one("SELECT id, email FROM ld_users WHERE id = ?", [req.params.id]); if (!target) throw error(404, "Lojista não encontrado.");
    const name = String(req.body?.name || "").trim().slice(0, 120); const email = String(req.body?.email || "").trim().toLowerCase();
    if (name.length < 2 || !EMAIL_RE.test(email)) throw error(422, "Informe nome e e-mail válidos.");
    if (email !== target.email && await one("SELECT id FROM ld_users WHERE email = ?", [email])) throw error(409, "Já existe uma conta com esse e-mail.");
    await query("UPDATE ld_users SET name = ?, email = ?, updated_at = ? WHERE id = ?", [name, email, Date.now(), target.id]); await audit(req.admin, "merchant.update", "merchant", target.id);
    return res.json({ ok: true });
  }));
  router.post("/merchants/:id/reset-password", requireAdmin, requireRole("super_admin", "operator"), route(async (req, res) => {
    const user = await one("SELECT id, name, email FROM ld_users WHERE id = ?", [req.params.id]); if (!user) throw error(404, "Lojista não encontrado.");
    const reset = await createReset(user.id); await sendPasswordLink(user, reset, req, "reset"); await audit(req.admin, "merchant.password_reset_requested", "merchant", user.id);
    return res.json({ ok: true });
  }));
  router.put("/merchants/:id/status", requireAdmin, requireRole("super_admin", "operator"), route(async (req, res) => {
    const status = String(req.body?.status || ""); const reason = String(req.body?.reason || "").trim().slice(0, 500); if (!["active", "blocked", "banned"].includes(status)) throw error(422, "Status de conta inválido.");
    if (req.params.id === req.admin.id) throw error(422, "Não é permitido alterar o próprio acesso administrativo.");
    const target = await one("SELECT id FROM ld_users WHERE id = ?", [req.params.id]); if (!target) throw error(404, "Lojista não encontrado.");
    const now = Date.now(); await query("INSERT INTO ld_admin_account_controls (user_id, status, reason, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)", [target.id, status, reason, req.admin.id, now, now]); await query("UPDATE ld_users SET session_invalid_before = ?, updated_at = ? WHERE id = ?", [now, now, target.id]); await audit(req.admin, `merchant.${status}`, "merchant", target.id, { reason });
    return res.json({ ok: true, status });
  }));
  router.delete("/merchants/:id", requireAdmin, requireRole("super_admin"), route(async (req, res) => {
    if (req.body?.confirm !== true) throw error(422, "Confirme a exclusão permanente da conta."); if (req.params.id === req.admin.id) throw error(422, "Não é permitido excluir a própria conta administrativa.");
    const target = await one("SELECT id, email FROM ld_users WHERE id = ?", [req.params.id]); if (!target) throw error(404, "Lojista não encontrado.");
    await query("DELETE FROM ld_users WHERE id = ?", [target.id]); await audit(req.admin, "merchant.delete", "merchant", target.id, { emailHash: hashAudit(target.email).slice(0, 12) }); return res.json({ ok: true });
  }));

  router.get("/stores", requireAdmin, route(async (_req, res) => {
    const onlineSince = Date.now() - 2 * 60 * 1000;
    const stores = await query("SELECT stores.id, stores.name, stores.slug, stores.status, stores.created_at, users.id AS user_id, users.name AS owner_name, users.email AS owner_email, COALESCE(controls.status, 'active') AS control_status, CASE WHEN presence.last_seen_at >= ? THEN 1 ELSE 0 END AS owner_online, (SELECT COUNT(*) FROM ld_products products WHERE products.store_id = stores.id) AS products_count, (SELECT COUNT(*) FROM ld_customers customers WHERE customers.store_id = stores.id) AS customers_count, (SELECT COUNT(*) FROM ld_banners banners WHERE banners.store_id = stores.id) AS banners_count, (SELECT COUNT(*) FROM ld_coupons coupons WHERE coupons.store_id = stores.id) AS coupons_count, (SELECT COUNT(*) FROM ld_product_categories categories WHERE categories.store_id = stores.id AND categories.parent_category_id IS NULL) AS categories_count, (SELECT COUNT(*) FROM ld_product_categories categories WHERE categories.store_id = stores.id AND categories.parent_category_id IS NOT NULL) AS subcategories_count, (SELECT COUNT(*) FROM ld_consumer_orders orders WHERE orders.store_id = stores.id) AS orders_count, (SELECT COALESCE(SUM(orders.total_cents), 0) FROM ld_consumer_orders orders WHERE orders.store_id = stores.id AND orders.status IN ('paid','processing','shipped','delivered')) AS sales_cents, (COALESCE((SELECT SUM(media.file_size) FROM ld_product_media media INNER JOIN ld_products products ON products.id = media.product_id WHERE products.store_id = stores.id), 0) + COALESCE((SELECT SUM(images.file_size) FROM ld_banner_images images INNER JOIN ld_banners banners ON banners.id = images.banner_id WHERE banners.store_id = stores.id), 0)) AS media_bytes FROM ld_stores stores INNER JOIN ld_users users ON users.id = stores.user_id LEFT JOIN ld_admin_store_controls controls ON controls.store_id = stores.id LEFT JOIN ld_user_presence presence ON presence.user_id = users.id ORDER BY stores.created_at DESC LIMIT 300", [onlineSince]);
    return res.json({ stores: stores.map((row) => ({ ...row, owner_online: Boolean(row.owner_online), media_bytes: Number(row.media_bytes || 0), sales_cents: Number(row.sales_cents || 0) })) });
  }));
  router.put("/stores/:id/status", requireAdmin, requireRole("super_admin", "operator"), route(async (req, res) => {
    const status = String(req.body?.status || ""); const reason = String(req.body?.reason || "").trim().slice(0, 500); if (!["active", "suspended"].includes(status)) throw error(422, "Status de loja inválido.");
    const store = await one("SELECT id FROM ld_stores WHERE id = ?", [req.params.id]); if (!store) throw error(404, "Loja não encontrada.");
    const now = Date.now(); await query("INSERT INTO ld_admin_store_controls (store_id, status, reason, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)", [store.id, status, reason, req.admin.id, now, now]); await query("UPDATE ld_stores SET status = ?, status_changed_at = ?, updated_at = ? WHERE id = ?", [status === "active" ? 3 : 2, now, now, store.id]); await audit(req.admin, `store.${status}`, "store", store.id, { reason });
    return res.json({ ok: true, status });
  }));

  router.get("/activities", requireAdmin, route(async (req, res) => {
    const userId = String(req.query?.userId || ""); const rows = await query(`SELECT activity.id, activity.event_type, activity.route, activity.metadata_json, activity.created_at, users.name AS user_name, users.email AS user_email, stores.name AS store_name FROM ld_user_activity_log activity INNER JOIN ld_users users ON users.id = activity.user_id LEFT JOIN ld_stores stores ON stores.id = activity.store_id WHERE ${userId ? "activity.user_id = ? AND " : ""}activity.event_type NOT LIKE 'support_%' AND COALESCE(activity.route, '') NOT LIKE '/support/%' ORDER BY activity.created_at DESC LIMIT 250`, userId ? [userId] : []);
    return res.json({ activities: rows.map((row) => ({ ...row, metadata: parseJson(row.metadata_json, {}) })) });
  }));

  router.get("/subscriptions", requireAdmin, route(async (_req, res) => { const subscriptions = await query("SELECT subscriptions.id, subscriptions.plan_id, subscriptions.status, subscriptions.amount_cents, subscriptions.trial_ends_at, subscriptions.current_period_ends_at, subscriptions.created_at, stores.id AS store_id, stores.name AS store_name, users.name AS owner_name, users.email AS owner_email FROM ld_subscriptions subscriptions INNER JOIN ld_stores stores ON stores.id = subscriptions.store_id INNER JOIN ld_users users ON users.id = stores.user_id ORDER BY subscriptions.created_at DESC LIMIT 250"); return res.json({ subscriptions: subscriptions.map((row) => ({ ...row, amount_cents: Number(row.amount_cents || 0), status: presentStatus(row.status) })) }); }));
  router.get("/invoices", requireAdmin, route(async (_req, res) => { const invoices = await query("SELECT orders.id, orders.status, orders.kind, orders.amount_cents, orders.currency, orders.due_at, orders.paid_at, orders.created_at, stores.name AS store_name, users.name AS owner_name, users.email AS owner_email FROM ld_billing_orders orders INNER JOIN ld_stores stores ON stores.id = orders.store_id INNER JOIN ld_users users ON users.id = orders.user_id ORDER BY orders.created_at DESC LIMIT 250"); return res.json({ invoices: invoices.map((row) => ({ ...row, amount_cents: Number(row.amount_cents || 0), status: presentStatus(row.status) })) }); }));

  router.get("/plans", requireAdmin, route(async (_req, res) => { const plans = await query(`SELECT plans.id, plans.name, plans.description, plans.features_json, plans.amount_cents, plans.is_featured, plans.active, plans.created_at, plans.updated_at, ${planLimitsSqlColumns()} FROM ld_plans plans LEFT JOIN ld_plan_limits limits ON limits.plan_id = plans.id ORDER BY plans.amount_cents ASC`); return res.json({ plans: plans.map((row) => ({ ...row, features: parseJson(row.features_json), limits: planLimitsFromRow(row), amount_cents: Number(row.amount_cents || 0), active: Boolean(row.active), is_featured: Boolean(row.is_featured) })) }); }));
  const parsePlan = (body) => { const name = String(body?.name || "").trim().slice(0, 120); const description = String(body?.description || "").trim().slice(0, 255); const amount = Number(body?.amountCents); const features = Array.isArray(body?.features) ? body.features.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : null; if (!name || !description || !Number.isInteger(amount) || amount < 0 || !features) throw error(422, "Revise os campos do plano."); let limits; try { limits = normalizePlanLimits(body?.limits || {}); } catch (cause) { throw error(422, String(cause?.message || "Revise os limites do plano.")); } return { name, description, amount, features, limits, featured: Boolean(body?.featured), active: body?.active !== false }; };
  router.post("/plans", requireAdmin, requireRole("super_admin"), route(async (req, res) => { const plan = parsePlan(req.body); const id = randomUUID(); const now = Date.now(); await query("INSERT INTO ld_plans (id, name, description, features_json, amount_cents, is_featured, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, plan.name, plan.description, JSON.stringify(plan.features), plan.amount, plan.featured ? 1 : 0, plan.active ? 1 : 0, now, now]); await persistPlanLimits(id, plan.limits, now); await audit(req.admin, "plan.create", "plan", id); return res.status(201).json({ plan: { id, ...plan, amount_cents: plan.amount } }); }));
  router.patch("/plans/:id", requireAdmin, requireRole("super_admin"), route(async (req, res) => { if (!(await one("SELECT id FROM ld_plans WHERE id = ?", [req.params.id]))) throw error(404, "Plano não encontrado."); const plan = parsePlan(req.body); const now = Date.now(); await query("UPDATE ld_plans SET name = ?, description = ?, amount_cents = ?, features_json = ?, is_featured = ?, active = ?, updated_at = ? WHERE id = ?", [plan.name, plan.description, plan.amount, JSON.stringify(plan.features), plan.featured ? 1 : 0, plan.active ? 1 : 0, now, req.params.id]); await persistPlanLimits(req.params.id, plan.limits, now); await audit(req.admin, "plan.update", "plan", req.params.id, { active: plan.active, limits: plan.limits }); return res.json({ ok: true }); }));
  router.delete("/plans/:id", requireAdmin, requireRole("super_admin"), route(async (req, res) => { if (req.body?.confirm !== true) throw error(422, "Confirme a exclusão permanente do plano."); const activeSubscriptions = await one("SELECT COUNT(*) AS total FROM ld_subscriptions WHERE plan_id = ? AND status NOT IN ('cancelled','canceled')", [req.params.id]); if (Number(activeSubscriptions?.total || 0) > 0) throw error(409, "Este plano possui assinaturas vinculadas. Desative-o em vez de excluí-lo."); const result = await query("DELETE FROM ld_plans WHERE id = ?", [req.params.id]); if (!result.affectedRows) throw error(404, "Plano não encontrado."); await audit(req.admin, "plan.delete", "plan", req.params.id); return res.json({ ok: true }); }));

  router.get("/settings", requireAdmin, route(async (_req, res) => { const settings = await query("SELECT setting_key, setting_value, updated_at FROM ld_admin_settings ORDER BY setting_key ASC"); const environment = ["DATABASE_URL", "JWT_SECRET", "MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET", "RESEND_API_KEY", "R2_BUCKET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].map((key) => ({ key, configured: Boolean(process.env[key]), editable: false })); return res.json({ environment, settings: settings.map((row) => ({ key: row.setting_key, value: parseJson(row.setting_value, {}), updatedAt: row.updated_at })) }); }));
  router.put("/settings/:key", requireAdmin, requireRole("super_admin"), route(async (req, res) => { const key = String(req.params.key || "").replace(/[^a-z0-9_.-]/gi, "").slice(0, 100); if (!key || !req.body?.value || typeof req.body.value !== "object") throw error(422, "Configuração inválida."); const now = Date.now(); await query("INSERT INTO ld_admin_settings (setting_key, setting_value, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)", [key, JSON.stringify(req.body.value), req.admin.id, now, now]); await audit(req.admin, "settings.update", "admin_setting", key); return res.json({ ok: true }); }));
  router.patch("/profile", requireAdmin, route(async (req, res) => { const name = String(req.body?.name || "").trim().slice(0, 120); if (name.length < 2) throw error(422, "Informe um nome válido."); await query("UPDATE ld_users SET name = ?, updated_at = ? WHERE id = ?", [name, Date.now(), req.admin.id]); req.admin.name = name; await audit(req.admin, "profile.update", "user", req.admin.id); return res.json({ user: req.admin }); }));
  router.post("/profile/password", requireAdmin, route(async (req, res) => { const currentPassword = String(req.body?.currentPassword || ""); const newPassword = String(req.body?.newPassword || ""); if (newPassword.length < 10 || newPassword.length > 200) throw error(422, "A nova senha deve ter de 10 a 200 caracteres."); const user = await one("SELECT password_hash FROM ld_users WHERE id = ?", [req.admin.id]); if (!user || !(await verifyPassword(currentPassword, user.password_hash))) throw error(422, "A senha atual não confere."); await query("UPDATE ld_users SET password_hash = ?, session_invalid_before = ?, updated_at = ? WHERE id = ?", [await hashPassword(newPassword), Date.now(), Date.now(), req.admin.id]); await audit(req.admin, "profile.password_change", "user", req.admin.id); return res.json({ ok: true }); }));
  return router;
}
