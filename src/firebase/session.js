import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const SESSION_COLLECTION = "sessions";

const ensureTimestampedPayload = (payload = {}) => ({
  ...payload,
  timestamp: payload.timestamp ?? Date.now(),
});

const getSessionRef = (db, gameId) =>
  doc(collection(db, SESSION_COLLECTION), gameId);

const getPlayerRef = (db, gameId, playerId) =>
  doc(collection(getSessionRef(db, gameId), "players"), playerId);

export async function createOrJoinSession(db, gameId, playerId) {
  if (!db || !gameId || !playerId) {
    return null;
  }

  const sessionRef = getSessionRef(db, gameId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      transaction.set(sessionRef, {
        roundCount: 0,
        lastSpin: null,
        currentPrompt: null,
        currentConsequence: null,
        spinLock: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    transaction.update(sessionRef, {
      updatedAt: serverTimestamp(),
    });
  });

  const playerRef = getPlayerRef(db, gameId, playerId);

  await setDoc(
    playerRef,
    {
      id: playerId,
      accepts: 0,
      refusals: 0,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { sessionRef, playerRef };
}

export function subscribeToSession(db, gameId, callback) {
  if (!db || !gameId || typeof callback !== "function") {
    return () => {};
  }

  const sessionRef = getSessionRef(db, gameId);

  let latestSession = null;
  let latestPlayers = [];

  const emit = () => {
    callback({
      session: latestSession,
      players: latestPlayers,
    });
  };

  const unsubscribeSession = onSnapshot(sessionRef, (snapshot) => {
    latestSession = snapshot.exists() ? snapshot.data() : null;
    emit();
  });

  const unsubscribePlayers = onSnapshot(
    collection(sessionRef, "players"),
    (snapshot) => {
      latestPlayers = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
      emit();
    }
  );

  return () => {
    unsubscribeSession();
    unsubscribePlayers();
  };
}

export async function acquireSpinLock(db, gameId, playerId) {
  if (!db || !gameId || !playerId) {
    return true;
  }

  const sessionRef = getSessionRef(db, gameId);

  try {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(sessionRef);

      if (!snapshot.exists()) {
        transaction.set(sessionRef, {
          roundCount: 0,
          lastSpin: null,
          currentPrompt: null,
          currentConsequence: null,
          spinLock: {
            lockedBy: playerId,
            timestamp: Date.now(),
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const data = snapshot.data();
      const currentLock = data.spinLock ?? null;
      const now = Date.now();
      const isLocked =
        currentLock &&
        currentLock.lockedBy &&
        currentLock.lockedBy !== playerId &&
        now - (currentLock.timestamp ?? 0) < 15000;

      if (isLocked) {
        throw new Error("locked");
      }

      transaction.update(sessionRef, {
        spinLock: {
          lockedBy: playerId,
          timestamp: now,
        },
        updatedAt: serverTimestamp(),
      });
    });

    return true;
  } catch (error) {
    if (error?.message === "locked") {
      return false;
    }

    throw error;
  }
}

export async function releaseSpinLock(db, gameId, playerId) {
  if (!db || !gameId || !playerId) {
    return;
  }

  const sessionRef = getSessionRef(db, gameId);

  await updateDoc(sessionRef, {
    spinLock: null,
    updatedAt: serverTimestamp(),
  });
}

export async function publishSpin(db, gameId, payload) {
  if (!db || !gameId || !payload) {
    return;
  }

  const sessionRef = getSessionRef(db, gameId);
  const spinPayload = ensureTimestampedPayload(payload);
  const updateData = {
    lastSpin: spinPayload,
    spinLock: {
      lockedBy: spinPayload.playerId,
      timestamp: spinPayload.lockTimestamp ?? Date.now(),
    },
    updatedAt: serverTimestamp(),
  };

  if (spinPayload.round !== undefined && spinPayload.round !== null) {
    updateData.roundCount = spinPayload.round;
  }

  await updateDoc(sessionRef, updateData);
}

async function updatePlayerStreak(db, gameId, playerId, result) {
  if (!db || !gameId || !playerId || !result) {
    return null;
  }

  const playerRef = getPlayerRef(db, gameId, playerId);
  let streakState = null;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(playerRef);
    const data = snapshot.exists() ? snapshot.data() : {};

    let accepts = data.accepts ?? 0;
    let refusals = data.refusals ?? 0;

    const didAccept = result === "accepted" || result === "correct";
    const didRefuse =
      result === "refused" || result === "auto-refusal" || result === "incorrect";

    if (didAccept) {
      accepts += 1;
      refusals = 0;
    } else if (didRefuse) {
      refusals += 1;
      accepts = 0;
    } else {
      accepts = 0;
      refusals = 0;
    }

    streakState = { accepts, refusals };

    transaction.set(
      playerRef,
      {
        accepts,
        refusals,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  return streakState;
}

export async function publishPrompt(db, gameId, payload) {
  if (!db || !gameId || !payload) {
    return null;
  }

  const sessionRef = getSessionRef(db, gameId);
  const promptPayload = ensureTimestampedPayload(payload);

  const updateData = {
    currentPrompt: promptPayload.prompt ?? null,
    currentConsequence: promptPayload.consequence ?? null,
    promptEvent: promptPayload,
    updatedAt: serverTimestamp(),
  };

  if (promptPayload.round !== undefined && promptPayload.round !== null) {
    updateData.roundCount = promptPayload.round;
  }

  if (promptPayload.releaseLock) {
    updateData.spinLock = null;
  }

  await updateDoc(sessionRef, updateData);

  const streak = await updatePlayerStreak(
    db,
    gameId,
    promptPayload.playerId,
    promptPayload.result
  );

  return { streak };
}

export async function touchPlayerPresence(db, gameId, playerId) {
  if (!db || !gameId || !playerId) {
    return;
  }

  const playerRef = getPlayerRef(db, gameId, playerId);
  await updateDoc(playerRef, {
    lastSeen: serverTimestamp(),
  });
}
