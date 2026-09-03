import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("escopo do lookup administrativo por slug", () => {
  it("mantém o filtro de proprietário na consulta legada", () => {
    const source = fs.readFileSync(path.resolve("server/modules/stores/controller.js"), "utf8");
    expect(source).toContain("WHERE slug = ? AND user_id = ?");
    expect(source).toContain("[normalizeSlug(req.params.slug), req.user.id]");
  });
});
