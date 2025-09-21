diff --git a/.codesandbox/date-night-app-vite/src/hooks/usePersistentState.js b/.codesandbox/date-night-app-vite/src/hooks/usePersistentState.js
index 8bf2e80108453ef5ea311f4fc6a9f3fedd62894b..7095ec0149ace0799959f1f3d3530c3c4de22723 100644
--- a/.codesandbox/date-night-app-vite/src/hooks/usePersistentState.js
+++ b/.codesandbox/date-night-app-vite/src/hooks/usePersistentState.js
@@ -1,66 +1,62 @@
-diff --git a//dev/null b/.codesandbox/date-night-app-vite/src/hooks/usePersistentState.js
-index 0000000000000000000000000000000000000000..30b4925b564ecb09a495d821d4e1c01a600936e5 100644
---- a//dev/null
-+++ b/.codesandbox/date-night-app-vite/src/hooks/usePersistentState.js
-@@ -0,0 +1,61 @@
-+import { useCallback, useEffect, useRef, useState } from "react";
-+
-+const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";
-+
-+export function usePersistentState(
-+  storageKey,
-+  initialValue,
-+  {
-+    serialize = JSON.stringify,
-+    deserialize = JSON.parse,
-+    skipNull = true,
-+  } = {}
-+) {
-+  const isFirstRender = useRef(true);
-+  const readValue = useCallback(() => {
-+    if (!isBrowser()) {
-+      return initialValue;
-+    }
-+
-+    try {
-+      const storedValue = window.localStorage.getItem(storageKey);
-+      if (storedValue === null || storedValue === undefined) {
-+        return initialValue;
-+      }
-+
-+      return deserialize(storedValue);
-+    } catch (error) {
-+      console.warn(`Failed to read persistent state for key "${storageKey}"`, error);
-+      return initialValue;
-+    }
-+  }, [deserialize, initialValue, storageKey]);
-+
-+  const [state, setState] = useState(readValue);
-+
-+  useEffect(() => {
-+    if (!isBrowser()) {
-+      return undefined;
-+    }
-+
-+    if (isFirstRender.current) {
-+      isFirstRender.current = false;
-+      return undefined;
-+    }
-+
-+    try {
-+      if (skipNull && (state === null || state === undefined)) {
-+        window.localStorage.removeItem(storageKey);
-+        return undefined;
-+      }
-+
-+      const serialized = serialize(state);
-+      window.localStorage.setItem(storageKey, serialized);
-+    } catch (error) {
-+      console.warn(`Failed to persist state for key "${storageKey}"`, error);
-+    }
-+
-+    return undefined;
-+  }, [serialize, skipNull, state, storageKey]);
-+
-+  return [state, setState];
-+}
+import { useCallback, useEffect, useRef, useState } from "react";
+
+const isBrowser = () =>
+  typeof window !== "undefined" && typeof window.localStorage !== "undefined";
+
+export function usePersistentState(
+  storageKey,
+  initialValue,
+  {
+    serialize = JSON.stringify,
+    deserialize = JSON.parse,
+    skipNull = true,
+  } = {}
+) {
+  const isFirstRender = useRef(true);
+  const readValue = useCallback(() => {
+    if (!isBrowser()) {
+      return initialValue;
+    }
+
+    try {
+      const storedValue = window.localStorage.getItem(storageKey);
+      if (storedValue === null || storedValue === undefined) {
+        return initialValue;
+      }
+
+      return deserialize(storedValue);
+    } catch (error) {
+      console.warn(`Failed to read persistent state for key "${storageKey}"`, error);
+      return initialValue;
+    }
+  }, [deserialize, initialValue, storageKey]);
+
+  const [state, setState] = useState(readValue);
+
+  useEffect(() => {
+    if (!isBrowser()) {
+      return undefined;
+    }
+
+    if (isFirstRender.current) {
+      isFirstRender.current = false;
+      return undefined;
+    }
+
+    try {
+      if (skipNull && (state === null || state === undefined)) {
+        window.localStorage.removeItem(storageKey);
+        return undefined;
+      }
+
+      const serialized = serialize(state);
+      window.localStorage.setItem(storageKey, serialized);
+    } catch (error) {
+      console.warn(`Failed to persist state for key "${storageKey}"`, error);
+    }
+
+    return undefined;
+  }, [serialize, skipNull, state, storageKey]);
+
+  return [state, setState];
+}

