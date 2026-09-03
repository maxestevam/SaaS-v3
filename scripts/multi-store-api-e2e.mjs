/** Exercita conta e lojas persistidas sem iniciar pagamentos Mercado Pago. */
import mysql from "mysql2/promise";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const email = `api-${Date.now()}@loja-descomplicada.invalid`;
const password = "LojaDescomplicada!2026";
const newPassword = "LojaDescomplicada!2027";
let accountDeleted = false;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

try {
  const registration = await request("/v1/auth/register", { method: "POST", body: JSON.stringify({ name: "Conta de validação", email, password }) });
  let token = registration.token;
  const session = () => ({ Authorization: `Bearer ${token}` });
  const catalog = await request("/v1/plans", { headers: session() });
  const essential = catalog.plans.find((plan) => plan.id === "essencial");
  const grow = catalog.plans.find((plan) => plan.id === "crescer");
  if (essential?.amountCents !== 50 || grow?.amountCents !== 60) throw new Error("O catálogo persistido não retornou os preços R$ 0,50 e R$ 0,60.");
  const created = await request("/v1/stores", { method: "POST", headers: session(), body: JSON.stringify({ name: "Minha Loja API", slug: "minha-loja-api", description: "Validação persistente", color: "#FF32B2", addressMode: "slug" }) });
  if (created.store.slug !== "minha-loja-api" || created.store.status !== 2) throw new Error("A loja não recebeu slug e status de construção.");
  const edited = await request(`/v1/stores/${created.store.id}`, { method: "PATCH", headers: session(), body: JSON.stringify({ name: "Minha Loja Atualizada", slug: "minha-loja-atualizada" }) });
  if (edited.store.slug !== "minha-loja-atualizada") throw new Error("O slug não foi atualizado.");
  const profile = await request("/v1/account", { method: "PATCH", headers: session(), body: JSON.stringify({ name: "Conta Atualizada", email }) });
  token = profile.token;
  await request("/v1/account/change-password", { method: "POST", headers: session(), body: JSON.stringify({ currentPassword: password, newPassword }) });
  const relogin = await request("/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password: newPassword }) });
  token = relogin.token;
  const stores = await request("/v1/stores", { headers: session() });
  if (!stores.stores.some((store) => store.slug === "minha-loja-atualizada")) throw new Error("A listagem não retornou a loja persistida.");
  const checkout = await request("/v1/billing/start-checkout", { method: "POST", headers: session(), body: JSON.stringify({ storeId: created.store.id, planId: "essencial" }) });
  if (!checkout.order?.id || checkout.order.amountCents !== 50 || checkout.order.status !== "pending") throw new Error("A escolha de plano não criou uma ordem interna pendente de R$ 0,50.");
  if (checkout.initPoint || checkout.order.checkoutInitPoint) throw new Error("A contratação transparente retornou indevidamente um link de checkout externo.");
  const repeatedCheckout = await request("/v1/billing/start-checkout", { method: "POST", headers: session(), body: JSON.stringify({ storeId: created.store.id, planId: "essencial" }) });
  if (!repeatedCheckout.reused || repeatedCheckout.order?.id !== checkout.order.id) throw new Error("A contratação transparente criou mais de uma ordem pendente para o mesmo plano.");
  const orders = await request(`/v1/billing/orders?storeId=${encodeURIComponent(created.store.id)}`, { headers: session() });
  if (!orders.orders.some((order) => order.id === checkout.order.id && order.planId === "essencial")) throw new Error("A ordem de assinatura não ficou disponível no gerenciamento financeiro.");
  const dashboard = await request("/v1/dashboard", { headers: session() });
  if (!dashboard.stores.some((store) => store.id === created.store.id)) throw new Error("O painel não retornou a loja persistida após as alterações.");
  console.log("Conta, senha, catálogo, loja, slug, cobrança interna e painel validados pela API persistente.");
} finally {
  if (process.env.DATABASE_URL && !accountDeleted) {
    const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
    await pool.execute("DELETE FROM ld_users WHERE email = ?", [email]);
    await pool.end();
  }
}

process.exit(0);
