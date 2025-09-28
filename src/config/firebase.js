import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseEnv = import.meta.env;

const firebaseConfig = {
  apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
  authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.VITE_FIREBASE_APP_ID,
  measurementId: firebaseEnv.VITE_FIREBASE_MEASUREMENT_ID,
};

const isConfigValid = Object.values(firebaseConfig).every((value) => value);

let db = null;

if (isConfigValid) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn(
    "Firebase configuration is incomplete. Falling back to local data only."
  );
}

export { db };
