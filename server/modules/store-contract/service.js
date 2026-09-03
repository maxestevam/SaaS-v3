import * as repository from "./repository.js";
import { STORE_CONTRACT_VERSION, assertValidStoreContract } from "../../../shared/store-contract/schema.js";
import { buildCommercialPreview, projectCommercialDomain } from "../../../shared/store-contract/commercial.js";

export class StoreContractError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function getStoreContract({ storeId, userId, dataSource = repository }) {
  const store = await dataSource.findStoreForUser(storeId, userId);
  if (!store) throw new StoreContractError(404, "Loja não encontrada.");
  return buildValidatedContract(store, await dataSource.loadStoreContractData(store.id));
}

export async function getPublicStoreContract({ slug, dataSource = repository }) {
  const store = await dataSource.findPublicStoreBySlug(normalizeSlug(slug));
  if (!store) throw new StoreContractError(404, "Loja pública não encontrada ou indisponível.");
  return buildValidatedContract(store, await dataSource.loadStoreContractData(store.id));
}

export async function getPublicCommercialPreview({ slug, input, dataSource = repository, now = Date.now() }) {
  const contract = await getPublicStoreContract({ slug, dataSource });
  return buildCommercialPreview(projectCommercialDomain(contract), input, now);
}

export function buildStoreContract(store, data = {}) {
  const categoryRecords = mapCategories(data.categories || []);
  const categoryById = new Map(categoryRecords.flat.map((category) => [category.id, category]));
  const mediaByProduct = groupBy(data.media || [], (item) => item.product_id);
  const variantsByProduct = groupBy(data.variants || [], (item) => item.product_id);
  const imagesByBanner = groupBy(data.bannerImages || [], (item) => item.banner_id);
  const banners = mapBanners(data.banners || [], imagesByBanner);
  return {
    contractVersion: STORE_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    store: mapStore(store),
    banners: banners.filter((banner) => banner.kind === "hero").map(({ kind, ...banner }) => banner),
    miniBanners: banners.filter((banner) => banner.kind === "mini").map(({ kind, ...banner }) => banner),
    categories: categoryRecords.roots,
    products: (data.products || []).map((product) => mapProduct(product, categoryById, mediaByProduct.get(product.id) || [], variantsByProduct.get(product.id) || [])),
    coupons: (data.coupons || []).map(mapCoupon),
    pages: [],
    orders: [],
  };
}

function buildValidatedContract(store, data) {
  const contract = buildStoreContract(store, data);
  assertValidStoreContract(contract);
  return contract;
}

function mapStore(store) {
  const name = textOrNull(store.name);
  const description = textOrNull(store.description);
  return {
    id: String(store.id),
    name,
    slug: normalizeSlug(store.slug),
    description,
    logo: textOrNull(store.logo_url || store.logoUrl),
    favicon: textOrNull(store.favicon_url),
    status: publicStoreStatus(store.status),
    maintenance: Boolean(store.maintenance),
    maintenanceMessage: textOrNull(store.maintenance_message),
    currency: textOrNull(store.currency),
    currencySymbol: currencySymbol(store.currency),
    locale: textOrNull(store.locale),
    timezone: textOrNull(store.timezone),
    contact: {
      email: textOrNull(store.contact_email),
      phone: textOrNull(store.contact_phone),
      whatsapp: textOrNull(store.whatsapp_phone),
      address: {
        street: joinAddress(store.address_street, store.address_number),
        neighborhood: textOrNull(store.address_district),
        city: textOrNull(store.address_city),
        state: textOrNull(store.address_state),
        zipCode: textOrNull(store.address_postal_code),
        country: textOrNull(store.address_country),
      },
    },
    social: {
      instagram: textOrNull(store.instagram_url),
      facebook: textOrNull(store.facebook_url),
      tiktok: textOrNull(store.tiktok_url),
      youtube: textOrNull(store.youtube_url),
      pinterest: textOrNull(store.pinterest_url),
      twitter: textOrNull(store.twitter_url),
    },
    seo: { title: name, description, keywords: [], ogImage: textOrNull(store.logo_url || store.logoUrl) },
    settings: mapSettings(store.settings_json),
    paymentMethods: mapMethods(store.payment_methods_json),
    shippingMethods: mapMethods(store.shipping_methods_json),
    template: textOrNull(store.template),
    theme: { primaryColor: textOrNull(store.color), secondaryColor: textOrNull(store.theme_secondary_color), accentColor: textOrNull(store.theme_accent_color), backgroundColor: textOrNull(store.theme_background_color), textColor: textOrNull(store.theme_text_color), fontFamily: textOrNull(store.font_family) },
  };
}

function mapCategories(rows) {
  const flat = rows.map((row, index) => ({ id: String(row.id), name: String(row.name), slug: normalizeSlug(row.name) || String(row.id), description: textOrNull(row.description), image: textOrNull(row.card_image_url), banner: textOrNull(row.hero_image_url), parentId: textOrNull(row.parent_category_id), position: index + 1, active: Boolean(row.active), productCount: Number(row.product_count || 0), subcategories: [] }));
  const byId = new Map(flat.map((item) => [item.id, item]));
  const roots = [];
  for (const item of flat) {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId).subcategories.push(item);
    else roots.push(item);
  }
  roots.forEach((root, rootIndex) => { root.position = rootIndex + 1; root.subcategories.forEach((child, childIndex) => { child.position = childIndex + 1; }); });
  return { roots, flat };
}

function mapProduct(product, categoryById, media, variants) {
  const assignedCategory = categoryById.get(String(product.category_id));
  const rootCategory = assignedCategory?.parentId ? categoryById.get(assignedCategory.parentId) || assignedCategory : assignedCategory;
  const images = media.map((item) => item.url).filter(Boolean);
  const primary = media.find((item) => Boolean(item.is_primary)) || media[0];
  const description = textOrNull(product.description);
  return {
    id: String(product.id),
    sku: textOrNull(product.sku),
    name: String(product.name),
    slug: normalizeSlug(product.name) || String(product.id),
    description,
    shortDescription: textOrNull(product.short_description) || shorten(description),
    price: centsToValue(product.price_cents),
    priceFrom: centsToValue(product.compare_at_price_cents),
    images,
    thumbnail: textOrNull(primary?.url),
    categoryId: String(rootCategory?.id || product.category_id),
    categorySlug: String(rootCategory?.slug || normalizeSlug(product.category_id) || product.category_id),
    subcategoryId: assignedCategory?.parentId ? assignedCategory.id : null,
    brand: textOrNull(product.brand),
    tags: jsonArray(product.tags_json),
    featured: null,
    isNew: null,
    isBestSeller: null,
    active: product.status === "active",
    stock: Number.isInteger(Number(product.stock_quantity)) ? Number(product.stock_quantity) : null,
    weight: product.weight_grams == null ? null : Number(product.weight_grams) / 1000,
    dimensions: product.width_mm == null && product.height_mm == null && product.depth_mm == null ? null : { width: Number(product.width_mm || 0) / 10, height: Number(product.height_mm || 0) / 10, depth: Number(product.depth_mm || 0) / 10 },
    variants: variants.map((variant) => ({ id: String(variant.id), name: String(variant.name), sku: textOrNull(variant.sku), price: centsToValue(variant.price_cents) ?? centsToValue(product.price_cents), stock: Number(variant.stock_quantity || 0), attributes: {} })),
    attributes: {},
    seo: { title: String(product.name), description, keywords: [] },
    createdAt: toIso(product.created_at),
    updatedAt: toIso(product.updated_at),
  };
}

function mapBanners(rows, imagesByBanner) {
  const rank = { top: 1, middle: 2, after_row_1: 3, after_row_2: 4, after_row_3: 5, after_row_4: 6, final: 7 };
  return [...rows].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0) || (rank[left.display_position] || 99) - (rank[right.display_position] || 99)).map((banner, index) => {
    const images = imagesByBanner.get(banner.id) || [];
    const desktop = images.find((item) => item.breakpoint === "desktop");
    const mobile = images.find((item) => item.breakpoint === "mobile");
    return { kind: banner.banner_kind || "hero", id: String(banner.id), title: String(banner.title), subtitle: textOrNull(banner.subtitle), image: textOrNull(desktop?.url || mobile?.url), imageMobile: textOrNull(mobile?.url || desktop?.url), link: textOrNull(banner.target_url), buttonText: textOrNull(banner.button_text), position: Number(banner.sort_order || index + 1), active: Boolean(banner.active) };
  });
}

function mapCoupon(coupon) {
  const value = coupon.discount_type === "percentage" ? Number(coupon.percentage_off) : coupon.discount_type === "fixed" ? centsToValue(coupon.amount_off_cents) : 0;
  return { id: String(coupon.id), code: String(coupon.code), description: null, type: String(coupon.discount_type), value, minValue: centsToValue(coupon.minimum_order_cents), maxDiscount: null, usageLimit: coupon.usage_limit == null ? null : Number(coupon.usage_limit), usageCount: Number(coupon.usage_count || 0), userLimit: null, startDate: null, endDate: toIso(coupon.expires_at), active: Boolean(coupon.active), categories: [], products: [] };
}

function groupBy(items, key) { return items.reduce((groups, item) => { const groupKey = key(item); const current = groups.get(groupKey) || []; current.push(item); groups.set(groupKey, current); return groups; }, new Map()); }
function textOrNull(value) { const text = String(value || "").trim(); return text || null; }
function centsToValue(value) { return value == null || value === "" ? null : Number((Number(value) / 100).toFixed(2)); }
function currencySymbol(currency) { return String(currency || "").toUpperCase() === "BRL" ? "R$" : null; }
function jsonArray(value) { try { const parsed = typeof value === "string" ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }
function mapSettings(value) { const source = parseJson(value, {}); return { freeShippingMinValue: finiteOrNull(source.freeShippingMinValue), maxInstallments: integerOrNull(source.maxInstallments), minInstallmentValue: finiteOrNull(source.minInstallmentValue), showPriceFrom: booleanOrNull(source.showPriceFrom), showStock: booleanOrNull(source.showStock), showSoldCount: booleanOrNull(source.showSoldCount), allowGuestCheckout: booleanOrNull(source.allowGuestCheckout), requireCpf: booleanOrNull(source.requireCpf), requirePhone: booleanOrNull(source.requirePhone) }; }
function mapMethods(value) { const source = parseJson(value, []); return Array.isArray(source) ? source.filter((item) => item && typeof item === "object").slice(0, 20) : []; }
function parseJson(value, fallback) { try { const parsed = typeof value === "string" ? JSON.parse(value) : value; return parsed ?? fallback; } catch { return fallback; } }
function finiteOrNull(value) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : null; }
function integerOrNull(value) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : null; }
function booleanOrNull(value) { return typeof value === "boolean" ? value : null; }
function toIso(value) { const timestamp = Number(value); return Number.isSafeInteger(timestamp) && timestamp > 0 ? new Date(timestamp).toISOString() : null; }
function shorten(value) { return value ? value.slice(0, 180) : null; }
function joinAddress(street, number) { const first = textOrNull(street); const second = textOrNull(number); return first && second ? `${first}, ${second}` : first || second; }
function normalizeSlug(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function publicStoreStatus(value) { return Number(value) === 3 ? "active" : Number(value) === 0 ? "inactive" : "pending"; }
