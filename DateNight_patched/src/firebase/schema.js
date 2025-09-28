import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

const STREAK_BADGE_CONFIG = Object.freeze([
  { tier: "bronze", badgeId: "streak-bronze", minStreak: 3 },
  { tier: "silver", badgeId: "streak-silver", minStreak: 6 },
  { tier: "gold", badgeId: "streak-gold", minStreak: 10 },
  { tier: "legendary", badgeId: "streak-legendary", minStreak: 15 },
]);

const STREAK_BADGE_ORDER = STREAK_BADGE_CONFIG.map((config) => config.badgeId);

const ADRENALINE_INCREMENT = 0.25;
const ADRENALINE_DECAY_ON_PENALTY = 0.25;
const ADRENALINE_THRESHOLD = 1;
const COWARD_PENALTY_THRESHOLD = 3;

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)])
    );
  }
  return value;
};

const mergeWithDefaults = (current, defaults) => {
  if (Array.isArray(defaults)) {
    return Array.isArray(current) ? current.map(cloneValue) : defaults.map(cloneValue);
  }

  if (isPlainObject(defaults)) {
    const source = isPlainObject(current) ? current : {};
    const result = {};

    for (const [key, defaultValue] of Object.entries(defaults)) {
      result[key] = mergeWithDefaults(source[key], defaultValue);
    }

    for (const [key, value] of Object.entries(source)) {
      if (!(key in defaults)) {
        result[key] = cloneValue(value);
      }
    }

    return result;
  }

  return current === undefined ? defaults : current;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sortBadges = (badges = []) => {
  const badgeOrder = new Map(STREAK_BADGE_ORDER.map((id, index) => [id, index]));
  return [...badges].sort((a, b) => {
    const indexA = badgeOrder.get(a);
    const indexB = badgeOrder.get(b);

    if (indexA === undefined && indexB === undefined) {
      return a.localeCompare(b);
    }
    if (indexA === undefined) {
      return 1;
    }
    if (indexB === undefined) {
      return -1;
    }
    return indexA - indexB;
  });
};

const rewardDefaults = Object.freeze({
  streakBadges: {
    unlocked: [],
    currentTier: "none",
    progress: 0,
    lastUnlockedAt: null,
    lastUnlockedBadge: null,
    thresholds: STREAK_BADGE_CONFIG.reduce((acc, config) => {
      acc[config.tier] = config.minStreak;
      return acc;
    }, {}),
  },
  adrenalineBar: {
    value: 0,
    isCharged: false,
    chargesConsumed: 0,
    lastChargeAt: null,
    lastConsumedAt: null,
    threshold: ADRENALINE_THRESHOLD,
    increment: ADRENALINE_INCREMENT,
    decayOnPenalty: ADRENALINE_DECAY_ON_PENALTY,
  },
  cowardPenalty: {
    refusalCount: 0,
    isActive: false,
    activatedAt: null,
    clearedAt: null,
    threshold: COWARD_PENALTY_THRESHOLD,
  },
});

/**
 * Canonical shape of the multiplayer game document stored in Firestore.
 * All mutable gameplay systems (wheel, meter, timer, particle FX) are
 * synchronized through this document so every client stays authoritative.
 */
export const gameSchema = Object.freeze({
  wheelState: {
    /**
     * Identifier for the current slice selection, e.g. "truth", "dare", "trivia".
     */
    currentSlice: "",
    /** Seed used to replicate wheel physics client-side. */
    spinSeed: 0,
    /** Player who initiated the current spin. */
    lastSpinnerId: "",
  },
  extremeMeter: {
    /** Accumulated intensity (0-1). */
    value: 0,
    /** Whether the next round is a forced extreme round. */
    isForced: false,
  },
  timer: {
    /** Timestamp (ms) when the active round expires. */
    expiresAt: null,
    /** Server timestamp recording when the timer started. */
    startedAt: null,
    /** Player that triggered the timer. */
    ownerId: "",
  },
  particles: {
    /** Current particle preset identifier. */
    preset: "",
    /** Particle lifecycle seed for deterministic visuals. */
    seed: 0,
  },
  /**
   * Spin lock prevents concurrent wheel spins. It is released automatically
   * when the owning client calls {@link releaseSpinLock} or expires by TTL.
   */
  spinLock: {
    locked: false,
    ownerId: null,
    acquiredAt: null,
    expiresAt: null,
  },
});

/**
 * Canonical shape of an entry in the players subcollection.
 * This schema holds the full player profile used across sessions.
 */
export const playerProfileSchema = Object.freeze({
  username: "",
  /** Avatar can be a URL string or an object with metadata. */
  avatar: {
    type: "url",
    value: "",
    /** Optional color badge/background details. */
    accentColor: "",
  },
  /** Reference to one of the built-in theme identifiers. */
  themeId: "classic-dark",
  /**
   * Optional custom theme definition. Clients should merge this over the
   * selected base theme when rendering.
   */
  customTheme: {
    /** Primary/secondary/background colors. */
    palette: {
      primary: "#000000",
      secondary: "#ffffff",
      accent: "#ff69b4",
      background: "#111111",
    },
    /** Wheel recolor overrides. */
    wheel: {
      sliceColors: [],
      labelColor: "#ffffff",
      pointerColor: "#ff69b4",
    },
    /** Identifier of the background music track to play. */
    musicTrackId: "",
  },
  /** Consecutive successful rounds. */
  streaks: {
    current: 0,
    best: 0,
  },
  /** Total number of refusals per mode. */
  refusals: {
    total: 0,
    truth: 0,
    dare: 0,
    trivia: 0,
    auto: 0,
  },
  /** Trivia accuracy stats. */
  triviaStats: {
    correct: 0,
    incorrect: 0,
    streak: 0,
  },
  /** Earned reward badges. */
  badges: [],
  /** Reward progress tracking for backend-driven unlocks. */
  rewards: rewardDefaults,
});

const ensureProfileDefaults = (profile = {}) =>
  mergeWithDefaults(profile, playerProfileSchema);

const SPIN_LOCK_DEFAULT_TTL_MS = 10000;

const requireDb = () => {
  if (!db) {
    throw new Error("Firestore is not configured. Multiplayer features are unavailable.");
  }
  return db;
};

const getGameDocRef = (gameId) => doc(requireDb(), "games", gameId);

const getPlayerDocRef = (gameId, playerId) =>
  doc(requireDb(), "games", gameId, "players", playerId);

const applyStreakBadges = (profile) => {
  const streakState = profile.rewards.streakBadges;
  const badgesSet = new Set(profile.badges || []);
  const unlockedSet = new Set(streakState.unlocked || []);
  let highestTier = streakState.currentTier || "none";
  const newlyUnlocked = [];

  for (const config of STREAK_BADGE_CONFIG) {
    if (profile.streaks.current >= config.minStreak) {
      highestTier = config.tier;
      if (!badgesSet.has(config.badgeId)) {
        badgesSet.add(config.badgeId);
        newlyUnlocked.push(config.badgeId);
      }
      unlockedSet.add(config.badgeId);
    }
  }

  if (highestTier === "none" && unlockedSet.size > 0) {
    for (let index = STREAK_BADGE_CONFIG.length - 1; index >= 0; index -= 1) {
      const config = STREAK_BADGE_CONFIG[index];
      if (unlockedSet.has(config.badgeId)) {
        highestTier = config.tier;
        break;
      }
    }
  }

  streakState.currentTier = highestTier;
  streakState.progress = profile.streaks.current;
  streakState.unlocked = sortBadges(Array.from(unlockedSet));

  if (newlyUnlocked.length > 0) {
    streakState.lastUnlockedBadge = newlyUnlocked[newlyUnlocked.length - 1];
    streakState.lastUnlockedAt = serverTimestamp();
  }

  profile.badges = sortBadges(Array.from(badgesSet));
};

const applyAdrenalineBar = (profile, { roundCompleted, roundRefused, timedOut, consumeAdrenaline }) => {
  const barState = profile.rewards.adrenalineBar;
  let { value } = barState;

  if (!Number.isFinite(value)) {
    value = 0;
  }
  if (!Number.isFinite(barState.chargesConsumed)) {
    barState.chargesConsumed = 0;
  }

  if (roundCompleted) {
    value = clamp(value + ADRENALINE_INCREMENT, 0, ADRENALINE_THRESHOLD);
    if (value >= ADRENALINE_THRESHOLD) {
      barState.isCharged = true;
      barState.lastChargeAt = serverTimestamp();
    }
  }

  if (roundRefused || timedOut) {
    value = clamp(value - ADRENALINE_DECAY_ON_PENALTY, 0, ADRENALINE_THRESHOLD);
    if (value < ADRENALINE_THRESHOLD) {
      barState.isCharged = false;
    }
  }

  if (consumeAdrenaline) {
    value = 0;
    if (barState.isCharged) {
      barState.lastConsumedAt = serverTimestamp();
    }
    barState.isCharged = false;
    barState.chargesConsumed += 1;
  }

  barState.value = Number(value.toFixed(3));
};

const applyCowardPenalty = (profile, { roundCompleted, roundRefused, timedOut }) => {
  const penaltyState = profile.rewards.cowardPenalty;

  if (!Number.isFinite(penaltyState.refusalCount)) {
    penaltyState.refusalCount = 0;
  }

  if (roundRefused || timedOut) {
    penaltyState.refusalCount += 1;
    if (penaltyState.refusalCount >= COWARD_PENALTY_THRESHOLD) {
      penaltyState.isActive = true;
      penaltyState.activatedAt = serverTimestamp();
    }
    return;
  }

  if (roundCompleted) {
    if (penaltyState.isActive) {
      penaltyState.clearedAt = serverTimestamp();
    }
    penaltyState.isActive = false;
    penaltyState.refusalCount = 0;
  }
};

const applyTriviaProgress = (profile, triviaResult) => {
  if (!triviaResult) {
    return;
  }

  if (triviaResult === "correct") {
    profile.triviaStats.correct += 1;
    profile.triviaStats.streak += 1;
  } else if (triviaResult === "incorrect" || triviaResult === "timeout") {
    profile.triviaStats.incorrect += 1;
    profile.triviaStats.streak = 0;
  }
};

const applyStreakProgress = (profile, { roundCompleted, roundRefused, timedOut }) => {
  if (roundCompleted) {
    profile.streaks.current += 1;
    profile.streaks.best = Math.max(profile.streaks.best, profile.streaks.current);
  }

  if (roundRefused || timedOut) {
    profile.streaks.current = 0;
  }
};

const applyRewardProgress = (profile, event) => {
  const nextProfile = ensureProfileDefaults(profile);

  applyStreakProgress(nextProfile, event);
  applyTriviaProgress(nextProfile, event.triviaResult);
  applyStreakBadges(nextProfile);
  applyAdrenalineBar(nextProfile, event);
  applyCowardPenalty(nextProfile, event);

  return nextProfile;
};


/**
 * Attempt to acquire the spin lock for the specified game.
 *
 * @param {string} gameId - Firestore document ID for the game session.
 * @param {string} playerId - Player requesting ownership of the spin lock.
 * @param {object} [options]
 * @param {number} [options.ttlMs=10000] - Milliseconds before the lock expires.
 * @returns {Promise<boolean>} Resolves true if the lock was acquired, false otherwise.
 */
export async function acquireSpinLock(gameId, playerId, options = {}) {
  const { ttlMs = SPIN_LOCK_DEFAULT_TTL_MS } = options;
  const dbInstance = requireDb();
  const gameRef = doc(dbInstance, "games", gameId);

  return runTransaction(dbInstance, async (transaction) => {
    const snapshot = await transaction.get(gameRef);
    const data = snapshot.data() || {};
    const spinLock = data.spinLock || {};
    const now = Date.now();

    const isLocked = Boolean(spinLock.locked);
    const expiresAt = spinLock.expiresAt?.toMillis?.() ?? spinLock.expiresAt ?? 0;
    const isExpired = expiresAt && expiresAt <= now;

    const canSteal = !isLocked || isExpired || spinLock.ownerId === playerId;

    if (!canSteal) {
      return false;
    }

    transaction.set(
      gameRef,
      {
        spinLock: {
          locked: true,
          ownerId: playerId,
          acquiredAt: serverTimestamp(),
          expiresAt: Timestamp.fromMillis(now + ttlMs),
        },
      },
      { merge: true }
    );

    return true;
  });
}

/**
 * Release the spin lock if the caller currently owns it.
 *
 * @param {string} gameId - Firestore document ID for the game session.
 * @param {string} playerId - Player attempting to release the lock.
 * @returns {Promise<boolean>} Resolves true if the lock was released, false otherwise.
 */
export async function releaseSpinLock(gameId, playerId) {
  const dbInstance = requireDb();
  const gameRef = getGameDocRef(gameId);

  return runTransaction(dbInstance, async (transaction) => {
    const snapshot = await transaction.get(gameRef);
    const data = snapshot.data() || {};
    const spinLock = data.spinLock || {};

    if (!spinLock.locked || spinLock.ownerId !== playerId) {
      return false;
    }

    transaction.set(
      gameRef,
      {
        spinLock: {
          locked: false,
          ownerId: null,
          acquiredAt: null,
          expiresAt: null,
        },
      },
      { merge: true }
    );

    return true;
  });
}

/**
 * Persist reward scaffolding and trivia accuracy progress to the player profile.
 *
 * @param {string} gameId - Firestore document ID for the game session.
 * @param {string} playerId - Identifier of the player whose profile should be updated.
 * @param {object} [event]
 * @param {boolean} [event.roundCompleted=false] - Whether the player successfully completed the round.
 * @param {boolean} [event.roundRefused=false] - Whether the player refused the prompt.
 * @param {boolean} [event.timedOut=false] - Whether the round ended because of a timeout.
 * @param {"correct"|"incorrect"|boolean|null} [event.triviaResult=null] - Trivia accuracy outcome.
 * @param {boolean} [event.consumeAdrenaline=false] - Whether an adrenaline charge was consumed.
 * @returns {Promise<object>} Resolves with the merged profile slice that was persisted.
 */
export async function updatePlayerProfileProgress(gameId, playerId, event = {}) {
  const dbInstance = requireDb();
  const playerRef = getPlayerDocRef(gameId, playerId);

  const normalizedEvent = {
    roundCompleted: Boolean(event.roundCompleted),
    roundRefused: Boolean(event.roundRefused),
    timedOut: Boolean(event.timedOut),
    consumeAdrenaline: Boolean(event.consumeAdrenaline),
    triviaResult:
      event.triviaResult === true
        ? "correct"
        : event.triviaResult === false
        ? "incorrect"
        : event.triviaResult,
  };

  return runTransaction(dbInstance, async (transaction) => {
    const snapshot = await transaction.get(playerRef);
    const profile = snapshot.exists() ? snapshot.data() : {};

    const updatedProfile = applyRewardProgress(profile, normalizedEvent);
    const payload = {
      streaks: updatedProfile.streaks,
      triviaStats: updatedProfile.triviaStats,
      rewards: updatedProfile.rewards,
      badges: updatedProfile.badges,
    };

    transaction.set(playerRef, payload, { merge: true });

    return payload;
  });
}

export { getGameDocRef };
