import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import * as repository from "./repository.js";
import { melhorEnvioRequest, sendResendEmail, smtpTransport, verifyResendApiKey } from "./providers.js";
import { sanitizeMelhorEnvioServices, sanitizeMercadoPagoMethods } from "./catalog.js";
import { emailEvents as validatedEmailEvents, IntegrationValidationError, normalizeEmail as validatedNormalizeEmail, normalizePostalCode as validatedNormalizePostalCode, parseEmailSettingsInput, parseEmailTemplateInput, parseFreightQuote as validatedFreightQuote, parseMelhorEnvioInput, parseResendInput, parseSmtpInput } from "./validation.js";

const { one, query, transaction } = repository;

const MERCADO_PAGO = "mercado_pago";
const MELHOR_ENVIO = "melhor_envio";
const RESEND = "resend";
const SMTP = "smtp";
const EMAIL_EVENTS = validatedEmailEvents;
const PROVIDERS = [MERCADO_PAGO, MELHOR_ENVIO, RESEND, SMTP];
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const CANONICAL_APP_URL = "https://lojadescompl-8wmvnkfz.manus.space";

const defaultTemplates = {
  purchase_paid: {
    label: "Compra realizada com sucesso",
    subject: "Recebemos seu pagamento — {{storeName}}",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Pagamento confirmado</h1><p>Olá, {{customerName}}.</p><p>Recebemos o pagamento do seu pedido {{orderReference}}. Obrigado por comprar na {{storeName}}.</p><p>Valor: <strong>{{orderTotal}}</strong>.</p><p>Em breve você receberá as próximas atualizações do pedido.</p></main>`,
  },
  order_completed: {
    label: "Compra finalizada",
    subject: "Seu pedido {{orderReference}} foi finalizado",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Pedido finalizado</h1><p>Olá, {{customerName}}.</p><p>Seu pedido {{orderReference}} foi finalizado pela {{storeName}}.</p><p>Se precisar de ajuda, responda a este e-mail.</p></main>`,
  },
  payment_requested: {
    label: "Realizar pagamento",
    subject: "Conclua o pagamento do pedido {{orderReference}}",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Seu pagamento está pendente</h1><p>Olá, {{customerName}}.</p><p>Para finalizar o pedido {{orderReference}} na {{storeName}}, conclua o pagamento de <strong>{{orderTotal}}</strong>.</p><p><a href="{{paymentUrl}}" style="display:inline-block;background:linear-gradient(45deg,#ff3f8f,#ff7a00);color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Realizar pagamento</a></p></main>`,
  },
  customer_password_reset: {
    label: "Recuperação de senha do cliente",
    subject: "Redefina sua senha — {{storeName}}",
    bodyHtml: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;max-width:620px;margin:0 auto;padding:24px"><h1 style="margin:0 0 16px;color:#ff3f8f">Redefinição de senha</h1><p>Olá, {{customerName}}.</p><p>Recebemos uma solicitação para redefinir sua senha na {{storeName}}.</p><p><a href="{{resetUrl}}" style="display:inline-block;background:linear-gradient(45deg,#ff3f8f,#ff7a00);color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Redefinir senha</a></p><p>Por segurança, este link expira em 30 minutos. Se você não solicitou a alteração, ignore esta mensagem.</p></main>`,
  },
};

export async function getStoreSettings({ storeId, userId }) {
  const store = await requireOwnedStore(storeId, userId);
  await ensureStoreIntegrationDefaults(store.id);
  return { settings: await publicStoreSettings(store.id) };
}

/** Retorna apenas opções comunicáveis na vitrine; tokens e configs cifradas nunca saem deste serviço. */
export async function getStorefrontIntegrationCapabilities({ storeId, userId, contactEmail }) {
  const store = await requireOwnedStore(storeId, userId);
  const [payments, shipping] = await Promise.all([
    mercadoPagoCapabilities(store.id),
    melhorEnvioCapabilities(store.id, contactEmail),
  ]);
  return { storeId: store.id, payments, shipping };
}

export async function createMercadoPagoAuthorization({ storeId, userId }) {
  const store = await requireOwnedStore(storeId, userId);
  const clientId = requiredEnv("MERCADO_PAGO_OAUTH_CLIENT_ID");
  requiredEnv("MERCADO_PAGO_OAUTH_CLIENT_SECRET");
  const timestamp = Date.now();
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  await repository.removePendingOAuthStates(store.id, MERCADO_PAGO);
  await repository.createOAuthState({ id: randomUUID(), storeId: store.id, userId, provider: MERCADO_PAGO, stateHash: hashState(state), codeVerifierEncrypted: encryptConfig({ codeVerifier }), expiresAt: timestamp + OAUTH_STATE_TTL_MS, createdAt: timestamp });
  return { authorizationUrl: buildMercadoPagoAuthorizationUrl({ clientId, state, redirectUri: mercadoPagoCallbackUrl(), codeChallenge }) };
}

export async function saveMelhorEnvioIntegration({ storeId, userId, input }) {
  const store = await requireOwnedStore(storeId, userId);
  const { accessToken, originPostalCode, environment } = input;
  await upsertIntegration({ storeId: store.id, provider: MELHOR_ENVIO, status: "connected", config: { accessToken }, metadata: { environment, originPostalCode }, accountEmail: null });
  return { integration: await publicIntegration(store.id, MELHOR_ENVIO) };
}

export async function testMelhorEnvioIntegration({ storeId, userId, contactEmail }) {
  const store = await requireOwnedStore(storeId, userId);
  const integration = await integrationWithConfig(store.id, MELHOR_ENVIO);
  if (!integration) throw new IntegrationError(422, "Conecte o Melhor Envio antes de testar.");
  const remote = await melhorEnvioRequest(integration, "/api/v2/me", { contactEmail });
  if (!remote.ok) throw new IntegrationError(422, "O Melhor Envio recusou a credencial. Revise o token e tente novamente.");
  await markIntegrationTest(store.id, MELHOR_ENVIO, null);
  return { ok: true, message: "Integração do Melhor Envio validada com sucesso." };
}

export async function calculateFreight({ storeId, userId, contactEmail, source }) {
  const store = await requireOwnedStore(storeId, userId);
  const integration = await integrationWithConfig(store.id, MELHOR_ENVIO);
  if (!integration) throw new IntegrationError(422, "Conecte o Melhor Envio antes de calcular o frete.");
  const input = validatedFreightQuote(source, integration.metadata);
  const remote = await melhorEnvioRequest(integration, "/api/v2/me/shipment/calculate", { contactEmail, method: "POST", body: input });
  const payload = await remote.json().catch(() => ({}));
  if (!remote.ok) throw new IntegrationError(422, safeProviderError(payload, "Não foi possível calcular o frete com estes dados."));
  await markIntegrationTest(store.id, MELHOR_ENVIO, null);
  return { quotes: Array.isArray(payload) ? payload.map(publicFreightQuote) : [] };
}

export async function saveResendIntegration({ storeId, userId, input }) {
  const store = await requireOwnedStore(storeId, userId);
  await upsertIntegration({ storeId: store.id, provider: RESEND, status: "connected", config: { apiKey: input.apiKey }, metadata: {}, accountEmail: null });
  return { integration: await publicIntegration(store.id, RESEND) };
}

export async function testResendIntegration({ storeId, userId }) {
  const store = await requireOwnedStore(storeId, userId);
  const integration = await integrationWithConfig(store.id, RESEND);
  if (!integration) throw new IntegrationError(422, "Salve a chave do Resend antes de testar.");
  const remote = await verifyResendApiKey(integration.config.apiKey);
  if (!remote.ok) throw new IntegrationError(422, "O Resend recusou a chave de API. Revise a configuração e tente novamente.");
  await markIntegrationTest(store.id, RESEND, null);
  return { ok: true, message: "Chave do Resend validada. Confirme também um domínio verificado antes de enviar e-mails." };
}

export async function saveSmtpIntegration({ storeId, userId, input }) {
  const store = await requireOwnedStore(storeId, userId);
  await upsertIntegration({ storeId: store.id, provider: SMTP, status: "connected", config: input, metadata: {}, accountEmail: validatedNormalizeEmail(input.username) || null });
  return { integration: await publicIntegration(store.id, SMTP) };
}

export async function testSmtpIntegration({ storeId, userId }) {
  const store = await requireOwnedStore(storeId, userId);
  const integration = await integrationWithConfig(store.id, SMTP);
  if (!integration) throw new IntegrationError(422, "Salve os dados SMTP antes de testar.");
  try {
    await smtpTransport(integration.config).verify();
    await markIntegrationTest(store.id, SMTP, null);
    return { ok: true, message: "Servidor SMTP validado com sucesso." };
  } catch {
    await markIntegrationTest(store.id, SMTP, "Não foi possível autenticar no servidor SMTP.");
    throw new IntegrationError(422, "Não foi possível autenticar no servidor SMTP. Revise host, porta, segurança e credenciais.");
  }
}

export async function saveEmailSettings({ storeId, userId, input }) {
  const store = await requireOwnedStore(storeId, userId);
  const integration = await publicIntegration(store.id, input.provider);
  if (!integration?.connected) throw new IntegrationError(422, "Conecte o provedor de e-mail escolhido antes de salvá-lo como ativo.");
  await repository.saveEmailSettings(store.id, input, Date.now());
  return { email: await publicEmailSettings(store.id) };
}

export async function updateEmailTemplate({ storeId, userId, eventKey, input }) {
  const store = await requireOwnedStore(storeId, userId);
  if (!EMAIL_EVENTS.includes(eventKey)) throw new IntegrationError(404, "Modelo de e-mail não encontrado.");
  await ensureStoreIntegrationDefaults(store.id);
  await repository.updateEmailTemplate(store.id, eventKey, input, Date.now());
  return { template: await publicEmailTemplate(store.id, eventKey) };
}

export async function sendTestEmail({ storeId, userId, recipient }) {
  const store = await requireOwnedStore(storeId, userId);
  const result = await sendStoreTransactionalEmail({ storeId: store.id, eventKey: "purchase_paid", recipient, variables: { storeName: store.name, customerName: "Cliente de teste", orderReference: "TESTE-001", orderTotal: "R$ 0,00", paymentUrl: "#" } });
  return { ok: true, messageId: result.messageId };
}

export async function handleMercadoPagoCallback({ state, code, providerError }) {
  const pending = state ? await repository.findActiveOAuthState(MERCADO_PAGO, hashState(state), Date.now()) : null;
  if (!pending) return { redirectUrl: callbackRedirect("invalid_state") };
  if (providerError || !code) {
    await repository.consumeOAuthState(pending.id, Date.now());
    return { redirectUrl: callbackRedirect("cancelled") };
  }
  const verifier = decryptConfig(pending.code_verifier_encrypted).codeVerifier;
  const response = await fetch("https://api.mercadopago.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: requiredEnv("MERCADO_PAGO_OAUTH_CLIENT_ID"), client_secret: requiredEnv("MERCADO_PAGO_OAUTH_CLIENT_SECRET"), code, grant_type: "authorization_code", redirect_uri: mercadoPagoCallbackUrl(), code_verifier: verifier }), signal: AbortSignal.timeout(15_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    await repository.consumeOAuthState(pending.id, Date.now());
    return { redirectUrl: callbackRedirect("failed") };
  }
  const profileResponse = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${payload.access_token}` }, signal: AbortSignal.timeout(10_000) });
  const profile = await profileResponse.json().catch(() => ({}));
  const expiresAt = Number(payload.expires_in) > 0 ? Date.now() + Number(payload.expires_in) * 1000 : null;
  await repository.withinTransaction(async (tx) => {
    await repository.consumeOAuthState(pending.id, Date.now(), tx);
    await upsertIntegration({ storeId: pending.store_id, provider: MERCADO_PAGO, status: "connected", config: { accessToken: payload.access_token, refreshToken: payload.refresh_token || "", expiresAt }, metadata: { accountId: profile.id || null, accountNickname: profile.nickname || "" }, accountEmail: validatedNormalizeEmail(profile.email) || null, db: tx });
  });
  return { redirectUrl: callbackRedirect("success") };
}

export async function sendStoreTransactionalEmail({ storeId, eventKey, recipient, variables = {} }) {
  if (!EMAIL_EVENTS.includes(eventKey)) throw new IntegrationError(422, "Tipo de e-mail transacional inválido.");
  const target = normalizeEmail(recipient);
  if (!target) throw new IntegrationError(422, "Informe um destinatário de e-mail válido.");
  await ensureStoreIntegrationDefaults(storeId);
  const [email, template, store] = await Promise.all([publicEmailSettings(storeId), publicEmailTemplate(storeId, eventKey), repository.findStore(storeId)]);
  if (!store || !template?.enabled) return { skipped: true, messageId: null };
  const integration = await integrationWithConfig(storeId, email.provider);
  if (!integration) throw new IntegrationError(422, "Conecte e selecione um provedor de e-mail antes de enviar mensagens.");
  const values = { storeName: store.name, customerName: "Cliente", orderReference: "", orderTotal: "", paymentUrl: "", resetUrl: "", ...variables };
  const subject = renderTemplate(template.subject, values, false);
  const html = renderTemplate(template.bodyHtml, values, true);
  const from = formatFrom(email.fromName, email.fromEmail);
  if (email.provider === RESEND) {
    const response = await sendResendEmail({ apiKey: integration.config.apiKey, idempotencyKey: `store-${storeId}-${eventKey}-${createHash("sha256").update(`${target}:${subject}:${html}`).digest("hex").slice(0, 28)}`, from, to: target, subject, html, replyTo: email.replyTo });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new IntegrationError(502, safeProviderError(payload, "O Resend não aceitou o envio deste e-mail."));
    return { skipped: false, messageId: payload.id || null };
  }
  try {
    const result = await smtpTransport(integration.config).sendMail({ from, to: target, subject, html, replyTo: email.replyTo || undefined });
    return { skipped: false, messageId: result.messageId || null };
  } catch {
    throw new IntegrationError(502, "O provedor SMTP não aceitou o envio deste e-mail.");
  }
}

/** Credencial de uso exclusivamente servidor para operações de checkout da própria loja. */
export async function getStoreMercadoPagoAccessToken(storeId) {
  let integration = await integrationWithConfig(storeId, MERCADO_PAGO);
  if (!integration?.config?.accessToken) throw new IntegrationError(422, "Esta loja ainda não conectou uma conta Mercado Pago para receber pagamentos.");
  const expiresAt = Number(integration.config.expiresAt || 0);
  if (!expiresAt || expiresAt > Date.now() + 60_000) return integration.config.accessToken;
  const refreshToken = String(integration.config.refreshToken || "");
  if (!refreshToken) throw new IntegrationError(422, "A conexão Mercado Pago desta loja expirou. Peça ao lojista para reconectá-la no painel.");
  const response = await fetch("https://api.mercadopago.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: requiredEnv("MERCADO_PAGO_OAUTH_CLIENT_ID"), client_secret: requiredEnv("MERCADO_PAGO_OAUTH_CLIENT_SECRET"), grant_type: "refresh_token", refresh_token: refreshToken }), signal: AbortSignal.timeout(15_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new IntegrationError(502, "Não foi possível renovar a conexão Mercado Pago desta loja. Peça ao lojista para reconectá-la no painel.");
  const refreshed = { accessToken: payload.access_token, refreshToken: payload.refresh_token || refreshToken, expiresAt: Number(payload.expires_in) > 0 ? Date.now() + Number(payload.expires_in) * 1000 : null };
  await upsertIntegration({ storeId, provider: MERCADO_PAGO, status: "connected", config: refreshed, metadata: integration.metadata, accountEmail: integration.account_email || null });
  integration = { ...integration, config: refreshed };
  return integration.config.accessToken;
}

async function mercadoPagoCapabilities(storeId) {
  const integration = await integrationWithConfig(storeId, MERCADO_PAGO);
  if (!integration?.config?.accessToken) return disconnectedCapability(MERCADO_PAGO);
  try {
    const accessToken = await getStoreMercadoPagoAccessToken(storeId);
    const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ([]));
    if (!response.ok) return unavailableCapability(MERCADO_PAGO, "Não foi possível atualizar os meios disponíveis no Mercado Pago.");
    return { provider: MERCADO_PAGO, connected: true, available: true, options: sanitizeMercadoPagoMethods(payload), error: "" };
  } catch {
    return unavailableCapability(MERCADO_PAGO, "Não foi possível atualizar os meios disponíveis no Mercado Pago.");
  }
}

async function melhorEnvioCapabilities(storeId, contactEmail) {
  const integration = await integrationWithConfig(storeId, MELHOR_ENVIO);
  if (!integration?.config?.accessToken) return disconnectedCapability(MELHOR_ENVIO);
  try {
    const response = await melhorEnvioRequest(integration, "/api/v2/me/shipment/services", { contactEmail });
    const payload = await response.json().catch(() => ([]));
    if (!response.ok) return unavailableCapability(MELHOR_ENVIO, "Não foi possível atualizar os serviços disponíveis no Melhor Envio.");
    return { provider: MELHOR_ENVIO, connected: true, available: true, options: sanitizeMelhorEnvioServices(payload), error: "" };
  } catch {
    return unavailableCapability(MELHOR_ENVIO, "Não foi possível atualizar os serviços disponíveis no Melhor Envio.");
  }
}

function disconnectedCapability(provider) { return { provider, connected: false, available: false, options: [], error: "" }; }
function unavailableCapability(provider, error) { return { provider, connected: true, available: false, options: [], error }; }

export function encryptConfig(value, secret = process.env.JWT_SECRET) {
  if (!secret) throw new Error("Chave de criptografia de integrações indisponível.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", integrationKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptConfig(value, secret = process.env.JWT_SECRET) {
  const [version, ivText, tagText, payloadText] = String(value || "").split(".");
  if (version !== "v1" || !ivText || !tagText || !payloadText) throw new IntegrationError(500, "Não foi possível ler uma configuração protegida.");
  const decipher = createDecipheriv("aes-256-gcm", integrationKey(secret), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payloadText, "base64url")), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted);
}

export function buildMercadoPagoAuthorizationUrl({ clientId, state, redirectUri, codeChallenge }) {
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

export function renderTemplate(source, values, html = true) { return String(source || "").replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g, (_match, name) => html ? escapeHtml(values?.[name] ?? "") : String(values?.[name] ?? "")); }
export function publicFreightQuote(quote) { return { id: Number(quote?.id || 0), carrier: String(quote?.company?.name || ""), service: String(quote?.name || ""), price: String(quote?.custom_price || quote?.price || ""), deliveryTime: Number(quote?.custom_delivery_time || quote?.delivery_time || 0), deliveryRange: quote?.custom_delivery_range || quote?.delivery_range || null }; }

async function ensureStoreIntegrationDefaults(storeId) {
  const timestamp = Date.now();
  await repository.ensureEmailSettings(storeId, timestamp);
  await repository.ensureEmailTemplates(storeId, defaultTemplates, timestamp);
}

async function publicStoreSettings(storeId) {
  const [integrations, email, templates] = await Promise.all([repository.listIntegrations(storeId), publicEmailSettings(storeId), repository.listEmailTemplates(storeId)]);
  return { storeId, integrations: PROVIDERS.map((provider) => publicIntegrationRow(integrations.find((item) => item.provider === provider), provider)), email, templates: templates.map(publicTemplateRow) };
}

async function publicEmailSettings(storeId) { const row = await repository.findEmailSettings(storeId); return { provider: row?.provider || RESEND, fromName: row?.from_name || "", fromEmail: row?.from_email || "", replyTo: row?.reply_to || "", updatedAt: Number(row?.updated_at || 0) }; }
async function publicEmailTemplate(storeId, eventKey) { const row = await repository.findEmailTemplate(storeId, eventKey); return row ? publicTemplateRow(row) : null; }
async function publicIntegration(storeId, provider) { const row = await repository.findIntegration(storeId, provider); return publicIntegrationRow(row, provider); }
function publicIntegrationRow(row, provider) { const metadata = parseJson(row?.metadata_json, {}); return { provider, connected: row?.status === "connected", status: row?.status || "disconnected", accountEmail: row?.account_email || "", accountNickname: metadata.accountNickname || "", originPostalCode: metadata.originPostalCode || "", environment: metadata.environment || "production", connectedAt: Number(row?.connected_at || 0), lastTestedAt: Number(row?.last_tested_at || 0), lastError: row?.last_error || "" }; }
function publicTemplateRow(row) { return { eventKey: row.event_key, label: defaultTemplates[row.event_key]?.label || row.event_key, subject: row.subject, bodyHtml: row.body_html, enabled: Boolean(row.enabled), updatedAt: Number(row.updated_at || 0) }; }

async function upsertIntegration({ storeId, provider, status, config, metadata, accountEmail, db = { query } }) {
  const timestamp = Date.now();
  await repository.upsertIntegration({ id: randomUUID(), storeId, provider, status, accountEmail, configEncrypted: encryptConfig(config), metadataJson: JSON.stringify(metadata || {}), connectedAt: status === "connected" ? timestamp : null, createdAt: timestamp, updatedAt: timestamp }, db);
}
async function integrationWithConfig(storeId, provider) { const row = await repository.findConnectedIntegration(storeId, provider); return row?.config_encrypted ? { ...row, config: decryptConfig(row.config_encrypted), metadata: parseJson(row.metadata_json, {}) } : null; }
async function markIntegrationTest(storeId, provider, lastError) { await repository.markIntegrationTest(storeId, provider, lastError, Date.now()); }
async function ownedStore(storeId, userId) { return repository.findOwnedStore(storeId, userId); }
async function requireOwnedStore(storeId, userId) {
  const store = await ownedStore(storeId, userId);
  if (!store) throw new IntegrationError(404, "Loja não encontrada.");
  return store;
}

function parseFreightQuote(source, metadata) { const from = normalizePostalCode(source?.originPostalCode || metadata?.originPostalCode); const to = normalizePostalCode(source?.destinationPostalCode); const products = Array.isArray(source?.products) ? source.products.map((product) => ({ id: requiredText(product?.id, 1, 80, "Informe a identificação do produto."), width: positiveNumber(product?.width, "Informe a largura do produto."), height: positiveNumber(product?.height, "Informe a altura do produto."), length: positiveNumber(product?.length, "Informe o comprimento do produto."), weight: positiveNumber(product?.weight, "Informe o peso do produto."), insurance_value: positiveNumber(product?.insuranceValue, "Informe o valor segurado do produto."), quantity: Math.max(1, Math.floor(positiveNumber(product?.quantity, "Informe a quantidade do produto."))) })) : []; if (!from || !to || !products.length) throw new IntegrationError(422, "Informe CEP de origem, CEP de destino e pelo menos um produto com dimensões, peso, valor e quantidade."); return { from: { postal_code: from }, to: { postal_code: to }, products }; }
function mercadoPagoCallbackUrl() { return `${String(process.env.APP_URL || CANONICAL_APP_URL).replace(/\/$/, "")}/v1/integrations/mercado-pago/callback`; }
function callbackRedirect(status) { return `${CANONICAL_APP_URL}/settings?integration=mercado-pago&connection=${status}`; }
function integrationKey(secret) { return createHash("sha256").update(`loja-descomplicada:integration-config:${secret}`).digest(); }
function hashState(state) { return createHash("sha256").update(String(state)).digest("hex"); }
function requiredEnv(key) { const value = String(process.env[key] || "").trim(); if (!value) throw new IntegrationError(503, "A conexão OAuth do Mercado Pago ainda não foi configurada neste ambiente."); return value; }
function requiredText(value, min, max, message) { const text = String(value || "").trim(); if (text.length < min || text.length > max) throw new IntegrationError(422, message); return text; }
function positiveNumber(value, message) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) throw new IntegrationError(422, message); return number; }
function normalizeEmail(value) { const email = String(value || "").trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""; }
function normalizePostalCode(value) { const postalCode = String(value || "").replace(/\D/g, ""); return /^\d{8}$/.test(postalCode) ? postalCode : ""; }
function parseJson(value, fallback) { try { return typeof value === "object" && value ? value : JSON.parse(value || "{}"); } catch { return fallback; } }
function formatFrom(name, email) { return `${String(name || "").replace(/[<>\r\n]/g, "").trim()} <${email}>`; }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
function safeProviderError(value, fallback) { const message = String(value?.message || value?.error || fallback).replace(/[^\p{L}\p{N} .,;:!()\-_/]/gu, " ").replace(/\s+/g, " ").trim(); return message.slice(0, 300) || fallback; }
export class IntegrationError extends Error { constructor(status, message) { super(message); this.status = status; } }
export { defaultTemplates };
