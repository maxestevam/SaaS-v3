import { api } from "@/lib/api";
import { normalizeSlug } from "../../../../shared/store-contract/normalizers.js";

const text = (value, fallback = "") => value == null ? fallback : String(value);
const bool = (value, fallback = false) => value == null ? fallback : Boolean(value);
const list = (value) => Array.isArray(value) ? value : [];
const money = (value) => value == null || value === "" ? null : Number(value);
const imageUrl = (item) => text(item?.url || item?.imageUrl || item?.image || item?.thumbnail, "");

function normalizeDomain(value) {
  const domain = value || {};
  return {
    ...domain,
    store: { ...(domain.store || {}), contact: { ...(domain.store?.contact || {}), address: { ...(domain.store?.contact?.address || {}) } }, social: { ...(domain.store?.social || {}) }, seo: { ...(domain.store?.seo || {}), keywords: list(domain.store?.seo?.keywords) }, settings: { ...(domain.store?.settings || {}) }, theme: { ...(domain.store?.theme || {}) } },
    banners: list(domain.banners), miniBanners: list(domain.miniBanners), categories: list(domain.categories), products: list(domain.products), coupons: list(domain.coupons), pages: list(domain.pages), orders: list(domain.orders),
  };
}

export const storeContractDataSource = {
  async getPublicStoreDomain(slug) {
    return normalizeDomain(await api.getPublicStoreContract(slug));
  },
};

export function selectStorefrontShellViewModel(domain) {
  const store = domain.store || {};
  return { store: { ...store, slug: text(store.slug), name: text(store.name, "Loja"), description: text(store.description), logoUrl: text(store.logo || store.logoUrl), faviconUrl: text(store.favicon || store.faviconUrl), maintenance: bool(store.maintenance), maintenanceMessage: text(store.maintenanceMessage), seo: store.seo || {} }, locale: store.locale || "pt-BR", currency: store.currency || "BRL" };
}
export function selectActiveBanners(domain) { return list(domain?.banners).filter((b) => b?.active !== false).map((b) => ({ ...b, id: text(b.id), title: text(b.title), subtitle: text(b.subtitle), desktopImageUrl: text(b.desktopImageUrl || b.image || b.imageUrl), mobileImageUrl: text(b.mobileImageUrl || b.imageMobile), link: text(b.link || b.targetUrl), buttonText: text(b.buttonText) })); }
export function selectTopLevelCategories(domain) { return list(domain?.categories).filter((c) => c?.active !== false && !c.parentId).map(categoryView); }
export function selectCategoryViewModel(domain, slug) { return selectTopLevelCategories(domain).find((c) => c.slug === slug) || list(domain?.categories).map(categoryView).find((c) => c.slug === slug) || null; }
function categoryView(c) { return { ...c, id: text(c.id), name: text(c.name), slug: text(c.slug || normalizeSlug(c.name)), description: text(c.description), imageUrl: text(c.image || c.imageUrl || c.cardImageUrl), subcategories: list(c.subcategories).map(categoryView) }; }
export function selectCatalogProductViewModels(domain, options = {}) { const search = text(options.search).trim().toLowerCase(); return list(domain?.products).filter((p) => p?.active !== false && (!options.categorySlug || p.categorySlug === options.categorySlug) && (!options.subcategoryId || p.subcategoryId === options.subcategoryId) && (!search || [p.name, p.brand, p.categoryName, ...(p.tags || [])].join(" ").toLowerCase().includes(search))).map(productView); }
export function selectStorefrontProductBySlug(domain, slug) { return list(domain?.products).map(productView).find((p) => p.slug === slug) || null; }
function productView(p) { const variants = list(p.variants).map((v) => ({ ...v, id: text(v.id), name: text(v.name || v.label), price: money(v.price), stock: money(v.stock), available: v.available == null ? (v.stock == null ? null : Number(v.stock) > 0) : Boolean(v.available) })); const price = money(p.price); const fromPrice = variants.length ? Math.min(...variants.map((v) => v.price).filter((v) => v != null), price ?? Infinity) : money(p.priceFrom ?? p.price); const gallery = list(p.images).map((image, i) => ({ id: text(image.id, `image-${i}`), url: imageUrl(image), alt: text(image.alt) })).filter((i) => i.url); return { ...p, id: text(p.id), name: text(p.name), slug: text(p.slug || normalizeSlug(p.name)), categoryName: text(p.categoryName), imageUrl: imageUrl(p.thumbnail || p), gallery, variants, badges: { new: bool(p.isNew || p.badges?.new), featured: bool(p.featured || p.badges?.featured) }, hasPromotion: p.compareAtPrice != null || p.compareAtPriceCents != null, discountPercent: null, available: p.available == null ? (p.stock == null ? null : Number(p.stock) > 0) : Boolean(p.available), price, fromPrice, priceMode: variants.length ? "from" : "fixed", priceLabel: p.priceLabel || null, fromPriceLabel: p.fromPriceLabel || null, compareAtPriceLabel: p.compareAtPriceLabel || null, stockLabel: p.stockLabel || "Disponível", description: text(p.description), additionalInfo: { sku: p.sku, weightKg: p.weight ? Number(p.weight) / 1000 : null }, selectedVariantId: variants[0]?.id || null }; }
export function selectProductDetailViewModel(product, variantId, locale, currency) { const selectedVariant = product.variants.find((v) => v.id === variantId) || product.variants[0]; return { ...product, selectedVariantId: selectedVariant?.id || null, price: selectedVariant?.price ?? product.price, locale, currency }; }
export function selectPublicPageViewModel(domain, slug) { return list(domain?.pages).map((p) => ({ ...p, slug: text(p.slug || normalizeSlug(p.title)) })).find((p) => p.slug === slug && p.active !== false) || null; }
