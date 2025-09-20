import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase.js";
import { defaultPrompts } from "../config/prompts.js";

export const usePrompts = (gameId) => {
  const [prompts, setPrompts] = useState(null);

  useEffect(() => {
    if (!gameId || !db) return;

    const promptsRef = doc(db, "dateNightGames", gameId);

    const setupGame = async () => {
      try {
        const docSnap = await getDoc(promptsRef);
        if (!docSnap.exists()) {
          await setDoc(promptsRef, defaultPrompts);
        }
      } catch (error) {
        console.error("Error setting up game document:", error);
      }
    };
    setupGame();

    const unsubscribe = onSnapshot(
      promptsRef,
      (doc) => {
        if (doc.exists()) setPrompts(doc.data());
      },
      (error) => {
        console.error("Error with Firestore snapshot listener:", error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  const savePrompts = useCallback(
    (newPrompts) => {
      if (gameId && db) {
        const promptsRef = doc(db, "dateNightGames", gameId);
        setDoc(promptsRef, newPrompts).catch((error) =>
          console.error("Error updating prompts: ", error)
        );
      }
    },
    [gameId]
  );

  return [prompts, savePrompts];
};
