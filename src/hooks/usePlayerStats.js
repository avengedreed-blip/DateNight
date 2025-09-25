import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db as firestore } from "../config/firebase.js";
import { loadOffline, saveOffline } from "../utils/offlineStorage.js";
import {
  PLAYER_STATS_DEFAULTS,
  clampPlayerAdrenaline,
  normalizeRemoteStats,
  sanitizePlayerBadges,
  subscribeToPlayerStats,
  writePlayerStats,
} from "../firebase/playerStats.js";

const SESSION_STORAGE_KEY = "dn_sessionStats";
const PLAYER_STORAGE_PREFIX = "dn_playerStats_";
const OFFLINE_STATS_KEY = "dn_offline_stats";

const ensureWindow = () => (typeof window !== "undefined" ? window : null);

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const ensureStatsShape = (source = {}) => {
  const base = { ...PLAYER_STATS_DEFAULTS, ...(source ?? {}) };
  return {
    rounds: toNumber(base.rounds, PLAYER_STATS_DEFAULTS.rounds),
    refusals: toNumber(base.refusals, PLAYER_STATS_DEFAULTS.refusals),
    timeouts: toNumber(base.timeouts, PLAYER_STATS_DEFAULTS.timeouts),
    triviaCorrect: toNumber(base.triviaCorrect, PLAYER_STATS_DEFAULTS.triviaCorrect),
    triviaIncorrect: toNumber(
      base.triviaIncorrect,
      PLAYER_STATS_DEFAULTS.triviaIncorrect
    ),
    extremes: toNumber(base.extremes, PLAYER_STATS_DEFAULTS.extremes),
    currentStreak: toNumber(base.currentStreak, PLAYER_STATS_DEFAULTS.currentStreak),
    triviaStreak: toNumber(base.triviaStreak, PLAYER_STATS_DEFAULTS.triviaStreak),
    adrenaline: clampPlayerAdrenaline(base.adrenaline),
    badges: sanitizePlayerBadges(base.badges),
    updatedAt: toNumber(base.updatedAt, Date.now()),
  };
};

const readLocalStats = (key) => {
  const target = ensureWindow();
  if (!key || !target) {
    return ensureStatsShape();
  }

  if (key === OFFLINE_STATS_KEY) {
    const payload = loadOffline(key, ensureStatsShape());
    return ensureStatsShape(payload);
  }

  try {
    const raw = target.localStorage?.getItem(key);
    if (!raw) {
      return ensureStatsShape();
    }
    const parsed = JSON.parse(raw);
    return ensureStatsShape(parsed);
  } catch (error) {
    console.warn("Failed to read stored stats", error);
    return ensureStatsShape();
  }
};

const writeLocalStats = (key, stats) => {
  const target = ensureWindow();
  if (!key || !target) {
    return;
  }

  if (key === OFFLINE_STATS_KEY) {
    const payload = ensureStatsShape(stats);
    saveOffline(key, payload);
    return;
  }

  try {
    const payload = ensureStatsShape(stats);
    target.localStorage?.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist player stats locally", error);
  }
};

const buildSignature = (stats) => {
  const payload = ensureStatsShape(stats);
  return JSON.stringify({
    rounds: payload.rounds,
    refusals: payload.refusals,
    timeouts: payload.timeouts,
    triviaCorrect: payload.triviaCorrect,
    triviaIncorrect: payload.triviaIncorrect,
    extremes: payload.extremes,
    currentStreak: payload.currentStreak,
    triviaStreak: payload.triviaStreak,
    adrenaline: payload.adrenaline,
    badges: payload.badges,
  });
};

const HOT_STREAK_BADGES = [
  { threshold: 3, badge: "HOT_STREAK_3" },
  { threshold: 5, badge: "HOT_STREAK_5" },
  { threshold: 10, badge: "HOT_STREAK_10" },
];

const TRIVIA_BADGES = [
  { threshold: 3, badge: "TRIVIA_ACE_3" },
  { threshold: 5, badge: "TRIVIA_ACE_5" },
];

const useRecentOutcomes = () => {
  const ref = useRef([]);
  const push = useCallback((kind) => {
    if (!kind) {
      return ref.current;
    }
    const queue = ref.current.slice();
    queue.push({ kind, timestamp: Date.now() });
    while (queue.length > 5) {
      queue.shift();
    }
    ref.current = queue;
    return queue;
  }, []);
  const reset = useCallback(() => {
    ref.current = [];
  }, []);
  const get = useCallback(() => ref.current.slice(), []);
  return { push, reset, get };
};

export function usePlayerStats({ gameId, playerId, mode, db } = {}) {
  const normalizedMode = typeof mode === "string" && mode.length ? mode : "unknown";
  const usingSessionStats = normalizedMode === "single-device" || normalizedMode === "offline";
  const storageKey = normalizedMode === "offline"
    ? OFFLINE_STATS_KEY
    : usingSessionStats
    ? SESSION_STORAGE_KEY
    : playerId
    ? `${PLAYER_STORAGE_PREFIX}${playerId}`
    : null;
  const recentOutcomes = useRecentOutcomes();
  const remoteDb = db ?? firestore;
  const [stats, setStats] = useState(() => ensureStatsShape(readLocalStats(storageKey)));
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteError, setRemoteError] = useState(null);
  const statsRef = useRef(stats);
  const signatureRef = useRef(buildSignature(stats));
  const remoteWriteInFlightRef = useRef(null);
  const remoteLatestSignatureRef = useRef(null);
  const remoteEnabled = Boolean(
    remoteDb &&
      gameId &&
      playerId &&
      normalizedMode !== "single-device" &&
      normalizedMode !== "offline" &&
      normalizedMode !== "unknown"
  );

  useEffect(() => {
    const initial = ensureStatsShape(readLocalStats(storageKey));
    statsRef.current = initial;
    signatureRef.current = buildSignature(initial);
    recentOutcomes.reset();
    setStats(initial);
  }, [storageKey, recentOutcomes]);

  useEffect(() => {
    statsRef.current = stats;
    signatureRef.current = buildSignature(stats);
  }, [stats]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    writeLocalStats(storageKey, stats);
  }, [stats, storageKey]);

  useEffect(() => {
    if (!remoteEnabled) {
      setRemoteReady(false);
      setRemoteError(null);
      return undefined;
    }

    let active = true;
    const unsubscribe = subscribeToPlayerStats(
      remoteDb,
      gameId,
      playerId,
      (remoteStats) => {
        if (!active) {
          return;
        }

        setRemoteReady(true);
        setRemoteError(null);

        if (!remoteStats) {
          return;
        }

        const normalized = ensureStatsShape(normalizeRemoteStats(remoteStats));
        const remoteSignature = buildSignature(normalized);
        remoteLatestSignatureRef.current = remoteSignature;

        setStats((current) => {
          const currentStats = ensureStatsShape(current);
          if (!currentStats.updatedAt || normalized.updatedAt >= currentStats.updatedAt) {
            statsRef.current = { ...normalized };
            signatureRef.current = remoteSignature;
            return normalized;
          }

          return currentStats;
        });
      },
      (error) => {
        if (!active) {
          return;
        }
        console.warn("Failed to subscribe to player stats", error);
        setRemoteError(error);
        setRemoteReady(false);
      }
    );

    return () => {
      active = false;
      setRemoteReady(false);
      remoteLatestSignatureRef.current = null;
      unsubscribe?.();
    };
  }, [gameId, playerId, remoteDb, remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled || !remoteReady) {
      return;
    }

    const localSignature = signatureRef.current;
    const remoteSignature = remoteLatestSignatureRef.current;

    if (localSignature === remoteSignature) {
      return;
    }

    const persist = async () => {
      try {
        const payload = statsRef.current;
        remoteWriteInFlightRef.current = writePlayerStats(remoteDb, gameId, playerId, payload);
        await remoteWriteInFlightRef.current;
        remoteLatestSignatureRef.current = signatureRef.current;
      } catch (error) {
        console.warn("Failed to persist player stats to Firestore", error);
        setRemoteError(error);
      } finally {
        remoteWriteInFlightRef.current = null;
      }
    };

    persist();
  }, [gameId, playerId, remoteDb, remoteEnabled, remoteReady, stats]);

  const recordEvent = useCallback(
    (type, payload = {}) => {
      setStats((previous) => {
        const base = ensureStatsShape(previous);
        const next = { ...base };
        const canEarnBadges = normalizedMode !== "single-device";
        const badges = new Set(next.badges ?? []);
        const addBadge = (badge) => {
          if (!badge || !canEarnBadges) {
            return;
          }
          if (!badges.has(badge)) {
            badges.add(badge);
          }
        };
        const applyOutcome = (kind) => {
          recentOutcomes.push(kind);
        };

        switch (type) {
          case "round-start": {
            next.rounds += 1;
            if (payload.isExtreme) {
              next.extremes += 1;
            }
            break;
          }
          case "round-success": {
            applyOutcome("success");
            next.currentStreak += 1;
            next.triviaStreak = 0;
            next.adrenaline = clampPlayerAdrenaline(next.adrenaline + 5);
            for (const level of HOT_STREAK_BADGES) {
              if (next.currentStreak >= level.threshold) {
                addBadge(level.badge);
              }
            }
            break;
          }
          case "trivia-correct": {
            applyOutcome("success");
            next.triviaCorrect += 1;
            next.currentStreak += 1;
            next.triviaStreak += 1;
            next.adrenaline = clampPlayerAdrenaline(next.adrenaline + 5);
            for (const level of HOT_STREAK_BADGES) {
              if (next.currentStreak >= level.threshold) {
                addBadge(level.badge);
              }
            }
            for (const level of TRIVIA_BADGES) {
              if (next.triviaStreak >= level.threshold) {
                addBadge(level.badge);
              }
            }
            break;
          }
          case "trivia-incorrect": {
            applyOutcome("failure");
            next.triviaIncorrect += 1;
            next.currentStreak = 0;
            next.triviaStreak = 0;
            break;
          }
          case "timeout": {
            applyOutcome("timeout");
            next.timeouts += 1;
            next.currentStreak = 0;
            next.triviaStreak = 0;
            next.adrenaline = clampPlayerAdrenaline(next.adrenaline - 5);
            break;
          }
          case "refusal": {
            applyOutcome("refusal");
            next.refusals += 1;
            next.currentStreak = 0;
            next.triviaStreak = 0;
            break;
          }
          default: {
            return base;
          }
        }

        if (type === "refusal") {
          const recent = recentOutcomes.get();
          const refusalCount = recent.filter((entry) => entry.kind === "refusal").length;
          if (refusalCount >= 3) {
            addBadge("COWARD_PENALTY");
            next.adrenaline = clampPlayerAdrenaline(next.adrenaline - 10);
          }
        }

        next.badges = Array.from(badges);
        next.updatedAt = Date.now();
        statsRef.current = next;
        signatureRef.current = buildSignature(next);
        return next;
      });
    },
    [normalizedMode, recentOutcomes]
  );

  const badges = useMemo(() => {
    if (normalizedMode === "single-device") {
      return [];
    }
    return stats.badges ?? [];
  }, [normalizedMode, stats.badges]);

  return {
    stats,
    badges,
    adrenaline: stats.adrenaline ?? PLAYER_STATS_DEFAULTS.adrenaline,
    recordEvent,
    remoteReady,
    remoteError,
    mode: normalizedMode,
    storageKey,
  };
}
