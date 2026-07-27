import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "messagingSenderId",
  "appId",
];

export function isFirebaseConfigured() {
  return requiredConfigKeys.every((key) =>
    Boolean(firebaseConfig[key]?.trim())
  );
}

export function getFirebaseServiceWorkerUrl() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase web ayarlari frontend .env dosyasinda eksik."
    );
  }

  const searchParams = new URLSearchParams(firebaseConfig);
  return `/firebase-messaging-sw.js?${searchParams.toString()}`;
}

export async function getFirebaseMessaging() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase web ayarlari frontend .env dosyasinda eksik."
    );
  }

  if (!(await isSupported())) {
    throw new Error("Bu tarayici Firebase Web Push desteklemiyor.");
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getMessaging(app);
}
