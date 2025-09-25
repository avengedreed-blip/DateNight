import { useCallback, useMemo } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "../config/firebase";

const EVENTS_COLLECTION = "analytics";

const defaultMetadata = Object.freeze({
  playerId: null,
  username: "anonymous",
});

const normalizeMetadata = ({ playerId, username } = {}) => ({
  playerId: playerId ?? defaultMetadata.playerId,
  username:
    typeof username === "string" && username.trim().length > 0
      ? username.trim()
      : defaultMetadata.username,
});

const createPayload = (type, metadata, data) => ({
  type,
  ...data,
  playerId: metadata.playerId,
  username: metadata.username,
  createdAt: serverTimestamp(),
});

const useAnalytics = ({ gameId, playerId, username } = {}) => {
  const isReady = Boolean(db && gameId);
  const metadata = useMemo(
    () => normalizeMetadata({ playerId, username }),
    [playerId, username]
  );

  const getCollectionRef = useCallback(() => {
    if (!isReady) {
      return null;
    }
    return collection(db, "games", gameId, EVENTS_COLLECTION);
  }, [gameId, isReady]);

  const logEvent = useCallback(
    async (type, data = {}) => {
      const collectionRef = getCollectionRef();
      if (!collectionRef) {
        console.warn("Analytics logging skipped: Firestore is unavailable.", {
          type,
          data,
        });
        return null;
      }

      const payload = createPayload(type, metadata, data);
      try {
        const docRef = await addDoc(collectionRef, payload);
        return docRef.id;
      } catch (error) {
        console.error("Failed to log analytics event", { type, error });
        return null;
      }
    },
    [getCollectionRef, metadata]
  );

  const logRound = useCallback(
    async ({ outcome = "completed", slice = "", mode = "classic", streak = null } = {}) =>
      logEvent("round", {
        outcome,
        slice,
        mode,
        streak,
      }),
    [logEvent]
  );

  const logRefusal = useCallback(
    async ({ reason = "manual", slice = "", consequence = "" } = {}) =>
      logEvent("refusal", {
        reason,
        slice,
        consequence,
      }),
    [logEvent]
  );

  const logStreak = useCallback(
    async ({ current = 0, best = 0 } = {}) =>
      logEvent("streak", {
        current,
        best,
      }),
    [logEvent]
  );

  const logTriviaAccuracy = useCallback(
    async ({
      questionId = "",
      correct = false,
      streak = null,
      responseTimeMs = null,
    } = {}) =>
      logEvent("triviaAccuracy", {
        questionId,
        correct: Boolean(correct),
        result: correct ? "correct" : "incorrect",
        streak,
        responseTimeMs,
      }),
    [logEvent]
  );

  const logTimeout = useCallback(
    async ({
      slice = "",
      mode = "classic",
      durationSeconds = 30,
      autoRefusal = true,
    } = {}) =>
      logEvent("timeout", {
        slice,
        mode,
        durationSeconds,
        autoRefusal,
      }),
    [logEvent]
  );

  return {
    isReady,
    metadata,
    logEvent,
    logRound,
    logRefusal,
    logStreak,
    logTriviaAccuracy,
    logTimeout,
  };
};

export default useAnalytics;
