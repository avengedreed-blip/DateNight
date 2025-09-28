import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptModulePath = path.resolve(__dirname, "../src/hooks/usePromptGenerator.js");
const firebaseConfigPath = path.resolve(__dirname, "../src/firebase/config.js");

const importPromptGenerator = async ({ dbOverride = null, firestoreMocks = {} } = {}) => {
  vi.resetModules();

  const baseMocks = {
    collection: vi.fn(firestoreMocks.collection ?? (() => ({ path: "mock" }))),
    onSnapshot: vi.fn(() => (firestoreMocks.unsubscribe ?? (() => {}))),
  };

  vi.doMock(firebaseConfigPath, () => ({ db: dbOverride }));
  vi.doMock("firebase/firestore", () => baseMocks);

  const module = await import(promptModulePath);
  return { module, firestore: baseMocks };
};

describe("prompt generator weighting", () => {
  it("returns prompts from requested category and intensity", async () => {
    const { module } = await importPromptGenerator();

    const { result } = renderHook(() => module.default({ storageKey: "pg-test" }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const prompt = result.current.getPrompt("truth", "normal");
    expect(prompt).toBeTruthy();
    expect(prompt.category).toBe("truth");
    expect(prompt.intensity).toBe("normal");
  });

  it("selects more intense prompts in late-game phases", async () => {
    const { module } = await importPromptGenerator();

    const randomSpy = vi.spyOn(Math, "random").mockReturnValueOnce(0.95).mockReturnValueOnce(0);

    const { result } = renderHook(() => module.default({ storageKey: "pg-phase" }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.setRoundNumber(20);
    });

    const prompt = result.current.getPrompt("truth");
    expect(prompt.intensity).toBe("extreme");

    randomSpy.mockRestore();
  });

  it("applies cooldown weighting to avoid repeating prompts", async () => {
    const { module } = await importPromptGenerator();

    const randomSpy = vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.2);

    const { result } = renderHook(() => module.default({ storageKey: "pg-cooldown" }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const first = result.current.getPrompt("truth", "normal");
    const second = result.current.getPrompt("truth", "normal");

    expect(second.id).not.toBe(first.id);
    randomSpy.mockRestore();
  });

  it("persists custom prompts locally when added", async () => {
    const { module } = await importPromptGenerator();

    const { result } = renderHook(() => module.default({ storageKey: "pg-custom" }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.addCustomPrompt({
        id: "custom-truth-1",
        category: "truth",
        intensity: "normal",
        text: "What is your go-to dance move?",
      });
    });

    await waitFor(() => expect(result.current.customPrompts.length).toBeGreaterThan(0));

    const storedRaw = window.localStorage.getItem("pg-custom");
    expect(storedRaw).toBeTruthy();
    const stored = JSON.parse(storedRaw);
    expect(stored.some((entry) => entry.id === "custom-truth-1")).toBe(true);
  });
});
