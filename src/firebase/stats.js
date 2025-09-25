import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

const ANALYTICS_COLLECTION_KEY = "analytics";
const PLAYERS_COLLECTION_KEY = "players";
const DEFAULT_EVENT_LIMIT = 200;
const LOCAL_ANALYTICS_STORAGE_KEY = "dateNightAnalyticsSessions";

const ensureWindow = () => (typeof window !== "undefined" ? window : null);

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

  if (typeof value.seconds === "number") {
    const seconds = value.seconds;
    const nanos = typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
    return Math.round(seconds * 1000 + nanos / 1_000_000);
  }

  return 0;
};

const normalizeAnalyticsDoc = (docSnapshot) => {
  const data = docSnapshot.data() ?? {};
  const payload = data.payload ?? data.data ?? {};
  const clientTimestamp = toMillis(data.clientTimestamp ?? data.timestamp);
  const timestamp = toMillis(data.timestamp ?? data.clientTimestamp ?? Date.now());
  return {
    id: docSnapshot.id,
    type: typeof data.type === "string" ? data.type : "unknown",
    payload,
    timestamp,
    clientTimestamp,
    playerId:
      typeof payload.playerId === "string" && payload.playerId.length
        ? payload.playerId
        : null,
    source: "remote",
  };
};

const buildAnalyticsQuery = (collectionRef, options = {}) => {
  const limitValue = Number.isFinite(options.limit) ? options.limit : DEFAULT_EVENT_LIMIT;
  try {
    return query(collectionRef, orderBy("clientTimestamp", "desc"), limit(limitValue));
  } catch (error) {
    console.warn("Failed to build analytics query", error);
    return collectionRef;
  }
};

const getAnalyticsCollectionRef = (db, gameId, playerId) => {
  if (!db || !gameId) {
    return null;
  }

  if (playerId) {
    return collection(db, "games", gameId, PLAYERS_COLLECTION_KEY, playerId, ANALYTICS_COLLECTION_KEY);
  }

  return collection(db, "games", gameId, ANALYTICS_COLLECTION_KEY);
};

const normalizePlayerDoc = (docSnapshot) => {
  const data = docSnapshot.data() ?? {};
  return {
    id: docSnapshot.id,
    displayName:
      typeof data.displayName === "string" && data.displayName.trim().length
        ? data.displayName.trim()
        : docSnapshot.id,
    stats: data.stats ?? null,
    raw: data,
  };
};

export const readLocalAnalyticsEvents = (sessionKey) => {
  if (!sessionKey) {
    return [];
  }

  const target = ensureWindow();
  if (!target) {
    return [];
  }

  try {
    const raw = target.localStorage?.getItem(LOCAL_ANALYTICS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    const session = parsed?.sessions?.[sessionKey];
    const events = Array.isArray(session?.events) ? session.events : [];
    return events
      .map((event) => ({
        id: event.id ?? `${event.type ?? "event"}-${Math.random().toString(36).slice(2, 10)}`,
        type: typeof event.type === "string" ? event.type : "unknown",
        payload: event.payload ?? event.data ?? {},
        timestamp: toMillis(event.timestamp ?? event.clientTimestamp ?? Date.now()),
        clientTimestamp: toMillis(event.clientTimestamp ?? event.timestamp ?? Date.now()),
        playerId:
          typeof event.payload?.playerId === "string" && event.payload.playerId.length
            ? event.payload.playerId
            : null,
        source: "local",
      }))
      .sort((a, b) => b.clientTimestamp - a.clientTimestamp);
  } catch (error) {
    console.warn("Failed to read local analytics events", error);
    return [];
  }
};

export const subscribeToSessionAnalytics = (
  db,
  gameId,
  callback,
  options = {}
) => {
  if (!db || !gameId || typeof callback !== "function") {
    return () => {};
  }

  const collectionRef = getAnalyticsCollectionRef(db, gameId, null);
  if (!collectionRef) {
    return () => {};
  }

  const analyticsQuery = buildAnalyticsQuery(collectionRef, options);

  return onSnapshot(
    analyticsQuery,
    (snapshot) => {
      const events = snapshot.docs.map(normalizeAnalyticsDoc);
      callback(events);
    },
    (error) => {
      console.warn("Session analytics subscription failed", error);
      callback([]);
    }
  );
};

export const subscribeToPlayerAnalytics = (
  db,
  gameId,
  playerId,
  callback,
  options = {}
) => {
  if (!db || !gameId || !playerId || typeof callback !== "function") {
    return () => {};
  }

  const collectionRef = getAnalyticsCollectionRef(db, gameId, playerId);
  if (!collectionRef) {
    return () => {};
  }

  const analyticsQuery = buildAnalyticsQuery(collectionRef, options);

  return onSnapshot(
    analyticsQuery,
    (snapshot) => {
      const events = snapshot.docs.map(normalizeAnalyticsDoc);
      callback(events);
    },
    (error) => {
      console.warn(`Player analytics subscription failed for ${playerId}`, error);
      callback([]);
    }
  );
};

export const subscribeToGamePlayers = (db, gameId, callback) => {
  if (!db || !gameId || typeof callback !== "function") {
    return () => {};
  }

  try {
    const playersRef = collection(db, "games", gameId, PLAYERS_COLLECTION_KEY);
    return onSnapshot(
      playersRef,
      (snapshot) => {
        callback(snapshot.docs.map(normalizePlayerDoc));
      },
      (error) => {
        console.warn("Player roster subscription failed", error);
        callback([]);
      }
    );
  } catch (error) {
    console.warn("Failed to subscribe to players", error);
    callback([]);
    return () => {};
  }
};

export const analyticsHelpers = {
  toMillis,
  normalizeAnalyticsDoc,
};

export const constants = {
  LOCAL_ANALYTICS_STORAGE_KEY,
  DEFAULT_EVENT_LIMIT,
};
