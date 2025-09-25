import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db as firestore } from "../config/firebase.js";
import { loadOffline, saveOffline } from "../utils/offlineStorage.js";

const STORAGE_KEY = "dateNightAnalyticsSessions";
const OFFLINE_STORAGE_KEY = "dn_offline_analytics";
const DEFAULT_SESSION = {
  id: "",
  gameId: "",
  createdAt: 0,
  updatedAt: 0,
  events: [],
  streak: {
    current: 0,
    best: 0,
  },
};

const REWARD_LEVELS = [
  { threshold: 5, badge: "Bronze" },
  { threshold: 10, badge: "Silver" },
  { threshold: 20, badge: "Gold" },
];

const ensureWindow = () => (typeof window !== "undefined" ? window : null);

const readStoreFromKey = (storageKey) => {
  if (storageKey === OFFLINE_STORAGE_KEY) {
    return loadOffline(storageKey, { sessions: {} }) ?? { sessions: {} };
  }

  const target = ensureWindow();
  if (!target) {
    return { sessions: {} };
  }

  const raw = target.localStorage?.getItem(storageKey);
  if (!raw) {
    return { sessions: {} };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.sessions) {
      return parsed;
    }
    return { sessions: {} };
  } catch (error) {
    console.warn("Failed to parse analytics store", error);
    return { sessions: {} };
  }
};

const writeStoreToKey = (storageKey, store) => {
  if (storageKey === OFFLINE_STORAGE_KEY) {
    saveOffline(storageKey, store);
    return;
  }

  const target = ensureWindow();
  if (!target) {
    return;
  }

  try {
    target.localStorage?.setItem(storageKey, JSON.stringify(store));
  } catch (error) {
    console.warn("Failed to persist analytics store", error);
  }
};

const createSession = (sessionKey) => {
  const now = Date.now();
  return {
    ...DEFAULT_SESSION,
    id: `${sessionKey}-${now}`,
    gameId: sessionKey,
    createdAt: now,
    updatedAt: now,
    events: [],
    streak: {
      current: 0,
      best: 0,
    },
  };
};

const getSessionFromStore = (store, sessionKey) => {
  if (!store.sessions) {
    store.sessions = {};
  }
  if (!store.sessions[sessionKey]) {
    store.sessions[sessionKey] = createSession(sessionKey);
  }
  return store.sessions[sessionKey];
};

const updateSessionInStore = (store, sessionKey, updater) => {
  const session = getSessionFromStore(store, sessionKey);
  const updated = updater(session);
  store.sessions[sessionKey] = {
    ...updated,
    updatedAt: Date.now(),
  };
  return store.sessions[sessionKey];
};

const toCsvRow = (values) =>
  values
    .map((value) => {
      if (value === null || value === undefined) {
        return "";
      }
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes("\"")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
    .join(",");

export function useAnalytics(gameId, options = {}) {
  const sessionKey = gameId || "local-session";
  const modeOption = typeof options.mode === "string" ? options.mode : null;
  const normalizedMode = modeOption && modeOption.length ? modeOption : "unknown";
  const playerId =
    typeof options.playerId === "string" && options.playerId.length
      ? options.playerId
      : null;
  const remoteDb = options.db ?? firestore;
  const debugEnabled =
    typeof options.debug === "boolean"
      ? options.debug
      : Boolean(options.debugAnalyticsEnabled);
  const storageKey =
    normalizedMode === "offline" ? OFFLINE_STORAGE_KEY : STORAGE_KEY;
  const [session, setSession] = useState(() => {
    const store = readStoreFromKey(storageKey);
    const value = getSessionFromStore(store, sessionKey);
    return { ...value };
  });
  const [pendingReward, setPendingReward] = useState(null);
  const [events, setEvents] = useState(() => session.events ?? []);
  const storeRef = useRef(readStoreFromKey(storageKey));
  const debugRef = useRef(debugEnabled);

  useEffect(() => {
    debugRef.current = debugEnabled;
  }, [debugEnabled]);

  useEffect(() => {
    const store = readStoreFromKey(storageKey);
    storeRef.current = store;
    const nextSession = getSessionFromStore(store, sessionKey);
    setSession({ ...nextSession });
    setPendingReward(null);
    setEvents(nextSession.events ?? []);
  }, [sessionKey, storageKey]);

  useEffect(() => {
    setEvents(session?.events ?? []);
  }, [session]);

  const analyticsCollectionRef = useMemo(() => {
    if (!remoteDb || !gameId || normalizedMode === "offline") {
      return null;
    }

    try {
      if (normalizedMode === "single-device") {
        return collection(remoteDb, "games", gameId, "analytics");
      }

      if (playerId) {
        return collection(remoteDb, "games", gameId, "players", playerId, "analytics");
      }
    } catch (error) {
      console.warn("Failed to resolve analytics collection", error);
    }

    return null;
  }, [gameId, normalizedMode, playerId, remoteDb]);

  const persistSession = useCallback(
    (updater) => {
      setSession((previous) => {
        const store = readStoreFromKey(storageKey);
        storeRef.current = store;
        const nextSession = updateSessionInStore(store, sessionKey, (current) => {
          const base = current ?? createSession(sessionKey);
          return updater(base);
        });
        writeStoreToKey(storageKey, store);
        return { ...nextSession };
      });
    },
    [sessionKey, storageKey]
  );

  const trackEvent = useCallback(
    (type, payload) => {
      const basePayload = { ...(payload ?? {}) };
      basePayload.mode = normalizedMode;

      if (
        normalizedMode !== "single-device" &&
        normalizedMode !== "offline" &&
        playerId
      ) {
        basePayload.playerId = playerId;
      }

      const entry = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        timestamp: Date.now(),
        payload: basePayload,
        data: basePayload,
      };
      if (debugRef.current) {
        console.log(`[Analytics:${normalizedMode}]`, type, entry.payload);
      }
      setEvents((current) => {
        const next = [...current, entry];
        return next.slice(-100);
      });
      persistSession((current) => ({
        ...current,
        events: [...(current.events ?? []), entry].slice(-200),
      }));

      if (analyticsCollectionRef) {
        addDoc(analyticsCollectionRef, {
          type,
          payload: basePayload,
          timestamp: serverTimestamp(),
          clientTimestamp: entry.timestamp,
        }).catch((error) => {
          console.warn("Failed to record analytics event", error);
        });
      }
    },
    [analyticsCollectionRef, normalizedMode, persistSession, playerId]
  );

  const incrementStreak = useCallback(
    (metadata) => {
      let triggeredReward = null;
      let nextValue = 0;
      persistSession((current) => {
        const currentStreak = (current.streak?.current ?? 0) + 1;
        nextValue = currentStreak;
        const best = Math.max(current.streak?.best ?? 0, currentStreak);
        const rewardLevel = REWARD_LEVELS.find(
          (level) => level.threshold === currentStreak
        );
        if (rewardLevel) {
          triggeredReward = {
            ...rewardLevel,
            streak: currentStreak,
            metadata,
          };
        } else if (currentStreak === 30) {
          triggeredReward = {
            badge: "Legendary",
            threshold: currentStreak,
            streak: currentStreak,
            metadata,
          };
        }
        return {
          ...current,
          streak: {
            current: currentStreak,
            best,
          },
        };
      });

      trackEvent("streak", {
        action: "increment",
        streak: nextValue,
        ...metadata,
      });

      if (triggeredReward) {
        setPendingReward(triggeredReward);
        trackEvent("reward", {
          badge: triggeredReward.badge,
          threshold: triggeredReward.threshold,
          streak: triggeredReward.streak,
          ...metadata,
        });
      }
    },
    [persistSession, trackEvent]
  );

  const resetStreak = useCallback(
    (metadata) => {
      persistSession((current) => ({
        ...current,
        streak: {
          current: 0,
          best: current.streak?.best ?? 0,
        },
      }));
      trackEvent("streak", {
        action: "reset",
        streak: 0,
        ...metadata,
      });
    },
    [persistSession, trackEvent]
  );

  const acknowledgeReward = useCallback(() => {
    setPendingReward(null);
  }, []);

  const trackSpin = useCallback(
    (details) => {
      trackEvent("spin", details);
    },
    [trackEvent]
  );

  const trackOutcome = useCallback(
    (details) => {
      trackEvent("outcome", details);
    },
    [trackEvent]
  );

  const trackTimer = useCallback(
    (details) => {
      trackEvent("timer", details);
    },
    [trackEvent]
  );

  const trackExtremeMeter = useCallback(
    (details) => {
      trackEvent("extremeMeter", details);
    },
    [trackEvent]
  );

  const downloadReport = useCallback(() => {
    const target = ensureWindow();
    if (!target) {
      console.warn("Download is not available in this environment");
      return;
    }

    const activeSession = storeRef.current.sessions?.[sessionKey] ?? session;
    const payload = {
      sessionId: activeSession.id,
      gameId: activeSession.gameId,
      createdAt: activeSession.createdAt,
      updatedAt: Date.now(),
      streak: activeSession.streak,
      events: activeSession.events ?? [],
    };

    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonUrl;
    jsonLink.download = `date-night-analytics-${sessionKey}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    const headers = ["id", "timestamp", "type", "details"];
    const rows = [headers.join(",")];
    for (const event of payload.events) {
      rows.push(
        toCsvRow([
          event.id,
          new Date(event.timestamp).toISOString(),
          event.type,
          JSON.stringify(event.payload ?? event.data ?? {}),
        ])
      );
    }
    const csvBlob = new Blob([rows.join("\n")], {
      type: "text/csv",
    });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = `date-night-analytics-${sessionKey}.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);
  }, [session, sessionKey]);

  const streak = session?.streak?.current ?? 0;
  const bestStreak = session?.streak?.best ?? 0;

  return useMemo(
    () => ({
      streak,
      bestStreak,
      pendingReward,
      events,
      incrementStreak,
      resetStreak,
      acknowledgeReward,
      trackEvent,
      trackSpin,
      trackOutcome,
      trackTimer,
      trackExtremeMeter,
      downloadReport,
      mode: normalizedMode,
      playerId,
    }),
    [
      acknowledgeReward,
      bestStreak,
      events,
      downloadReport,
      incrementStreak,
      pendingReward,
      resetStreak,
      streak,
      trackEvent,
      trackExtremeMeter,
      trackOutcome,
      trackSpin,
      trackTimer,
      normalizedMode,
      playerId,
    ]
  );
}
