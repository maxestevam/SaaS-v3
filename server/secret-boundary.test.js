import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = path.join(projectRoot, "client");
const publicBuildRoot = path.join(projectRoot, "dist", "public");
const privateNames = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_OAUTH_CLIENT_SECRET",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "JWT_SECRET",
  "BUILT_IN_FORGE_API_KEY",
];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(target) : [target];
  }));
  return nested.flat();
}

describe("fronteira de segredos", () => {
  it("não referencia nomes de segredos privados no código cliente", async () => {
    const files = await filesIn(path.join(clientRoot, "src"));
    const source = await Promise.all(files.filter((file) => /\.(js|jsx|ts|tsx)$/.test(file)).map((file) => readFile(file, "utf8")));
    const joined = source.join("\n");
    for (const name of privateNames) expect(joined).not.toContain(name);
  });

  it.skipIf(!existsSync(publicBuildRoot))("não inclui valores privados no HTML ou bundle público", async () => {
    const publicFiles = await filesIn(publicBuildRoot);
    const publicOutput = (await Promise.all(publicFiles.map((file) => readFile(file, "utf8").catch(() => "")))).join("\n");
    for (const name of privateNames) {
      const value = String(process.env[name] || "").trim();
      if (value) expect(publicOutput).not.toContain(value);
    }
  });

  it("mantém URL canônica HTTPS e remetente de e-mail em formato válido", () => {
    const appUrl = String(process.env.APP_URL || "").trim();
    const emailFrom = String(process.env.EMAIL_FROM || "").trim();
    const senderEmail = emailFrom.match(/<([^>]+)>/)?.[1] || emailFrom;

    expect(() => new URL(appUrl)).not.toThrow();
    expect(new URL(appUrl).protocol).toBe("https:");
    expect(senderEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});
