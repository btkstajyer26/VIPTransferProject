import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { changeCurrentPassword } from "@/api/userServices";
import { useAuth } from "@/context/AuthContext";

const PASSWORD_RULES =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

function ChangePasswordPage() {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Mevcut şifrenizi girin.");
      return;
    }
    if (!PASSWORD_RULES.test(newPassword)) {
      setError(
        "Yeni şifre en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Şifre tekrarı eşleşmiyor.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Yeni şifre mevcut şifreyle aynı olamaz.");
      return;
    }

    try {
      setLoading(true);
      await changeCurrentPassword({ currentPassword, newPassword, confirmPassword });
      setDone(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Şifre güncellenemedi. Mevcut şifrenizi kontrol edin."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Hesap güvenliği</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-[#071a32]">Şifre Değiştir</h2>
        <p className="mt-2 text-sm text-slate-500">
          Mevcut şifrenizi girerek yeni şifrenizi belirleyin.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-8">

          {done ? (
            <div className="rounded-[24px] bg-emerald-50 p-7 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
              <h3 className="mt-4 text-xl font-bold text-emerald-900">Şifreniz güncellendi</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-700">
                Yeni şifrenizle tekrar giriş yapmanız gerekiyor.
              </p>
              <button
                onClick={logout}
                className="mt-5 rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white"
              >
                Güvenli çıkış yap
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 shrink-0" size={19} />
                  {error}
                </div>
              )}

              <PasswordField
                id="current-password"
                label="Mevcut şifre"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
              />
              <PasswordField
                id="new-password"
                label="Yeni şifre"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-password"
                label="Yeni şifre tekrar"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showNew}
                autoComplete="new-password"
              />

              <button
                disabled={loading}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <KeyRound size={17} />
                )}
                Şifreyi güncelle
              </button>
            </form>
          )}
        </section>

        <aside className="h-fit rounded-[28px] bg-[#071a32] p-6 text-white">
          <ShieldCheck className="text-blue-300" size={28} />
          <h3 className="mt-5 text-xl font-bold">Güçlü şifre önerileri</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>• En az 8 karakter kullanın.</li>
            <li>• Büyük ve küçük harf, rakam ve özel karakter içersin.</li>
            <li>• Başka hesaplarda kullandığınız şifreyi tekrarlamayın.</li>
            <li>• Şifrenizi kimseyle paylaşmayın.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, show, onToggle, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-slate-700">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 pr-12 text-sm outline-none focus:border-blue-500"
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export default ChangePasswordPage;
