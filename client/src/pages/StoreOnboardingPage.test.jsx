import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), api: { createStore: vi.fn() } }));

vi.mock("wouter", () => ({ Link: ({ children, ...props }) => <a {...props}>{children}</a>, useLocation: () => ["/onboarding/store", mocks.navigate] }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/i18n", () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import StoreOnboardingPage from "./StoreOnboardingPage.jsx";

describe("onboarding de loja", () => {
  afterEach(() => cleanup());

  it("mantém cabeçalho e ação fixos como página, sem apresentar camada modal", () => {
    const { container } = render(<StoreOnboardingPage />);
    expect(screen.getByRole("heading", { name: "onboarding.storeTitle", level: 1 })).toBeTruthy();
    expect(container.querySelector("header.sticky.top-0")).toBeTruthy();
    expect(container.querySelector("footer.sticky.bottom-0")).toBeTruthy();
    expect(container.querySelector("main [class*='overflow-y-auto']")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
