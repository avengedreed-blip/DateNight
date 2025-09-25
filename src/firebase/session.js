import { onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../config/firebase";
import { getGameDocRef } from "./schema";

const STORAGE_PREFIX = "date-night/session-state";

const DEFAULT_TIMER = Object.freeze({
  ownerId: "",
  startedAt: null,
  expiresAt: null,
  durationMs: null,
});

const DEFAULT_EXTREME_METER = Object.freeze({
  value: 0,
  isForced: false,
});

const DEFAULT_PARTICLES = Object.freeze({
  preset: "",
  seed: 0,
});

const DEFAULT_STATUS = "idle";
const DEFAULT_MESSAGE = null;

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn("localStorage is not accessible", error);
    return null;
  }
};

const toMillis = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value.toMillis === "function") {
    try {
      return value.toMillis();
    } catch (error) {
      console.warn("Failed to convert Firestore timestamp", error);
      return null;
    }
  }
  return null;
};

const clamp = (value, min, max) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const normalizeTimer = (timer = {}) => {
  const startedAt = toMillis(timer.startedAt);
  const expiresAt = toMillis(timer.expiresAt);

  let durationMs = null;
  if (timer.durationMs != null && Number.isFinite(timer.durationMs)) {
    durationMs = Math.max(Number(timer.durationMs), 0);
  } else if (startedAt != null && expiresAt != null) {
    durationMs = Math.max(expiresAt - startedAt, 0);
  }

  return {
    ownerId: typeof timer.ownerId === "string" ? timer.ownerId : DEFAULT_TIMER.ownerId,
    startedAt,
    expiresAt,
    durationMs,
  };
};

const normalizeExtremeMeter = (meter = {}) => ({
  value:
    typeof meter.value === "number"
      ? clamp(meter.value, 0, 1)
      : DEFAULT_EXTREME_METER.value,
  isForced: Boolean(meter.isForced),
});

const normalizeParticles = (particles = {}) => ({
  preset: typeof particles.preset === "string" ? particles.preset : DEFAULT_PARTICLES.preset,
  seed:
    typeof particles.seed === "number" && Number.isFinite(particles.seed)
      ? particles.seed
      : DEFAULT_PARTICLES.seed,
});

const cloneDefaultSessionState = () => ({
  timer: { ...DEFAULT_TIMER },
  extremeMeter: { ...DEFAULT_EXTREME_METER },
  particles: { ...DEFAULT_PARTICLES },
  status: DEFAULT_STATUS,
  message: DEFAULT_MESSAGE,
  lastSyncedAt: null,
});

const normalizeSessionState = (rawState = {}) => {
  const timer = normalizeTimer(rawState.timer);
  const extremeMeter = normalizeExtremeMeter(rawState.extremeMeter);
  const particles = normalizeParticles(rawState.particles);
  const status =
    typeof rawState.status === "string" && rawState.status.trim().length > 0
      ? rawState.status.trim()
      : DEFAULT_STATUS;
  const message =
    typeof rawState.message === "string" && rawState.message.trim().length > 0
      ? rawState.message.trim()
      : DEFAULT_MESSAGE;
  const lastSyncedAt = toMillis(rawState.lastSyncedAt);

  return {
    timer,
    extremeMeter,
    particles,
    status,
    message,
    lastSyncedAt,
  };
};

const SAFE_RECONNECTION_STATE = Object.freeze({
  ...cloneDefaultSessionState(),
  status: "reconnecting",
  message: "Connection lost. Attempting to resync…",
});

const getSessionStorageKey = (gameId) => {
  const suffix = typeof gameId === "string" && gameId.trim().length > 0 ? gameId.trim() : "anonymous";
  return `${STORAGE_PREFIX}::${suffix}`;
};

const getPendingStorageKey = (gameId) => `${getSessionStorageKey(gameId)}::pending`;

const serialize = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn("Failed to serialize session state", error);
    return null;
  }
};

const deserialize = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Failed to deserialize session state", error);
    return null;
  }
};

const loadSessionFromStorage = (gameId) => {
  const storage = getStorage();
  if (!storage) {
    return cloneDefaultSessionState();
  }

  const raw = storage.getItem(getSessionStorageKey(gameId));
  if (!raw) {
    return cloneDefaultSessionState();
  }

  const parsed = deserialize(raw);
  if (!parsed) {
    return cloneDefaultSessionState();
  }

  return normalizeSessionState(parsed);
};

const persistSessionToStorage = (gameId, state) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const normalized = normalizeSessionState(state);
  const serialized = serialize(normalized);
  if (!serialized) {
    return;
  }

  try {
    storage.setItem(getSessionStorageKey(gameId), serialized);
  } catch (error) {
    console.warn("Failed to persist session state to localStorage", error);
  }
};

const clearStoredSession = (gameId) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(getSessionStorageKey(gameId));
    storage.removeItem(getPendingStorageKey(gameId));
  } catch (error) {
    console.warn("Failed to clear stored session state", error);
  }
};

const readPendingWrites = (gameId) => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(getPendingStorageKey(gameId));
  if (!raw) {
    return [];
  }

  const parsed = deserialize(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((entry) => entry && typeof entry === "object");
};

const persistPendingWrites = (gameId, queue) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  if (!queue || queue.length === 0) {
    try {
      storage.removeItem(getPendingStorageKey(gameId));
    } catch (error) {
      console.warn("Failed to clear pending session writes", error);
    }
    return;
  }

  const serialized = serialize(queue);
  if (!serialized) {
    return;
  }

  try {
    storage.setItem(getPendingStorageKey(gameId), serialized);
  } catch (error) {
    console.warn("Failed to persist pending session writes", error);
  }
};

const queuePendingSessionWrite = (gameId, payload) => {
  if (!gameId) {
    return;
  }
  const queue = readPendingWrites(gameId);
  queue.push(payload);
  persistPendingWrites(gameId, queue);
};

const flushPendingSessionWrites = async (gameId) => {
  const queue = readPendingWrites(gameId);
  if (queue.length === 0) {
    return { flushed: true, count: 0 };
  }

  if (!db || !gameId) {
    return { flushed: false, count: queue.length };
  }

  const gameRef = getGameDocRef(gameId);
  const remaining = [];

  for (let index = 0; index < queue.length; index += 1) {
    const mutation = queue[index];
    if (!mutation || typeof mutation !== "object") {
      continue;
    }

    const { data, merge = true } = mutation;
    if (!data || typeof data !== "object") {
      continue;
    }

    try {
      await setDoc(gameRef, data, { merge });
    } catch (error) {
      console.error("Failed to flush pending session write", error);
      remaining.push(mutation);
      persistPendingWrites(gameId, remaining.concat(queue.slice(index + 1)));
      return { flushed: false, count: remaining.length + (queue.length - index - 1), error };
    }
  }

  persistPendingWrites(gameId, []);
  return { flushed: true, count: queue.length };
};

const getSafeReconnectionState = ({ lastKnown, reason } = {}) => {
  const base = lastKnown ? normalizeSessionState(lastKnown) : cloneDefaultSessionState();
  return {
    ...base,
    status: "reconnecting",
    message: reason && typeof reason === "string" && reason.trim().length > 0
      ? `Reconnecting… (${reason.trim()})`
      : SAFE_RECONNECTION_STATE.message,
    lastSyncedAt: base.lastSyncedAt ?? Date.now(),
  };
};

const subscribeToSession = (gameId, handlers = {}) => {
  const { onSession, onError, onFallback } = handlers;

  if (!db || !gameId) {
    const fallback = getSafeReconnectionState({
      lastKnown: loadSessionFromStorage(gameId),
      reason: "offline",
    });
    onFallback?.(fallback, null);
    onSession?.(fallback);
    return () => {};
  }

  const gameRef = getGameDocRef(gameId);

  try {
    const unsubscribe = onSnapshot(
      gameRef,
      async (snapshot) => {
        const data = snapshot.data() || {};
        const normalized = normalizeSessionState({
          ...data,
          status: "online",
          message: null,
          lastSyncedAt: Date.now(),
        });

        persistSessionToStorage(gameId, normalized);

        const pendingResult = await flushPendingSessionWrites(gameId);
        if (!pendingResult.flushed && pendingResult.count > 0) {
          const reconnectionState = getSafeReconnectionState({
            lastKnown: normalized,
            reason: "retrying queued updates",
          });
          onFallback?.(reconnectionState, null);
        }

        onSession?.(normalized);
      },
      (error) => {
        console.error("Failed to subscribe to multiplayer session", error);
        const fallback = getSafeReconnectionState({
          lastKnown: loadSessionFromStorage(gameId),
          reason: error?.message,
        });
        onError?.(error);
        onFallback?.(fallback, error);
        onSession?.(fallback);
      }
    );

    return () => {
      unsubscribe();
    };
  } catch (error) {
    console.error("Failed to establish session subscription", error);
    const fallback = getSafeReconnectionState({
      lastKnown: loadSessionFromStorage(gameId),
      reason: error?.message,
    });
    onError?.(error);
    onFallback?.(fallback, error);
    onSession?.(fallback);
    return () => {};
  }
};

const writeSessionSection = async (gameId, section, payload, options = {}) => {
  const { merge = true, localState = null, onError, onQueued } = options;

  if (localState) {
    persistSessionToStorage(gameId, {
      ...localState,
      lastSyncedAt: Date.now(),
      status: "offline",
      message: "Pending sync",
    });
  }

  const mutation = { data: { [section]: payload }, merge };

  if (!db || !gameId) {
    queuePendingSessionWrite(gameId, mutation);
    onQueued?.({ reason: "offline", section, payload });
    return { success: false, queued: true };
  }

  try {
    await setDoc(getGameDocRef(gameId), mutation.data, { merge: mutation.merge });
    if (localState) {
      persistSessionToStorage(gameId, {
        ...localState,
        lastSyncedAt: Date.now(),
        status: "online",
        message: null,
      });
    }
    return { success: true, queued: false };
  } catch (error) {
    console.error(`Failed to write session section "${section}"`, error);
    queuePendingSessionWrite(gameId, mutation);
    onError?.(error);
    onQueued?.({ reason: "error", section, payload, error });
    return { success: false, queued: true, error };
  }
};

export {
  SAFE_RECONNECTION_STATE,
  clearStoredSession,
  cloneDefaultSessionState,
  flushPendingSessionWrites,
  getSafeReconnectionState,
  loadSessionFromStorage,
  normalizeSessionState,
  persistSessionToStorage,
  queuePendingSessionWrite,
  subscribeToSession,
  writeSessionSection,
};
