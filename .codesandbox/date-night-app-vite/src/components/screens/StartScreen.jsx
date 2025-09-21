diff --git a/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx b/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx
index dddd88cca12b357c8203050d24ed48577a2249ba..b2970d088d2f4f576cf0d5991ce400b96774fc7f 100644
--- a/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx
+++ b/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx
@@ -1,60 +1,40 @@
-diff --git a/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx b/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx
-index 00414501fd4673c53199f12905c838b7c69c8739..1494ebd121f8857188632d4dadcc843deb9baf65 100644
---- a/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx
-+++ b/.codesandbox/date-night-app-vite/src/components/screens/StartScreen.jsx
-@@ -1,35 +1,36 @@
--import React from 'react';
-+import React from "react";
- 
- const StartScreen = ({ createNewGame, joinGame, inputGameId, setInputGameId }) => (
--  <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4">
--    <main className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)]">
--      <h1 className="text-3xl font-bold mb-4 text-shadow">Date Night</h1>
--      <p className="text-[var(--text-secondary)] mb-6">
--        Create a game to share with your partner or join an existing one.
-+  <div className="start-screen">
-+    <main className="start-panel">
-+      <h1 className="start-panel__title">Date Night</h1>
-+      <p className="start-panel__text">
-+        Spin the wheel, challenge each other, and keep the evening playful.
-       </p>
--      <button
--        onClick={createNewGame}
--        className="w-full bg-[var(--primary-accent)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-lg mb-4 transition-all transform hover:scale-105 active:scale-95"
--      >
--        Create New Game
--      </button>
--      <form onSubmit={joinGame} className="flex flex-col">
-+      <div className="start-panel__actions">
-+        <button type="button" className="primary-button" onClick={createNewGame}>
-+          Create New Game
-+        </button>
-+        <button type="button" className="secondary-button" onClick={() => setInputGameId("")}>
-+          Reset Game Code
-+        </button>
-+      </div>
-+      <form className="start-panel__form" onSubmit={joinGame}>
-         <input
-+          className="input input--center"
-           type="text"
-           value={inputGameId}
--          onChange={(e) => setInputGameId(e.target.value)}
--          className="w-full p-3 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] text-white text-center uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] mb-2"
-+          onChange={(event) => setInputGameId(event.target.value.toUpperCase())}
-           placeholder="ENTER GAME ID"
-+          autoComplete="off"
-+          maxLength={8}
-         />
--        <button
--          type="submit"
--          className="w-full bg-black/20 hover:bg-black/40 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95"
--        >
-+        <button type="submit" className="ghost-button">
-           Join Game
-         </button>
-       </form>
-     </main>
-   </div>
- );
- 
- export default StartScreen;
+import React from "react";
+
+const StartScreen = ({ createNewGame, joinGame, inputGameId, setInputGameId }) => (
+  <div className="start-screen">
+    <main className="start-panel">
+      <h1 className="start-panel__title">Date Night</h1>
+      <p className="start-panel__text">
+        Spin the wheel, challenge each other, and keep the evening playful.
+      </p>
+      <div className="start-panel__actions">
+        <button type="button" className="primary-button" onClick={createNewGame}>
+          Create New Game
+        </button>
+        <button
+          type="button"
+          className="secondary-button"
+          onClick={() => setInputGameId("")}
+        >
+          Reset Game Code
+        </button>
+      </div>
+      <form className="start-panel__form" onSubmit={joinGame}>
+        <input
+          className="input input--center"
+          type="text"
+          value={inputGameId}
+          onChange={(event) => setInputGameId(event.target.value.toUpperCase())}
+          placeholder="ENTER GAME ID"
+          autoComplete="off"
+          maxLength={8}
+        />
+        <button type="submit" className="ghost-button">
+          Join Game
+        </button>
+      </form>
+    </main>
+  </div>
+);
+
+export default StartScreen;
