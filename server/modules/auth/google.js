import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, signSession } from "../../auth.js";
import { publicUser } from "../shared/presenters.js";
import { createUser, findUserByEmail } from "./repository.js";

const pendingStates = new Map();
const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleAuthStatus() {
  const enabled = process.env.GOOGLE_AUTH_ENABLED === "true";
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return { enabled: enabled && configured };
}

export function startGoogleAuth(appUrl) {
  if (!googleAuthStatus().enabled) throw Object.assign(new Error("O login com Google não está habilitado."), { status: 404 });
  const state = randomBytes(24).toString("base64url");
  pendingStates.set(state, { appUrl, expiresAt: Date.now() + 10 * 60 * 1000 });
  const redirectUri = `${appUrl.replace(/\/$/, "")}/v1/auth/google/callback`;
  const query = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
  return `${GOOGLE_AUTHORIZE_URL}?${query}`;
}

export async function finishGoogleAuth({ code, state }) {
  const pending = pendingStates.get(state);
  pendingStates.delete(state);
  if (!pending || pending.expiresAt < Date.now()) throw Object.assign(new Error("A solicitação de login expirou. Tente novamente."), { status: 400 });
  const redirectUri = `${pending.appUrl.replace(/\/$/, "")}/v1/auth/google/callback`;
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
  if (!tokenResponse.ok) throw Object.assign(new Error("Não foi possível validar o acesso com Google."), { status: 401 });
  const tokens = await tokenResponse.json();
  const profileResponse = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) throw Object.assign(new Error("Não foi possível obter os dados da conta Google."), { status: 401 });
  const profile = await profileResponse.json();
  if (!profile.email || profile.email_verified === false) throw Object.assign(new Error("A conta Google precisa ter um e-mail verificado."), { status: 422 });
  let user = await findUserByEmail(String(profile.email).trim().toLowerCase());
  if (!user) {
    const timestamp = Date.now();
    user = { id: randomUUID(), name: String(profile.name || profile.email).slice(0, 120), email: String(profile.email).trim().toLowerCase(), passwordHash: await hashPassword(randomBytes(32).toString("base64url")), createdAt: timestamp, updatedAt: timestamp };
    await createUser(user);
  }
  return { token: await signSession(user, process.env.JWT_SECRET), user: publicUser(user), appUrl: pending.appUrl };
}
