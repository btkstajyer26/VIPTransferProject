import { useEffect, useState } from "react";
import { Bell, CheckCircle2, LoaderCircle, X } from "lucide-react";

import {
  enablePushNotifications,
  listenForForegroundPush,
} from "@/api/pushNotificationServices";
import { updateNotificationPreference } from "@/api/notificationPreferenceServices";
import useAuth from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function PushNotificationPrompt() {
  const { isAuthenticated, userId } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState("");
  const [foregroundNotification, setForegroundNotification] = useState(null);
  const [pushReady, setPushReady] = useState(false);
  const [whatsappDismissed, setWhatsappDismissed] = useState(false);
  const [isEnablingWhatsapp, setIsEnablingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState("");

  const whatsappConsentKey = userId
    ? `vip-whatsapp-consent-${userId}`
    : null;

  const hasWhatsappConsent =
    whatsappConsentKey &&
    localStorage.getItem(whatsappConsentKey) === "enabled";

  const playNotificationSound = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startAt = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, startAt);
    oscillator.frequency.setValueAtTime(880, startAt + 0.12);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.32);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.34);
    oscillator.addEventListener("ended", () => audioContext.close());
  };

  useEffect(() => {
    if (
      !isAuthenticated ||
      !isFirebaseConfigured() ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return undefined;
    }

    let foregroundUnsubscribe;
    let cancelled = false;

    enablePushNotifications()
      .then(() => setPushReady(true))
      .catch((registrationError) => {
        console.error("Firebase installation kaydi yenilenemedi:", registrationError);
      });

    listenForForegroundPush((payload) => {
      const notification = payload.notification ?? {};

      setForegroundNotification({
        title: notification.title ?? "VIP Transfer",
        body: notification.body ?? "Yeni bir bildiriminiz var.",
        data: payload.data ?? {},
      });
      playNotificationSound();
    })
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
          return;
        }

        foregroundUnsubscribe = unsubscribe;
      })
      .catch((listenerError) => {
        console.error("Foreground push dinleyicisi baslatilamadi:", listenerError);
      });

    return () => {
      cancelled = true;
      foregroundUnsubscribe?.();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!foregroundNotification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(
      () => setForegroundNotification(null),
      8000
    );

    return () => window.clearTimeout(timeoutId);
  }, [foregroundNotification]);

  const shouldShow =
    isAuthenticated &&
    isFirebaseConfigured() &&
    !dismissed &&
    typeof Notification !== "undefined" &&
    Notification.permission !== "granted";

  const handleEnable = async () => {
    setError("");
    setIsEnabling(true);

    try {
      await enablePushNotifications();
      setPushReady(true);
      setDismissed(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Push bildirimleri etkinlestirilemedi."
      );
    } finally {
      setIsEnabling(false);
    }
  };

  const handleEnableWhatsapp = async () => {
    setWhatsappError("");
    setIsEnablingWhatsapp(true);

    try {
      await updateNotificationPreference("WHATSAPP", true);
      localStorage.setItem(whatsappConsentKey, "enabled");
      setWhatsappDismissed(true);
    } catch (requestError) {
      setWhatsappError(
        requestError.response?.data?.message ||
          requestError.message ||
          "WhatsApp bildirim izni kaydedilemedi."
      );
    } finally {
      setIsEnablingWhatsapp(false);
    }
  };

  const shouldShowWhatsapp =
    isAuthenticated &&
    pushReady &&
    !shouldShow &&
    !hasWhatsappConsent &&
    !whatsappDismissed;

  if (!shouldShow && !shouldShowWhatsapp && !foregroundNotification) {
    return null;
  }

  return (
    <>
      {shouldShow && (
        <aside className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
            aria-label="Bildirim istegini kapat"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-3 pr-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Push bildirimlerini aç
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Rezervasyon ve sadakat gelişmelerini tarayıcından takip et.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={handleEnable}
            disabled={isEnabling}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEnabling && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isEnabling ? "Etkinleştiriliyor" : "Bildirimleri etkinleştir"}
          </button>
        </aside>
      )}

      {shouldShowWhatsapp && (
        <aside className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
          <button
            type="button"
            onClick={() => setWhatsappDismissed(true)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
            aria-label="WhatsApp bildirim istegini kapat"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-3 pr-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                WhatsApp bildirimlerini aç
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Rezervasyon gelişmelerini WhatsApp üzerinden de almak ister misin?
              </p>
            </div>
          </div>

          {whatsappError && (
            <p className="mt-3 text-sm text-red-600">{whatsappError}</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWhatsappDismissed(true)}
              disabled={isEnablingWhatsapp}
              className="h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Şimdi değil
            </button>

            <button
              type="button"
              onClick={handleEnableWhatsapp}
              disabled={isEnablingWhatsapp}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEnablingWhatsapp && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {isEnablingWhatsapp ? "Kaydediliyor" : "İzin ver"}
            </button>
          </div>
        </aside>
      )}

      {foregroundNotification && (
        <aside
          role="status"
          className="fixed right-5 top-5 z-[60] w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl"
        >
          <div className="h-1 bg-emerald-500" />
          <div className="flex gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">
                {foregroundNotification.title}
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {foregroundNotification.body}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setForegroundNotification(null)}
              className="h-fit text-slate-400 hover:text-slate-700"
              aria-label="Bildirimi kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
