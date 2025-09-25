import { useCallback, useEffect, useMemo, useRef } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "../config/firebase";
import { addAchievementsToProfile } from "../firebase/profile";

const EVENTS_COLLECTION = "analytics";
const ANALYTICS_COLLECTION = EVENTS_COLLECTION;

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const normalizeString = (value, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const getPlayerKey = (playerId) => {
  const normalized = normalizeString(playerId ?? "");
  return normalized.length > 0 ? normalized : "__anonymous__";
};

const ensurePlayerAggregate = (playersMap, playerId, username) => {
  const key = getPlayerKey(playerId);
  const normalizedName = normalizeString(username, "anonymous");

  if (!playersMap.has(key)) {
    playersMap.set(key, {
      playerId: key === "__anonymous__" ? null : key,
      username: normalizedName,
      roundsPlayed: 0,
      refusals: 0,
      trivia: {
        attempts: 0,
        correct: 0,
      },
      longestStreak: 0,
      badges: new Set(),
    });
  } else {
    const aggregate = playersMap.get(key);
    if (normalizedName && normalizedName !== "anonymous") {
      aggregate.username = normalizedName;
    }
  }

  return playersMap.get(key);
};

const incrementMapValue = (target, key, amount = 1) => {
  if (!key) {
    return;
  }

  const current = typeof target[key] === "number" ? target[key] : 0;
  target[key] = current + amount;
};

const summarizeAnalyticsEvents = (events = []) => {
  const summary = {
    rounds: {
      total: 0,
      completed: 0,
      byOutcome: {},
      bySlice: {},
    },
    trivia: {
      attempts: 0,
      correct: 0,
      incorrect: 0,
      accuracyPercent: 0,
      averageResponseMs: null,
      bestStreak: 0,
    },
    refusals: {
      total: 0,
      byReason: {},
      bySlice: {},
    },
    streaks: {
      longestOverall: 0,
      byPlayer: {},
    },
    badges: {
      total: 0,
      earned: [],
      byPlayer: {},
    },
    players: [],
    totals: {
      events: Array.isArray(events) ? events.length : 0,
    },
    window: {
      startedAt: null,
      endedAt: null,
    },
  };

  if (!Array.isArray(events) || events.length === 0) {
    return summary;
  }

  const badgeSet = new Set();
  const playersMap = new Map();
  let totalResponseMs = 0;
  let responseSamples = 0;
  let earliestEvent = null;
  let latestEvent = null;

  const updateWindow = (createdAt) => {
    if (!createdAt) {
      return;
    }

    let timestamp = null;
    if (isFiniteNumber(createdAt)) {
      timestamp = createdAt;
    } else if (typeof createdAt?.toMillis === "function") {
      try {
        timestamp = createdAt.toMillis();
      } catch (error) {
        timestamp = null;
      }
    } else if (createdAt instanceof Date) {
      timestamp = createdAt.getTime();
    }

    if (!isFiniteNumber(timestamp)) {
      return;
    }

    if (earliestEvent == null || timestamp < earliestEvent) {
      earliestEvent = timestamp;
    }
    if (latestEvent == null || timestamp > latestEvent) {
      latestEvent = timestamp;
    }
  };

  for (const rawEvent of events) {
    const event = rawEvent ?? {};
    const type = normalizeString(event.type);
    updateWindow(event.createdAt);

    const playerAggregate = ensurePlayerAggregate(
      playersMap,
      event.playerId,
      event.username
    );

    switch (type) {
      case "round": {
        summary.rounds.total += 1;
        const outcome = normalizeString(event.outcome, "unknown");
        incrementMapValue(summary.rounds.byOutcome, outcome);
        if (outcome === "completed") {
          summary.rounds.completed += 1;
        }

        const slice = normalizeString(event.slice);
        if (slice) {
          incrementMapValue(summary.rounds.bySlice, slice);
        }

        playerAggregate.roundsPlayed += 1;

        if (isFiniteNumber(event.streak)) {
          const streakValue = Math.max(0, Math.floor(event.streak));
          if (streakValue > summary.streaks.longestOverall) {
            summary.streaks.longestOverall = streakValue;
          }
          if (streakValue > playerAggregate.longestStreak) {
            playerAggregate.longestStreak = streakValue;
          }
        }
        break;
      }

      case "refusal": {
        summary.refusals.total += 1;
        const reason = normalizeString(event.reason, "unknown");
        incrementMapValue(summary.refusals.byReason, reason);

        const slice = normalizeString(event.slice);
        if (slice) {
          incrementMapValue(summary.refusals.bySlice, slice);
        }

        playerAggregate.refusals += 1;
        break;
      }

      case "timeout": {
        if (event.autoRefusal) {
          summary.refusals.total += 1;
          incrementMapValue(summary.refusals.byReason, "timeout");
          const slice = normalizeString(event.slice);
          if (slice) {
            incrementMapValue(summary.refusals.bySlice, slice);
          }
          playerAggregate.refusals += 1;
        }
        break;
      }

      case "triviaAccuracy": {
        summary.trivia.attempts += 1;
        const correct = Boolean(event.correct);
        if (correct) {
          summary.trivia.correct += 1;
        } else {
          summary.trivia.incorrect += 1;
        }

        if (isFiniteNumber(event.streak)) {
          const streakValue = Math.max(0, Math.floor(event.streak));
          if (streakValue > summary.trivia.bestStreak) {
            summary.trivia.bestStreak = streakValue;
          }
          if (streakValue > summary.streaks.longestOverall) {
            summary.streaks.longestOverall = streakValue;
          }
          if (streakValue > playerAggregate.longestStreak) {
            playerAggregate.longestStreak = streakValue;
          }
        }

        if (isFiniteNumber(event.responseTimeMs)) {
          totalResponseMs += event.responseTimeMs;
          responseSamples += 1;
        }

        playerAggregate.trivia.attempts += 1;
        if (correct) {
          playerAggregate.trivia.correct += 1;
        }
        break;
      }

      case "streak": {
        const best = isFiniteNumber(event.best)
          ? Math.max(0, Math.floor(event.best))
          : null;

        if (best != null) {
          if (best > summary.streaks.longestOverall) {
            summary.streaks.longestOverall = best;
          }
          if (best > playerAggregate.longestStreak) {
            playerAggregate.longestStreak = best;
          }
        }

        if (isFiniteNumber(event.current)) {
          const current = Math.max(0, Math.floor(event.current));
          if (current > summary.trivia.bestStreak) {
            summary.trivia.bestStreak = Math.max(summary.trivia.bestStreak, current);
          }
        }
        break;
      }

      case "badge":
      case "badgeEarned": {
        const badgeId = normalizeString(event.badgeId || event.badge);
        if (badgeId) {
          badgeSet.add(badgeId);
          playerAggregate.badges.add(badgeId);
        }
        break;
      }

      default:
        break;
    }
  }

  summary.trivia.accuracyPercent = summary.trivia.attempts
    ? Number(((summary.trivia.correct / summary.trivia.attempts) * 100).toFixed(2))
    : 0;

  summary.trivia.averageResponseMs = responseSamples
    ? Math.round(totalResponseMs / responseSamples)
    : null;

  const playerSummaries = [];
  for (const aggregate of playersMap.values()) {
    const { badges, ...rest } = aggregate;
    const badgeArray = Array.from(badges);

    playerSummaries.push({
      ...rest,
      badges: badgeArray,
    });

    if (badgeArray.length > 0) {
      summary.badges.byPlayer[aggregate.playerId ?? "anonymous"] = badgeArray;
      for (const badgeId of badgeArray) {
        badgeSet.add(badgeId);
      }
    }

    summary.streaks.byPlayer[aggregate.playerId ?? "anonymous"] = {
      playerId: aggregate.playerId,
      username: aggregate.username,
      longest: aggregate.longestStreak,
    };
  }

  summary.badges.earned = Array.from(badgeSet);
  summary.badges.total = summary.badges.earned.length;
  summary.players = playerSummaries;

  summary.window.startedAt = earliestEvent;
  summary.window.endedAt = latestEvent;

  return summary;
};

const defaultMetadata = Object.freeze({
  playerId: null,
  username: "anonymous",
});

const normalizeMetadata = ({ playerId, username } = {}) => ({
  playerId: playerId ?? defaultMetadata.playerId,
  username:
    typeof username === "string" && username.trim().length > 0
      ? username.trim()
      : defaultMetadata.username,
});

const createPayload = (type, metadata, data) => ({
  type,
  ...data,
  playerId: metadata.playerId,
  username: metadata.username,
  createdAt: serverTimestamp(),
});

const useAnalytics = ({ gameId, playerId, username } = {}) => {
  const isReady = Boolean(db && gameId);
  const metadata = useMemo(
    () => normalizeMetadata({ playerId, username }),
    [playerId, username]
  );
  const achievementsStateRef = useRef({
    triviaCorrectStreak: 0,
    extremeDaresAccepted: 0,
    refusals: 0,
    unlocked: new Set(),
  });

  useEffect(() => {
    achievementsStateRef.current = {
      triviaCorrectStreak: 0,
      extremeDaresAccepted: 0,
      refusals: 0,
      unlocked: new Set(),
    };
  }, [gameId, playerId]);

  const persistAchievements = useCallback(
    async (achievementNames = []) => {
      if (!playerId || achievementNames.length === 0) {
        return;
      }

      try {
        await addAchievementsToProfile(
          { playerId, gameId },
          achievementNames.filter((name) => typeof name === "string" && name.trim().length > 0)
        );
      } catch (error) {
        console.error("Failed to persist achievements", error);
      }
    },
    [gameId, playerId]
  );

  const unlockAchievement = useCallback(
    (achievementName) => {
      if (typeof achievementName !== "string" || achievementName.trim().length === 0) {
        return;
      }

      const normalized = achievementName.trim();
      const state = achievementsStateRef.current;
      if (state.unlocked.has(normalized)) {
        return;
      }

      state.unlocked.add(normalized);
      persistAchievements([normalized]);
    },
    [persistAchievements]
  );

  const getCollectionRef = useCallback(() => {
    if (!isReady) {
      return null;
    }
    return collection(db, "games", gameId, EVENTS_COLLECTION);
  }, [gameId, isReady]);

  const logEvent = useCallback(
    async (type, data = {}) => {
      const collectionRef = getCollectionRef();
      if (!collectionRef) {
        console.warn("Analytics logging skipped: Firestore is unavailable.", {
          type,
          data,
        });
        return null;
      }

      const payload = createPayload(type, metadata, data);
      try {
        const docRef = await addDoc(collectionRef, payload);
        return docRef.id;
      } catch (error) {
        console.error("Failed to log analytics event", { type, error });
        return null;
      }
    },
    [getCollectionRef, metadata]
  );

  const logRound = useCallback(
    async ({
      outcome = "completed",
      slice = "",
      mode = "classic",
      streak = null,
      intensity = "",
    } = {}) => {
      if (normalizeString(slice) === "dare" && normalizeString(outcome) === "completed") {
        const state = achievementsStateRef.current;
        const normalizedIntensity = normalizeString(intensity);
        if (normalizedIntensity === "extreme") {
          state.extremeDaresAccepted += 1;
          if (state.extremeDaresAccepted >= 5) {
            unlockAchievement("Iron Stomach");
          }
        }
      }

      return logEvent("round", {
        outcome,
        slice,
        mode,
        streak,
        intensity,
      });
    },
    [logEvent, unlockAchievement]
  );

  const logRefusal = useCallback(
    async ({ reason = "manual", slice = "", consequence = "" } = {}) => {
      const state = achievementsStateRef.current;
      state.refusals += 1;
      if (state.refusals >= 3) {
        unlockAchievement("Coward");
      }

      return logEvent("refusal", {
        reason,
        slice,
        consequence,
      });
    },
    [logEvent, unlockAchievement]
  );

  const logStreak = useCallback(
    async ({ current = 0, best = 0 } = {}) =>
      logEvent("streak", {
        current,
        best,
      }),
    [logEvent]
  );

  const logBadgeEarned = useCallback(
    async ({ badgeId = "", tier = "", source = "streak" } = {}) =>
      logEvent("badgeEarned", {
        badgeId: normalizeString(badgeId),
        tier: normalizeString(tier),
        source: normalizeString(source, "streak"),
      }),
    [logEvent]
  );

  const logTriviaAccuracy = useCallback(
    async ({
      questionId = "",
      correct = false,
      streak = null,
      responseTimeMs = null,
    } = {}) => {
      const isCorrect = Boolean(correct);
      const state = achievementsStateRef.current;

      if (isCorrect) {
        state.triviaCorrectStreak += 1;
        if (state.triviaCorrectStreak >= 10) {
          unlockAchievement("Trivia Master");
        }
      } else {
        state.triviaCorrectStreak = 0;
      }

      return logEvent("triviaAccuracy", {
        questionId,
        correct: isCorrect,
        result: isCorrect ? "correct" : "incorrect",
        streak,
        responseTimeMs,
      });
    },
    [logEvent, unlockAchievement]
  );

  const logTimeout = useCallback(
    async ({
      slice = "",
      mode = "classic",
      durationSeconds = 30,
      autoRefusal = true,
    } = {}) => {
      if (autoRefusal) {
        const state = achievementsStateRef.current;
        state.refusals += 1;
        if (state.refusals >= 3) {
          unlockAchievement("Coward");
        }
      }

      return logEvent("timeout", {
        slice,
        mode,
        durationSeconds,
        autoRefusal,
      });
    },
    [logEvent, unlockAchievement]
  );

  return {
    isReady,
    metadata,
    logEvent,
    logRound,
    logRefusal,
    logStreak,
    logBadgeEarned,
    logTriviaAccuracy,
    logTimeout,
  };
};

export default useAnalytics;
export { ANALYTICS_COLLECTION, summarizeAnalyticsEvents };
