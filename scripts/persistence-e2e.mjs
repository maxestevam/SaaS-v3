/** Validação de ponta a ponta: cadastro, loja, teste e painel persistidos, com limpeza automática do registro temporário. */
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `e2e-${Date.now()}@lojauno.invalid`;
const password = "FluxoPersistente!2026";
let pool;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registered = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Validação E2E", email, password }) });
  if (!registered.token) throw new Error("O cadastro não retornou uma sessão.");

  const loggedIn = await request("/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!loggedIn.token || loggedIn.user.email !== email) throw new Error("O login não restaurou a sessão persistida.");

  const session = { Authorization: `Bearer ${loggedIn.token}` };
  const storeResult = await request("/v1/stores", { method: "POST", headers: session, body: JSON.stringify({ name: "Loja de validação", description: "Registro temporário de validação", color: "#FF32B2" }) });
  const checkout = await request("/v1/billing/start-checkout", { method: "POST", headers: session, body: JSON.stringify({ storeId: storeResult.store.id, planId: "crescer" }) });
  if (!checkout.order?.id || checkout.order.amountCents !== 60 || checkout.order.status !== "pending") throw new Error("A ordem pendente do checkout transparente não foi criada.");
  if (checkout.initPoint || checkout.order.checkoutInitPoint) throw new Error("O checkout transparente não deve criar link externo antes da escolha de pagamento.");

  const billingReturn = await request(`/v1/billing/status?storeId=${encodeURIComponent(storeResult.store.id)}`, { headers: session });
  if (billingReturn.subscription?.status !== "pending" || billingReturn.subscription.planId !== "crescer") throw new Error("O status de cobrança não encontrou a assinatura pendente persistida.");

  const dashboard = await request("/v1/dashboard", { headers: session });
  const persistedStore = dashboard.stores.find((store) => store.id === storeResult.store.id);
  if (!persistedStore?.subscription || persistedStore.subscription.planId !== "crescer") throw new Error("A loja ou o plano não foram persistidos.");
  console.log("Fluxo persistente validado: cadastro, login, loja, checkout pendente e painel.");
} finally {
  if (process.env.DATABASE_URL) {
    pool = await mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}

process.exit(0);
