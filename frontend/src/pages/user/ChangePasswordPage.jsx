import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { forgotPassword, resetPassword } from "@/api/authApi";
import { getCurrentUser } from "@/api/userServices";
import { useAuth } from "@/context/AuthContext";

function ChangePasswordPage() {
  const { logout } = useAuth();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("request");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((profile) => {
        if (active) setEmail(profile?.email || "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const requestCode = async (event) => {
    event.preventDefault();
    setError("");
    if (!email) {
      setError("Hesabınızda kayıtlı e-posta bulunmuyor. Önce profilinizi güncelleyin.");
      return;
    }
    try {
      setLoading(true);
      await forgotPassword(email);
      setStep("verify");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Doğrulama kodu gönderilemedi."));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("6 haneli doğrulama kodunu girin.");
      return;
    }
    if (password.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (password !== passwordAgain) {
      setError("Şifre tekrarları eşleşmiyor.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email, code, password);
      setStep("success");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Kod hatalı veya süresi dolmuş."));
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
          Güvenliğiniz için e-posta doğrulama koduyla yeni şifrenizi belirleyin.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-8">
          <StepIndicator step={step} />
          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={19} /> {error}
            </div>
          )}

          {step === "request" && (
            <form onSubmit={requestCode} className="mt-7">
              <label htmlFor="password-email" className="text-sm font-bold text-slate-700">Kayıtlı e-posta</label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input id="password-email" value={email} readOnly className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-600" />
              </div>
              <button disabled={loading} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-60">
                {loading ? <LoaderCircle className="animate-spin" size={17} /> : <KeyRound size={17} />}
                Doğrulama kodu gönder
              </button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={changePassword} className="mt-7 space-y-5">
              <div>
                <label htmlFor="change-code" className="text-sm font-bold text-slate-700">Doğrulama kodu</label>
                <input
                  id="change-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-blue-500"
                />
              </div>
              <PasswordField label="Yeni şifre" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((current) => !current)} />
              <PasswordField label="Yeni şifre tekrar" value={passwordAgain} onChange={setPasswordAgain} show={showPassword} />
              <div className="flex flex-wrap gap-3">
                <button disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-60">
                  {loading ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                  Şifreyi güncelle
                </button>
                <button type="button" onClick={() => setStep("request")} className="rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
                  Kodu tekrar gönder
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div className="mt-8 rounded-[24px] bg-emerald-50 p-7 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
              <h3 className="mt-4 text-xl font-bold text-emerald-900">Şifreniz güncellendi</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-700">Yeni şifrenizle tekrar giriş yapmanız gerekiyor.</p>
              <button onClick={logout} className="mt-5 rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white">
                Güvenli çıkış yap
              </button>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-[28px] bg-[#071a32] p-6 text-white">
          <ShieldCheck className="text-blue-300" size={28} />
          <h3 className="mt-5 text-xl font-bold">Güçlü şifre önerileri</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>• En az 8 karakter tercih edin.</li>
            <li>• Harf, rakam ve sembolleri birlikte kullanın.</li>
            <li>• Başka hesaplarda kullandığınız şifreyi tekrarlamayın.</li>
            <li>• Doğrulama kodunu kimseyle paylaşmayın.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function StepIndicator({ step }) {
  const active = step === "request" ? 1 : step === "verify" ? 2 : 3;
  return (
    <div className="flex items-center gap-3 text-xs font-bold">
      {["Kod gönder", "Yeni şifre", "Tamamlandı"].map((label, index) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${index + 1 <= active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{index + 1}</span>
          <span className={index + 1 <= active ? "text-[#071a32]" : "text-slate-400"}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <div className="relative mt-2">
        <input type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value.slice(0, 100))} autoComplete="new-password" className="h-12 w-full rounded-2xl border border-slate-200 px-4 pr-12 text-sm outline-none focus:border-blue-500" />
        {onToggle && (
          <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

export default ChangePasswordPage;
