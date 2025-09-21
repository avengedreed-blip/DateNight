import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../config/firebase.js";
import { defaultPrompts } from "../config/prompts.js";

const clonePrompts = (source) => JSON.parse(JSON.stringify(source));

export function usePrompts(gameId) {
  const [prompts, setPrompts] = useState(() => clonePrompts(defaultPrompts));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = null;
    let isActive = true;

    setIsLoading(true);

    const loadPrompts = async () => {
      if (!gameId || !db) {
        if (isActive) {
          setPrompts(clonePrompts(defaultPrompts));
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
            setPrompts(clonePrompts(defaultPrompts));
          }
        } else if (isActive) {
          setPrompts(snapshot.data());
        }

        unsubscribe = onSnapshot(
          promptsRef,
          (docSnapshot) => {
            if (!isActive) {
              return;
            }

            if (docSnapshot.exists()) {
              setPrompts(docSnapshot.data());
            }
          },
          (error) => {
            console.error("Error with Firestore snapshot listener:", error);
            if (isActive) {
              setPrompts(clonePrompts(defaultPrompts));
            }
          }
        );
      } catch (error) {
        console.error("Failed to load prompts from Firestore", error);
        if (isActive) {
          setPrompts(clonePrompts(defaultPrompts));
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
  }, [gameId]);

  const savePrompts = useCallback(
    (nextPrompts) => {
      setPrompts(nextPrompts);

      if (!gameId || !db) {
        return;
      }

      const promptsRef = doc(db, "dateNightGames", gameId);
      setDoc(promptsRef, nextPrompts).catch((error) => {
        console.error("Failed to persist prompts to Firestore", error);
      });
    },
    [gameId]
  );

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

  return { prompts, savePrompts, promptGroups, isLoading };
}
