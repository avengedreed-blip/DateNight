import { collection, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";

import { db } from "../config/firebase";

const CUSTOM_PROMPTS_COLLECTION = "customPrompts";

const DEFAULT_AVATAR = "🎲";
const DEFAULT_THEME_ID = "classic-dark";

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const toPositiveNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return numeric;
};

const sanitizeStreaks = (value = {}) => ({
  current: toPositiveNumber(value.current, 0),
  best: toPositiveNumber(value.best, 0),
});

const sanitizeNumericRecord = (value = {}) => {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const result = {};
  Object.keys(value)
    .sort()
    .forEach((key) => {
      result[key] = toPositiveNumber(value[key], 0);
    });
  return result;
};

const sanitizeTriviaStats = (value = {}) => {
  const stats = sanitizeNumericRecord(value);
  return {
    correct: toPositiveNumber(stats.correct, 0),
    incorrect: toPositiveNumber(stats.incorrect, 0),
    streak: toPositiveNumber(stats.streak, 0),
  };
};

const sanitizeBadges = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Set();
  value.forEach((badge) => {
    if (isNonEmptyString(badge)) {
      deduped.add(badge.trim());
    }
  });

  return Array.from(deduped).sort();
};

const sanitizeCustomTheme = (value) => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const bg = Array.isArray(value.bg)
    ? value.bg.filter((color) => isNonEmptyString(color)).slice(0, 2)
    : [];
  const colors = Array.isArray(value.colors)
    ? value.colors.filter((color) => isNonEmptyString(color)).slice(0, 4)
    : [];

  if (bg.length < 2 || colors.length < 4) {
    return null;
  }

  const particles = typeof value.particles === "object" && value.particles !== null ? value.particles : {};

  return {
    bg,
    colors,
    labels: isNonEmptyString(value.labels) ? value.labels.trim() : "white",
    particles: {
      type: isNonEmptyString(particles.type) ? particles.type.trim() : "custom",
      color: isNonEmptyString(particles.color) ? particles.color.trim() : "#ffffff",
    },
    meterBg: isNonEmptyString(value.meterBg) ? value.meterBg.trim() : "#111111",
  };
};

const sanitizeTheme = (themeId, customTheme) => {
  const resolvedThemeId = isNonEmptyString(themeId) ? themeId.trim() : DEFAULT_THEME_ID;
  if (resolvedThemeId === "custom") {
    const sanitizedCustomTheme = sanitizeCustomTheme(customTheme);
    if (sanitizedCustomTheme) {
      return { themeId: "custom", customTheme: sanitizedCustomTheme };
    }
    return { themeId: DEFAULT_THEME_ID, customTheme: null };
  }

  return { themeId: resolvedThemeId, customTheme: null };
};

const computeStatsSignature = (profile = {}) => {
  const sanitized = {
    streaks: sanitizeStreaks(profile.streaks),
    refusals: sanitizeNumericRecord(profile.refusals),
    triviaStats: sanitizeTriviaStats(profile.triviaStats),
    badges: sanitizeBadges(profile.badges),
  };

  return JSON.stringify(sanitized);
};

const mergeStreaks = (current, incoming) => {
  const base = sanitizeStreaks(current);
  const next = sanitizeStreaks(incoming);

  return {
    current: Math.max(base.current, next.current),
    best: Math.max(base.best, next.best),
  };
};

const mergeNumericTotals = (current = {}, incoming = {}) => {
  const currentSanitized = sanitizeNumericRecord(current);
  const incomingSanitized = sanitizeNumericRecord(incoming);
  const keys = new Set([...Object.keys(currentSanitized), ...Object.keys(incomingSanitized)]);

  const result = {};
  keys.forEach((key) => {
    result[key] = toPositiveNumber(currentSanitized[key], 0) + toPositiveNumber(incomingSanitized[key], 0);
  });

  return result;
};

const mergeTriviaStats = (current, incoming) => {
  const base = sanitizeTriviaStats(current);
  const next = sanitizeTriviaStats(incoming);

  return {
    correct: base.correct + next.correct,
    incorrect: base.incorrect + next.incorrect,
    streak: Math.max(base.streak, next.streak),
  };
};

const mergeBadges = (currentBadges = [], incomingBadges = []) => {
  const badges = new Set();
  sanitizeBadges(currentBadges).forEach((badge) => badges.add(badge));
  sanitizeBadges(incomingBadges).forEach((badge) => badges.add(badge));
  return Array.from(badges).sort();
};

const getSnapshotUpdateTime = (snapshot) => {
  if (!snapshot) {
    return 0;
  }
  const { updateTime } = snapshot;
  if (!updateTime) {
    return 0;
  }
  if (typeof updateTime.toMillis === "function") {
    try {
      return updateTime.toMillis();
    } catch (error) {
      console.warn("Failed to read snapshot update time", error);
      return 0;
    }
  }
  if (typeof updateTime === "number") {
    return updateTime;
  }
  return 0;
};

const sanitizePromptSnapshot = (docSnap) => {
  if (!docSnap) {
    return null;
  }
  const data = docSnap.data();
  if (!data) {
    return null;
  }

  const id = isNonEmptyString(docSnap.id) ? docSnap.id.trim() : null;
  const text = isNonEmptyString(data.text) ? data.text.trim() : null;
  const category = isNonEmptyString(data.category) ? data.category.trim() : null;

  if (!id || !text || !category) {
    return null;
  }

  const intensity = isNonEmptyString(data.intensity) ? data.intensity.trim() : null;

  return {
    id,
    text,
    category,
    intensity,
  };
};

const collectCustomPromptsForPlayer = async (playerRef) => {
  if (!playerRef) {
    return [];
  }

  const promptsRef = collection(playerRef, CUSTOM_PROMPTS_COLLECTION);
  const snapshot = await getDocs(promptsRef);
  const prompts = [];

  snapshot.forEach((docSnap) => {
    const prompt = sanitizePromptSnapshot(docSnap);
    if (prompt) {
      prompts.push(prompt);
    }
  });

  return prompts;
};

const mergeCustomPrompts = (entries) => {
  const merged = new Map();

  entries.forEach((entry) => {
    entry.prompts.forEach((prompt) => {
      const key = prompt.id || `${prompt.category}|${prompt.text}|${prompt.intensity ?? ""}`;
      if (!merged.has(key)) {
        merged.set(key, prompt);
      }
    });
  });

  return Array.from(merged.values());
};

const normalizeProfilePayload = (profile, fallbacks = {}) => {
  const username = isNonEmptyString(profile.username) ? profile.username.trim() : fallbacks.username;
  const avatar = isNonEmptyString(profile.avatar) ? profile.avatar.trim() : fallbacks.avatar;
  const { themeId, customTheme } = sanitizeTheme(profile.themeId, profile.customTheme);

  return {
    username,
    avatar,
    themeId,
    customTheme,
    streaks: sanitizeStreaks(profile.streaks),
    refusals: sanitizeNumericRecord(profile.refusals),
    triviaStats: sanitizeTriviaStats(profile.triviaStats),
    badges: sanitizeBadges(profile.badges),
  };
};

const getPlayerDocumentRef = (playerId) => {
  if (!db || typeof playerId !== "string" || playerId.trim().length === 0) {
    return null;
  }

  try {
    return doc(db, "players", playerId.trim());
  } catch (error) {
    console.warn("Failed to resolve player document reference", error);
    return null;
  }
};

const getPlayerCustomPromptsCollectionRef = (playerId) => {
  const playerDocRef = getPlayerDocumentRef(playerId);
  if (!playerDocRef) {
    return null;
  }

  try {
    return collection(playerDocRef, CUSTOM_PROMPTS_COLLECTION);
  } catch (error) {
    console.warn("Failed to resolve custom prompts collection", error);
    return null;
  }
};

const serializeCustomPromptForWrite = (prompt) => {
  const payload = {
    category: prompt.category,
    text: prompt.text,
  };

  if (typeof prompt.intensity === "string" && prompt.intensity.trim().length > 0) {
    payload.intensity = prompt.intensity.trim();
  } else {
    payload.intensity = null;
  }

  return payload;
};

const persistCustomPromptsToCollection = async (collectionRef, prompts = []) => {
  if (!db || !collectionRef) {
    throw new Error("Firestore is not initialized or collection reference is missing");
  }

  const batch = writeBatch(db);
  const desiredIds = new Set();
  let hasMutations = false;

  if (Array.isArray(prompts)) {
    prompts.forEach((prompt) => {
      if (!prompt || typeof prompt.id !== "string" || prompt.id.trim().length === 0) {
        return;
      }
      const trimmedId = prompt.id.trim();
      desiredIds.add(trimmedId);
      const docRef = doc(collectionRef, trimmedId);
      batch.set(docRef, serializeCustomPromptForWrite(prompt), { merge: true });
      hasMutations = true;
    });
  }

  const snapshot = await getDocs(collectionRef);
  snapshot.forEach((docSnap) => {
    if (!desiredIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
      hasMutations = true;
    }
  });

  if (!hasMutations) {
    return;
  }

  await batch.commit();
};

const persistCustomPromptsForPlayer = async (playerId, prompts = []) => {
  const collectionRef = getPlayerCustomPromptsCollectionRef(playerId);
  if (!collectionRef) {
    throw new Error("Unable to resolve player custom prompts collection");
  }

  await persistCustomPromptsToCollection(collectionRef, prompts);
};

const mergePlayerProfilesByUsername = async (playerId, options = {}) => {
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  if (!isNonEmptyString(playerId)) {
    throw new Error("A valid playerId is required to merge profiles");
  }

  const normalizedPlayerId = playerId.trim();
  const playerRef = getPlayerDocumentRef(normalizedPlayerId);
  if (!playerRef) {
    throw new Error("Unable to resolve player document reference");
  }

  const explicitUsername = isNonEmptyString(options.username) ? options.username.trim() : null;

  let primarySnapshot = null;
  let resolvedUsername = explicitUsername;

  if (!resolvedUsername) {
    primarySnapshot = await getDoc(playerRef);
    if (!primarySnapshot.exists()) {
      return null;
    }
    const primaryData = primarySnapshot.data() || {};
    if (!isNonEmptyString(primaryData.username)) {
      return null;
    }
    resolvedUsername = primaryData.username.trim();
  }

  const playersCollectionRef = collection(db, "players");
  const playersQuery = query(playersCollectionRef, where("username", "==", resolvedUsername));
  const querySnapshot = await getDocs(playersQuery);

  const entriesMap = new Map();

  querySnapshot.forEach((docSnap) => {
    entriesMap.set(docSnap.id, {
      id: docSnap.id,
      ref: docSnap.ref,
      data: docSnap.data() || {},
      snapshot: docSnap,
      updateTime: getSnapshotUpdateTime(docSnap),
    });
  });

  if (!entriesMap.has(normalizedPlayerId)) {
    if (!primarySnapshot) {
      primarySnapshot = await getDoc(playerRef);
    }
    if (primarySnapshot.exists()) {
      entriesMap.set(normalizedPlayerId, {
        id: normalizedPlayerId,
        ref: playerRef,
        data: primarySnapshot.data() || {},
        snapshot: primarySnapshot,
        updateTime: getSnapshotUpdateTime(primarySnapshot),
      });
    }
  }

  const entries = Array.from(entriesMap.values());
  if (entries.length === 0) {
    return null;
  }

  entries.sort((a, b) => {
    if (b.updateTime !== a.updateTime) {
      return b.updateTime - a.updateTime;
    }
    if (a.id === normalizedPlayerId) {
      return -1;
    }
    if (b.id === normalizedPlayerId) {
      return 1;
    }
    return a.id.localeCompare(b.id);
  });

  await Promise.all(
    entries.map(async (entry) => {
      entry.prompts = await collectCustomPromptsForPlayer(entry.ref);
    })
  );

  let resolvedAvatar = null;
  let resolvedTheme = null;
  let aggregatedStreaks = sanitizeStreaks();
  let aggregatedRefusals = {};
  let aggregatedTrivia = sanitizeTriviaStats();
  let aggregatedBadges = [];

  const seenSignatures = new Set();

  entries.forEach((entry) => {
    const signature = computeStatsSignature(entry.data);
    const hasBeenCounted = seenSignatures.has(signature);

    if (!resolvedAvatar && isNonEmptyString(entry.data.avatar)) {
      resolvedAvatar = entry.data.avatar.trim();
    }

    if (!resolvedTheme) {
      const hasThemeId = isNonEmptyString(entry.data.themeId);
      const hasCustomTheme = typeof entry.data.customTheme === "object" && entry.data.customTheme !== null;

      if (hasThemeId || hasCustomTheme) {
        const candidateTheme = sanitizeTheme(entry.data.themeId, entry.data.customTheme);
        if (candidateTheme.themeId !== "custom") {
          candidateTheme.customTheme = null;
        }
        resolvedTheme = candidateTheme;
      }
    }

    if (!hasBeenCounted) {
      aggregatedStreaks = mergeStreaks(aggregatedStreaks, entry.data.streaks);
      aggregatedRefusals = mergeNumericTotals(aggregatedRefusals, entry.data.refusals);
      aggregatedTrivia = mergeTriviaStats(aggregatedTrivia, entry.data.triviaStats);
      aggregatedBadges = mergeBadges(aggregatedBadges, entry.data.badges);
      seenSignatures.add(signature);
    }
  });

  const mergedPrompts = mergeCustomPrompts(entries);

  if (!resolvedTheme) {
    resolvedTheme = sanitizeTheme(null, null);
  }

  const mergedProfile = normalizeProfilePayload(
    {
      username: resolvedUsername,
      avatar: resolvedAvatar ?? DEFAULT_AVATAR,
      themeId: resolvedTheme ? resolvedTheme.themeId : DEFAULT_THEME_ID,
      customTheme: resolvedTheme ? resolvedTheme.customTheme : null,
      streaks: aggregatedStreaks,
      refusals: aggregatedRefusals,
      triviaStats: aggregatedTrivia,
      badges: aggregatedBadges,
    },
    {
      username: resolvedUsername,
      avatar: DEFAULT_AVATAR,
    }
  );

  const finalSignature = computeStatsSignature(mergedProfile);

  const batch = writeBatch(db);
  entries.forEach((entry) => {
    batch.set(
      entry.ref,
      {
        username: mergedProfile.username,
        avatar: mergedProfile.avatar,
        themeId: mergedProfile.themeId,
        customTheme: mergedProfile.themeId === "custom" ? mergedProfile.customTheme : null,
        streaks: mergedProfile.streaks,
        refusals: mergedProfile.refusals,
        triviaStats: mergedProfile.triviaStats,
        badges: mergedProfile.badges,
        mergeSignature: finalSignature,
      },
      { merge: true }
    );
  });

  await batch.commit();

  await Promise.all(
    entries.map((entry) =>
      persistCustomPromptsToCollection(collection(entry.ref, CUSTOM_PROMPTS_COLLECTION), mergedPrompts)
    )
  );

  return {
    playerIds: entries.map((entry) => entry.id),
    profile: mergedProfile,
    prompts: mergedPrompts,
  };
};

export {
  CUSTOM_PROMPTS_COLLECTION,
  getPlayerCustomPromptsCollectionRef,
  mergePlayerProfilesByUsername,
  persistCustomPromptsForPlayer,
  persistCustomPromptsToCollection,
};

