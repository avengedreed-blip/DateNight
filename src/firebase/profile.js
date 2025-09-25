import { collection, doc, getDocs, writeBatch } from "firebase/firestore";

import { db } from "../config/firebase";

const CUSTOM_PROMPTS_COLLECTION = "customPrompts";

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

export {
  CUSTOM_PROMPTS_COLLECTION,
  getPlayerCustomPromptsCollectionRef,
  persistCustomPromptsForPlayer,
  persistCustomPromptsToCollection,
};

