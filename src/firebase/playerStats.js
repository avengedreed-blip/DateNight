import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

export const PLAYER_STATS_DEFAULTS = {
  rounds: 0,
  refusals: 0,
  timeouts: 0,
  triviaCorrect: 0,
  triviaIncorrect: 0,
  extremes: 0,
  currentStreak: 0,
  triviaStreak: 0,
  adrenaline: 50,
  badges: [],
  updatedAt: 0,
};

const clampAdrenaline = (value) => {
  const numeric = Number.isFinite(value) ? value : PLAYER_STATS_DEFAULTS.adrenaline;
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 100) {
    return 100;
  }
  return Math.round(numeric);
};

const sanitizeBadges = (badges) => {
  if (!Array.isArray(badges)) {
    return [];
  }

  const unique = new Set();
  for (const badge of badges) {
    if (typeof badge === "string" && badge.trim().length > 0) {
      unique.add(badge.trim());
    }
  }

  return Array.from(unique);
};

const toMillis = (value) => {
  if (!value) {
    return 0;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return 0;
};

export const getPlayerStatsDocRef = (db, gameId, playerId) => {
  if (!db || !gameId || !playerId) {
    return null;
  }

  return doc(db, "games", gameId, "players", playerId);
};

export const normalizeRemoteStats = (source) => {
  if (!source || typeof source !== "object") {
    return { ...PLAYER_STATS_DEFAULTS };
  }

  return {
    rounds: Number.isFinite(source.rounds) ? source.rounds : PLAYER_STATS_DEFAULTS.rounds,
    refusals: Number.isFinite(source.refusals)
      ? source.refusals
      : PLAYER_STATS_DEFAULTS.refusals,
    timeouts: Number.isFinite(source.timeouts) ? source.timeouts : PLAYER_STATS_DEFAULTS.timeouts,
    triviaCorrect: Number.isFinite(source.triviaCorrect)
      ? source.triviaCorrect
      : PLAYER_STATS_DEFAULTS.triviaCorrect,
    triviaIncorrect: Number.isFinite(source.triviaIncorrect)
      ? source.triviaIncorrect
      : PLAYER_STATS_DEFAULTS.triviaIncorrect,
    extremes: Number.isFinite(source.extremes)
      ? source.extremes
      : PLAYER_STATS_DEFAULTS.extremes,
    currentStreak: Number.isFinite(source.currentStreak)
      ? source.currentStreak
      : PLAYER_STATS_DEFAULTS.currentStreak,
    triviaStreak: Number.isFinite(source.triviaStreak)
      ? source.triviaStreak
      : PLAYER_STATS_DEFAULTS.triviaStreak,
    adrenaline: clampAdrenaline(source.adrenaline),
    badges: sanitizeBadges(source.badges),
    updatedAt: toMillis(source.updatedAt),
  };
};

export const subscribeToPlayerStats = (
  db,
  gameId,
  playerId,
  onData,
  onError = (error) => console.warn("Player stats listener error", error)
) => {
  const ref = getPlayerStatsDocRef(db, gameId, playerId);
  if (!ref) {
    return () => {};
  }

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData?.(null);
        return;
      }

      onData?.(normalizeRemoteStats(snapshot.data()));
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const writePlayerStats = async (db, gameId, playerId, stats) => {
  const ref = getPlayerStatsDocRef(db, gameId, playerId);
  if (!ref) {
    return Promise.resolve();
  }

  const payload = normalizeRemoteStats(stats ?? {});

  return setDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const clampPlayerAdrenaline = clampAdrenaline;
export const sanitizePlayerBadges = sanitizeBadges;
