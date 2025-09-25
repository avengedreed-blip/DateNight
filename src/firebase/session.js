import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { getGameDocRef } from "./schema";
import { ANALYTICS_COLLECTION, summarizeAnalyticsEvents } from "../hooks/useAnalytics";

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

const DEFAULT_SPIN_LOCK = Object.freeze({
  locked: false,
  ownerId: null,
  acquiredAt: null,
  expiresAt: null,
});

const DEFAULT_ROUND_STATE = Object.freeze({
  current: 0,
  updatedAt: null,
});

const DEFAULT_PROMPT_STATE = Object.freeze({
  weightsVersion: 0,
  resetCount: 0,
  lastResetAt: null,
});

const DEFAULT_LIFECYCLE_STATE = Object.freeze({
  status: "idle",
  createdAt: null,
  startedAt: null,
  endedAt: null,
  lastResetAt: null,
  resetCount: 0,
});

const DEFAULT_STATUS = "idle";
const DEFAULT_MESSAGE = null;

const PROMPT_STATE_STORAGE_PREFIX = `${STORAGE_PREFIX}::prompt-state-marker`;

const persistAnalyticsSummary = async (gameId) => {
  if (!db) {
    return { success: false, reason: "offline" };
  }

  try {
    const analyticsRef = collection(db, "games", gameId, ANALYTICS_COLLECTION);
    const analyticsSnapshot = await getDocs(analyticsRef);
    const events = analyticsSnapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }));

    const summary = summarizeAnalyticsEvents(events);
    const summaryPayload = {
      ...summary,
      generatedAt: serverTimestamp(),
      version: 1,
      source: "endGame",
    };

    await setDoc(doc(db, "games", gameId, "summary", "current"), summaryPayload, {
      merge: true,
    });

    return { success: true, summary: summaryPayload };
  } catch (error) {
    console.error(`Failed to persist analytics summary for game "${gameId}"`, error);
    return { success: false, error };
  }
};

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

const toNonNegativeInt = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  return fallback;
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

const normalizeRoundState = (roundState = {}) => ({
  current: toNonNegativeInt(roundState.current, DEFAULT_ROUND_STATE.current),
  updatedAt: toMillis(roundState.updatedAt),
});

const normalizePromptState = (promptState = {}) => {
  const weightsVersion =
    coercePromptWeightsVersion(promptState.weightsVersion) ?? DEFAULT_PROMPT_STATE.weightsVersion;

  const resetCount = toNonNegativeInt(promptState.resetCount, DEFAULT_PROMPT_STATE.resetCount);

  return {
    weightsVersion,
    resetCount,
    lastResetAt: toMillis(promptState.lastResetAt),
  };
};

const coercePromptWeightsVersion = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const parsed = Number.parseFloat(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const normalizeLifecycleState = (lifecycle = {}) => {
  const status =
    typeof lifecycle.status === "string" && lifecycle.status.trim().length > 0
      ? lifecycle.status.trim()
      : DEFAULT_LIFECYCLE_STATE.status;

  const resetCount = toNonNegativeInt(lifecycle.resetCount, DEFAULT_LIFECYCLE_STATE.resetCount);

  return {
    status,
    createdAt: toMillis(lifecycle.createdAt),
    startedAt: toMillis(lifecycle.startedAt),
    endedAt: toMillis(lifecycle.endedAt),
    lastResetAt: toMillis(lifecycle.lastResetAt),
    resetCount,
  };
};

const normalizeSpinLock = (spinLock = {}) => ({
  locked: Boolean(spinLock.locked),
  ownerId: typeof spinLock.ownerId === "string" ? spinLock.ownerId : null,
  acquiredAt: toMillis(spinLock.acquiredAt),
  expiresAt: toMillis(spinLock.expiresAt),
});

const isSpinLockExpired = (spinLock) => {
  if (!spinLock?.locked) {
    return false;
  }
  const expiresAt = spinLock.expiresAt;
  if (!expiresAt) {
    return true;
  }
  return expiresAt <= Date.now();
};

const cloneDefaultSessionState = () => ({
  timer: { ...DEFAULT_TIMER },
  extremeMeter: { ...DEFAULT_EXTREME_METER },
  particles: { ...DEFAULT_PARTICLES },
  roundState: { ...DEFAULT_ROUND_STATE },
  promptState: { ...DEFAULT_PROMPT_STATE },
  lifecycle: { ...DEFAULT_LIFECYCLE_STATE },
  status: DEFAULT_STATUS,
  message: DEFAULT_MESSAGE,
  lastSyncedAt: null,
});

const buildDefaultGameDocument = ({
  promptVersion,
  lifecycleStatus,
  timestamp,
} = {}) => {
  const version =
    typeof promptVersion === "number" && Number.isFinite(promptVersion)
      ? promptVersion
      : generatePromptWeightsVersion();
  const resolvedTimestamp = timestamp ?? serverTimestamp();
  const status =
    typeof lifecycleStatus === "string" && lifecycleStatus.trim().length > 0
      ? lifecycleStatus.trim()
      : "waiting";

  return {
    wheelState: {
      currentSlice: "",
      spinSeed: 0,
      lastSpinnerId: "",
    },
    timer: { ...DEFAULT_TIMER },
    extremeMeter: { ...DEFAULT_EXTREME_METER },
    particles: { ...DEFAULT_PARTICLES },
    spinLock: { ...DEFAULT_SPIN_LOCK },
    roundState: {
      current: DEFAULT_ROUND_STATE.current,
      updatedAt: resolvedTimestamp,
    },
    promptState: {
      weightsVersion: version,
      resetCount: DEFAULT_PROMPT_STATE.resetCount,
      lastResetAt: resolvedTimestamp,
    },
    lifecycle: {
      status,
      createdAt: resolvedTimestamp,
      startedAt: null,
      endedAt: null,
      lastResetAt: resolvedTimestamp,
      resetCount: DEFAULT_LIFECYCLE_STATE.resetCount,
    },
    createdAt: resolvedTimestamp,
    updatedAt: resolvedTimestamp,
  };
};

const normalizeSessionState = (rawState = {}) => {
  const timer = normalizeTimer(rawState.timer);
  const extremeMeter = normalizeExtremeMeter(rawState.extremeMeter);
  const particles = normalizeParticles(rawState.particles);
  const roundState = normalizeRoundState(rawState.roundState);
  const promptState = normalizePromptState(rawState.promptState);
  const lifecycle = normalizeLifecycleState(rawState.lifecycle);
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
    roundState,
    promptState,
    lifecycle,
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

const getPromptStateStorageKey = (gameId) => {
  const suffix =
    typeof gameId === "string" && gameId.trim().length > 0 ? gameId.trim() : "anonymous";
  return `${PROMPT_STATE_STORAGE_PREFIX}::${suffix}`;
};

const generatePromptWeightsVersion = () => Date.now() + Math.floor(Math.random() * 1000);

const createLocalGameId = () => `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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

const readPromptStateMarker = (gameId) => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(getPromptStateStorageKey(gameId));
  if (!raw) {
    return null;
  }

  const parsed = deserialize(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return parsed;
};

const persistPromptStateMarker = (gameId, marker) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const serialized = serialize(marker);
  if (!serialized) {
    return;
  }

  try {
    storage.setItem(getPromptStateStorageKey(gameId), serialized);
  } catch (error) {
    console.warn("Failed to persist prompt state marker", error);
  }
};

const clearPromptStateMarker = (gameId) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(getPromptStateStorageKey(gameId));
  } catch (error) {
    console.warn("Failed to clear prompt state marker", error);
  }
};

const getStoredPromptWeightsVersion = (gameId) => {
  const marker = readPromptStateMarker(gameId);
  if (!marker || typeof marker !== "object") {
    return null;
  }
  return coercePromptWeightsVersion(marker.version);
};

const persistPromptWeightsVersion = (gameId, version) => {
  const normalized = coercePromptWeightsVersion(version);
  if (normalized == null) {
    clearPromptStateMarker(gameId);
    return;
  }
  persistPromptStateMarker(gameId, { version: normalized });
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

const createGame = async (options = {}) => {
  const { gameId, lifecycleStatus } = options;
  const promptVersion = generatePromptWeightsVersion();
  const now = Date.now();

  const resolvedLifecycleStatus =
    typeof lifecycleStatus === "string" && lifecycleStatus.trim().length > 0
      ? lifecycleStatus.trim()
      : "waiting";

  const localDefaults = cloneDefaultSessionState();
  const baseState = {
    ...localDefaults,
    timer: { ...DEFAULT_TIMER },
    extremeMeter: { ...DEFAULT_EXTREME_METER },
    particles: { ...DEFAULT_PARTICLES },
    roundState: {
      current: DEFAULT_ROUND_STATE.current,
      updatedAt: now,
    },
    promptState: {
      weightsVersion: promptVersion,
      resetCount: 0,
      lastResetAt: now,
    },
    lifecycle: {
      ...localDefaults.lifecycle,
      status: resolvedLifecycleStatus,
      createdAt: now,
      lastResetAt: now,
      endedAt: null,
      resetCount: 0,
    },
    status: "online",
    message: null,
    lastSyncedAt: now,
  };

  const storeLocalState = (id, state) => {
    persistSessionToStorage(id, state);
    persistPromptWeightsVersion(id, promptVersion);
  };

  const normalizedGameId =
    typeof gameId === "string" && gameId.trim().length > 0 ? gameId.trim() : null;

  if (!db) {
    const fallbackId = normalizedGameId ?? createLocalGameId();
    const offlineState = {
      ...baseState,
      status: "offline",
      message: "Multiplayer is unavailable. Session created locally.",
    };
    storeLocalState(fallbackId, offlineState);
    return {
      gameId: fallbackId,
      state: offlineState,
      promptVersion,
      offline: true,
      created: false,
    };
  }

  const payload = buildDefaultGameDocument({
    promptVersion,
    lifecycleStatus: resolvedLifecycleStatus,
  });

  try {
    let gameRef;

    if (normalizedGameId) {
      gameRef = getGameDocRef(normalizedGameId);
      const snapshot = await getDoc(gameRef);
      if (snapshot.exists()) {
        throw new Error(`Game with id "${normalizedGameId}" already exists`);
      }
      await setDoc(gameRef, payload, { merge: false });
    } else {
      gameRef = await addDoc(collection(db, "games"), payload);
    }

    const resolvedId = gameRef.id;
    const onlineState = {
      ...baseState,
      status: "online",
      message: null,
      lastSyncedAt: now,
    };

    storeLocalState(resolvedId, onlineState);

    return {
      gameId: resolvedId,
      state: onlineState,
      promptVersion,
      offline: false,
      created: true,
    };
  } catch (error) {
    console.error("Failed to create multiplayer game", error);
    const fallbackId = normalizedGameId ?? createLocalGameId();
    const failedState = {
      ...baseState,
      status: "offline",
      message: error?.message ?? "Unable to create game session",
    };
    storeLocalState(fallbackId, failedState);

    return {
      gameId: fallbackId,
      state: failedState,
      promptVersion,
      offline: true,
      created: false,
      error,
    };
  }
};

const joinGame = async (gameId) => {
  if (typeof gameId !== "string" || gameId.trim().length === 0) {
    throw new Error("A valid gameId is required to join a game.");
  }

  const normalizedGameId = gameId.trim();
  const now = Date.now();

  if (!db) {
    const localState = normalizeSessionState({
      ...loadSessionFromStorage(normalizedGameId),
      status: "offline",
      message: "Multiplayer is offline",
      lastSyncedAt: now,
    });

    persistSessionToStorage(normalizedGameId, localState);

    return {
      gameId: normalizedGameId,
      state: localState,
      exists: Boolean(localState),
      offline: true,
    };
  }

  const gameRef = getGameDocRef(normalizedGameId);
  const snapshot = await getDoc(gameRef);

  if (!snapshot.exists()) {
    clearStoredSession(normalizedGameId);
    clearPromptStateMarker(normalizedGameId);
    return {
      gameId: normalizedGameId,
      state: null,
      exists: false,
      offline: false,
    };
  }

  const data = snapshot.data() || {};
  const spinLock = normalizeSpinLock(data.spinLock);

  if (isSpinLockExpired(spinLock)) {
    try {
      await setDoc(
        gameRef,
        { spinLock: { ...DEFAULT_SPIN_LOCK } },
        { merge: true }
      );
    } catch (error) {
      console.warn("Failed to clear expired spin lock", error);
    }
  }

  const normalizedState = normalizeSessionState({
    ...data,
    status: "online",
    message: null,
    lastSyncedAt: now,
  });

  if (!normalizedState.roundState.updatedAt) {
    normalizedState.roundState = {
      ...normalizedState.roundState,
      updatedAt: now,
    };
  }

  if (!normalizedState.promptState.lastResetAt) {
    normalizedState.promptState = {
      ...normalizedState.promptState,
      lastResetAt: now,
    };
  }

  normalizedState.lastSyncedAt = now;
  normalizedState.status = "online";
  normalizedState.message = null;

  persistSessionToStorage(normalizedGameId, normalizedState);

  const remotePromptVersion = coercePromptWeightsVersion(
    data.promptState?.weightsVersion
  );

  if (remotePromptVersion != null) {
    const storedVersion = getStoredPromptWeightsVersion(normalizedGameId);
    if (storedVersion == null || storedVersion !== remotePromptVersion) {
      persistPromptWeightsVersion(normalizedGameId, remotePromptVersion);
    }
  } else {
    clearPromptStateMarker(normalizedGameId);
  }

  return {
    gameId: normalizedGameId,
    state: normalizedState,
    exists: true,
    offline: false,
    promptVersion:
      remotePromptVersion ?? normalizedState.promptState.weightsVersion ?? null,
    snapshot: data,
  };
};

const resetGame = async (gameId, options = {}) => {
  if (typeof gameId !== "string" || gameId.trim().length === 0) {
    throw new Error("A valid gameId is required to reset a game.");
  }

  const normalizedGameId = gameId.trim();
  const promptVersion = generatePromptWeightsVersion();
  const now = Date.now();
  const previousState = loadSessionFromStorage(normalizedGameId);

  const previousLifecycleResets = toNonNegativeInt(
    previousState?.lifecycle?.resetCount,
    0
  );
  const previousPromptResets = toNonNegativeInt(
    previousState?.promptState?.resetCount,
    0
  );

  const nextState = {
    ...cloneDefaultSessionState(),
    ...previousState,
    timer: { ...DEFAULT_TIMER },
    extremeMeter: { ...DEFAULT_EXTREME_METER },
    particles: { ...DEFAULT_PARTICLES },
    roundState: {
      current: DEFAULT_ROUND_STATE.current,
      updatedAt: now,
    },
    promptState: {
      weightsVersion: promptVersion,
      resetCount: previousPromptResets + 1,
      lastResetAt: now,
    },
    lifecycle: {
      ...DEFAULT_LIFECYCLE_STATE,
      ...previousState?.lifecycle,
      status: "waiting",
      createdAt: previousState?.lifecycle?.createdAt ?? now,
      lastResetAt: now,
      endedAt: null,
      resetCount: previousLifecycleResets + 1,
    },
    status: db ? "online" : "offline",
    message: db ? null : "Pending reset sync",
    lastSyncedAt: db ? now : previousState?.lastSyncedAt ?? now,
  };

  persistSessionToStorage(normalizedGameId, nextState);
  persistPromptWeightsVersion(normalizedGameId, promptVersion);

  const resetTimestamp = serverTimestamp();
  const payload = {
    spinLock: { ...DEFAULT_SPIN_LOCK },
    timer: {
      ownerId: DEFAULT_TIMER.ownerId,
      durationMs: DEFAULT_TIMER.durationMs,
      startedAt: null,
      expiresAt: null,
      updatedAt: resetTimestamp,
      updatedBy: options?.playerId ?? null,
    },
    extremeMeter: {
      value: DEFAULT_EXTREME_METER.value,
      isForced: DEFAULT_EXTREME_METER.isForced,
      updatedAt: resetTimestamp,
      lastUpdatedBy: options?.playerId ?? null,
    },
    particles: {
      preset: DEFAULT_PARTICLES.preset,
      seed: DEFAULT_PARTICLES.seed,
      updatedAt: resetTimestamp,
      lastUpdatedBy: options?.playerId ?? null,
    },
    roundState: {
      current: DEFAULT_ROUND_STATE.current,
      updatedAt: resetTimestamp,
    },
    promptState: {
      weightsVersion: promptVersion,
      resetCount: increment(1),
      lastResetAt: resetTimestamp,
    },
    lifecycle: {
      status: "waiting",
      endedAt: null,
      lastResetAt: resetTimestamp,
      resetCount: increment(1),
    },
    updatedAt: resetTimestamp,
  };

  const mutation = { data: payload, merge: true };

  if (!db) {
    queuePendingSessionWrite(normalizedGameId, mutation);
    return {
      gameId: normalizedGameId,
      state: nextState,
      promptVersion,
      queued: true,
      offline: true,
    };
  }

  try {
    await setDoc(getGameDocRef(normalizedGameId), payload, { merge: true });
    return {
      gameId: normalizedGameId,
      state: nextState,
      promptVersion,
      queued: false,
      offline: false,
    };
  } catch (error) {
    console.error("Failed to reset multiplayer game", error);
    queuePendingSessionWrite(normalizedGameId, mutation);
    const offlineState = {
      ...nextState,
      status: "offline",
      message: "Pending reset sync",
    };
    persistSessionToStorage(normalizedGameId, offlineState);

    return {
      gameId: normalizedGameId,
      state: offlineState,
      promptVersion,
      queued: true,
      offline: true,
      error,
    };
  }
};

const endGame = async (gameId, options = {}) => {
  if (typeof gameId !== "string" || gameId.trim().length === 0) {
    throw new Error("A valid gameId is required to end a game.");
  }

  const normalizedGameId = gameId.trim();
  const now = Date.now();
  const previousState = loadSessionFromStorage(normalizedGameId);

  const endedState = {
    ...cloneDefaultSessionState(),
    ...previousState,
    timer: { ...DEFAULT_TIMER },
    extremeMeter: { ...DEFAULT_EXTREME_METER },
    particles: { ...DEFAULT_PARTICLES },
    roundState: {
      current: DEFAULT_ROUND_STATE.current,
      updatedAt: now,
    },
    promptState: {
      weightsVersion: DEFAULT_PROMPT_STATE.weightsVersion,
      resetCount: toNonNegativeInt(previousState?.promptState?.resetCount, 0),
      lastResetAt: previousState?.promptState?.lastResetAt ?? null,
    },
    lifecycle: {
      ...previousState?.lifecycle,
      status: "ended",
      endedAt: now,
    },
    status: db ? "online" : "offline",
    message: db ? "Game ended" : "Pending end sync",
    lastSyncedAt: db ? now : previousState?.lastSyncedAt ?? now,
  };

  persistSessionToStorage(normalizedGameId, endedState);
  clearPromptStateMarker(normalizedGameId);

  const promptVersion = generatePromptWeightsVersion();
  const endedTimestamp = serverTimestamp();

  const payload = {
    spinLock: { ...DEFAULT_SPIN_LOCK },
    timer: {
      ownerId: DEFAULT_TIMER.ownerId,
      durationMs: DEFAULT_TIMER.durationMs,
      startedAt: null,
      expiresAt: null,
      updatedAt: endedTimestamp,
      updatedBy: options?.playerId ?? null,
    },
    extremeMeter: {
      value: DEFAULT_EXTREME_METER.value,
      isForced: DEFAULT_EXTREME_METER.isForced,
      updatedAt: endedTimestamp,
      lastUpdatedBy: options?.playerId ?? null,
    },
    particles: {
      preset: DEFAULT_PARTICLES.preset,
      seed: DEFAULT_PARTICLES.seed,
      updatedAt: endedTimestamp,
      lastUpdatedBy: options?.playerId ?? null,
    },
    roundState: {
      current: DEFAULT_ROUND_STATE.current,
      updatedAt: endedTimestamp,
    },
    promptState: {
      weightsVersion: promptVersion,
      resetCount: increment(1),
      lastResetAt: endedTimestamp,
    },
    lifecycle: {
      status: "ended",
      endedAt: endedTimestamp,
      lastResetAt: endedTimestamp,
      resetCount: increment(1),
    },
    updatedAt: endedTimestamp,
  };

  const mutation = { data: payload, merge: true };

  if (!db) {
    queuePendingSessionWrite(normalizedGameId, mutation);
    return {
      gameId: normalizedGameId,
      state: endedState,
      promptVersion,
      queued: true,
      offline: true,
    };
  }

  try {
    await setDoc(getGameDocRef(normalizedGameId), payload, { merge: true });
    await persistAnalyticsSummary(normalizedGameId);
    return {
      gameId: normalizedGameId,
      state: endedState,
      promptVersion,
      queued: false,
      offline: false,
    };
  } catch (error) {
    console.error("Failed to end multiplayer game", error);
    queuePendingSessionWrite(normalizedGameId, mutation);
    const offlineState = {
      ...endedState,
      status: "offline",
      message: "Pending end sync",
    };
    persistSessionToStorage(normalizedGameId, offlineState);

    return {
      gameId: normalizedGameId,
      state: offlineState,
      promptVersion,
      queued: true,
      offline: true,
      error,
    };
  }
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
  createGame,
  endGame,
  flushPendingSessionWrites,
  getSafeReconnectionState,
  joinGame,
  loadSessionFromStorage,
  normalizeSessionState,
  persistSessionToStorage,
  resetGame,
  queuePendingSessionWrite,
  subscribeToSession,
  writeSessionSection,
};
