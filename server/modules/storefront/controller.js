import { Router } from "express";
import { StorefrontError, addFavorite, cancelOrder, changePassword, cleanupExpiredCarts, clearFavorites, createConsumerCheckout, deleteAccount, getCart, getCustomerSession, getProfile, listAddresses, listFavorites, listOrders, loginCustomer, logoutCustomer, mergeFavorites, processConsumerMercadoPagoWebhook, registerCustomer, removeAddress, removeFavorite, requestPasswordReset, resetPassword, saveAddress, setDefaultAddress, syncCart, syncFavorites, updateProfile } from "./service.js";

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
const storeId = (req) => String(req.get("x-store-id") || req.body?.storeId || req.query?.storeId || "");
const token = (req) => String(req.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
const requireCustomer = async (req) => { const session = await getCustomerSession(token(req)); if (storeId(req) && storeId(req) !== session.storeId) throw new StorefrontError(403, "A sessão não pertence a esta loja."); return session; };
const optionalCustomer = async (req) => token(req) ? requireCustomer(req) : null;
const browserId = (req) => String(req.get("x-cart-id") || req.body?.browserId || req.query?.browserId || "");

router.post("/customer/register", route(async (req, res) => res.status(201).json(await registerCustomer({ storeId: storeId(req), input: req.body || {} }))));
router.post("/customer/login", route(async (req, res) => res.json(await loginCustomer({ storeId: storeId(req), input: req.body || {} }))));
router.post("/customer/logout", route(async (req, res) => { await logoutCustomer(token(req)); res.json({ ok: true }); }));
router.post("/customer/forgot-password", route(async (req, res) => res.json(await requestPasswordReset({ storeId: storeId(req), email: req.body?.email }))));
router.post("/customer/reset-password", route(async (req, res) => res.json(await resetPassword({ token: req.body?.token, password: req.body?.password }))));

router.get("/customer/profile", route(async (req, res) => res.json({ user: await getProfile(await requireCustomer(req)) })));
router.put("/customer/profile", route(async (req, res) => res.json({ user: await updateProfile({ session: await requireCustomer(req), input: req.body || {} }) })));
router.post("/customer/change-password", route(async (req, res) => res.json(await changePassword({ session: await requireCustomer(req), input: req.body || {} }))));
router.delete("/customer/account", route(async (req, res) => { await deleteAccount({ session: await requireCustomer(req), password: req.body?.password }); res.json({ ok: true }); }));

router.get("/customer/addresses", route(async (req, res) => res.json({ addresses: await listAddresses(await requireCustomer(req)) })));
router.post("/customer/addresses", route(async (req, res) => res.status(201).json(await saveAddress({ session: await requireCustomer(req), input: req.body || {} }))));
router.put("/customer/addresses/:addressId", route(async (req, res) => res.json(await saveAddress({ session: await requireCustomer(req), addressId: req.params.addressId, input: req.body || {} }))));
router.post("/customer/addresses/:addressId/set-default", route(async (req, res) => res.json(await setDefaultAddress({ session: await requireCustomer(req), addressId: req.params.addressId }))));
router.delete("/customer/addresses/:addressId", route(async (req, res) => { await removeAddress({ session: await requireCustomer(req), addressId: req.params.addressId }); res.json({ ok: true }); }));

router.get("/customer/favorites", route(async (req, res) => res.json({ favorites: await listFavorites(await requireCustomer(req)) })));
router.post("/customer/favorites", route(async (req, res) => res.json({ favorites: await addFavorite({ session: await requireCustomer(req), productId: req.body?.productId }) })));
router.post("/customer/favorites/merge", route(async (req, res) => res.json({ favorites: await mergeFavorites({ session: await requireCustomer(req), productIds: req.body?.productIds || [] }) })));
router.post("/customer/favorites/sync", route(async (req, res) => res.json({ favorites: await syncFavorites({ session: await requireCustomer(req), productIds: req.body?.productIds || [] }) })));
router.delete("/customer/favorites/:productId", route(async (req, res) => res.json({ favorites: await removeFavorite({ session: await requireCustomer(req), productId: req.params.productId }) })));
router.delete("/customer/favorites", route(async (req, res) => { await clearFavorites(await requireCustomer(req)); res.json({ ok: true }); }));

router.get("/customer/cart", route(async (req, res) => { const session = await optionalCustomer(req); res.json(await getCart({ storeId: storeId(req), session, browserId: browserId(req) })); }));
router.post("/customer/cart/sync", route(async (req, res) => { const session = await optionalCustomer(req); res.json(await syncCart({ storeId: storeId(req), session, browserId: browserId(req), items: req.body?.items || [] })); }));

router.get("/customer/orders", route(async (req, res) => res.json({ orders: await listOrders(await requireCustomer(req)) })));
router.post("/customer/orders/checkout", route(async (req, res) => res.status(201).json(await createConsumerCheckout({ session: await requireCustomer(req), input: req.body || {} }))));
router.post("/customer/orders/:orderId/cancel", route(async (req, res) => res.json(await cancelOrder({ session: await requireCustomer(req), orderId: req.params.orderId }))));

router.post("/consumer/mercado-pago/webhook", route(async (req, res) => { const paymentId = String(req.query?.["data.id"] || req.body?.data?.id || ""); if (!/^\d{1,32}$/.test(paymentId)) return res.status(200).json({ ignored: true }); await processConsumerMercadoPagoWebhook({ signature: req.get("x-signature"), requestId: req.get("x-request-id"), paymentId, storeId: String(req.query?.store_id || "") }); res.status(200).json({ ok: true }); }));

router.use((error, _req, res, next) => error instanceof StorefrontError ? res.status(error.status).json({ error: error.message }) : next(error));
export default router;
