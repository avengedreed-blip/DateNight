import { useCallback, useEffect, useRef, useState } from "react";

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function usePersistentState(
  storageKey,
  initialValue,
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    skipNull = true,
  } = {}
) {
  const isFirstRender = useRef(true);
  const readValue = useCallback(() => {
    if (!isBrowser()) {
      return initialValue;
    }

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue === null || storedValue === undefined) {
        return initialValue;
      }

      return deserialize(storedValue);
    } catch (error) {
      console.warn(`Failed to read persistent state for key "${storageKey}"`, error);
      return initialValue;
    }
  }, [deserialize, initialValue, storageKey]);

  const [state, setState] = useState(readValue);

  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return undefined;
    }

    try {
      if (skipNull && (state === null || state === undefined)) {
        window.localStorage.removeItem(storageKey);
        return undefined;
      }

      const serialized = serialize(state);
      window.localStorage.setItem(storageKey, serialized);
    } catch (error) {
      console.warn(`Failed to persist state for key "${storageKey}"`, error);
    }

    return undefined;
  }, [serialize, skipNull, state, storageKey]);

  return [state, setState];
}
