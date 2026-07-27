importScripts(
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js"
);

const serviceWorkerUrl = new URL(self.location.href);
const firebaseConfig = {
  apiKey: serviceWorkerUrl.searchParams.get("apiKey"),
  authDomain: serviceWorkerUrl.searchParams.get("authDomain"),
  projectId: serviceWorkerUrl.searchParams.get("projectId"),
  storageBucket: serviceWorkerUrl.searchParams.get("storageBucket"),
  messagingSenderId: serviceWorkerUrl.searchParams.get("messagingSenderId"),
  appId: serviceWorkerUrl.searchParams.get("appId"),
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  /*
   * Notification payload'larini Firebase tarayicida otomatik gosterir.
   * Data-only mesaj gelirse burada gorunur bir bildirim olusturulur.
   */
  if (payload.notification) {
    return;
  }

  const data = payload.data ?? {};

  self.registration.showNotification("VIP Transfer", {
    body: "Yeni bir bildiriminiz var.",
    icon: "/vite.svg",
    badge: "/vite.svg",
    data,
    tag: data.notificationId ?? "vip-transfer-notification",
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 80, 180],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const reservationId = event.notification.data?.reservationId;
  const targetUrl = reservationId
    ? `/reservation?reservationId=${reservationId}`
    : "/";

  event.waitUntil(clients.openWindow(targetUrl));
});
