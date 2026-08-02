import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { changeCurrentUserPassword } from "@/api/userServices";

function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, next: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value.slice(0, 100) }));
    setError("");
    setSuccess(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError("Yeni şifre ve şifre tekrarı eşleşmiyor.");
      return;
    }

    try {
      setLoading(true);
      await changeCurrentUserPassword(form);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Şifre güncellenemedi."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Hesap güvenliği</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-[#071a32]">Şifre Değiştir</h2>
        <p className="mt-2 text-sm text-slate-500">Mevcut şifrenizi doğrulayarak hesabınız için yeni bir şifre belirleyin.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-8">
          {error && <Message tone="error" icon={AlertCircle}>{error}</Message>}
          {success && <Message tone="success" icon={CheckCircle2}>Şifreniz başarıyla güncellendi.</Message>}

          <form onSubmit={submit} className="mt-2 space-y-5">
            <PasswordField
              label="Mevcut şifre"
              value={form.currentPassword}
              onChange={(value) => update("currentPassword", value)}
              show={show.current}
              onToggle={() => setShow((current) => ({ ...current, current: !current.current }))}
              autoComplete="current-password"
            />
            <div className="-mt-2 text-right">
              <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Mevcut şifremi bilmiyorum
              </Link>
            </div>
            <PasswordField
              label="Yeni şifre"
              value={form.newPassword}
              onChange={(value) => update("newPassword", value)}
              show={show.next}
              onToggle={() => setShow((current) => ({ ...current, next: !current.next }))}
              autoComplete="new-password"
            />
            <PasswordField
              label="Yeni şifre tekrar"
              value={form.confirmPassword}
              onChange={(value) => update("confirmPassword", value)}
              show={show.next}
              autoComplete="new-password"
            />
            <button disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {loading ? <LoaderCircle className="animate-spin" size={17} /> : <KeyRound size={17} />}
              Şifreyi güncelle
            </button>
          </form>
        </section>

        <aside className="h-fit rounded-[28px] bg-[#071a32] p-6 text-white">
          <ShieldCheck className="text-blue-300" size={28} />
          <h3 className="mt-5 text-xl font-bold">Güçlü şifre önerileri</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>• En az 8 karakter kullanın.</li>
            <li>• Büyük-küçük harf, rakam ve özel karakter ekleyin.</li>
            <li>• Daha önce kullandığınız bir şifreyi tekrar etmeyin.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, autoComplete }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <div className="relative mt-2">
        <input required type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="h-12 w-full rounded-2xl border border-slate-200 px-4 pr-12 text-sm outline-none focus:border-blue-500" />
        {onToggle && (
          <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

function Message({ tone, icon: Icon, children }) {
  const style = tone === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700";
  return <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${style}`}><Icon className="mt-0.5 shrink-0" size={19} />{children}</div>;
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

export default ChangePasswordPage;
