import { useEffect, useState } from "react";
import { BellRing, LoaderCircle, MessageCircle, ShieldAlert, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNotificationPreferences, updateNotificationPreference } from "@/api/notificationPreferenceServices";
import { deleteCurrentUser } from "@/api/userServices";
import { useAuth } from "@/context/AuthContext";

export default function AccountSettingsPage() {
  const [preferences, setPreferences] = useState({ PUSH: false, WHATSAPP: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const { clearSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { getNotificationPreferences().then((data) => setPreferences(Object.fromEntries((data || []).map((x) => [x.channel, x.enabled])))).catch((e) => setError(e?.response?.data?.message || "Tercihler alınamadı.")).finally(() => setLoading(false)); }, []);

  const toggle = async (channel) => {
    const enabled = !preferences[channel];
    try { setBusy(channel); setError(""); await updateNotificationPreference(channel, enabled); setPreferences((x) => ({...x,[channel]:enabled})); }
    catch (e) { setError(e?.response?.data?.message || "Tercih güncellenemedi."); }
    finally { setBusy(""); }
  };

  const removeAccount = async () => {
    if (confirmText !== "HESABIMI SİL") return;
    try { setBusy("delete"); await deleteCurrentUser(); clearSession(); navigate("/", { replace: true }); }
    catch (e) { setError(e?.response?.data?.message || "Hesap silinemedi."); setBusy(""); }
  };

  return <div className="space-y-6">
    <header><p className="text-sm font-semibold text-blue-600">Tercihler ve güvenlik</p><h2 className="mt-1 text-3xl font-bold text-[#071a32]">Hesap Ayarları</h2><p className="mt-2 text-sm text-slate-500">Bildirim kanallarınızı ve hesap yaşam döngüsünü yönetin.</p></header>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="rounded-[28px] border bg-white p-6 sm:p-8"><div className="mb-6 flex items-center gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-blue-600"><BellRing/></span><div><h3 className="font-bold text-slate-900">Bildirim tercihleri</h3><p className="text-sm text-slate-500">Rezervasyon gelişmelerini hangi kanallardan almak istediğinizi seçin.</p></div></div>
      {loading ? <LoaderCircle className="animate-spin"/> : <div className="divide-y rounded-2xl border">{[["PUSH","Tarayıcı bildirimleri",Smartphone],["WHATSAPP","WhatsApp bildirimleri",MessageCircle]].map(([channel,label,Icon]) => <div key={channel} className="flex items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><Icon className="text-blue-600" size={20}/><div><p className="font-semibold">{label}</p><p className="text-xs text-slate-500">E-posta ile hesap doğrulama ve zorunlu operasyon mesajları devam eder.</p></div></div><button type="button" onClick={() => toggle(channel)} disabled={busy === channel} aria-pressed={preferences[channel]} className={`relative h-7 w-12 rounded-full transition ${preferences[channel] ? "bg-blue-600":"bg-slate-300"}`}><span className={`absolute top-1 size-5 rounded-full bg-white transition ${preferences[channel] ? "left-6":"left-1"}`}/></button></div>)}</div>}
    </section>
    <section className="rounded-[28px] border border-red-200 bg-white p-6 sm:p-8"><div className="flex items-start gap-3"><ShieldAlert className="mt-1 text-red-600"/><div><h3 className="font-bold text-red-700">Hesabı kalıcı olarak sil</h3><p className="mt-2 text-sm leading-6 text-slate-600">Bu işlem geri alınamaz. Devam etmek için aşağıya <strong>HESABIMI SİL</strong> yazın.</p></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="h-11 flex-1 rounded-xl border px-3"/><button onClick={removeAccount} disabled={confirmText !== "HESABIMI SİL" || busy === "delete"} className="h-11 rounded-xl bg-red-600 px-5 font-semibold text-white disabled:opacity-40">Hesabımı sil</button></div></section>
  </div>;
}
