import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

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
});

const SPIN_LOCK_DEFAULT_TTL_MS = 10000;

const requireDb = () => {
  if (!db) {
    throw new Error("Firestore is not configured. Multiplayer features are unavailable.");
  }
  return db;
};

const getGameDocRef = (gameId) => doc(requireDb(), "games", gameId);

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

export { getGameDocRef };
