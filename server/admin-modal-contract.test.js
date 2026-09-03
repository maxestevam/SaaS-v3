import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("contrato das páginas administrativas", () => {
  it("direciona produto, cliente, cupom, banner e categoria para superfícies de página", () => {
    const files = [
      "client/src/pages/ProductsPage.jsx",
      "client/src/pages/CustomersPage.jsx",
      "client/src/components/CustomerDetailPanel.jsx",
      "client/src/pages/CouponsPage.jsx",
      "client/src/pages/BannersPage.jsx",
      "client/src/components/CategoryManager.jsx",
    ].map((relative) => fs.readFileSync(path.join(root, relative), "utf8"));
    expect(files[0]).toContain("AdminPagePanel");
    expect(files[1]).toContain("AdminPagePanel");
    expect(files[2]).toContain("page ? content");
    expect(files[3]).toContain("AdminPagePanel");
    expect(files[4]).toContain("AdminPagePanel");
    expect(files[4]).not.toContain("@/components/ui/drawer");
    expect(files[5]).toContain("AdminPagePanel");
    expect(files[5]).not.toContain("@/components/ui/drawer");
  });
});
