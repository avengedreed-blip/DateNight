import { useCallback, useEffect, useMemo, useState } from "react";

import {
  appendEventLogEntry,
  loadEventLogFromStorage,
  subscribeToEventLog,
} from "../firebase/session";

const normalizeGameId = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const sortEvents = (events = []) =>
  events
    .filter((entry) => entry && typeof entry === "object")
    .slice()
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.id.localeCompare(b.id);
    });

const useEventLog = (gameId) => {
  const normalizedInitialId = normalizeGameId(gameId);
  const [events, setEvents] = useState(() =>
    normalizedInitialId ? sortEvents(loadEventLogFromStorage(normalizedInitialId)) : []
  );
  const [isLoaded, setIsLoaded] = useState(() => !normalizedInitialId);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    const normalizedId = normalizeGameId(gameId);

    if (!normalizedId) {
      setEvents([]);
      setIsLoaded(true);
      setLastError(null);
      return () => {};
    }

    let isSubscribed = true;

    setIsLoaded(false);
    setLastError(null);
    setEvents(sortEvents(loadEventLogFromStorage(normalizedId)));

    const unsubscribe = subscribeToEventLog(normalizedId, {
      onUpdate: (nextEvents) => {
        if (!isSubscribed) {
          return;
        }
        setEvents(sortEvents(nextEvents));
      },
      onError: (error) => {
        if (!isSubscribed) {
          return;
        }
        setLastError(error);
      },
      onReady: () => {
        if (!isSubscribed) {
          return;
        }
        setIsLoaded(true);
      },
    });

    return () => {
      isSubscribed = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [gameId]);

  const refresh = useCallback(() => {
    const normalizedId = normalizeGameId(gameId);
    if (!normalizedId) {
      setEvents([]);
      setIsLoaded(true);
      return [];
    }

    const nextEvents = sortEvents(loadEventLogFromStorage(normalizedId));
    setEvents(nextEvents);
    return nextEvents;
  }, [gameId]);

  const appendEvent = useCallback(
    async ({ action, playerId, username, timestamp } = {}) => {
      const normalizedId = normalizeGameId(gameId);
      if (!normalizedId) {
        throw new Error("A valid gameId is required to append to the event log.");
      }

      setLastError(null);

      try {
        const result = await appendEventLogEntry(normalizedId, {
          action,
          playerId,
          username,
          timestamp,
        });
        const nextEvents = sortEvents(loadEventLogFromStorage(normalizedId));
        setEvents(nextEvents);
        return result;
      } catch (error) {
        setLastError(error);
        throw error;
      }
    },
    [gameId]
  );

  return useMemo(
    () => ({
      events,
      isLoaded,
      lastError,
      appendEvent,
      refresh,
    }),
    [appendEvent, events, isLoaded, lastError, refresh]
  );
};

export default useEventLog;
