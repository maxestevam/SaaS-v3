import { Router } from "express";
import { AuthDomainError, loginAccount, registerAccount, requestPasswordReset, resetPassword } from "./service.js";
import { AuthValidationError, normalizeEmail, parseLogin, parsePasswordReset, parseRegistration } from "./validation.js";
import { finishGoogleAuth, googleAuthStatus, startGoogleAuth } from "./google.js";

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

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
  await requestPasswordReset(normalizeEmail(req.body?.email), `${req.protocol}://${req.get("host")}`);
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

export default router;
