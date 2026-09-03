import { one, query } from "../../db.js";
import { optionalEmail, optionalUrl, validText } from "../shared/validation.js";

const BRAZILIAN_STATES = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

export async function listStoreFontOptions() {
  return query("SELECT id, label, description, css_family FROM ld_store_font_options WHERE active = 1 ORDER BY sort_order ASC, label ASC");
}

export async function getStoresForUser(userId) {
  return query(
    "SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.support_hours, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_observation, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json, profiles.about_title, profiles.about_body, subscriptions.plan_id AS subscription_plan_id, subscriptions.status AS subscription_status, subscriptions.trial_ends_at AS subscription_trial_ends_at FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id LEFT JOIN (SELECT store_id, MAX(created_at) AS latest_created_at FROM ld_subscriptions GROUP BY store_id) AS latest_subscription ON latest_subscription.store_id = stores.id LEFT JOIN ld_subscriptions AS subscriptions ON subscriptions.store_id = latest_subscription.store_id AND subscriptions.created_at = latest_subscription.latest_created_at WHERE stores.user_id = ? ORDER BY stores.created_at DESC",
    [userId],
  );
}

export async function storeWithProfileForUser(storeId, userId) {
  return one(
    "SELECT stores.*, profiles.font_family, profiles.contact_email, profiles.contact_phone, profiles.whatsapp_phone, profiles.support_hours, profiles.address_postal_code, profiles.address_street, profiles.address_number, profiles.address_complement, profiles.address_observation, profiles.address_district, profiles.address_city, profiles.address_state, profiles.address_country, profiles.instagram_url, profiles.facebook_url, profiles.tiktok_url, profiles.youtube_url, profiles.pinterest_url, profiles.twitter_url, profiles.favicon_url, profiles.settings_json, profiles.payment_methods_json, profiles.shipping_methods_json, profiles.about_title, profiles.about_body FROM ld_stores AS stores LEFT JOIN ld_store_profiles AS profiles ON profiles.store_id = stores.id WHERE stores.id = ? AND stores.user_id = ?",
    [storeId, userId],
  );
}

export async function ensureStoreProfile(storeId) {
  const timestamp = Date.now();
  await query(
    "INSERT IGNORE INTO ld_store_profiles (store_id, about_body, created_at, updated_at) VALUES (?, '', ?, ?)",
    [storeId, timestamp, timestamp],
  );
}

export async function ownedStoreForUser(storeId, userId) {
  return one("SELECT id, name FROM ld_stores WHERE id = ? AND user_id = ?", [storeId, userId]);
}

export function normalizeStoreProfile(source, existing = {}, fontOptions = []) {
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
    twitter: optionalUrl(socials.twitter ?? existing.twitter_url),
  };
  const originals = [
    socials.instagram ?? existing.instagram_url,
    socials.facebook ?? existing.facebook_url,
    socials.tiktok ?? existing.tiktok_url,
    socials.youtube ?? existing.youtube_url,
    socials.pinterest ?? existing.pinterest_url,
    socials.twitter ?? existing.twitter_url,
  ];

  if (!fontFamily) return { valid: false, error: "Selecione uma fonte visual disponível." };
  if (emailInput && !email) return { valid: false, error: "Informe um e-mail de contato válido ou deixe o campo em branco." };
  if (!/^[A-Z]{2}$/.test(country)) return { valid: false, error: "Informe um país válido com duas letras." };
  if (state && !BRAZILIAN_STATES.has(state)) return { valid: false, error: "Selecione uma UF brasileira válida." };
  if (originals.some((value, index) => String(value || "").trim() && !Object.values(links)[index])) {
    return { valid: false, error: "Informe links válidos com http:// ou https:// nas redes sociais." };
  }

  const text = (value, max) => validText(value || "", 0, max);
  return {
    valid: true,
    value: {
      fontFamily,
      contact: {
        email,
        phone: text(contact.phone ?? existing.contact_phone, 40),
        whatsapp: text(contact.whatsapp ?? existing.whatsapp_phone, 40),
        hours: text(contact.hours ?? existing.support_hours, 160),
      },
      address: {
        postalCode: text(address.postalCode ?? existing.address_postal_code, 20),
        street: text(address.street ?? existing.address_street, 180),
        number: text(address.number ?? existing.address_number, 30),
        complement: text(address.complement ?? existing.address_complement, 120),
        observation: text(address.observation ?? existing.address_observation, 80),
        district: text(address.district ?? existing.address_district, 120),
        city: text(address.city ?? existing.address_city, 120),
        state,
        country,
      },
      socials: links,
      about: {
        title: text(about.title ?? existing.about_title, 160),
        body: text(about.body ?? existing.about_body, 5000),
      },
    },
  };
}

export function normalizeStorefrontAdmin(source, existing = {}) {
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
  if (!/^[A-Z]{3}$/.test(currency)) return { valid: false, error: "Informe uma moeda válida com três letras." };
  if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(locale)) return { valid: false, error: "Informe um locale válido, como pt-BR." };
  if (!timezone || timezone.length > 80) return { valid: false, error: "Informe um fuso horário válido." };
  if (!/^[a-z0-9_-]{1,40}$/i.test(template)) return { valid: false, error: "Informe um template válido." };
  if (rawFavicon && !faviconUrl) return { valid: false, error: "Informe uma URL válida para o favicon ou deixe o campo vazio." };
  if (Object.values(colors).some((color) => color === false)) return { valid: false, error: "Use cores hexadecimais válidas no tema." };
  if (settings === false || paymentMethods === false || shippingMethods === false || !isPlainObject(settings) || !Array.isArray(paymentMethods) || !Array.isArray(shippingMethods)) return { valid: false, error: "Revise as configurações comerciais da loja." };
  return { valid: true, value: { maintenance: Boolean(maintenance), maintenanceMessage: validText(storefront.maintenanceMessage ?? existing.maintenance_message ?? "", 0, 500), currency, locale, timezone, template, theme: colors, faviconUrl, settings, paymentMethods, shippingMethods } };
}

function normalizeOptionalColor(value) { if (value === null || value === undefined || value === "") return null; const normalized = String(value).trim().toUpperCase(); return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : false; }
function isPlainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function safeJson(value, fallback) { if (value === null || value === undefined || value === "") return fallback; const candidate = typeof value === "string" ? (() => { try { return JSON.parse(value); } catch { return false; } })() : value; try { return JSON.stringify(candidate).length <= 12000 ? candidate : false; } catch { return false; } }
