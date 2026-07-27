import {
  onMessage,
  onRegistered,
  register,
} from "firebase/messaging";

import apiClient from "@/api/apiClient";
import {
  getFirebaseMessaging,
  getFirebaseServiceWorkerUrl,
} from "@/lib/firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const REGISTRATION_TIMEOUT_MS = 15000;

async function saveInstallation(fid) {
  await apiClient.post("/firebase-installations", {
    fid,
    platform: "WEB",
  });

  await apiClient.put("/notification-preferences/PUSH", {
    enabled: true,
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Bu tarayici service worker desteklemiyor.");
  }

  return navigator.serviceWorker.register(
    getFirebaseServiceWorkerUrl()
  );
}

export async function enablePushNotifications() {
  if (!("Notification" in window)) {
    throw new Error("Bu tarayici bildirimleri desteklemiyor.");
  }

  if (!VAPID_KEY?.trim()) {
    throw new Error("VITE_FIREBASE_VAPID_KEY tanimli degil.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Tarayici bildirim izni verilmedi.");
  }

  const messaging = await getFirebaseMessaging();
  const serviceWorkerRegistration = await registerServiceWorker();

  return new Promise((resolve, reject) => {
    let completed = false;
    let unsubscribe = () => {};

    const timeoutId = window.setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new Error("Firebase installation kaydi zaman asimina ugradi."));
      }
    }, REGISTRATION_TIMEOUT_MS);

    unsubscribe = onRegistered(messaging, async (fid) => {
      if (completed) {
        return;
      }

      try {
        await saveInstallation(fid);
        completed = true;
        window.clearTimeout(timeoutId);
        unsubscribe();
        resolve(fid);
      } catch (error) {
        completed = true;
        window.clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      }
    });

    register(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration,
    }).catch((error) => {
      if (!completed) {
        completed = true;
        window.clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      }
    });
  });
}

export async function listenForForegroundPush(onNotification) {
  const messaging = await getFirebaseMessaging();

  return onMessage(messaging, (payload) => {
    onNotification?.(payload);
  });
}
