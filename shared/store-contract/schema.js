export const STORE_CONTRACT_VERSION = "1.0";

export class StoreContractValidationError extends Error {
  constructor(issues) {
    super("O contrato público da loja não corresponde ao schema.");
    this.name = "StoreContractValidationError";
    this.issues = issues;
  }
}

export function validateStoreContract(value) {
  const issues = [];
  const requiredObject = (target, key, path) => {
    if (!target || typeof target !== "object" || Array.isArray(target) || !(key in target) || !target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
      issues.push({ path: `${path}.${key}`, message: "Objeto obrigatório ausente ou inválido." });
      return {};
    }
    return target[key];
  };
  const requiredArray = (target, key, path) => {
    if (!target || !(key in target) || !Array.isArray(target[key])) {
      issues.push({ path: `${path}.${key}`, message: "Lista obrigatória ausente ou inválida." });
      return [];
    }
    return target[key];
  };
  const requiredString = (target, key, path) => {
    if (!target || typeof target[key] !== "string" || !target[key].trim()) issues.push({ path: `${path}.${key}`, message: "Texto obrigatório ausente ou inválido." });
  };
  const nullableString = (target, key, path) => {
    if (target && key in target && target[key] !== null && typeof target[key] !== "string") issues.push({ path: `${path}.${key}`, message: "Campo opcional deve ser texto ou nulo." });
  };
  const nullableNumber = (target, key, path) => {
    if (target && key in target && target[key] !== null && !Number.isFinite(target[key])) issues.push({ path: `${path}.${key}`, message: "Campo opcional deve ser número ou nulo." });
  };
  const nullableBoolean = (target, key, path) => {
    if (target && key in target && target[key] !== null && typeof target[key] !== "boolean") issues.push({ path: `${path}.${key}`, message: "Campo opcional deve ser booleano ou nulo." });
  };
  const objectOrNull = (target, key, path) => {
    if (target && key in target && target[key] !== null && (typeof target[key] !== "object" || Array.isArray(target[key]))) issues.push({ path: `${path}.${key}`, message: "Campo opcional deve ser objeto ou nulo." });
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
  requiredArray(seo, "keywords", "$.store.seo").forEach((item, index) => { if (typeof item !== "string") issues.push({ path: `$.store.seo.keywords[${index}]`, message: "Palavra-chave deve ser texto." }); });
  const settings = requiredObject(store, "settings", "$.store");
  ["freeShippingMinValue", "maxInstallments", "minInstallmentValue"].forEach((key) => nullableNumber(settings, key, "$.store.settings"));
  ["showPriceFrom", "showStock", "showSoldCount", "allowGuestCheckout", "requireCpf", "requirePhone"].forEach((key) => nullableBoolean(settings, key, "$.store.settings"));
  const theme = requiredObject(store, "theme", "$.store");
  ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor", "fontFamily"].forEach((key) => nullableString(theme, key, "$.store.theme"));
  requiredArray(store, "paymentMethods", "$.store").forEach((item, index) => validatePaymentMethod(item, `$.store.paymentMethods[${index}]`, { requiredString, nullableString, nullableNumber, nullableBoolean, issues }));
  requiredArray(store, "shippingMethods", "$.store").forEach((item, index) => validateShippingMethod(item, `$.store.shippingMethods[${index}]`, { requiredString, nullableString, nullableNumber, nullableBoolean, issues }));

  requiredArray(value, "banners", "$").forEach((item, index) => validateBanner(item, `$.banners[${index}]`, { requiredString, nullableString, nullableNumber, nullableBoolean, issues }));
  requiredArray(value, "miniBanners", "$").forEach((item, index) => validateMiniBanner(item, `$.miniBanners[${index}]`, { requiredString, nullableString, nullableBoolean, issues }));
  requiredArray(value, "categories", "$").forEach((item, index) => validateCategory(item, `$.categories[${index}]`, { requiredString, nullableString, nullableNumber, nullableBoolean, requiredArray, issues }));
  requiredArray(value, "products", "$").forEach((item, index) => validateProduct(item, `$.products[${index}]`, { requiredString, nullableString, nullableNumber, nullableBoolean, requiredArray, objectOrNull, issues }));
  requiredArray(value, "coupons", "$").forEach((item, index) => validateCoupon(item, `$.coupons[${index}]`, { requiredString, nullableString, nullableNumber, nullableBoolean, requiredArray, issues }));
  requiredArray(value, "pages", "$").forEach((item, index) => validatePage(item, `$.pages[${index}]`, { requiredString, nullableString, nullableBoolean, objectOrNull, issues }));
  requiredArray(value, "orders", "$").forEach((item, index) => validateOrder(item, `$.orders[${index}]`, { requiredString, nullableString, nullableNumber, nullableBoolean, requiredArray, objectOrNull, issues }));
  return { success: issues.length === 0, issues };
}

export function assertValidStoreContract(value) {
  const result = validateStoreContract(value);
  if (!result.success) throw new StoreContractValidationError(result.issues);
  return value;
}

function validatePaymentMethod(item, path, tools) { tools.requiredString(item, "id", path); tools.requiredString(item, "name", path); tools.nullableString(item, "icon", path); tools.nullableBoolean(item, "enabled", path); tools.nullableNumber(item, "installments", path); tools.nullableNumber(item, "minInstallmentValue", path); tools.nullableNumber(item, "discount", path); tools.nullableNumber(item, "daysToExpire", path); }
function validateShippingMethod(item, path, tools) { tools.requiredString(item, "id", path); tools.requiredString(item, "name", path); tools.nullableString(item, "description", path); tools.nullableNumber(item, "minDays", path); tools.nullableNumber(item, "maxDays", path); tools.nullableNumber(item, "price", path); tools.nullableBoolean(item, "enabled", path); }
function validateBanner(item, path, tools) { tools.requiredString(item, "id", path); tools.requiredString(item, "title", path); ["subtitle", "image", "imageMobile", "link", "buttonText"].forEach((key) => tools.nullableString(item, key, path)); tools.nullableNumber(item, "position", path); tools.nullableBoolean(item, "active", path); }
function validateMiniBanner(item, path, tools) { tools.requiredString(item, "id", path); tools.requiredString(item, "title", path); ["image", "link"].forEach((key) => tools.nullableString(item, key, path)); tools.nullableBoolean(item, "active", path); }
function validateCategory(item, path, tools) { tools.requiredString(item, "id", path); tools.requiredString(item, "name", path); tools.requiredString(item, "slug", path); ["description", "image", "banner", "parentId"].forEach((key) => tools.nullableString(item, key, path)); tools.nullableNumber(item, "position", path); tools.nullableBoolean(item, "active", path); tools.nullableNumber(item, "productCount", path); tools.requiredArray(item, "subcategories", path).forEach((child, index) => validateCategory({ ...child, subcategories: child?.subcategories || [] }, `${path}.subcategories[${index}]`, tools)); }
function validateProduct(item, path, tools) { ["id", "name", "slug", "categoryId", "categorySlug"].forEach((key) => tools.requiredString(item, key, path)); ["sku", "description", "shortDescription", "thumbnail", "subcategoryId", "brand", "createdAt", "updatedAt"].forEach((key) => tools.nullableString(item, key, path)); ["price", "priceFrom", "stock", "weight"].forEach((key) => tools.nullableNumber(item, key, path)); ["featured", "isNew", "isBestSeller", "active"].forEach((key) => tools.nullableBoolean(item, key, path)); tools.requiredArray(item, "images", path); tools.requiredArray(item, "tags", path); tools.requiredArray(item, "variants", path).forEach((variant, index) => { const variantPath = `${path}.variants[${index}]`; tools.requiredString(variant, "id", variantPath); ["name", "sku"].forEach((key) => tools.nullableString(variant, key, variantPath)); ["price", "stock"].forEach((key) => tools.nullableNumber(variant, key, variantPath)); tools.objectOrNull(variant, "attributes", variantPath); }); tools.objectOrNull(item, "attributes", path); tools.objectOrNull(item, "dimensions", path); tools.objectOrNull(item, "seo", path); }
function validateCoupon(item, path, tools) { ["id", "code", "type"].forEach((key) => tools.requiredString(item, key, path)); ["description", "startDate", "endDate"].forEach((key) => tools.nullableString(item, key, path)); ["value", "minValue", "maxDiscount", "usageLimit", "usageCount", "userLimit"].forEach((key) => tools.nullableNumber(item, key, path)); tools.nullableBoolean(item, "active", path); tools.requiredArray(item, "categories", path); tools.requiredArray(item, "products", path); }
function validatePage(item, path, tools) { ["id", "title", "slug"].forEach((key) => tools.requiredString(item, key, path)); tools.nullableString(item, "content", path); tools.objectOrNull(item, "seo", path); tools.nullableBoolean(item, "active", path); }
function validateOrder(item, path, tools) { ["id", "number", "status"].forEach((key) => tools.requiredString(item, key, path)); ["statusLabel", "createdAt", "updatedAt", "paymentMethod", "paymentMethodLabel", "cancelReason"].forEach((key) => tools.nullableString(item, key, path)); ["subtotal", "shipping", "discount", "total", "installments"].forEach((key) => tools.nullableNumber(item, key, path)); tools.requiredArray(item, "items", path); tools.objectOrNull(item, "shippingAddress", path); tools.objectOrNull(item, "tracking", path); }
