import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dialog } from "./dialog.jsx";

describe("superfície administrativa fullscreen", () => {
  it("ocupa a tela inteira, isola o conteúdo de fundo e fecha pelo controle do modal", async () => {
    const onOpenChange = vi.fn();
    const appRoot = document.createElement("div"); appRoot.id = "root"; document.body.append(appRoot);
    render(<Dialog open onOpenChange={onOpenChange} title="Editar registro"><button type="button">Salvar</button></Dialog>);
    const dialog = screen.getByRole("dialog", { name: "Editar registro" });
    expect(dialog.className).toContain("inset-0");
    expect(dialog.className).toContain("z-[120]");
    expect(dialog.querySelector("section")?.className).toContain("h-[100dvh]");
    expect(appRoot.inert).toBe(true);
    fireEvent.click(screen.getAllByLabelText("Fechar").find((element) => !element.className.includes("absolute")));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    appRoot.remove();
  });
});
