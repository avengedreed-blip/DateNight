import { useEffect, useMemo, useRef, useState } from "react";
import { db as firestore } from "../config/firebase.js";
import {
  readLocalAnalyticsEvents,
  subscribeToGamePlayers,
  subscribeToPlayerAnalytics,
  subscribeToSessionAnalytics,
} from "../firebase/stats.js";

const LAST_EVENTS_LIMIT = 20;
const SESSION_STORAGE_KEY = "dn_sessionStats";
const PLAYER_STORAGE_PREFIX = "dn_playerStats_";

const DEFAULT_TOTALS = {
  rounds: 0,
  refusals: 0,
  timeouts: 0,
  triviaCorrect: 0,
  triviaIncorrect: 0,
  extremes: 0,
};

const DEFAULT_PLAYER_SUMMARY = {
  rounds: 0,
  refusals: 0,
  timeouts: 0,
  triviaCorrect: 0,
  triviaIncorrect: 0,
  extremes: 0,
  currentStreak: 0,
  triviaStreak: 0,
  badges: [],
  adrenaline: 50,
  adrenalineHistory: [],
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

const ensureWindow = () => (typeof window !== "undefined" ? window : null);

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clampAdrenaline = (value) => {
  const numeric = Number.isFinite(value) ? value : DEFAULT_PLAYER_SUMMARY.adrenaline;
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 100) {
    return 100;
  }
  return Math.round(numeric);
};

const readLocalJson = (key) => {
  const target = ensureWindow();
  if (!key || !target) {
    return null;
  }

  try {
    const raw = target.localStorage?.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse local storage payload", key, error);
    return null;
  }
};

const normalizePlayerStats = (source) => {
  if (!source || typeof source !== "object") {
    return { ...DEFAULT_PLAYER_SUMMARY };
  }

  const badges = Array.isArray(source.badges)
    ? source.badges.filter((badge) => typeof badge === "string" && badge.trim().length)
    : [];

  return {
    rounds: toNumber(source.rounds, DEFAULT_PLAYER_SUMMARY.rounds),
    refusals: toNumber(source.refusals, DEFAULT_PLAYER_SUMMARY.refusals),
    timeouts: toNumber(source.timeouts, DEFAULT_PLAYER_SUMMARY.timeouts),
    triviaCorrect: toNumber(source.triviaCorrect, DEFAULT_PLAYER_SUMMARY.triviaCorrect),
    triviaIncorrect: toNumber(
      source.triviaIncorrect,
      DEFAULT_PLAYER_SUMMARY.triviaIncorrect
    ),
    extremes: toNumber(source.extremes, DEFAULT_PLAYER_SUMMARY.extremes),
    currentStreak: toNumber(source.currentStreak, DEFAULT_PLAYER_SUMMARY.currentStreak),
    triviaStreak: toNumber(source.triviaStreak, DEFAULT_PLAYER_SUMMARY.triviaStreak),
    badges,
    adrenaline: clampAdrenaline(source.adrenaline),
    adrenalineHistory: Array.isArray(source.adrenalineHistory)
      ? source.adrenalineHistory
      : [],
  };
};

const readLocalSessionStats = () => normalizePlayerStats(readLocalJson(SESSION_STORAGE_KEY));

const readLocalPlayerStats = (playerId) =>
  normalizePlayerStats(readLocalJson(`${PLAYER_STORAGE_PREFIX}${playerId}`));

const ensureHistoryEntry = (summary, value, timestamp) => {
  const target = summary.adrenalineHistory ?? [];
  const entry = { value: clampAdrenaline(value), timestamp };
  if (!target.length || target[target.length - 1].value !== entry.value) {
    target.push(entry);
    while (target.length > 50) {
      target.shift();
    }
  }
  summary.adrenalineHistory = target;
  summary.adrenaline = entry.value;
};

const computePlayerFromEvents = (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    return { ...DEFAULT_PLAYER_SUMMARY, adrenalineHistory: [] };
  }

  const sorted = [...events].sort(
    (a, b) => (a.clientTimestamp ?? a.timestamp) - (b.clientTimestamp ?? b.timestamp)
  );
  const summary = {
    ...DEFAULT_PLAYER_SUMMARY,
    badges: [],
    adrenalineHistory: [],
  };
  ensureHistoryEntry(summary, summary.adrenaline, sorted[0]?.timestamp ?? Date.now());
  const badges = new Set(summary.badges);
  let refusalStreak = 0;

  for (const event of sorted) {
    const payload = event?.payload ?? {};
    const timestamp = event.clientTimestamp ?? event.timestamp ?? Date.now();

    switch (event.type) {
      case "roundStart": {
        summary.rounds += 1;
        if (
          payload.isExtremeRound ||
          payload.intensity === "extreme" ||
          payload.promptIntensity === "extreme"
        ) {
          summary.extremes += 1;
        }
        break;
      }
      case "outcome": {
        const result = payload.result;
        const promptType = payload.promptType;
        if (
          payload.promptIntensity === "extreme" ||
          payload.consequenceIntensity === "extreme"
        ) {
          summary.extremes += 1;
        }
        summary.rounds += 1;
        if (result === "accepted") {
          summary.currentStreak += 1;
          summary.triviaStreak = 0;
          refusalStreak = 0;
          ensureHistoryEntry(summary, summary.adrenaline + 5, timestamp);
        } else if (result === "correct") {
          summary.currentStreak += 1;
          summary.triviaCorrect += promptType === "trivia" ? 1 : 0;
          summary.triviaStreak += promptType === "trivia" ? 1 : 0;
          refusalStreak = 0;
          ensureHistoryEntry(summary, summary.adrenaline + 5, timestamp);
        } else if (result === "incorrect") {
          if (promptType === "trivia") {
            summary.triviaIncorrect += 1;
          }
          summary.currentStreak = 0;
          summary.triviaStreak = 0;
          refusalStreak = 0;
        } else if (result === "timeout") {
          summary.timeouts += 1;
          summary.currentStreak = 0;
          summary.triviaStreak = 0;
          refusalStreak = 0;
          ensureHistoryEntry(summary, summary.adrenaline - 5, timestamp);
        } else if (result === "refused") {
          summary.refusals += 1;
          summary.currentStreak = 0;
          summary.triviaStreak = 0;
          refusalStreak += 1;
        }

        if (result !== "refused") {
          refusalStreak = 0;
        }

        break;
      }
      case "reward": {
        if (typeof payload.badge === "string" && payload.badge.length) {
          badges.add(payload.badge);
        }
        break;
      }
      case "streak": {
        if (payload.action === "reset") {
          summary.currentStreak = 0;
        } else if (payload.action === "increment" && Number.isFinite(payload.streak)) {
          summary.currentStreak = payload.streak;
        }
        break;
      }
      default:
        break;
    }

    for (const level of HOT_STREAK_BADGES) {
      if (summary.currentStreak >= level.threshold) {
        badges.add(level.badge);
      }
    }
    for (const level of TRIVIA_BADGES) {
      if (summary.triviaStreak >= level.threshold) {
        badges.add(level.badge);
      }
    }
    if (refusalStreak >= 3) {
      badges.add("COWARD_PENALTY");
      ensureHistoryEntry(summary, summary.adrenaline - 10, timestamp);
      refusalStreak = 0;
    }
  }

  summary.badges = Array.from(badges);
  return summary;
};

const computeSessionTotals = (events) => {
  const totals = { ...DEFAULT_TOTALS };
  if (!Array.isArray(events)) {
    return totals;
  }

  const seenRounds = new Set();

  for (const event of events) {
    const payload = event?.payload ?? {};
    if (event.type === "roundStart") {
      const key = payload.round ?? event.id;
      if (!seenRounds.has(key)) {
        seenRounds.add(key);
        totals.rounds += 1;
      }
      if (payload.isExtremeRound || payload.intensity === "extreme") {
        totals.extremes += 1;
      }
      continue;
    }

    if (event.type !== "outcome") {
      continue;
    }

    const result = payload.result;
    const promptType = payload.promptType;
    const roundKey = payload.round ?? event.id;
    if (!seenRounds.has(roundKey)) {
      seenRounds.add(roundKey);
      totals.rounds += 1;
    }

    if (result === "refused") {
      totals.refusals += 1;
    } else if (result === "timeout") {
      totals.timeouts += 1;
    } else if (result === "correct" && promptType === "trivia") {
      totals.triviaCorrect += 1;
    } else if (result === "incorrect" && promptType === "trivia") {
      totals.triviaIncorrect += 1;
    }

    if (
      payload.promptIntensity === "extreme" ||
      payload.consequenceIntensity === "extreme" ||
      payload.isExtremeRound
    ) {
      totals.extremes += 1;
    }
  }

  return totals;
};

const mergeEvents = (...lists) => {
  const merged = [];
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const event of list) {
      if (!event || typeof event !== "object") {
        continue;
      }
      merged.push(event);
    }
  }
  return merged
    .slice()
    .sort((a, b) => (b.clientTimestamp ?? b.timestamp ?? 0) - (a.clientTimestamp ?? a.timestamp ?? 0));
};

const determineMode = (mode) => {
  if (typeof mode === "string" && mode.length) {
    return mode;
  }
  return "unknown";
};

export function useStatsDashboard({ gameId, mode, db } = {}) {
  const normalizedMode = determineMode(mode);
  const remoteEnabled =
    Boolean(db ?? firestore) &&
    Boolean(gameId) &&
    normalizedMode !== "offline" &&
    normalizedMode !== "unknown";
  const trackPlayers = normalizedMode === "multiplayer" || normalizedMode === "party";
  const remoteDb = db ?? firestore;
  const sessionKey = gameId || "local-session";

  const [remoteSessionEvents, setRemoteSessionEvents] = useState([]);
  const [remotePlayers, setRemotePlayers] = useState([]);
  const [remotePlayerEvents, setRemotePlayerEvents] = useState({});
  const [localEvents, setLocalEvents] = useState(() => readLocalAnalyticsEvents(sessionKey));
  const pollingRef = useRef(null);

  useEffect(() => {
    setLocalEvents(readLocalAnalyticsEvents(sessionKey));
  }, [sessionKey]);

  useEffect(() => {
    const target = ensureWindow();
    if (!target) {
      return () => {};
    }

    if (pollingRef.current) {
      target.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const poll = () => {
      setLocalEvents(readLocalAnalyticsEvents(sessionKey));
    };
    poll();
    pollingRef.current = target.setInterval(poll, 1500);

    return () => {
      if (pollingRef.current) {
        target.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [sessionKey]);

  useEffect(() => {
    if (!remoteEnabled) {
      setRemoteSessionEvents([]);
      return () => {};
    }

    return subscribeToSessionAnalytics(remoteDb, gameId, (events) => {
      setRemoteSessionEvents(events);
    });
  }, [gameId, remoteDb, remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled || !trackPlayers) {
      setRemotePlayers([]);
      return () => {};
    }

    return subscribeToGamePlayers(remoteDb, gameId, (players) => {
      setRemotePlayers(players);
    });
  }, [gameId, remoteDb, remoteEnabled, trackPlayers]);

  useEffect(() => {
    if (!remoteEnabled || !trackPlayers || remotePlayers.length === 0) {
      setRemotePlayerEvents({});
      return () => {};
    }

    const unsubs = [];
    for (const player of remotePlayers) {
      const unsubscribe = subscribeToPlayerAnalytics(remoteDb, gameId, player.id, (events) => {
        setRemotePlayerEvents((current) => ({
          ...current,
          [player.id]: events,
        }));
      });
      unsubs.push(unsubscribe);
    }

    return () => {
      for (const unsubscribe of unsubs) {
        unsubscribe?.();
      }
    };
  }, [gameId, remoteDb, remoteEnabled, remotePlayers, trackPlayers]);

  const dashboard = useMemo(() => {
    const activeSessionEvents = remoteEnabled ? remoteSessionEvents : localEvents;
    const combinedSessionEvents = Array.isArray(activeSessionEvents)
      ? activeSessionEvents
      : [];

    const sessionTotals = computeSessionTotals(combinedSessionEvents);
    if (sessionTotals.rounds === 0) {
      const localFallback = readLocalSessionStats();
      if (localFallback.rounds > 0) {
        sessionTotals.rounds = localFallback.rounds;
        sessionTotals.refusals = localFallback.refusals;
        sessionTotals.timeouts = localFallback.timeouts;
        sessionTotals.triviaCorrect = localFallback.triviaCorrect;
        sessionTotals.triviaIncorrect = localFallback.triviaIncorrect;
        sessionTotals.extremes = localFallback.extremes;
      }
    }

    const sessionAdrenalineHistory = [];
    for (const event of combinedSessionEvents) {
      if (event.type === "extremeMeter") {
        const payload = event.payload ?? {};
        sessionAdrenalineHistory.push({
          value: clampAdrenaline(payload.value ?? 0),
          delta: toNumber(payload.delta, 0),
          timestamp: event.clientTimestamp ?? event.timestamp ?? Date.now(),
        });
      }
    }

    const rewardEntries = [];
    for (const event of combinedSessionEvents) {
      if (event.type === "reward") {
        rewardEntries.push({
          type: "streakBadge",
          badge: event.payload?.badge ?? "",
          threshold: event.payload?.threshold ?? null,
          playerId: event.payload?.playerId ?? null,
          timestamp: event.clientTimestamp ?? event.timestamp ?? Date.now(),
        });
      }
    }

    const playerSummaries = [];
    if (trackPlayers) {
      if (remoteEnabled && remotePlayers.length) {
        for (const player of remotePlayers) {
          const baseStats = normalizePlayerStats(player.raw?.stats ?? player.raw ?? {});
          const playerEvents = remotePlayerEvents[player.id] ?? [];
          const computedFromEvents = playerEvents.length
            ? computePlayerFromEvents(playerEvents)
            : null;
          const derivedStats =
            baseStats.rounds || baseStats.refusals || baseStats.triviaCorrect
              ? baseStats
              : computedFromEvents ?? baseStats;
          const adrenalineHistory = derivedStats.adrenalineHistory?.length
            ? derivedStats.adrenalineHistory
            : computedFromEvents?.adrenalineHistory?.length
            ? computedFromEvents.adrenalineHistory
            : [];
          playerSummaries.push({
            playerId: player.id,
            displayName: player.displayName,
            currentStreak: derivedStats.currentStreak,
            triviaStreak: derivedStats.triviaStreak,
            badges: derivedStats.badges ?? [],
            adrenaline: {
              current: derivedStats.adrenaline,
              history: adrenalineHistory,
            },
            totals: {
              rounds: derivedStats.rounds,
              refusals: derivedStats.refusals,
              timeouts: derivedStats.timeouts,
              triviaCorrect: derivedStats.triviaCorrect,
              triviaIncorrect: derivedStats.triviaIncorrect,
              extremes: derivedStats.extremes,
            },
            events: playerEvents,
          });
        }
      } else {
        const eventsByPlayer = new Map();
        for (const event of mergeEvents(combinedSessionEvents)) {
          if (!event.playerId) {
            continue;
          }
          if (!eventsByPlayer.has(event.playerId)) {
            eventsByPlayer.set(event.playerId, []);
          }
          eventsByPlayer.get(event.playerId).push(event);
        }

        for (const [playerId, events] of eventsByPlayer.entries()) {
          const baseStats = readLocalPlayerStats(playerId);
          const derivedStats =
            events.length > 0 ? computePlayerFromEvents(events) : baseStats;
          playerSummaries.push({
            playerId,
            displayName: playerId,
            currentStreak: derivedStats.currentStreak,
            triviaStreak: derivedStats.triviaStreak,
            badges: derivedStats.badges ?? baseStats.badges ?? [],
            adrenaline: {
              current: derivedStats.adrenaline ?? baseStats.adrenaline,
              history: derivedStats.adrenalineHistory?.length
                ? derivedStats.adrenalineHistory
                : baseStats.adrenalineHistory ?? [],
            },
            totals: {
              rounds: derivedStats.rounds,
              refusals: derivedStats.refusals,
              timeouts: derivedStats.timeouts,
              triviaCorrect: derivedStats.triviaCorrect,
              triviaIncorrect: derivedStats.triviaIncorrect,
              extremes: derivedStats.extremes,
            },
            events,
          });
        }
      }
    }

    for (const player of playerSummaries) {
      const streakBadges = (player.badges ?? []).filter((badge) =>
        badge.startsWith("HOT_STREAK")
      );
      const triviaBadges = (player.badges ?? []).filter((badge) =>
        badge.startsWith("TRIVIA_ACE")
      );
      if (streakBadges.length) {
        rewardEntries.push({
          type: "streakBadge",
          playerId: player.playerId,
          badges: streakBadges,
        });
      }
      if (triviaBadges.length) {
        rewardEntries.push({
          type: "triviaBadge",
          playerId: player.playerId,
          badges: triviaBadges,
        });
      }
      if ((player.badges ?? []).includes("COWARD_PENALTY")) {
        rewardEntries.push({
          type: "cowardPenalty",
          playerId: player.playerId,
        });
      }
      if (player.adrenaline?.history?.length) {
        rewardEntries.push({
          type: "adrenalineHistory",
          playerId: player.playerId,
          history: player.adrenaline.history,
        });
      }
    }

    if (sessionAdrenalineHistory.length) {
      rewardEntries.push({
        type: "adrenalineHistory",
        scope: "session",
        history: sessionAdrenalineHistory,
      });
    }

    const combinedEvents = mergeEvents(
      combinedSessionEvents,
      ...Object.values(remotePlayerEvents)
    );

    return {
      sessionTotals,
      players: trackPlayers ? playerSummaries : [],
      rewards: rewardEntries,
      lastEvents: combinedEvents.slice(0, LAST_EVENTS_LIMIT),
    };
  }, [
    localEvents,
    remoteEnabled,
    remotePlayerEvents,
    remotePlayers,
    remoteSessionEvents,
    trackPlayers,
  ]);

  return dashboard;
}
