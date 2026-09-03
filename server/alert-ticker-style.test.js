import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ticker global de alertas", () => {
  it("usa uma animação de leitura lenta e respeita redução de movimento", () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/index.css"), "utf8");
    expect(css).toContain(".dashboard-alert-ticker { animation: dashboard-alert-ticker 32s linear infinite; }");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
