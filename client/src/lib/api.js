/** Loja Descomplicada: fronteira de dados persistente e simples para o aplicativo. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
import { apiErrorFromResponse, apiUnavailableError } from "@/lib/api-error";

async function request(path, options = {}) {
  const { publicRequest = false, ...requestOptions } = options;
  const token = publicRequest ? null : localStorage.getItem("ld_token");
  const isFormData = typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
  const isBinary = typeof Blob !== "undefined" && requestOptions.body instanceof Blob;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: {
        ...(isFormData || isBinary ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestOptions.headers || {}),
      },
    });
  } catch (error) {
    throw apiUnavailableError(path, error);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw apiErrorFromResponse(response, body, path);
  return body;
}

export const api = {
  register: (data) => request("/v1/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/v1/auth/login", { method: "POST", body: JSON.stringify(data) }),
  googleAuthStatus: () => request("/v1/auth/google/status"),
  forgotPassword: (data) => request("/v1/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }),
  resetPassword: (data) => request("/v1/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
  createStore: (data) => request("/v1/stores", { method: "POST", body: JSON.stringify(data) }),
  updateStore: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteStore: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}`, { method: "DELETE", body: "{}" }),
  requestStoreDeletion: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/deletion-requests`, { method: "POST", body: JSON.stringify(data) }),
  uploadStoreLogo: (storeId, file) => { const body = new FormData(); body.append("file", file); return request(`/v1/stores/${encodeURIComponent(storeId)}/logo`, { method: "POST", body }); },
  deleteStoreLogo: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/logo`, { method: "DELETE", body: "{}" }),
  getStores: () => request("/v1/stores"),
  lookupBrazilianAddress: (cep, options = {}) => request(`/v1/public/address/cep/${encodeURIComponent(cep)}`, { ...options, publicRequest: true }),
  getPublicStoreContract: (slug) => request(`/v1/public/stores/${encodeURIComponent(slug)}/contract`, { publicRequest: true }),
  previewPublicCommercial: (slug, data) => request(`/v1/public/stores/${encodeURIComponent(slug)}/commercial-preview`, { publicRequest: true, method: "POST", body: JSON.stringify(data) }),
  getStoreContract: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/contract`),
  getPlans: () => request("/v1/plans"),
  getAccount: () => request("/v1/account"),
  updateAccount: (data) => request("/v1/account", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (data) => request("/v1/account/change-password", { method: "POST", body: JSON.stringify(data) }),
  deleteAccount: (data) => request("/v1/account", { method: "DELETE", body: JSON.stringify(data) }),
  startCheckout: (data) => request("/v1/billing/start-checkout", { method: "POST", body: JSON.stringify(data) }),
  startTrial: (data) => request("/v1/billing/start-trial", { method: "POST", body: JSON.stringify(data) }),
  getSubscription: (storeId) => request(`/v1/billing/status?storeId=${encodeURIComponent(storeId)}`),
  getSubscriptions: (storeId) => request(`/v1/subscriptions${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""}`),
  changePlan: (subscriptionId, storeId, data) => request(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/change-plan`, { method: "POST", body: JSON.stringify({ ...data, storeId }) }),
  getBillingOrders: (storeId) => request(`/v1/billing/orders${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""}`),
  createPixPayment: (orderId, storeId) => request(`/v1/billing/orders/${encodeURIComponent(orderId)}/pix`, { method: "POST", body: JSON.stringify({ storeId }) }),
  payOrderByCard: (orderId, storeId, data) => request(`/v1/billing/orders/${encodeURIComponent(orderId)}/card`, { method: "POST", body: JSON.stringify({ ...data, storeId }) }),
  getDashboard: () => request("/v1/dashboard"),
  getCategories: (storeId, search = "") => request(`/v1/stores/${encodeURIComponent(storeId)}/categories${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createCategory: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/categories`, { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (storeId, categoryId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/categories/${encodeURIComponent(categoryId)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCategory: (storeId, categoryId, data = {}) => request(`/v1/stores/${encodeURIComponent(storeId)}/categories/${encodeURIComponent(categoryId)}`, { method: "DELETE", body: JSON.stringify(data) }),
  getProducts: (storeId, filters = {}) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => [key, String(value)])); return request(`/v1/stores/${encodeURIComponent(storeId)}/products?${params}`); },
  getProduct: (storeId, productId) => request(`/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`),
  createProduct: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/products`, { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (storeId, productId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProduct: (storeId, productId) => request(`/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`, { method: "DELETE", body: "{}" }),
  deleteProductMedia: (storeId, productId, mediaId) => request(`/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/media/${encodeURIComponent(mediaId)}`, { method: "DELETE", body: "{}" }),
  uploadProductMedia: (storeId, draftId, file) => { const body = new FormData(); body.append("draftId", draftId); body.append("file", file); return request(`/v1/stores/${encodeURIComponent(storeId)}/products/media`, { method: "POST", body }); },
  deleteProductUpload: (storeId, uploadId) => request(`/v1/stores/${encodeURIComponent(storeId)}/products/media/${encodeURIComponent(uploadId)}`, { method: "DELETE", body: "{}" }),
  getCustomers: (storeId, filters = {}) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => [key, String(value)])); return request(`/v1/stores/${encodeURIComponent(storeId)}/customers?${params}`); },
  getCustomer: (storeId, customerId) => request(`/v1/stores/${encodeURIComponent(storeId)}/customers/${encodeURIComponent(customerId)}`),
  createCustomer: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/customers`, { method: "POST", body: JSON.stringify(data) }),
  updateCustomer: (storeId, customerId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/customers/${encodeURIComponent(customerId)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCustomer: (storeId, customerId) => request(`/v1/stores/${encodeURIComponent(storeId)}/customers/${encodeURIComponent(customerId)}`, { method: "DELETE", body: "{}" }),
  createCustomerPurchase: (storeId, customerId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/customers/${encodeURIComponent(customerId)}/purchases`, { method: "POST", body: JSON.stringify(data) }),
  deleteCustomerPurchase: (storeId, customerId, purchaseId) => request(`/v1/stores/${encodeURIComponent(storeId)}/customers/${encodeURIComponent(customerId)}/purchases/${encodeURIComponent(purchaseId)}`, { method: "DELETE", body: "{}" }),
  getStoreOrders: (storeId, filters = {}) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => [key, String(value)])); return request(`/v1/stores/${encodeURIComponent(storeId)}/orders?${params}`); },
  getStoreOrder: (storeId, orderId) => request(`/v1/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}`),
  updateStoreOrderStatus: (storeId, orderId, status) => request(`/v1/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getCoupons: (storeId, filters = {}) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => [key, String(value)])); return request(`/v1/stores/${encodeURIComponent(storeId)}/coupons?${params}`); },
  getCoupon: (storeId, couponId) => request(`/v1/stores/${encodeURIComponent(storeId)}/coupons/${encodeURIComponent(couponId)}`),
  validateCoupon: (storeId, couponId, customerId) => request(`/v1/stores/${encodeURIComponent(storeId)}/coupons/${encodeURIComponent(couponId)}/validate`, { method: "POST", body: JSON.stringify({ customerId }) }),
  createCoupon: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/coupons`, { method: "POST", body: JSON.stringify(data) }),
  updateCoupon: (storeId, couponId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/coupons/${encodeURIComponent(couponId)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCoupon: (storeId, couponId) => request(`/v1/stores/${encodeURIComponent(storeId)}/coupons/${encodeURIComponent(couponId)}`, { method: "DELETE", body: "{}" }),
  getBanners: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners`),
  getBanner: (storeId, bannerId) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}`),
  createBanner: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners`, { method: "POST", body: JSON.stringify(data) }),
  updateBanner: (storeId, bannerId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBanner: (storeId, bannerId) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}`, { method: "DELETE", body: "{}" }),
  uploadBannerImage: (storeId, bannerId, data) => { const body = new FormData(); body.append("file", data.file); body.append("breakpoint", data.breakpoint); body.append("cropX", String(data.cropX ?? 50)); body.append("cropY", String(data.cropY ?? 50)); body.append("cropZoom", String(data.cropZoom ?? 1)); return request(`/v1/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}/media`, { method: "POST", body }); },
  updateBannerImage: (storeId, bannerId, imageId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}/media/${encodeURIComponent(imageId)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBannerImage: (storeId, bannerId, imageId) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}/media/${encodeURIComponent(imageId)}`, { method: "DELETE", body: "{}" }),
  uploadBannerDraftImage: (storeId, draftId, data) => { const body = new FormData(); body.append("draftId", draftId); body.append("file", data.file); body.append("breakpoint", data.breakpoint); body.append("cropX", String(data.cropX ?? 50)); body.append("cropY", String(data.cropY ?? 50)); body.append("cropZoom", String(data.cropZoom ?? 1)); return request(`/v1/stores/${encodeURIComponent(storeId)}/banners/media`, { method: "POST", body }); },
  deleteBannerDraftImage: (storeId, uploadId) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners/media/${encodeURIComponent(uploadId)}`, { method: "DELETE", body: "{}" }),
  attachBannerDraftImages: (storeId, bannerId, draftId, uploadIds) => request(`/v1/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}/media/attach`, { method: "POST", body: JSON.stringify({ draftId, uploadIds }) }),
  getStoreSettings: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/settings`),
  getStorefrontCapabilities: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/storefront-capabilities`),
  beginMercadoPagoConnect: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/mercado-pago/authorize`),
  saveMelhorEnvio: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/melhor-envio`, { method: "PUT", body: JSON.stringify(data) }),
  testMelhorEnvio: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/melhor-envio/test`, { method: "POST", body: "{}" }),
  calculateMelhorEnvio: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/melhor-envio/calculate`, { method: "POST", body: JSON.stringify(data) }),
  saveResend: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/resend`, { method: "PUT", body: JSON.stringify(data) }),
  testResend: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/resend/test`, { method: "POST", body: "{}" }),
  saveSmtp: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/smtp`, { method: "PUT", body: JSON.stringify(data) }),
  testSmtp: (storeId) => request(`/v1/stores/${encodeURIComponent(storeId)}/integrations/smtp/test`, { method: "POST", body: "{}" }),
  saveStoreEmailSettings: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/email-settings`, { method: "PUT", body: JSON.stringify(data) }),
  saveStoreEmailTemplate: (storeId, eventKey, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/email-templates/${encodeURIComponent(eventKey)}`, { method: "PUT", body: JSON.stringify(data) }),
  sendStoreTestEmail: (storeId, data) => request(`/v1/stores/${encodeURIComponent(storeId)}/email/test`, { method: "POST", body: JSON.stringify(data) }),
};
