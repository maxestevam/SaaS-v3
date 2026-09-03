import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Dialog } from "./dialog.jsx";

describe("Dialog em modos modal e página", () => {
  beforeEach(() => { document.getElementById("root")?.remove(); const root = document.createElement("div"); root.id = "root"; document.body.prepend(root); });
  afterEach(() => { cleanup(); document.getElementById("root")?.remove(); });

  it("preserva o diálogo modal e o isolamento do conteúdo para componentes não convertidos", () => {
    render(<Dialog open onOpenChange={vi.fn()} title="Confirmação"><button type="button">Confirmar</button></Dialog>);
    expect(screen.getByRole("dialog", { name: "Confirmação" })).toBeTruthy();
    expect(document.getElementById("root")?.inert).toBe(true);
  });

  it("renderiza o modo de página sem portal, diálogo ou bloqueio do aplicativo", () => {
    render(<Dialog page open onOpenChange={vi.fn()} title="Página"><button type="button">Salvar</button></Dialog>);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Salvar")).toBeTruthy();
    expect(document.getElementById("root")?.inert).not.toBe(true);
  });
});
