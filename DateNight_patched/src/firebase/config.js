// Firebase configuration values are loaded from Vite environment variables (.env).
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const isConfigComplete = requiredKeys.every((key) => Boolean(firebaseConfig[key]));

let app = null;
let analytics = null;
let db = null;

if (isConfigComplete) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  if (typeof window !== "undefined" && firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      console.warn("Firebase analytics initialization failed.", error);
    }
  }
} else {
  console.warn(
    "Firebase configuration is incomplete. Falling back to local data only."
  );
}

export { app, analytics, db, firebaseConfig };
