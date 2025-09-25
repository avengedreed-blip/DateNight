import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

const createDefaultTotals = () => ({
  rounds: 0,
  refusals: 0,
  timeouts: 0,
  triviaCorrect: 0,
  triviaIncorrect: 0,
  extremes: 0,
});

export const LIFETIME_TOTAL_DEFAULTS = createDefaultTotals();

export const LIFETIME_STATS_DEFAULTS = {
  totals: createDefaultTotals(),
  longestStreak: 0,
  longestTriviaStreak: 0,
  maxAdrenaline: 0,
  badges: [],
  updatedAt: 0,
};

const ensureNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toPositiveInteger = (value, fallback = 0) => {
  const numeric = ensureNumber(value, fallback);
  if (numeric <= 0) {
    return 0;
  }
  return Math.round(numeric);
};

const clampAdrenaline = (value) => {
  const numeric = ensureNumber(value, LIFETIME_STATS_DEFAULTS.maxAdrenaline);
  if (numeric <= 0) {
    return 0;
  }
  if (numeric >= 100) {
    return 100;
  }
  return Math.round(numeric);
};

const sanitizeTotals = (source) => {
  const defaults = createDefaultTotals();
  if (!source || typeof source !== "object") {
    return defaults;
  }

  return Object.keys(defaults).reduce((acc, key) => {
    acc[key] = Math.max(0, toPositiveInteger(source[key], defaults[key]));
    return acc;
  }, {});
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

const ensureId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const normalizeMode = (mode) => {
  if (typeof mode === "string" && mode.length) {
    return mode;
  }
  return "unknown";
};

export const ensureLifetimeShape = (source) => {
  if (!source || typeof source !== "object") {
    return {
      totals: createDefaultTotals(),
      longestStreak: 0,
      longestTriviaStreak: 0,
      maxAdrenaline: 0,
      badges: [],
      updatedAt: 0,
    };
  }

  const totals = sanitizeTotals(source.totals ?? source);
  const longestStreak = Math.max(0, toPositiveInteger(source.longestStreak, 0));
  const longestTriviaStreak = Math.max(0, toPositiveInteger(source.longestTriviaStreak, 0));
  const maxAdrenaline = Math.max(0, clampAdrenaline(source.maxAdrenaline));
  const badges = sanitizeBadges(source.badges ?? source.milestoneBadges);
  const updatedAt = toMillis(source.updatedAt);

  return {
    totals,
    longestStreak,
    longestTriviaStreak,
    maxAdrenaline,
    badges,
    updatedAt,
  };
};

export const mergeLifetimeStats = (primary, secondary) => {
  const a = ensureLifetimeShape(primary);
  const b = ensureLifetimeShape(secondary);

  const totals = Object.keys(LIFETIME_TOTAL_DEFAULTS).reduce((acc, key) => {
    const value = Math.max(a.totals[key] ?? 0, b.totals[key] ?? 0);
    acc[key] = Math.max(0, toPositiveInteger(value));
    return acc;
  }, {});

  return {
    totals,
    longestStreak: Math.max(a.longestStreak, b.longestStreak),
    longestTriviaStreak: Math.max(a.longestTriviaStreak, b.longestTriviaStreak),
    maxAdrenaline: Math.max(a.maxAdrenaline, b.maxAdrenaline),
    badges: Array.from(new Set([...(a.badges ?? []), ...(b.badges ?? [])])),
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0),
  };
};

export const buildLifetimeSignature = (stats) => {
  const normalized = ensureLifetimeShape(stats);
  const sortedBadges = Array.from(new Set(normalized.badges ?? [])).sort();
  return JSON.stringify({
    totals: normalized.totals,
    longestStreak: normalized.longestStreak,
    longestTriviaStreak: normalized.longestTriviaStreak,
    maxAdrenaline: normalized.maxAdrenaline,
    badges: sortedBadges,
  });
};

export const resolveLifetimeDocTarget = ({
  mode,
  profileId,
  playerId,
  collection,
  id,
} = {}) => {
  const explicitCollection = typeof collection === "string" && collection.length ? collection : null;
  const explicitId = ensureId(id);

  if (explicitCollection && explicitId) {
    return { collection: explicitCollection, id: explicitId };
  }

  const normalizedMode = normalizeMode(mode);
  if (normalizedMode === "offline" || normalizedMode === "unknown") {
    return null;
  }

  if (normalizedMode === "single-device") {
    const resolvedId = ensureId(profileId);
    if (!resolvedId) {
      return null;
    }
    return { collection: "couples", id: resolvedId };
  }

  const resolvedId = ensureId(profileId) ?? ensureId(playerId);
  if (!resolvedId) {
    return null;
  }

  return { collection: "profiles", id: resolvedId };
};

export const getLifetimeProfileRef = (db, options = {}) => {
  if (!db) {
    return null;
  }

  const target = resolveLifetimeDocTarget(options);
  if (!target) {
    return null;
  }

  return doc(db, target.collection, target.id);
};

export const subscribeToLifetimeStats = (
  db,
  options,
  onData,
  onError = (error) => console.warn("Lifetime stats listener error", error)
) => {
  const ref = getLifetimeProfileRef(db, options);
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
      onData?.(ensureLifetimeShape(snapshot.data()));
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const writeLifetimeStats = async (db, options, stats) => {
  const ref = getLifetimeProfileRef(db, options);
  if (!ref) {
    return Promise.resolve();
  }

  const normalized = ensureLifetimeShape(stats ?? {});
  const payload = {
    totals: sanitizeTotals(normalized.totals),
    longestStreak: Math.max(0, toPositiveInteger(normalized.longestStreak, 0)),
    longestTriviaStreak: Math.max(0, toPositiveInteger(normalized.longestTriviaStreak, 0)),
    maxAdrenaline: Math.max(0, clampAdrenaline(normalized.maxAdrenaline)),
    badges: sanitizeBadges(normalized.badges),
  };

  return setDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
