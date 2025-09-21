diff --git a/.codesandbox/date-night-app-vite/src/config/firebase.js b/.codesandbox/date-night-app-vite/src/config/firebase.js
index a55a494b72bf09e93e910e2b5fe25a2172e75ca3..55fb94dd5577af73fc34c53e7fcb2a8cfde72185 100644
--- a/.codesandbox/date-night-app-vite/src/config/firebase.js
+++ b/.codesandbox/date-night-app-vite/src/config/firebase.js
@@ -1,34 +1,27 @@
-diff --git a/.codesandbox/date-night-app-vite/src/config/firebase.js b/.codesandbox/date-night-app-vite/src/config/firebase.js
-index 3a7c2cafe00a9c4ad07a8fe6c019f745ea2a2ccb..55fb94dd5577af73fc34c53e7fcb2a8cfde72185 100644
---- a/.codesandbox/date-night-app-vite/src/config/firebase.js
-+++ b/.codesandbox/date-night-app-vite/src/config/firebase.js
-@@ -1,17 +1,27 @@
- import { initializeApp } from "firebase/app";
- import { getFirestore } from "firebase/firestore";
- 
- const firebaseConfig = {
-   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
-   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
-   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
-   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
-   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
-   appId: import.meta.env.VITE_FIREBASE_APP_ID,
-   measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
- };
- 
--const app = initializeApp(firebaseConfig);
--const db = getFirestore(app);
-+const isConfigValid = Object.values(firebaseConfig).every((value) => value);
-+
-+let db = null;
-+
-+if (isConfigValid) {
-+  const app = initializeApp(firebaseConfig);
-+  db = getFirestore(app);
-+} else {
-+  console.warn(
-+    "Firebase configuration is incomplete. Falling back to local data only."
-+  );
-+}
- 
- export { db };
+import { initializeApp } from "firebase/app";
+import { getFirestore } from "firebase/firestore";
+
+const firebaseConfig = {
+  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
+  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
+  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
+  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
+  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
+  appId: import.meta.env.VITE_FIREBASE_APP_ID,
+  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
+};
+
+const isConfigValid = Object.values(firebaseConfig).every((value) => value);
+
+let db = null;
+
+if (isConfigValid) {
+  const app = initializeApp(firebaseConfig);
+  db = getFirestore(app);
+} else {
+  console.warn(
+    "Firebase configuration is incomplete. Falling back to local data only."
+  );
+}
+
+export { db };
