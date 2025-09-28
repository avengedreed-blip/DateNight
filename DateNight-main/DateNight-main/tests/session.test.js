import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFirestoreModule } from "./utils/firestoreStub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionModulePath = path.resolve(__dirname, "../src/firebase/session.js");
const firebaseConfigPath = path.resolve(__dirname, "../src/config/firebase.js");

const createFakeLocalStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    _dump: () => Object.fromEntries(store.entries()),
  };
};

const setWindowStorage = (storage) => {
  const target = globalThis.window ?? (globalThis.window = {});
  Object.defineProperty(target, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
};

const importSessionModule = async ({ firestoreOptions = {}, dbOverride, storage } = {}) => {
  vi.resetModules();

  const { db: fakeDb, module, state } = createFirestoreModule(firestoreOptions);
  const resolvedDb = dbOverride === undefined ? fakeDb : dbOverride;

  vi.doMock(firebaseConfigPath, () => ({ db: resolvedDb }));
  vi.doMock("firebase/firestore", () => module);

  const localStorage = storage ?? createFakeLocalStorage();
  setWindowStorage(localStorage);

  const sessionModule = await import(sessionModulePath);
  return { sessionModule, state, storage: localStorage, db: resolvedDb };
};

const readStoredState = (storage, keySuffix) => {
  const raw = storage.getItem(`date-night/session-state::${keySuffix}`);
  return raw ? JSON.parse(raw) : null;
};

describe("multiplayer session lifecycle", () => {
  it("creates a local-only game when Firestore is offline", async () => {
    const storage = createFakeLocalStorage();
    const { sessionModule } = await importSessionModule({ dbOverride: null, storage });
    const { createGame } = sessionModule;

    const result = await createGame({ gameId: "offline-game" });

    expect(result.offline).toBe(true);
    expect(result.created).toBe(false);
    expect(result.state.status).toBe("offline");
    expect(result.state.message).toMatch(/multiplayer is unavailable/i);

    const stored = readStoredState(storage, "offline-game");
    expect(stored.status).toBe("offline");
    expect(stored.lifecycle.status).toBe("waiting");
  });

  it("creates and persists a game document when Firestore is available", async () => {
    const { sessionModule, state, storage } = await importSessionModule();
    const { createGame } = sessionModule;

    const result = await createGame({ lifecycleStatus: "waiting" });

    expect(result.offline).toBe(false);
    expect(result.created).toBe(true);
    expect(result.gameId).toBeDefined();

    const stored = readStoredState(storage, result.gameId);
    expect(stored.status).toBe("online");
    expect(state.addDocCalls).toHaveLength(1);
    expect(state.addDocCalls[0].collectionRef.path).toBe("games");
    expect(state.docs.has(`games/${result.gameId}`)).toBe(true);
  });

  it("joins an existing game and clears expired spin locks", async () => {
    const expiredTime = Date.now() - 10_000;
    const { sessionModule, state } = await importSessionModule({
      firestoreOptions: {
        initialDocs: {
          "games/game-123": {
            data: {
              spinLock: { locked: true, ownerId: "p1", expiresAt: expiredTime },
              lifecycle: { status: "waiting" },
            },
          },
        },
      },
    });

    const { joinGame } = sessionModule;
    const result = await joinGame("game-123");

    expect(result.exists).toBe(true);
    expect(result.offline).toBe(false);
    expect(state.setDocCalls.some((call) => call.ref.path === "games/game-123" && call.data.spinLock)).toBe(true);
    const updatedLock = state.setDocCalls.find((call) => call.ref.path === "games/game-123" && call.data.spinLock);
    expect(updatedLock.data.spinLock.locked).toBe(false);
  });

  it("queues reset mutations locally when offline", async () => {
    const storage = createFakeLocalStorage();
    const { sessionModule } = await importSessionModule({ dbOverride: null, storage });
    const { resetGame, persistSessionToStorage } = sessionModule;

    persistSessionToStorage("queued-game", {
      timer: { ownerId: "", startedAt: null, expiresAt: null, durationMs: null },
      extremeMeter: { value: 0.5, isForced: false },
      particles: { preset: "", seed: 0 },
      roundState: { current: 3, updatedAt: Date.now() },
      promptState: { weightsVersion: 1, resetCount: 2, lastResetAt: Date.now() },
      lifecycle: { status: "waiting", createdAt: Date.now(), startedAt: null, endedAt: null, lastResetAt: Date.now(), resetCount: 2 },
      status: "online",
      message: null,
      lastSyncedAt: Date.now(),
    });

    const result = await resetGame("queued-game", { playerId: "player-1" });

    expect(result.offline).toBe(true);
    expect(result.queued).toBe(true);

    const pendingRaw = storage.getItem("date-night/session-state::queued-game::pending");
    expect(pendingRaw).toBeTruthy();
    const pending = JSON.parse(pendingRaw);
    expect(Array.isArray(pending)).toBe(true);
    expect(pending.length).toBeGreaterThan(0);
  });

  it("persists analytics summaries when ending a game online", async () => {
    const analyticsPath = "games/game-end/analytics/event-1";
    const { sessionModule, state } = await importSessionModule({
      firestoreOptions: {
        initialDocs: {
          "games/game-end": { data: { lifecycle: { status: "active" } } },
          [analyticsPath]: {
            data: {
              type: "round",
              outcome: "completed",
              slice: "truth",
              playerId: "p1",
              username: "Casey",
              streak: 2,
            },
          },
          "games/game-end/analytics/event-2": {
            data: {
              type: "refusal",
              reason: "timeout",
              slice: "dare",
              playerId: "p2",
              username: "Morgan",
            },
          },
        },
      },
    });

    const { endGame } = sessionModule;
    const result = await endGame("game-end", { playerId: "host" });

    expect(result.offline).toBe(false);
    const summaryCall = state.setDocCalls.find(
      (call) => call.ref.path === "games/game-end/summary/current"
    );
    expect(summaryCall).toBeDefined();
    expect(summaryCall.data.rounds).toBeDefined();
    expect(summaryCall.data.rounds.completed).toBe(1);
    expect(summaryCall.data.refusals.total).toBe(1);
  });
});

describe("event log handling", () => {
  it("stores pending event log entries when offline and validates inputs", async () => {
    const storage = createFakeLocalStorage();
    const { sessionModule } = await importSessionModule({ dbOverride: null, storage });
    const { appendEventLogEntry } = sessionModule;

    await expect(appendEventLogEntry("game-1", { action: "spin" })).resolves.toMatchObject({ offline: true });

    const storedLogRaw = storage.getItem("date-night/session-state::event-log::game-1");
    expect(storedLogRaw).toBeTruthy();

    await expect(appendEventLogEntry("game-1", { username: "Pat" })).rejects.toThrow(/action is required/i);
  });
});
