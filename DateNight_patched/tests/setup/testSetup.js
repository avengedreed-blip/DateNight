import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.clear();
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});
