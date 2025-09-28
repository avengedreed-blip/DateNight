import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../firebase/config";

const LOCAL_STORAGE_KEY = "date-night/playerProfile";

const DEFAULT_PROFILE = Object.freeze({
  username: "Player One",
  avatar: "🎲",
  themeId: "classic-dark",
  customTheme: null,
  streaks: Object.freeze({
    current: 0,
    best: 0,
  }),
  refusals: Object.freeze({
    total: 0,
    truth: 0,
    dare: 0,
    trivia: 0,
    auto: 0,
  }),
  triviaStats: Object.freeze({
    correct: 0,
    incorrect: 0,
    streak: 0,
  }),
  badges: Object.freeze([]),
});

const DEFAULT_STREAKS = DEFAULT_PROFILE.streaks;
const DEFAULT_REFUSALS = DEFAULT_PROFILE.refusals;
const DEFAULT_TRIVIA_STATS = DEFAULT_PROFILE.triviaStats;

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn("localStorage is not accessible", error);
    return null;
  }
};

const isPlainObject = (value) =>
  typeof value === "object" && value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const sanitizeString = (value, fallback) => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const sanitizeThemeId = (value) => {
  if (typeof value !== "string") {
    return DEFAULT_PROFILE.themeId;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PROFILE.themeId;
};

const sanitizeCounters = (value, defaults) => {
  const keys = Object.keys(defaults);
  const source = isPlainObject(value) ? value : {};
  const result = {};

  keys.forEach((key) => {
    const rawValue = source[key];
    const numeric = Number(rawValue);
    result[key] = Number.isFinite(numeric) ? numeric : defaults[key];
    if (result[key] < 0) {
      result[key] = defaults[key];
    }
  });

  return result;
};

const sanitizeBadges = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Set();
  value.forEach((entry) => {
    if (typeof entry === "string" && entry.trim().length > 0) {
      deduped.add(entry.trim());
    }
  });
  return Array.from(deduped);
};

const sanitizeCustomTheme = (value) => {
  if (!isPlainObject(value)) {
    return null;
  }

  const bg = Array.isArray(value.bg)
    ? value.bg.filter((color) => typeof color === "string" && color.trim().length > 0).slice(0, 2)
    : [];
  const colors = Array.isArray(value.colors)
    ? value.colors.filter((color) => typeof color === "string" && color.trim().length > 0).slice(0, 4)
    : [];

  if (bg.length < 2 || colors.length < 4) {
    return null;
  }

  const particlesSource = isPlainObject(value.particles) ? value.particles : {};

  return {
    bg,
    colors,
    labels: sanitizeString(value.labels, "white"),
    particles: {
      type: sanitizeString(particlesSource.type, "custom"),
      color: sanitizeString(particlesSource.color, "#ffffff"),
    },
    meterBg:
      typeof value.meterBg === "string" && value.meterBg.trim().length > 0
        ? value.meterBg.trim()
        : "#111111",
  };
};

const normalizeProfile = (rawProfile = {}) => {
  const username = sanitizeString(rawProfile.username, DEFAULT_PROFILE.username);
  const avatar = sanitizeString(rawProfile.avatar, DEFAULT_PROFILE.avatar);
  const sanitizedThemeId = sanitizeThemeId(rawProfile.themeId);
  const sanitizedCustomTheme = sanitizeCustomTheme(rawProfile.customTheme);

  let themeId = sanitizedThemeId;
  let customTheme = sanitizedCustomTheme;

  if (themeId === "custom" && !customTheme) {
    themeId = DEFAULT_PROFILE.themeId;
  }

  if (themeId !== "custom") {
    customTheme = null;
  }

  return {
    username,
    avatar,
    themeId,
    customTheme,
    streaks: sanitizeCounters(rawProfile.streaks, DEFAULT_STREAKS),
    refusals: sanitizeCounters(rawProfile.refusals, DEFAULT_REFUSALS),
    triviaStats: sanitizeCounters(rawProfile.triviaStats, DEFAULT_TRIVIA_STATS),
    badges: sanitizeBadges(rawProfile.badges),
  };
};

const mergeCounters = (current, updates, defaults) => {
  const keys = Object.keys(defaults);
  const merged = { ...sanitizeCounters(current, defaults) };
  if (isPlainObject(updates)) {
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        merged[key] = updates[key];
      }
    });
  }
  return merged;
};

const mergeProfile = (current, updates) => {
  if (!isPlainObject(updates)) {
    return normalizeProfile(current);
  }

  const next = {
    ...current,
  };

  if (Object.prototype.hasOwnProperty.call(updates, "username")) {
    next.username = updates.username;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "avatar")) {
    next.avatar = updates.avatar;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "themeId")) {
    next.themeId = updates.themeId;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "customTheme")) {
    next.customTheme = updates.customTheme;
  }

  next.streaks = mergeCounters(current.streaks, updates.streaks, DEFAULT_STREAKS);
  next.refusals = mergeCounters(current.refusals, updates.refusals, DEFAULT_REFUSALS);
  next.triviaStats = mergeCounters(current.triviaStats, updates.triviaStats, DEFAULT_TRIVIA_STATS);

  if (Object.prototype.hasOwnProperty.call(updates, "badges")) {
    next.badges = updates.badges;
  }

  return normalizeProfile(next);
};

const serializeProfile = (profile) => JSON.stringify(profile);

const loadProfileFromStorage = (key) => {
  const storage = getStorage();
  if (!storage) {
    return normalizeProfile();
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return normalizeProfile();
    }
    const parsed = JSON.parse(raw);
    return normalizeProfile(parsed);
  } catch (error) {
    console.warn("Failed to parse player profile from localStorage", error);
    return normalizeProfile();
  }
};

const persistProfileToStorage = (key, profile) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(profile));
  } catch (error) {
    console.warn("Failed to persist player profile to localStorage", error);
  }
};

const prepareProfileForWrite = (profile) => ({
  username: profile.username,
  avatar: profile.avatar,
  themeId: profile.themeId,
  customTheme: profile.themeId === "custom" ? profile.customTheme ?? null : null,
  streaks: { ...profile.streaks },
  refusals: { ...profile.refusals },
  triviaStats: { ...profile.triviaStats },
  badges: [...profile.badges],
});

const profilesEqual = (a, b) => serializeProfile(a) === serializeProfile(b);

const useProfile = ({
  storageKey = LOCAL_STORAGE_KEY,
  gameId = null,
  playerId = null,
} = {}) => {
  const remoteDocRef = useMemo(() => {
    if (!db || !gameId || !playerId) {
      return null;
    }
    return doc(db, "games", gameId, "players", playerId);
  }, [gameId, playerId]);

  const [profile, setProfile] = useState(() => loadProfileFromStorage(storageKey));
  const [isLoading, setIsLoading] = useState(() => Boolean(remoteDocRef));
  const [isSynced, setIsSynced] = useState(() => !remoteDocRef);
  const [lastError, setLastError] = useState(null);

  const profileRef = useRef(profile);
  const profileSignatureRef = useRef(serializeProfile(profile));
  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);
  const hasBootstrappedRemoteRef = useRef(false);
  const pendingWriteRef = useRef(null);
  const isFlushingPendingWriteRef = useRef(false);

  useEffect(() => () => {
    mountedRef.current = false;
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    profileRef.current = profile;
    profileSignatureRef.current = serializeProfile(profile);
  }, [profile]);

  const persistToStorage = useCallback(
    (value) => {
      persistProfileToStorage(storageKey, value);
    },
    [storageKey]
  );

  const reloadFromStorage = useCallback(() => {
    const stored = loadProfileFromStorage(storageKey);
    if (!profilesEqual(stored, profileRef.current)) {
      profileRef.current = stored;
      profileSignatureRef.current = serializeProfile(stored);
      setProfile(stored);
    }
    return stored;
  }, [storageKey]);

  const queuePendingWrite = useCallback((nextProfile) => {
    pendingWriteRef.current = {
      profile: nextProfile,
      signature: serializeProfile(nextProfile),
      timestamp: Date.now(),
    };
  }, []);

  const clearPendingWrite = useCallback(() => {
    pendingWriteRef.current = null;
  }, []);

  const flushPendingWrite = useCallback(async () => {
    if (
      !remoteDocRef ||
      !pendingWriteRef.current ||
      isFlushingPendingWriteRef.current ||
      !mountedRef.current
    ) {
      return false;
    }

    isFlushingPendingWriteRef.current = true;
    const pending = pendingWriteRef.current;

    try {
      await setDoc(remoteDocRef, prepareProfileForWrite(pending.profile), { merge: true });
      if (!mountedRef.current) {
        return false;
      }
      clearPendingWrite();
      setIsSynced(true);
      setLastError(null);
      return true;
    } catch (error) {
      if (mountedRef.current) {
        console.error("Failed to flush pending profile to Firestore", error);
        setLastError(error);
        setIsSynced(false);
      }
      return false;
    } finally {
      isFlushingPendingWriteRef.current = false;
    }
  }, [clearPendingWrite, remoteDocRef]);

  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    hasBootstrappedRemoteRef.current = false;

    if (!remoteDocRef) {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsSynced(true);
      }
      return undefined;
    }

    if (mountedRef.current) {
      setIsLoading(true);
      setIsSynced(false);
      setLastError(null);
    }

    const unsubscribe = onSnapshot(
      remoteDocRef,
      (snapshot) => {
        if (!mountedRef.current) {
          return;
        }

        if (!snapshot.exists()) {
          setIsLoading(false);
          setIsSynced(false);

          if (!hasBootstrappedRemoteRef.current) {
            hasBootstrappedRemoteRef.current = true;
            const localProfile = profileRef.current ?? normalizeProfile();
            setDoc(remoteDocRef, prepareProfileForWrite(localProfile), { merge: true })
              .catch((error) => {
                if (!mountedRef.current) {
                  return;
                }
                hasBootstrappedRemoteRef.current = false;
                console.error("Failed to bootstrap profile to Firestore", error);
                setLastError(error);
                setIsSynced(false);
              });
          }
          return;
        }

        const remoteProfile = normalizeProfile(snapshot.data());
        const remoteSignature = serializeProfile(remoteProfile);
        const localSignature = profileSignatureRef.current;
        const pending = pendingWriteRef.current;

        if (pending && pending.signature === localSignature && remoteSignature !== localSignature) {
          setIsLoading(false);
          setIsSynced(false);
          flushPendingWrite();
          return;
        }

        if (!profilesEqual(remoteProfile, profileRef.current)) {
          profileRef.current = remoteProfile;
          profileSignatureRef.current = remoteSignature;
          setProfile(remoteProfile);
          persistToStorage(remoteProfile);
        }

        clearPendingWrite();
        setIsLoading(false);
        setIsSynced(true);
        setLastError(null);
      },
      (error) => {
        if (!mountedRef.current) {
          return;
        }
        console.error("Failed to subscribe to player profile", error);
        setLastError(error);
        setIsLoading(false);
        setIsSynced(false);
        const fallback = reloadFromStorage();
        profileRef.current = fallback;
        profileSignatureRef.current = serializeProfile(fallback);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [clearPendingWrite, flushPendingWrite, persistToStorage, reloadFromStorage, remoteDocRef]);

  const updateProfile = useCallback(
    async (updates = {}, options = {}) => {
      const { replace = false } = options;
      const currentProfile = profileRef.current ?? normalizeProfile();
      const nextProfile = replace
        ? normalizeProfile(updates)
        : mergeProfile(currentProfile, updates);

      if (profilesEqual(currentProfile, nextProfile)) {
        return currentProfile;
      }

      profileRef.current = nextProfile;
      profileSignatureRef.current = serializeProfile(nextProfile);
      setProfile(nextProfile);
      persistToStorage(nextProfile);

      if (remoteDocRef) {
        try {
          if (mountedRef.current) {
            setIsSynced(false);
          }
          await setDoc(remoteDocRef, prepareProfileForWrite(nextProfile), { merge: true });
          if (mountedRef.current) {
            setIsSynced(true);
            setLastError(null);
            clearPendingWrite();
          }
        } catch (error) {
          if (mountedRef.current) {
            console.error("Failed to persist profile to Firestore", error);
            setLastError(error);
            setIsSynced(false);
            queuePendingWrite(nextProfile);
          }
        }
      }

      return nextProfile;
    },
    [clearPendingWrite, persistToStorage, queuePendingWrite, remoteDocRef]
  );

  const resetProfile = useCallback(
    () => updateProfile(DEFAULT_PROFILE, { replace: true }),
    [updateProfile]
  );

  return useMemo(
    () => ({
      profile,
      isLoading,
      isSynced,
      error: lastError,
      updateProfile,
      resetProfile,
      reloadFromStorage,
    }),
    [isLoading, isSynced, lastError, profile, reloadFromStorage, resetProfile, updateProfile]
  );
};

export { LOCAL_STORAGE_KEY, DEFAULT_PROFILE };
export default useProfile;
