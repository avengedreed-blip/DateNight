diff --git a/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx b/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx
index 9502bc53f51931a89f83bd7de83868f59ffc1f79..133f88d728a930465d46770a1ce16f986af0ade2 100644
--- a/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx
+++ b/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx
@@ -1,25 +1,12 @@
-diff --git a/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx b/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx
-index 50d7c09f0b22ecf7c43b1449672834be86864763..133f88d728a930465d46770a1ce16f986af0ade2 100644
---- a/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx
-+++ b/.codesandbox/date-night-app-vite/src/components/screens/LoadingScreen.jsx
-@@ -1,16 +1,12 @@
- import React from "react";
- 
- const LoadingScreen = ({ message }) => (
--  <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4">
--    <main className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)]">
--      <h1 className="text-3xl font-bold mb-4 animate-pulse text-shadow">
--        {message}
--      </h1>
--      <p className="text-[var(--text-secondary)]">
--        Getting things ready for date night!
--      </p>
-+  <div className="loading-screen">
-+    <main className="loading-panel">
-+      <h1 className="loading-panel__title">{message}</h1>
-+      <p className="loading-panel__text">Setting the mood for the perfect evening…</p>
-     </main>
-   </div>
- );
- 
- export default LoadingScreen;
+import React from "react";
+
+const LoadingScreen = ({ message }) => (
+  <div className="loading-screen">
+    <main className="loading-panel">
+      <h1 className="loading-panel__title">{message}</h1>
+      <p className="loading-panel__text">Setting the mood for the perfect evening…</p>
+    </main>
+  </div>
+);
+
+export default LoadingScreen;
