import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../firebase/config";

const TRACK_FILE_MAP = Object.freeze({
  "classic-dark": "bgm_classic_dark.mp3",
  "romantic-glow": "bgm_romantic_glow.mp3",
  "playful-neon": "bgm_playful_neon.mp3",
  "mystic-night": "bgm_mystic_night.mp3",
});

const TRACK_IDS = Object.freeze(Object.keys(TRACK_FILE_MAP));
const DEFAULT_TRACK_ID = "classic-dark";
const BGM_PUBLIC_PATH = "/audio/bgm";
const PLACEHOLDER_TRACK = "/audio/placeholder.mp3";
const LOCAL_STORAGE_KEY = "date-night/musicTrackId";
const CROSSFADE_DURATION_MS = 1000;

export const MUSIC_TRACK_OPTIONS = Object.freeze(
  TRACK_IDS.map((trackId) => ({
    id: trackId,
    label: trackId
      .split("-")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" "),
  }))
);

const isBrowser = typeof window !== "undefined";

const trackSourceCache = new Map();
const trackCheckPromises = new Map();
const missingTrackWarnings = new Set();
let hasSuccessfulTrackResolution = false;
let loggedMissingDirectoryWarning = false;

const verifyFileAvailability = async (url) => {
  if (!isBrowser || typeof fetch !== "function") {
    return true;
  }

  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.warn(`Failed to verify background music file "${url}"`, error);
    return false;
  }
};

const resolveTrackSource = async (trackId) => {
  if (trackSourceCache.has(trackId)) {
    return trackSourceCache.get(trackId);
  }

  const filename = TRACK_FILE_MAP[trackId];
  if (!filename) {
    console.warn(`Unknown music track: ${trackId}`);
    trackSourceCache.set(trackId, PLACEHOLDER_TRACK);
    return PLACEHOLDER_TRACK;
  }

  const candidatePath = `${BGM_PUBLIC_PATH}/${filename}`;

  if (!trackCheckPromises.has(candidatePath)) {
    trackCheckPromises.set(candidatePath, verifyFileAvailability(candidatePath));
  }

  const exists = await trackCheckPromises.get(candidatePath);

  if (exists) {
    hasSuccessfulTrackResolution = true;
    trackSourceCache.set(trackId, candidatePath);
    return candidatePath;
  }

  if (!hasSuccessfulTrackResolution && !loggedMissingDirectoryWarning) {
    console.warn(
      "No background music files found in /audio/bgm/. Using placeholder track."
    );
    loggedMissingDirectoryWarning = true;
  } else if (!missingTrackWarnings.has(candidatePath)) {
    console.warn(
      `Background music file missing: ${candidatePath}. Falling back to placeholder.`
    );
    missingTrackWarnings.add(candidatePath);
  }

  trackSourceCache.set(trackId, PLACEHOLDER_TRACK);
  return PLACEHOLDER_TRACK;
};

const getStorage = () => {
  if (!isBrowser) {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn("localStorage is not accessible", error);
    return null;
  }
};

const clampVolume = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }
  return Math.min(Math.max(value, 0), 1);
};

const isAutoplayError = (error) => {
  if (!error) {
    return false;
  }
  return error.name === "NotAllowedError" || error.name === "SecurityError";
};

const loadTrackFromStorage = (key) => {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_TRACK_ID;
  }

  try {
    const stored = storage.getItem(key);
    if (stored && Object.prototype.hasOwnProperty.call(TRACK_FILE_MAP, stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("Failed to load music track from localStorage", error);
  }

  return DEFAULT_TRACK_ID;
};

const persistTrackToStorage = (key, trackId) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, trackId);
  } catch (error) {
    console.warn("Failed to persist music track to localStorage", error);
  }
};

const createAudioElement = (src) => {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.loop = false;
  audio.crossOrigin = "anonymous";
  audio.playsInline = true;
  return audio;
};

export function useMusic({ storageKey = LOCAL_STORAGE_KEY } = {}) {
  const firestoreDocRef = useMemo(() => {
    if (!db) {
      return null;
    }
    return doc(db, "settings", "music");
  }, []);

  const [currentTrackId, setCurrentTrackId] = useState(() =>
    loadTrackFromStorage(storageKey)
  );
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const trackIdRef = useRef(currentTrackId);
  const shouldPlayRef = useRef(false);
  const isManuallyStoppedRef = useRef(false);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const activeAudioRef = useRef(null);
  const fadeFrameRef = useRef(null);
  const fadeContextRef = useRef(null);
  const pendingResumeRef = useRef(null);
  const resumeListenerRef = useRef(null);
  const updateSourceRef = useRef("storage");
  const unsubscribeRef = useRef(null);
  const startRequestIdRef = useRef(0);

  const cleanupAudio = useCallback((entry) => {
    if (!entry) {
      return;
    }
    const { element, loopHandler } = entry;
    element.pause();
    try {
      element.currentTime = 0;
    } catch (error) {
      console.warn("Failed to reset audio element", error);
    }
    element.volume = volumeRef.current;
    element.muted = true;
    if (loopHandler) {
      element.removeEventListener("ended", loopHandler);
    }
  }, []);

  const cancelFade = useCallback(() => {
    const context = fadeContextRef.current;
    if (fadeFrameRef.current) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
    fadeContextRef.current = null;

    if (context && context.nextEntry && activeAudioRef.current !== context.nextEntry) {
      cleanupAudio(context.nextEntry);
    }
  }, [cleanupAudio]);

  const removeResumeListeners = useCallback(() => {
    if (!resumeListenerRef.current || !isBrowser) {
      return;
    }
    const handler = resumeListenerRef.current;
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("keydown", handler);
    resumeListenerRef.current = null;
  }, []);

  const resumePendingPlayback = useCallback(() => {
    const resume = pendingResumeRef.current;
    if (!resume) {
      removeResumeListeners();
      return;
    }

    pendingResumeRef.current = null;

    Promise.resolve()
      .then(() => resume())
      .catch((error) => {
        if (isAutoplayError(error)) {
          pendingResumeRef.current = resume;
          return;
        }
        console.error("Failed to resume background music", error);
      })
      .finally(() => {
        if (!pendingResumeRef.current) {
          removeResumeListeners();
        }
      });
  }, [removeResumeListeners]);

  const addResumeListeners = useCallback(() => {
    if (!isBrowser || resumeListenerRef.current) {
      return;
    }
    const handler = () => {
      resumePendingPlayback();
    };
    resumeListenerRef.current = handler;
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("touchstart", handler, { passive: true });
    window.addEventListener("keydown", handler);
  }, [resumePendingPlayback]);

  const handleAutoplayRestriction = useCallback(
    (audio) => {
      if (!isBrowser) {
        return;
      }

      const attemptPlayback = async () => {
        try {
          await audio.play();
          audio.muted = isMutedRef.current;
          audio.volume = isMutedRef.current ? 0 : volumeRef.current;
        } catch (error) {
          if (isAutoplayError(error)) {
            pendingResumeRef.current = attemptPlayback;
            return;
          }
          console.error("Failed to resume background music", error);
        }
      };

      pendingResumeRef.current = attemptPlayback;
      addResumeListeners();
    },
    [addResumeListeners]
  );

  const safePlay = useCallback(
    (audio) => {
      if (!audio) {
        return Promise.resolve();
      }

      try {
        const playResult = audio.play();
        if (!playResult || typeof playResult.then !== "function") {
          return Promise.resolve();
        }

        return playResult.catch((error) => {
          if (isAutoplayError(error)) {
            handleAutoplayRestriction(audio);
            return;
          }
          console.error("Failed to start background music", error);
        });
      } catch (error) {
        if (isAutoplayError(error)) {
          handleAutoplayRestriction(audio);
          return Promise.resolve();
        }
        console.error("Failed to start background music", error);
        return Promise.resolve();
      }
    },
    [handleAutoplayRestriction]
  );

  const performCrossfade = useCallback(
    (previousEntry, nextEntry) => {
      cancelFade();

      const context = {
        previousEntry,
        nextEntry,
        startedAt: performance.now(),
      };

      fadeContextRef.current = context;

      const previousAudio = previousEntry ? previousEntry.element : null;
      const previousStartVolume = previousAudio ? previousAudio.volume : 0;
      const nextAudio = nextEntry.element;
      nextAudio.volume = 0;
      nextAudio.muted = isMutedRef.current;

      const step = () => {
        if (fadeContextRef.current !== context) {
          return;
        }

        const elapsed = performance.now() - context.startedAt;
        const ratio = Math.min(elapsed / CROSSFADE_DURATION_MS, 1);

        if (previousAudio) {
          previousAudio.volume = previousStartVolume * (1 - ratio);
        }

        if (!isMutedRef.current) {
          nextAudio.volume = volumeRef.current * ratio;
        } else {
          nextAudio.volume = 0;
        }

        if (ratio < 1) {
          fadeFrameRef.current = requestAnimationFrame(step);
          return;
        }

        fadeContextRef.current = null;
        fadeFrameRef.current = null;

        if (previousAudio) {
          previousAudio.volume = 0;
        }

        nextAudio.volume = isMutedRef.current ? 0 : volumeRef.current;

        if (previousEntry) {
          cleanupAudio(previousEntry);
        }

        activeAudioRef.current = nextEntry;

        if (!shouldPlayRef.current) {
          nextAudio.pause();
        }
      };

      fadeFrameRef.current = requestAnimationFrame(step);
    },
    [cancelFade, cleanupAudio]
  );

  const startPlayback = useCallback(
    (nextTrackId) => {
      const requestId = startRequestIdRef.current + 1;
      startRequestIdRef.current = requestId;

      resolveTrackSource(nextTrackId)
        .then((source) => {
          if (startRequestIdRef.current !== requestId) {
            return;
          }

          if (!source) {
            console.warn(`Unable to resolve music source for track: ${nextTrackId}`);
            return;
          }

          const currentEntry = activeAudioRef.current;
          if (currentEntry && currentEntry.id === nextTrackId && currentEntry.src === source) {
            if (currentEntry.element.paused && shouldPlayRef.current) {
              safePlay(currentEntry.element);
            }
            currentEntry.element.muted = isMutedRef.current;
            currentEntry.element.volume = isMutedRef.current ? 0 : volumeRef.current;
            return;
          }

          const audio = createAudioElement(source);
          audio.muted = isMutedRef.current;
          audio.volume = 0;

          const loopHandler = () => {
            audio.currentTime = 0;
            safePlay(audio);
          };

          audio.addEventListener("ended", loopHandler);

          const nextEntry = {
            id: nextTrackId,
            element: audio,
            loopHandler,
            src: source,
          };

          performCrossfade(currentEntry, nextEntry);
          safePlay(audio);
        })
        .catch((error) => {
          console.error("Failed to start playback for background music", error);
        });
    },
    [performCrossfade, safePlay]
  );

  const persistTrackToFirestore = useCallback(
    (trackId) => {
      if (!firestoreDocRef) {
        return;
      }

      setDoc(firestoreDocRef, { musicTrackId: trackId }, { merge: true }).catch(
        (error) => {
          console.error("Failed to persist music track to Firestore", error);
        }
      );
    },
    [firestoreDocRef]
  );

  const playTrack = useCallback(
    (themeKey) => {
      const nextTrackId = Object.prototype.hasOwnProperty.call(
        TRACK_FILE_MAP,
        themeKey
      )
        ? themeKey
        : DEFAULT_TRACK_ID;

      shouldPlayRef.current = true;
      isManuallyStoppedRef.current = false;

      if (trackIdRef.current === nextTrackId) {
        updateSourceRef.current = null;
        startPlayback(nextTrackId);
        return;
      }

      updateSourceRef.current = "local";
      setCurrentTrackId(nextTrackId);
    },
    [startPlayback]
  );

  const stopTrack = useCallback(() => {
    shouldPlayRef.current = false;
    isManuallyStoppedRef.current = true;
    cancelFade();

    if (pendingResumeRef.current) {
      pendingResumeRef.current = null;
    }
    removeResumeListeners();

    const activeEntry = activeAudioRef.current;
    if (!activeEntry) {
      return;
    }

    const audio = activeEntry.element;
    const startVolume = audio.volume;
    const context = {
      type: "stop",
      startedAt: performance.now(),
      entry: activeEntry,
      startVolume,
    };

    fadeContextRef.current = context;

    const step = () => {
      if (fadeContextRef.current !== context) {
        return;
      }

      const elapsed = performance.now() - context.startedAt;
      const ratio = Math.min(elapsed / CROSSFADE_DURATION_MS, 1);
      audio.volume = startVolume * (1 - ratio);

      if (ratio < 1) {
        fadeFrameRef.current = requestAnimationFrame(step);
        return;
      }

      fadeContextRef.current = null;
      fadeFrameRef.current = null;
      cleanupAudio(activeEntry);
      activeAudioRef.current = null;
    };

    fadeFrameRef.current = requestAnimationFrame(step);
  }, [cancelFade, cleanupAudio, removeResumeListeners]);

  const setVolume = useCallback((value) => {
    const normalized = clampVolume(value);
    volumeRef.current = normalized;
    setVolumeState(normalized);

    const activeEntry = activeAudioRef.current;
    if (activeEntry) {
      activeEntry.element.volume = isMutedRef.current ? 0 : normalized;
    }

    const pendingEntry = fadeContextRef.current?.nextEntry;
    if (pendingEntry) {
      pendingEntry.element.volume = isMutedRef.current ? 0 : normalized;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;

      const activeEntry = activeAudioRef.current;
      if (activeEntry) {
        activeEntry.element.muted = next;
        if (!next) {
          activeEntry.element.volume = volumeRef.current;
        }
      }

      const fadeContext = fadeContextRef.current;
      if (fadeContext && fadeContext.nextEntry) {
        fadeContext.nextEntry.element.muted = next;
        if (!next) {
          fadeContext.nextEntry.element.volume = volumeRef.current;
        }
      }

      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelFade();
      removeResumeListeners();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (fadeContextRef.current && fadeContextRef.current.nextEntry) {
        cleanupAudio(fadeContextRef.current.nextEntry);
      }
      cleanupAudio(activeAudioRef.current);
      activeAudioRef.current = null;
    };
  }, [cancelFade, cleanupAudio, removeResumeListeners]);

  useEffect(() => {
    trackIdRef.current = currentTrackId;
  }, [currentTrackId]);

  useEffect(() => {
    if (!firestoreDocRef) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      firestoreDocRef,
      (snapshot) => {
        const data = snapshot.data();
        const remoteTrackId =
          data && typeof data.musicTrackId === "string"
            ? data.musicTrackId
            : null;

        if (!remoteTrackId) {
          if (updateSourceRef.current === "storage") {
            persistTrackToFirestore(trackIdRef.current);
            updateSourceRef.current = null;
          }
          return;
        }

        if (
          Object.prototype.hasOwnProperty.call(TRACK_FILE_MAP, remoteTrackId) &&
          remoteTrackId !== trackIdRef.current
        ) {
          updateSourceRef.current = "remote";
          if (!isManuallyStoppedRef.current) {
            shouldPlayRef.current = true;
          }
          setCurrentTrackId(remoteTrackId);
        }
      },
      (error) => {
        console.error("Failed to subscribe to music track changes", error);
      }
    );

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
    };
  }, [firestoreDocRef, persistTrackToFirestore]);

  useEffect(() => {
    const trackId = currentTrackId;
    if (!trackId) {
      return;
    }

    persistTrackToStorage(storageKey, trackId);

    if (updateSourceRef.current === "local") {
      persistTrackToFirestore(trackId);
    }

    if (shouldPlayRef.current) {
      startPlayback(trackId);
    }

    updateSourceRef.current = null;
  }, [currentTrackId, persistTrackToFirestore, startPlayback, storageKey]);

  return {
    currentTrackId,
    isMuted,
    volume,
    playTrack,
    stopTrack,
    setVolume,
    toggleMute,
  };
}

export default useMusic;
