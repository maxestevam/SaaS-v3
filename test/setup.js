import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi });

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
