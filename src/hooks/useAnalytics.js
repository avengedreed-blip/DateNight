import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "dateNightAnalyticsSessions";
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

const readStore = () => {
  const target = ensureWindow();
  if (!target) {
    return { sessions: {} };
  }

  const raw = target.localStorage?.getItem(STORAGE_KEY);
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

const writeStore = (store) => {
  const target = ensureWindow();
  if (!target) {
    return;
  }

  try {
    target.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store));
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

export function useAnalytics(gameId) {
  const sessionKey = gameId || "local-session";
  const [session, setSession] = useState(() => {
    const store = readStore();
    const value = getSessionFromStore(store, sessionKey);
    return { ...value };
  });
  const [pendingReward, setPendingReward] = useState(null);
  const storeRef = useRef(readStore());

  useEffect(() => {
    const store = readStore();
    storeRef.current = store;
    const nextSession = getSessionFromStore(store, sessionKey);
    setSession({ ...nextSession });
    setPendingReward(null);
  }, [sessionKey]);

  const persistSession = useCallback(
    (updater) => {
      setSession((previous) => {
        const store = readStore();
        storeRef.current = store;
        const nextSession = updateSessionInStore(store, sessionKey, (current) => {
          const base = current ?? createSession(sessionKey);
          return updater(base);
        });
        writeStore(store);
        return { ...nextSession };
      });
    },
    [sessionKey]
  );

  const logEvent = useCallback(
    (type, payload) => {
      const entry = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        timestamp: Date.now(),
        data: payload ?? {},
      };
      console.log("[Analytics]", type, entry.data);
      persistSession((current) => ({
        ...current,
        events: [...(current.events ?? []), entry],
      }));
    },
    [persistSession]
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

      logEvent("streak", {
        action: "increment",
        streak: nextValue,
        ...metadata,
      });

      if (triggeredReward) {
        setPendingReward(triggeredReward);
        logEvent("reward", {
          badge: triggeredReward.badge,
          threshold: triggeredReward.threshold,
          streak: triggeredReward.streak,
          ...metadata,
        });
      }
    },
    [logEvent, persistSession]
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
      logEvent("streak", {
        action: "reset",
        streak: 0,
        ...metadata,
      });
    },
    [logEvent, persistSession]
  );

  const acknowledgeReward = useCallback(() => {
    setPendingReward(null);
  }, []);

  const trackSpin = useCallback(
    (details) => {
      logEvent("spin", details);
    },
    [logEvent]
  );

  const trackOutcome = useCallback(
    (details) => {
      logEvent("outcome", details);
    },
    [logEvent]
  );

  const trackTimer = useCallback(
    (details) => {
      logEvent("timer", details);
    },
    [logEvent]
  );

  const trackExtremeMeter = useCallback(
    (details) => {
      logEvent("extremeMeter", details);
    },
    [logEvent]
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
          JSON.stringify(event.data ?? {}),
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
      incrementStreak,
      resetStreak,
      acknowledgeReward,
      trackSpin,
      trackOutcome,
      trackTimer,
      trackExtremeMeter,
      downloadReport,
    }),
    [
      acknowledgeReward,
      bestStreak,
      downloadReport,
      incrementStreak,
      pendingReward,
      resetStreak,
      streak,
      trackExtremeMeter,
      trackOutcome,
      trackSpin,
      trackTimer,
    ]
  );
}
