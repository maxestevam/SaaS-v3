import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
// @ts-expect-error O módulo migrado permanece em JavaScript durante a transição gradual.
import api, { reconcileAllStores } from "./api.js";
// @ts-expect-error O domínio público de consumidor permanece em JavaScript durante a transição gradual.
import { cleanupExpiredCarts } from "./modules/storefront/service.js";
import { sdk } from "./_core/sdk";
import { isAuthorizedCron } from "./schedule-auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const app = express();
const server = createServer(app);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.get("/health", (_req, res) => res.json({ ok: true, service: "saas-multi-loja-novo" }));

async function requireCron(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = await sdk.authenticateRequest(req);
    if (!isAuthorizedCron(actor)) return res.status(403).json({ error: "cron-only" });
    return next();
  } catch {
    return res.status(403).json({ error: "cron-only" });
  }
}

app.post("/api/scheduled/billing-reconciliation/verify", requireCron, (_req, res) => {
  return res.json({ ok: true, verified: "billing-reconciliation" });
});

app.post("/api/scheduled/billing-reconciliation", requireCron, async (req, res) => {
  try {
    const result = await reconcileAllStores();
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("[Billing reconciliation]", error);
    return res.status(500).json({
      error: String(error instanceof Error ? error.message : error),
      timestamp: new Date().toISOString(),
      context: { url: req.originalUrl },
    });
  }
});

app.post("/api/scheduled/storefront-cart-cleanup", requireCron, async (req, res) => {
  try {
    return res.json({ ok: true, ...(await cleanupExpiredCarts()) });
  } catch (error) {
    console.error("[Storefront cart cleanup]", error);
    return res.status(500).json({ error: String(error instanceof Error ? error.message : error), timestamp: new Date().toISOString(), context: { url: req.originalUrl } });
  }
});

app.use("/v1", api);

async function start() {
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.use((_req, res) => res.sendFile(path.join(staticPath, "index.html")));
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.join(projectRoot, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      try {
        const template = await fs.readFile(path.join(projectRoot, "client", "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (error) {
        vite.ssrFixStacktrace(error as Error);
        next(error);
      }
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Loja Descomplicada API]", error);
    if (error && typeof error === "object" && "type" in error && (error as { type?: string }).type === "entity.too.large") return res.status(413).json({ error: "A requisição excede o tamanho máximo permitido." });
    if (error && typeof error === "object" && "type" in error && (error as { type?: string }).type === "entity.parse.failed") return res.status(422).json({ error: "O corpo da requisição deve ser um JSON válido." });
    res.status(500).json({ error: "Não foi possível concluir esta ação agora." });
  });

  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => console.log(`Loja Descomplicada disponível em http://localhost:${port}`));
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
