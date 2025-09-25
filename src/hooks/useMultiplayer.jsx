import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../config/firebase.js";
import {
  acquireSpinLock,
  createOrJoinSession,
  publishPrompt,
  publishSpin,
  releaseSpinLock,
  subscribeToSession,
  touchPlayerPresence,
} from "../firebase/session.js";

const PLAYER_STORAGE_KEY = "dateNightPlayerId";

const generatePlayerId = () =>
  `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const readStoredPlayerId = () => {
  if (typeof window === "undefined") {
    return "local-player";
  }

  const stored = window.localStorage?.getItem(PLAYER_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const created = generatePlayerId();
  window.localStorage?.setItem(PLAYER_STORAGE_KEY, created);
  return created;
};

export function useMultiplayer({
  gameId,
  enabled,
  onRemoteSpin,
  onRemotePrompt,
  skipPlayerTracking = false,
  skipSpinLock = false,
}) {
  const [playerId] = useState(readStoredPlayerId);
  const [connectedCount, setConnectedCount] = useState(1);
  const [playerStreak, setPlayerStreak] = useState({ accepts: 0, refusals: 0 });
  const [sessionReady, setSessionReady] = useState(false);
  const lastSpinIdRef = useRef(null);
  const lastPromptIdRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const lockTimestampRef = useRef(null);
  const isBrowser = typeof window !== "undefined";
  const availability = Boolean(db) && isBrowser;

  const isActive = Boolean(
    availability && enabled && gameId && typeof gameId === "string"
  );

  useEffect(() => {
    if (!isActive) {
      setConnectedCount(1);
      setPlayerStreak({ accepts: 0, refusals: 0 });
      setSessionReady(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;
    setSessionReady(false);

    createOrJoinSession(db, gameId, playerId, {
      skipPlayerDoc: skipPlayerTracking,
    })
      .then(() => {
        if (cancelled) {
          return;
        }

        setSessionReady(true);
        if (!skipPlayerTracking) {
          touchPlayerPresence(db, gameId, playerId).catch(() => {});
        }

        unsubscribeRef.current = subscribeToSession(
          db,
          gameId,
          ({ session, players }) => {
            if (players) {
              setConnectedCount(Math.max(players.length, 1));
              const self = players.find((player) => player.id === playerId);
              if (self) {
                setPlayerStreak({
                  accepts: self.accepts ?? 0,
                  refusals: self.refusals ?? 0,
                });
              }
            }

            if (session) {
              const { lastSpin, promptEvent } = session;

              if (lastSpin?.id && lastSpin.id !== lastSpinIdRef.current) {
                lastSpinIdRef.current = lastSpin.id;

                if (lastSpin.playerId && lastSpin.playerId !== playerId) {
                  onRemoteSpin?.(lastSpin);
                }
              }

              if (
                promptEvent?.id &&
                promptEvent.id !== lastPromptIdRef.current
              ) {
                lastPromptIdRef.current = promptEvent.id;

                if (
                  promptEvent.playerId &&
                  promptEvent.playerId !== playerId
                ) {
                  onRemotePrompt?.(promptEvent);
                }
              }
            }
          },
          {
            includePlayers: !skipPlayerTracking,
          }
        );
      })
      .catch((error) => {
        console.warn("Failed to join multiplayer session", error);
        setSessionReady(false);
      });

    return () => {
      cancelled = true;
      setSessionReady(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [
    gameId,
    isActive,
    onRemotePrompt,
    onRemoteSpin,
    playerId,
    skipPlayerTracking,
  ]);

  const publishLocalSpin = useCallback(
    async (payload) => {
      if (!sessionReady || !isActive) {
        return;
      }

      try {
        await publishSpin(
          db,
          gameId,
          {
            ...payload,
            playerId,
            lockTimestamp:
              lockTimestampRef.current ?? payload.lockTimestamp ?? Date.now(),
          },
          { skipSpinLock }
        );
      } catch (error) {
        console.warn("Failed to publish spin", error);
      }
    },
    [gameId, isActive, playerId, sessionReady, skipSpinLock]
  );

  const publishLocalPrompt = useCallback(
    async (payload) => {
      if (!sessionReady || !isActive) {
        return null;
      }

      try {
        const result = await publishPrompt(
          db,
          gameId,
          {
            ...payload,
            playerId,
          },
          { skipPlayerTracking }
        );

        if (result?.streak) {
          setPlayerStreak(result.streak);
        }

        if (payload.releaseLock) {
          lockTimestampRef.current = null;
        }

        return result;
      } catch (error) {
        console.warn("Failed to publish prompt", error);
        return null;
      }
    },
    [gameId, isActive, playerId, sessionReady, skipPlayerTracking]
  );

  const acquireLock = useCallback(async () => {
    if (!isActive || skipSpinLock) {
      return true;
    }

    const locked = await acquireSpinLock(db, gameId, playerId);
    if (locked) {
      lockTimestampRef.current = Date.now();
    }
    return locked;
  }, [gameId, isActive, playerId, skipSpinLock]);

  const releaseLock = useCallback(async () => {
    if (!isActive || skipSpinLock) {
      return;
    }

    try {
      await releaseSpinLock(db, gameId, playerId);
    } catch (error) {
      console.warn("Failed to release spin lock", error);
    } finally {
      lockTimestampRef.current = null;
    }
  }, [gameId, isActive, playerId, skipSpinLock]);

  useEffect(() => {
    if (!isActive || typeof window === "undefined") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (!skipPlayerTracking) {
        touchPlayerPresence(db, gameId, playerId).catch(() => {});
      }
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [gameId, isActive, playerId, skipPlayerTracking]);

  return useMemo(
    () => ({
      isAvailable: availability,
      isActive,
      playerId,
      connectedCount,
      playerStreak,
      publishLocalSpin,
      publishLocalPrompt,
      acquireLock,
      releaseLock,
    }),
    [
      acquireLock,
      connectedCount,
      isActive,
      availability,
      playerId,
      playerStreak,
      publishLocalPrompt,
      publishLocalSpin,
      releaseLock,
    ]
  );
}
