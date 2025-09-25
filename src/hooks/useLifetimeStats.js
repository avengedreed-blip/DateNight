import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db as firestore } from "../config/firebase.js";
import { loadOffline, saveOffline } from "../utils/offlineStorage.js";
import {
  LIFETIME_STATS_DEFAULTS,
  buildLifetimeSignature,
  ensureLifetimeShape,
  mergeLifetimeStats,
  resolveLifetimeDocTarget,
  subscribeToLifetimeStats,
  writeLifetimeStats,
} from "../firebase/lifetimeStats.js";

const OFFLINE_STORAGE_KEY = "dn_lifetime_offline";
const COUPLE_STORAGE_KEY = "dn_lifetime_couple";
const PROFILE_STORAGE_PREFIX = "dn_lifetime_profile_";

const milestoneBadges = [
  { threshold: 100, key: "rounds", badge: "CENTURY_CLUB" },
  { threshold: 50, key: "triviaCorrect", badge: "TRIVIA_MASTER" },
  { threshold: 10, key: "extremes", badge: "EXTREME_JUNKIE" },
];

const ensureWindow = () => (typeof window !== "undefined" ? window : null);

const ensureId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const determineMode = (mode) => {
  if (typeof mode === "string" && mode.length) {
    return mode;
  }
  return "unknown";
};

const createDefaultLifetime = () => ensureLifetimeShape(LIFETIME_STATS_DEFAULTS);

const readLocalLifetime = (key) => {
  if (!key) {
    return createDefaultLifetime();
  }

  if (key === OFFLINE_STORAGE_KEY) {
    const payload = loadOffline(key, createDefaultLifetime());
    return ensureLifetimeShape(payload);
  }

  const target = ensureWindow();
  if (!target) {
    return createDefaultLifetime();
  }

  try {
    const raw = target.localStorage?.getItem(key);
    if (!raw) {
      return createDefaultLifetime();
    }
    return ensureLifetimeShape(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to read lifetime stats from localStorage", error);
    return createDefaultLifetime();
  }
};

const writeLocalLifetime = (key, stats) => {
  if (!key) {
    return;
  }

  const payload = ensureLifetimeShape(stats);

  if (key === OFFLINE_STORAGE_KEY) {
    saveOffline(key, payload);
    return;
  }

  const target = ensureWindow();
  if (!target) {
    return;
  }

  try {
    target.localStorage?.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist lifetime stats to localStorage", error);
  }
};

const resolveStorageKey = (mode, profileId, playerId, targetId) => {
  if (mode === "offline") {
    return OFFLINE_STORAGE_KEY;
  }
  if (mode === "single-device") {
    return COUPLE_STORAGE_KEY;
  }

  const resolvedId = ensureId(targetId) ?? ensureId(profileId) ?? ensureId(playerId);
  if (!resolvedId) {
    return null;
  }
  return `${PROFILE_STORAGE_PREFIX}${resolvedId}`;
};

const extractNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function useLifetimeStats({ mode, playerId, profileId, db } = {}) {
  const normalizedMode = determineMode(mode);
  const remoteDb = db ?? firestore;
  const remoteTarget = useMemo(
    () => resolveLifetimeDocTarget({ mode: normalizedMode, profileId, playerId }),
    [normalizedMode, profileId, playerId]
  );
  const storageKey = useMemo(
    () => resolveStorageKey(normalizedMode, profileId, playerId, remoteTarget?.id),
    [normalizedMode, profileId, playerId, remoteTarget]
  );
  const [lifetime, setLifetime] = useState(() => ensureLifetimeShape(readLocalLifetime(storageKey)));
  const lifetimeRef = useRef(lifetime);
  const signatureRef = useRef(buildLifetimeSignature(lifetime));
  const remoteLatestSignatureRef = useRef(null);
  const remoteWriteInFlightRef = useRef(null);
  const sessionStreakRef = useRef(0);
  const sessionTriviaStreakRef = useRef(0);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteError, setRemoteError] = useState(null);
  const remoteEnabled = Boolean(remoteDb) && Boolean(remoteTarget);

  useEffect(() => {
    lifetimeRef.current = lifetime;
    signatureRef.current = buildLifetimeSignature(lifetime);
  }, [lifetime]);

  useEffect(() => {
    const next = ensureLifetimeShape(readLocalLifetime(storageKey));
    sessionStreakRef.current = 0;
    sessionTriviaStreakRef.current = 0;
    setLifetime(next);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    writeLocalLifetime(storageKey, lifetime);
  }, [lifetime, storageKey]);

  useEffect(() => {
    if (!remoteEnabled) {
      setRemoteReady(false);
      setRemoteError(null);
      remoteLatestSignatureRef.current = null;
      return undefined;
    }

    let active = true;
    const unsubscribe = subscribeToLifetimeStats(
      remoteDb,
      { ...remoteTarget },
      (remoteStats) => {
        if (!active) {
          return;
        }
        const normalized = ensureLifetimeShape(remoteStats ?? {});
        remoteLatestSignatureRef.current = buildLifetimeSignature(normalized);
        setLifetime((previous) => {
          const merged = mergeLifetimeStats(previous, normalized);
          const previousSignature = buildLifetimeSignature(previous);
          const mergedSignature = buildLifetimeSignature(merged);
          if (previousSignature === mergedSignature) {
            return previous;
          }
          return merged;
        });
        setRemoteReady(true);
        setRemoteError(null);
      },
      (error) => {
        if (!active) {
          return;
        }
        setRemoteError(error);
      }
    );

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [remoteDb, remoteEnabled, remoteTarget]);

  useEffect(() => {
    if (!remoteEnabled || !remoteReady) {
      return undefined;
    }

    const localSignature = signatureRef.current;
    const remoteSignature = remoteLatestSignatureRef.current;

    if (localSignature === remoteSignature || remoteWriteInFlightRef.current) {
      return undefined;
    }

    let cancelled = false;

    const persist = async () => {
      const writingSignature = localSignature;
      const writingLifetime = ensureLifetimeShape(lifetimeRef.current);
      remoteWriteInFlightRef.current = true;

      try {
        await writeLifetimeStats(remoteDb, { ...remoteTarget }, writingLifetime);
        if (!cancelled) {
          if (remoteLatestSignatureRef.current !== writingSignature) {
            remoteLatestSignatureRef.current = writingSignature;
          }
          setRemoteError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setRemoteError(error);
        }
      } finally {
        remoteWriteInFlightRef.current = false;
        if (!cancelled) {
          const currentSignature = signatureRef.current;
          if (currentSignature !== writingSignature) {
            setLifetime((current) => ({ ...current }));
          }
        }
      }
    };

    persist();

    return () => {
      cancelled = true;
    };
  }, [lifetime, remoteDb, remoteEnabled, remoteReady, remoteTarget]);

  const recordLifetimeEvent = useCallback((type, payload = {}) => {
    if (type === "session-reset") {
      sessionStreakRef.current = 0;
      sessionTriviaStreakRef.current = 0;
      return;
    }

    setLifetime((previous) => {
      const base = ensureLifetimeShape(previous);
      const totals = { ...base.totals };
      const badges = new Set(base.badges ?? []);
      let longestStreak = base.longestStreak ?? 0;
      let longestTriviaStreak = base.longestTriviaStreak ?? 0;
      let maxAdrenaline = base.maxAdrenaline ?? 0;

      const updateAdrenaline = (value) => {
        const numeric = extractNumber(value);
        if (numeric === null) {
          return;
        }
        if (numeric > maxAdrenaline) {
          maxAdrenaline = Math.min(100, Math.max(0, Math.round(numeric)));
        }
      };

      switch (type) {
        case "round-start": {
          totals.rounds += 1;
          if (payload.isExtreme || payload.intensity === "extreme") {
            totals.extremes += 1;
          }
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "round-success": {
          sessionStreakRef.current += 1;
          sessionTriviaStreakRef.current = 0;
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "trivia-correct": {
          totals.triviaCorrect += 1;
          sessionStreakRef.current += 1;
          sessionTriviaStreakRef.current += 1;
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "trivia-incorrect": {
          totals.triviaIncorrect += 1;
          sessionStreakRef.current = 0;
          sessionTriviaStreakRef.current = 0;
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "timeout": {
          totals.timeouts += 1;
          sessionStreakRef.current = 0;
          sessionTriviaStreakRef.current = 0;
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "refusal": {
          totals.refusals += 1;
          sessionStreakRef.current = 0;
          sessionTriviaStreakRef.current = 0;
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "extreme": {
          totals.extremes += 1;
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "adrenaline": {
          updateAdrenaline(payload.value ?? payload.adrenaline);
          break;
        }
        case "streak-update": {
          if (extractNumber(payload.currentStreak) !== null) {
            sessionStreakRef.current = Math.max(0, Math.round(Number(payload.currentStreak)));
          }
          if (extractNumber(payload.triviaStreak) !== null) {
            sessionTriviaStreakRef.current = Math.max(
              0,
              Math.round(Number(payload.triviaStreak))
            );
          }
          updateAdrenaline(payload.adrenaline);
          break;
        }
        case "streak-reset": {
          sessionStreakRef.current = 0;
          sessionTriviaStreakRef.current = 0;
          updateAdrenaline(payload.adrenaline);
          break;
        }
        default: {
          updateAdrenaline(payload.adrenaline);
          break;
        }
      }

      longestStreak = Math.max(longestStreak, sessionStreakRef.current);
      longestTriviaStreak = Math.max(longestTriviaStreak, sessionTriviaStreakRef.current);

      for (const rule of milestoneBadges) {
        const value = totals[rule.key] ?? 0;
        if (value >= rule.threshold) {
          badges.add(rule.badge);
        }
      }

      const next = {
        totals,
        longestStreak,
        longestTriviaStreak,
        maxAdrenaline,
        badges: Array.from(badges),
        updatedAt: Date.now(),
      };

      return next;
    });
  }, []);

  const totals = useMemo(() => ({ ...lifetime.totals }), [lifetime.totals]);
  const milestoneBadgesList = useMemo(() => Array.from(new Set(lifetime.badges ?? [])), [
    lifetime.badges,
  ]);

  const source = useMemo(
    () => ({
      storageKey,
      remoteEnabled,
      remoteReady,
      remoteError,
      profileId: remoteTarget?.id ?? ensureId(profileId) ?? null,
      collection: remoteTarget?.collection ?? null,
      mode: normalizedMode,
    }),
    [
      storageKey,
      remoteEnabled,
      remoteReady,
      remoteError,
      remoteTarget,
      normalizedMode,
      profileId,
    ]
  );

  return {
    totals,
    longestStreak: lifetime.longestStreak ?? 0,
    longestTriviaStreak: lifetime.longestTriviaStreak ?? 0,
    maxAdrenaline: lifetime.maxAdrenaline ?? 0,
    milestoneBadges: milestoneBadgesList,
    updatedAt: lifetime.updatedAt ?? 0,
    recordLifetimeEvent,
    source,
  };
}
