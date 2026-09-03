import express from "express";
import { createServer } from "node:http";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminRouter } from "./admin-router.js";

const scrypt = promisify(scryptCallback);
let server;

async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${Buffer.from(await scrypt(password, salt, 64)).toString("hex")}`;
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  server = undefined;
});

describe("ADMIN_BOOTSTRAP_EMAIL", () => {
  it("concede a sessão inicial de superadministrador somente ao e-mail configurado", async () => {
    const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const password = "senha-administrativa-de-teste";
    const query = vi.fn(async () => []);
    const one = vi.fn()
      .mockResolvedValueOnce({ id: "admin-test", name: "Administrador", email, password_hash: await passwordHash(password) })
      .mockResolvedValueOnce(null);
    const app = express();
    app.use(express.json());
    app.use("/api/admin", createAdminRouter({ query, one }));
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ token: expect.any(String), user: { email, role: "super_admin" } });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ld_admin_roles"), ["admin-test", expect.any(Number), expect.any(Number)]);
  });
});
