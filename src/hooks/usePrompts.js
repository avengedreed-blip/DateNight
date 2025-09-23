import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../config/firebase.js";
import { defaultPrompts } from "../config/prompts.js";

const PROMPT_CACHE_VERSION = 1;
const PROMPT_CACHE_KEY = `dateNightPromptCache::v${PROMPT_CACHE_VERSION}`;

const clonePrompts = (source) => JSON.parse(JSON.stringify(source));

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readCachedPrompts = () => {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PROMPT_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== PROMPT_CACHE_VERSION ||
      !parsed.prompts
    ) {
      return null;
    }

    return parsed.prompts;
  } catch (error) {
    console.warn("Failed to read cached prompts", error);
    return null;
  }
};

const persistPromptCache = (prompts) => {
  if (!isBrowser()) {
    return;
  }

  try {
    const payload = {
      version: PROMPT_CACHE_VERSION,
      updatedAt: Date.now(),
      prompts,
    };
    window.localStorage.setItem(PROMPT_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to cache prompts locally", error);
  }
};

export function usePrompts(gameId) {
  const [prompts, setPrompts] = useState(() => {
    const cached = readCachedPrompts();
    if (cached) {
      return clonePrompts(cached);
    }

    return clonePrompts(defaultPrompts);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const applyPrompts = useCallback((nextPrompts, { persist = true } = {}) => {
    const safePrompts = clonePrompts(nextPrompts ?? defaultPrompts);
    setPrompts(safePrompts);

    if (persist) {
      persistPromptCache(safePrompts);
    }
  }, []);

  const hydrateFromCache = useCallback(() => {
    const cached = readCachedPrompts();
    if (!cached) {
      return false;
    }

    applyPrompts(cached, { persist: false });
    return true;
  }, [applyPrompts]);

  useEffect(() => {
    let unsubscribe = null;
    let isActive = true;

    setIsLoading(true);
    setError(null);

    const loadPrompts = async () => {
      if (!gameId || !db) {
        if (isActive) {
          const hydrated = hydrateFromCache();
          if (!hydrated) {
            applyPrompts(defaultPrompts);
          }
          setIsLoading(false);
        }
        return;
      }

      try {
        const promptsRef = doc(db, "dateNightGames", gameId);
        const snapshot = await getDoc(promptsRef);

        if (!snapshot.exists()) {
          await setDoc(promptsRef, defaultPrompts);
          if (isActive) {
            applyPrompts(defaultPrompts);
          }
        } else if (isActive) {
          applyPrompts(snapshot.data());
        }

        unsubscribe = onSnapshot(
          promptsRef,
          (docSnapshot) => {
            if (!isActive) {
              return;
            }

            if (docSnapshot.exists()) {
              applyPrompts(docSnapshot.data());
            }
          },
          (snapshotError) => {
            console.error("Error with Firestore snapshot listener:", snapshotError);
            if (isActive) {
              const hydrated = hydrateFromCache();
              if (!hydrated) {
                applyPrompts(defaultPrompts);
              }
              setError(
                "We couldn't stay in sync with the server. Using the local prompts for now."
              );
            }
          }
        );
      } catch (loadError) {
        console.error("Failed to load prompts from Firestore", loadError);
        if (isActive) {
          const hydrated = hydrateFromCache();
          if (!hydrated) {
            applyPrompts(defaultPrompts);
          }
          setError("We couldn't load your shared prompts. Try again in a moment.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadPrompts();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [applyPrompts, gameId, hydrateFromCache, reloadToken]);

  const savePrompts = useCallback(
    (nextPrompts) => {
      applyPrompts(nextPrompts);

      if (!gameId || !db) {
        return;
      }

      const promptsRef = doc(db, "dateNightGames", gameId);
      setDoc(promptsRef, nextPrompts).catch((persistError) => {
        console.error("Failed to persist prompts to Firestore", persistError);
      });
    },
    [applyPrompts, gameId]
  );

  const retry = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  const promptGroups = useMemo(
    () => ({
      truth: prompts.truthPrompts?.normal ?? [],
      spicyTruth: prompts.truthPrompts?.spicy ?? [],
      truthExtreme: prompts.truthPrompts?.extreme ?? [],
      dare: prompts.darePrompts?.normal ?? [],
      spicyDare: prompts.darePrompts?.spicy ?? [],
      dareExtreme: prompts.darePrompts?.extreme ?? [],
      trivia: prompts.triviaQuestions?.normal ?? [],
      consequenceNormal: prompts.consequences?.normal ?? [],
      consequenceSpicy: prompts.consequences?.spicy ?? [],
      consequenceExtreme: prompts.consequences?.extreme ?? [],
    }),
    [prompts]
  );

  return { prompts, savePrompts, promptGroups, isLoading, error, retry };
}
