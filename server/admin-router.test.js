import express from "express";
import { createServer } from "node:http";
import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminRouter } from "./admin-router.js";

let server;

async function request(path, options = {}, dependencies = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", createAdminRouter({ query: dependencies.query || vi.fn(async () => []), one: dependencies.one || vi.fn(async () => null) }));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message || "Erro interno." }));
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  return fetch(`http://127.0.0.1:${port}${path}`, options);
}

async function adminToken() {
  process.env.JWT_SECRET = "admin-router-test-secret";
  return new SignJWT({ role: "super_admin" }).setProtectedHeader({ alg: "HS256" }).setSubject("admin-1").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  server = undefined;
});

describe("admin router", () => {
  it("protege a consulta de sessão sem token administrativo", async () => {
    const response = await request("/api/admin/auth/me");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Autenticação administrativa necessária." });
  });

  it("rejeita login quando as credenciais não correspondem a uma conta", async () => {
    const response = await request("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalido@exemplo.com", password: "senha-invalida" }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "E-mail ou senha inválidos." });
  });

  it("não expõe mais endpoints administrativos de suporte", async () => {
    const response = await request("/api/admin/support/sessions", { headers: { Authorization: `Bearer ${await adminToken()}` } });
    expect(response.status).toBe(404);
  });
});
