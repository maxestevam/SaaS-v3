import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("react-easy-crop", () => ({ default: () => <div data-testid="crop-canvas" /> }));

import { EasyImageCropper } from "./EasyImageCropper.jsx";

describe("recortador de mídia", () => {
  it("ocupa toda a tela em uma camada modal, prende o foco e bloqueia o conteúdo de fundo", async () => {
    const backgroundClick = vi.fn(); const backgroundKey = vi.fn();
    const appRoot = document.createElement("div"); appRoot.id = "root";
    const backgroundButton = document.createElement("button"); backgroundButton.textContent = "Ação de fundo"; backgroundButton.addEventListener("click", backgroundClick); backgroundButton.addEventListener("keydown", backgroundKey); appRoot.append(backgroundButton); document.body.append(appRoot);
    render(<EasyImageCropper open imageSrc="blob:preview" onCancel={vi.fn()} onConfirm={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Recortar imagem" });
    const backdrop = screen.getAllByLabelText("Fechar").find((element) => element.className.includes("absolute"));
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.className).toContain("fixed");
    expect(dialog.className).toContain("inset-0");
    expect(dialog.className).toContain("z-[120]");
    expect(backdrop?.className).toContain("absolute");
    expect(backdrop?.className).toContain("inset-0");
    expect(dialog.querySelector("section")?.className).toContain("h-[100dvh]");
    expect(appRoot.inert).toBe(true);
    fireEvent.click(backgroundButton);
    expect(backgroundClick).not.toHaveBeenCalled();
    fireEvent.keyDown(backgroundButton, { key: "Enter" });
    expect(backgroundKey).not.toHaveBeenCalled();
    backgroundButton.focus();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    appRoot.remove();
  });
});
