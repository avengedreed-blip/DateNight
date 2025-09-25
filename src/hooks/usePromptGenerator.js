import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "../config/firebase";
import { defaultPrompts, PROMPT_CATEGORIES, PROMPT_INTENSITIES } from "../config/prompts";
import {
  CUSTOM_PROMPTS_COLLECTION,
  getPlayerCustomPromptsCollectionRef,
  persistCustomPromptsForPlayer,
  persistCustomPromptsToCollection,
} from "../firebase/profile";

const LOCAL_STORAGE_KEY = "customPrompts";
const DEFAULT_REMOTE_COLLECTION = CUSTOM_PROMPTS_COLLECTION;

const CATEGORY_SET = new Set(PROMPT_CATEGORIES);
const INTENSITY_SET = new Set(PROMPT_INTENSITIES);
const INTENSITY_REQUIRED_CATEGORIES = new Set(["truth", "dare", "consequence"]);

const MAX_WEIGHT = 1;
const MIN_WEIGHT = 0.1;
const RECOVERY_STEP = 0.2;
const HISTORY_PENALTY = 0.35;
const HISTORY_LIMIT = 4;

const isPlainObject = (value) =>
  typeof value === "object" && value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const buildPromptKey = (category, intensity, text) => {
  const normalizedText = text.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedIntensity = intensity ? intensity.trim().toLowerCase() : "default";
  return `${normalizedCategory}::${normalizedIntensity}::${normalizedText}`;
};

const sortPrompts = (prompts) =>
  [...prompts].sort((a, b) => a.id.localeCompare(b.id));

const promptListsEqual = (a, b) => {
  if (a === b) {
    return true;
  }
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const current = a[index];
    const other = b[index];
    if (
      current.id !== other.id ||
      current.category !== other.category ||
      (current.intensity ?? null) !== (other.intensity ?? null) ||
      current.text !== other.text
    ) {
      return false;
    }
  }
  return true;
};

const sanitizeCategory = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return CATEGORY_SET.has(normalized) ? normalized : null;
};

const sanitizeIntensity = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return INTENSITY_SET.has(normalized) ? normalized : null;
};

const sanitizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "";
};

const sanitizeId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const createGeneratedId = ({ category, intensity, text, counter, existingIds }) => {
  const slug = slugify(text);
  const scope = intensity ? `${category}-${intensity}` : category;
  const base = `custom:${scope}`;
  const slugPart = slug.length > 0 ? slug : `${counter}`;
  let candidate = `${base}-${slugPart}`;
  let suffix = 1;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${slugPart}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const normalizePromptEntry = (entry, { existingIds, existingKeys, counterRef }) => {
  if (!isPlainObject(entry)) {
    return null;
  }

  const text = sanitizeText(entry.text);
  if (!text) {
    return null;
  }

  const category = sanitizeCategory(entry.category);
  if (!category) {
    return null;
  }

  let intensity = null;
  if (INTENSITY_REQUIRED_CATEGORIES.has(category)) {
    intensity = sanitizeIntensity(entry.intensity) ?? "normal";
  }

  const providedId = sanitizeId(entry.id);
  let id = providedId;

  if (!id) {
    counterRef.current += 1;
    id = createGeneratedId({
      category,
      intensity,
      text,
      counter: counterRef.current,
      existingIds,
    });
  }

  const promptKey = buildPromptKey(category, intensity ?? null, text);
  if (existingKeys.has(promptKey)) {
    return null;
  }

  existingIds.add(id);
  existingKeys.add(promptKey);

  return intensity
    ? { id, category, intensity, text }
    : { id, category, text };
};

const normalizePromptList = (entries, { existingIds, existingKeys }) => {
  const counterRef = { current: 0 };
  const normalized = [];

  if (!Array.isArray(entries)) {
    return normalized;
  }

  entries.forEach((entry) => {
    const normalizedEntry = normalizePromptEntry(entry, { existingIds, existingKeys, counterRef });
    if (normalizedEntry) {
      normalized.push(normalizedEntry);
    }
  });

  return sortPrompts(normalized);
};

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

const parseStoredPrompts = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse custom prompts from localStorage", error);
    return [];
  }
};

const buildPromptMap = (prompts) => {
  const map = new Map();

  prompts.forEach((prompt) => {
    const key = prompt.intensity
      ? `${prompt.category}:${prompt.intensity}`
      : `${prompt.category}:default`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(prompt);
  });

  return map;
};

const updateHistory = (historyMap, key, promptId) => {
  const queue = historyMap.get(key) ?? [];
  queue.push(promptId);
  while (queue.length > HISTORY_LIMIT) {
    queue.shift();
  }
  historyMap.set(key, queue);
};

const getHistorySet = (historyMap, key) => new Set(historyMap.get(key) ?? []);

const usePromptGenerator = ({
  playerId = null,
  remoteCollection = null,
  storageKey = LOCAL_STORAGE_KEY,
} = {}) => {
  const resolvedStorageKey = storageKey ?? LOCAL_STORAGE_KEY;

  const [localCustomPrompts, setLocalCustomPrompts] = useState([]);
  const [remoteCustomPrompts, setRemoteCustomPrompts] = useState([]);
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);
  const [isRemoteLoaded, setIsRemoteLoaded] = useState(false);
  const [lastError, setLastError] = useState(null);

  const weightsRef = useRef(new Map());
  const historyRef = useRef(new Map());
  const customPromptsRef = useRef([]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      setIsLocalLoaded(true);
      return;
    }

    try {
      const storedValue = storage.getItem(resolvedStorageKey);
      const parsed = parseStoredPrompts(storedValue);
      const normalized = normalizePromptList(parsed, {
        existingIds: new Set(),
        existingKeys: new Set(),
      });
      setLocalCustomPrompts(normalized);
    } catch (error) {
      console.warn("Failed to load custom prompts from localStorage", error);
      setLocalCustomPrompts([]);
    } finally {
      setIsLocalLoaded(true);
    }
  }, [resolvedStorageKey]);

  const remoteConfig = useMemo(() => {
    if (!db) {
      return { type: "none", collectionRef: null, playerId: null };
    }

    if (playerId) {
      const collectionRef = getPlayerCustomPromptsCollectionRef(playerId);
      if (!collectionRef) {
        return { type: "none", collectionRef: null, playerId: null };
      }
      return { type: "player", collectionRef, playerId };
    }

    const targetCollection = remoteCollection ?? DEFAULT_REMOTE_COLLECTION;
    if (!targetCollection) {
      return { type: "none", collectionRef: null, playerId: null };
    }

    const collectionRef = Array.isArray(targetCollection)
      ? collection(db, ...targetCollection)
      : collection(db, targetCollection);

    return { type: "collection", collectionRef, playerId: null };
  }, [playerId, remoteCollection, db]);

  useEffect(() => {
    const { collectionRef } = remoteConfig;
    if (!collectionRef) {
      setIsRemoteLoaded(true);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setRemoteCustomPrompts(docs);
        setIsRemoteLoaded(true);
        setLastError(null);
      },
      (error) => {
        console.error("Failed to load custom prompts from Firestore", error);
        setIsRemoteLoaded(true);
        setLastError(error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [remoteConfig]);

  const normalizedCustomSources = useMemo(() => {
    const existingIds = new Set();
    const existingKeys = new Set();

    const normalizedLocal = normalizePromptList(localCustomPrompts, { existingIds, existingKeys });
    const normalizedRemote = normalizePromptList(remoteCustomPrompts, { existingIds, existingKeys });
    const union = sortPrompts([...normalizedLocal, ...normalizedRemote]);

    return { normalizedLocal, normalizedRemote, union };
  }, [localCustomPrompts, remoteCustomPrompts]);

  const customPrompts = normalizedCustomSources.union;

  useEffect(() => {
    customPromptsRef.current = customPrompts;
  }, [customPrompts]);

  useEffect(() => {
    if (!isLocalLoaded) {
      return;
    }

    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(resolvedStorageKey, JSON.stringify(customPrompts));
    } catch (error) {
      console.warn("Failed to persist custom prompts to localStorage", error);
    }
  }, [customPrompts, isLocalLoaded, resolvedStorageKey]);

  const mergedPrompts = useMemo(() => {
    const existingIds = new Set();
    const existingKeys = new Set();

    defaultPrompts.forEach((prompt) => {
      existingIds.add(prompt.id);
      existingKeys.add(buildPromptKey(prompt.category, prompt.intensity ?? null, prompt.text));
    });

    const normalizedLocal = normalizePromptList(localCustomPrompts, { existingIds, existingKeys });
    const normalizedRemote = normalizePromptList(remoteCustomPrompts, { existingIds, existingKeys });

    const byId = new Map();

    defaultPrompts.forEach((prompt) => {
      byId.set(prompt.id, prompt);
    });

    normalizedLocal.forEach((prompt) => {
      byId.set(prompt.id, prompt);
    });

    normalizedRemote.forEach((prompt) => {
      byId.set(prompt.id, prompt);
    });

    return Array.from(byId.values());
  }, [localCustomPrompts, remoteCustomPrompts]);

  const persistCustomPromptList = useCallback(
    async (promptsToPersist) => {
      if (!remoteConfig.collectionRef) {
        return;
      }

      try {
        if (remoteConfig.type === "player") {
          await persistCustomPromptsForPlayer(remoteConfig.playerId, promptsToPersist);
        } else if (remoteConfig.type === "collection") {
          await persistCustomPromptsToCollection(remoteConfig.collectionRef, promptsToPersist);
        }
        setLastError(null);
      } catch (error) {
        console.error("Failed to persist custom prompts to Firestore", error);
        setLastError(error);
      }
    },
    [remoteConfig]
  );

  const updateCustomPrompts = useCallback(
    async (updates = []) => {
      const current = customPromptsRef.current;
      const nextInput = typeof updates === "function" ? updates(current) : updates;
      const existingIds = new Set();
      const existingKeys = new Set();
      const normalizedNext = normalizePromptList(nextInput, { existingIds, existingKeys });

      if (promptListsEqual(current, normalizedNext)) {
        return current;
      }

      setLocalCustomPrompts(normalizedNext);
      customPromptsRef.current = normalizedNext;

      await persistCustomPromptList(normalizedNext);

      return normalizedNext;
    },
    [persistCustomPromptList]
  );

  const addCustomPrompt = useCallback(
    (entry) => updateCustomPrompts((current) => [...current, entry]),
    [updateCustomPrompts]
  );

  const removeCustomPrompt = useCallback(
    (promptId) =>
      updateCustomPrompts((current) => current.filter((prompt) => prompt.id !== promptId)),
    [updateCustomPrompts]
  );

  const replaceCustomPrompts = useCallback(
    (entries = []) => updateCustomPrompts(entries),
    [updateCustomPrompts]
  );

  useEffect(() => {
    const validIds = new Set(mergedPrompts.map((prompt) => prompt.id));
    const weights = weightsRef.current;
    const history = historyRef.current;

    Array.from(weights.keys()).forEach((key) => {
      if (!validIds.has(key)) {
        weights.delete(key);
      }
    });

    Array.from(history.keys()).forEach((poolKey) => {
      const filtered = (history.get(poolKey) ?? []).filter((id) => validIds.has(id));
      if (filtered.length > 0) {
        history.set(poolKey, filtered);
      } else {
        history.delete(poolKey);
      }
    });
  }, [mergedPrompts]);

  const promptPools = useMemo(() => buildPromptMap(mergedPrompts), [mergedPrompts]);

  const getPrompt = useCallback(
    (categoryInput, intensityInput) => {
      const category = sanitizeCategory(categoryInput);
      if (!category) {
        return null;
      }

      const intensity = INTENSITY_REQUIRED_CATEGORIES.has(category)
        ? sanitizeIntensity(intensityInput) ?? "normal"
        : null;

      const poolKey = intensity ? `${category}:${intensity}` : `${category}:default`;
      const pool = promptPools.get(poolKey);
      if (!pool || pool.length === 0) {
        return null;
      }

      const weights = weightsRef.current;

      pool.forEach((prompt) => {
        const entry = weights.get(prompt.id);
        if (!entry) {
          weights.set(prompt.id, { weight: MAX_WEIGHT });
        } else if (entry.weight < MAX_WEIGHT) {
          entry.weight = Math.min(MAX_WEIGHT, entry.weight + RECOVERY_STEP);
        }
      });

      const recentSelections = getHistorySet(historyRef.current, poolKey);

      let totalWeight = 0;
      const weightedPool = pool.map((prompt) => {
        const entry = weights.get(prompt.id) ?? { weight: MAX_WEIGHT };
        let weight = entry.weight;
        if (recentSelections.has(prompt.id)) {
          weight = Math.max(weight * HISTORY_PENALTY, MIN_WEIGHT);
        }
        totalWeight += weight;
        return { prompt, weight };
      });

      let selectedPrompt = pool[0];

      if (totalWeight > 0) {
        const roll = Math.random() * totalWeight;
        let cumulative = 0;
        selectedPrompt = weightedPool[weightedPool.length - 1].prompt;

        for (let index = 0; index < weightedPool.length; index += 1) {
          const entry = weightedPool[index];
          cumulative += entry.weight;
          if (roll <= cumulative) {
            selectedPrompt = entry.prompt;
            break;
          }
        }
      }

      const selectedEntry = weights.get(selectedPrompt.id) ?? { weight: MAX_WEIGHT };
      selectedEntry.weight = MIN_WEIGHT;
      weights.set(selectedPrompt.id, selectedEntry);

      updateHistory(historyRef.current, poolKey, selectedPrompt.id);

      return selectedPrompt;
    },
    [promptPools]
  );

  const isReady = isLocalLoaded && isRemoteLoaded;

  return useMemo(
    () => ({
      isReady,
      prompts: mergedPrompts,
      customPrompts,
      lastError,
      getPrompt,
      updateCustomPrompts,
      addCustomPrompt,
      removeCustomPrompt,
      replaceCustomPrompts,
    }),
    [
      addCustomPrompt,
      customPrompts,
      getPrompt,
      isReady,
      lastError,
      mergedPrompts,
      removeCustomPrompt,
      replaceCustomPrompts,
      updateCustomPrompts,
    ]
  );
};

export { usePromptGenerator };
export default usePromptGenerator;
