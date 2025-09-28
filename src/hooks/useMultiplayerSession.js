import { useCallback, useEffect, useRef, useState } from "react";
import {
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { getGameDocRef } from "../firebase/schema";

const DEFAULT_TIMER = {
  expiresAt: null,
  startedAt: null,
  durationMs: null,
  ownerId: "",
};

const DEFAULT_EXTREME_METER = {
  value: 0,
  isForced: false,
};

const DEFAULT_PARTICLES = {
  preset: "",
  seed: 0,
};

const createDefaultSessionState = () => ({
  timer: { ...DEFAULT_TIMER },
  extremeMeter: { ...DEFAULT_EXTREME_METER },
  particles: { ...DEFAULT_PARTICLES },
});

const toMillis = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value.toMillis === "function") {
    try {
      return value.toMillis();
    } catch (error) {
      console.error("Failed to convert Firestore timestamp", error);
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
  const expiresAt = toMillis(timer.expiresAt);
  const startedAt = toMillis(timer.startedAt);
  const durationMs =
    timer.durationMs != null
      ? timer.durationMs
      : expiresAt != null && startedAt != null
        ? Math.max(expiresAt - startedAt, 0)
        : null;

  return {
    ...DEFAULT_TIMER,
    ...timer,
    expiresAt,
    startedAt,
    durationMs,
    ownerId: timer.ownerId ?? DEFAULT_TIMER.ownerId,
  };
};

const normalizeExtremeMeter = (meter = {}) => ({
  ...DEFAULT_EXTREME_METER,
  value:
    typeof meter.value === "number"
      ? clamp(meter.value, 0, 1)
      : DEFAULT_EXTREME_METER.value,
  isForced: Boolean(meter.isForced),
});

const normalizeParticles = (particles = {}) => ({
  ...DEFAULT_PARTICLES,
  preset: typeof particles.preset === "string" ? particles.preset : "",
  seed:
    typeof particles.seed === "number" && Number.isFinite(particles.seed)
      ? particles.seed
      : DEFAULT_PARTICLES.seed,
});

const timersEqual = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return (
    a.ownerId === b.ownerId &&
    a.startedAt === b.startedAt &&
    a.expiresAt === b.expiresAt &&
    a.durationMs === b.durationMs
  );
};

const meterEqual = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return a.value === b.value && a.isForced === b.isForced;
};

const particlesEqual = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return a.preset === b.preset && a.seed === b.seed;
};

const sanitizeTimerForWrite = (timer) => ({
  ownerId: timer.ownerId ?? "",
  durationMs: timer.durationMs ?? null,
  startedAt:
    timer.startedAt != null ? Timestamp.fromMillis(timer.startedAt) : null,
  expiresAt:
    timer.expiresAt != null ? Timestamp.fromMillis(timer.expiresAt) : null,
  updatedAt: serverTimestamp(),
  updatedBy: timer.updatedBy ?? null,
});

const sanitizeExtremeMeterForWrite = (meter) => ({
  value: meter.value,
  isForced: meter.isForced,
  updatedAt: serverTimestamp(),
  lastUpdatedBy: meter.lastUpdatedBy ?? null,
});

const sanitizeParticlesForWrite = (particles) => ({
  preset: particles.preset,
  seed: particles.seed,
  updatedAt: serverTimestamp(),
  lastUpdatedBy: particles.lastUpdatedBy ?? null,
});

const isFirestoreAvailable = Boolean(db);

const useMultiplayerSession = ({ gameId, playerId } = {}) => {
  const [sessionState, setSessionState] = useState(() => createDefaultSessionState());
  const [isSynced, setIsSynced] = useState(false);
  const [lastError, setLastError] = useState(null);

  const stateRef = useRef(sessionState);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    stateRef.current = sessionState;
  }, [sessionState]);

  const resetState = useCallback(() => {
    const defaults = createDefaultSessionState();
    setSessionState(defaults);
    stateRef.current = defaults;
  }, []);

  useEffect(() => {
    if (!isFirestoreAvailable || !gameId) {
      resetState();
      setIsSynced(false);
      return undefined;
    }

    const gameRef = getGameDocRef(gameId);

    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        const data = snapshot.data() || {};
        setSessionState((prev) => {
          const nextTimer = normalizeTimer(data.timer);
          const nextExtremeMeter = normalizeExtremeMeter(data.extremeMeter);
          const nextParticles = normalizeParticles(data.particles);

          const nextState = {
            ...prev,
            timer: nextTimer,
            extremeMeter: nextExtremeMeter,
            particles: nextParticles,
          };

          stateRef.current = nextState;
          return nextState;
        });
        setIsSynced(true);
        setLastError(null);
      },
      (error) => {
        console.error("Failed to subscribe to multiplayer session", error);
        setLastError(error);
        setIsSynced(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
      setIsSynced(false);
    };
  }, [gameId, resetState]);

  useEffect(() => () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  const writeSection = useCallback(
    async (section, payload) => {
      if (!isFirestoreAvailable || !gameId) {
        return;
      }

      try {
        await setDoc(getGameDocRef(gameId), { [section]: payload }, { merge: true });
        setLastError(null);
      } catch (error) {
        console.error(`Failed to sync ${section} section`, error);
        setLastError(error);
      }
    },
    [gameId]
  );

  const syncTimer = useCallback(
    async ({ durationMs, ownerId, startedAt, expiresAt } = {}) => {
      const previousTimer = stateRef.current.timer;
      const now = Date.now();

      const resolvedOwner = ownerId ?? playerId ?? previousTimer.ownerId ?? "";
      const resolvedStartedAt =
        typeof startedAt === "number"
          ? startedAt
          : previousTimer.startedAt ?? now;
      const resolvedExpiresAt =
        typeof expiresAt === "number"
          ? expiresAt
          : durationMs != null
            ? resolvedStartedAt + Math.max(durationMs, 0)
            : previousTimer.expiresAt;
      const resolvedDuration =
        resolvedExpiresAt != null && resolvedStartedAt != null
          ? Math.max(resolvedExpiresAt - resolvedStartedAt, 0)
          : previousTimer.durationMs;

      const nextTimer = {
        ownerId: resolvedOwner,
        startedAt: resolvedStartedAt ?? null,
        expiresAt: resolvedExpiresAt ?? null,
        durationMs: resolvedDuration ?? null,
      };

      if (timersEqual(previousTimer, nextTimer)) {
        return previousTimer;
      }

      const localTimer = normalizeTimer(nextTimer);
      setSessionState((current) => ({
        ...current,
        timer: localTimer,
      }));
      stateRef.current = {
        ...stateRef.current,
        timer: localTimer,
      };

      await writeSection("timer", sanitizeTimerForWrite({
        ...nextTimer,
        updatedBy: playerId ?? null,
      }));

      return localTimer;
    },
    [playerId, writeSection]
  );

  const clearTimer = useCallback(async () => {
    const clearedTimer = normalizeTimer(DEFAULT_TIMER);
    setSessionState((current) => ({
      ...current,
      timer: clearedTimer,
    }));
    stateRef.current = {
      ...stateRef.current,
      timer: clearedTimer,
    };

    await writeSection("timer", sanitizeTimerForWrite({
      ...DEFAULT_TIMER,
      updatedBy: playerId ?? null,
    }));

    return clearedTimer;
  }, [playerId, writeSection]);

  const syncExtremeMeter = useCallback(
    async ({ value, isForced } = {}) => {
      const previousMeter = stateRef.current.extremeMeter;
      const resolvedValue =
        typeof value === "number" ? clamp(value, 0, 1) : previousMeter.value;
      const resolvedIsForced =
        typeof isForced === "boolean" ? isForced : previousMeter.isForced;

      if (
        meterEqual(previousMeter, {
          value: resolvedValue,
          isForced: resolvedIsForced,
        })
      ) {
        return previousMeter;
      }

      const localMeter = normalizeExtremeMeter({
        value: resolvedValue,
        isForced: resolvedIsForced,
      });

      setSessionState((current) => ({
        ...current,
        extremeMeter: localMeter,
      }));
      stateRef.current = {
        ...stateRef.current,
        extremeMeter: localMeter,
      };

      await writeSection("extremeMeter", sanitizeExtremeMeterForWrite({
        value: resolvedValue,
        isForced: resolvedIsForced,
        lastUpdatedBy: playerId ?? null,
      }));

      return localMeter;
    },
    [playerId, writeSection]
  );

  const syncParticles = useCallback(
    async ({ preset, seed } = {}) => {
      const previousParticles = stateRef.current.particles;
      const resolvedPreset =
        typeof preset === "string" ? preset : previousParticles.preset;
      const resolvedSeed =
        typeof seed === "number" && Number.isFinite(seed)
          ? seed
          : Date.now();

      if (
        particlesEqual(previousParticles, {
          preset: resolvedPreset,
          seed: resolvedSeed,
        })
      ) {
        return previousParticles;
      }

      const localParticles = normalizeParticles({
        preset: resolvedPreset,
        seed: resolvedSeed,
      });

      setSessionState((current) => ({
        ...current,
        particles: localParticles,
      }));
      stateRef.current = {
        ...stateRef.current,
        particles: localParticles,
      };

      await writeSection("particles", sanitizeParticlesForWrite({
        preset: resolvedPreset,
        seed: resolvedSeed,
        lastUpdatedBy: playerId ?? null,
      }));

      return localParticles;
    },
    [playerId, writeSection]
  );

  return {
    timer: sessionState.timer,
    extremeMeter: sessionState.extremeMeter,
    particles: sessionState.particles,
    sessionState,
    isSynced,
    isFirestoreEnabled: isFirestoreAvailable && Boolean(gameId),
    syncTimer,
    clearTimer,
    syncExtremeMeter,
    syncParticles,
    lastError,
  };
};

export default useMultiplayerSession;
