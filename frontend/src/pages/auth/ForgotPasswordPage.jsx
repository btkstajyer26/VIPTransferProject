import { useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { forgotPassword, resetPassword } from "@/api/authApi";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // "email" | "reset"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Adım 1 ──────────────────────────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("E-posta adresi zorunludur.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(trimmedEmail);
      setEmail(trimmedEmail);
      setStep("reset");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Kod gönderilirken bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Adım 2 ──────────────────────────────────────────────────────────────
  const handleCodeChange = (e) => {
    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const handlePasswordChange = (e) => {
    setNewPassword(e.target.value.slice(0, 100));
    setError("");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Lütfen 6 haneli doğrulama kodunu eksiksiz girin.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email, code, newPassword);
      navigate("/login", {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Kod hatalı veya süresi dolmuş. Lütfen tekrar deneyin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
          <KeyRound className="h-7 w-7 text-blue-300" />
        </div>

        {step === "email" ? (
          <>
            <h1 className="mt-6 text-center text-2xl font-semibold text-white">
              Şifremi unuttum
            </h1>

            <p className="mt-3 text-center text-sm leading-6 text-slate-400">
              Kayıtlı e-posta adresinizi girin. Şifre sıfırlama kodunu
              göndereceğiz.
            </p>

            <form
              onSubmit={handleSendCode}
              className="mt-8 space-y-5"
              noValidate
            >
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  E-posta adresi
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    autoFocus
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Kod gönderiliyor...
                  </>
                ) : (
                  "Kod Gönder"
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-center text-2xl font-semibold text-white">
              Yeni şifre belirle
            </h1>

            <p className="mt-3 text-center text-sm leading-6 text-slate-400">
              <span className="font-medium text-blue-300">{email}</span>{" "}
              adresine gönderilen 6 haneli kodu ve yeni şifrenizi girin.
            </p>

            <form
              onSubmit={handleResetPassword}
              className="mt-8 space-y-5"
              noValidate
            >
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Doğrulama Kodu
                </label>

                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={handleCodeChange}
                  autoFocus
                  disabled={isLoading}
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Yeni Şifre
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="En az 6 karakter"
                    minLength={6}
                    maxLength={100}
                    value={newPassword}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isLoading ||
                  code.length !== 6 ||
                  newPassword.length < 6
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Sıfırlanıyor...
                  </>
                ) : (
                  "Şifreyi Sıfırla"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Kodu almadınız mı?{" "}
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setNewPassword("");
                  setError("");
                }}
                className="font-medium text-blue-300 hover:text-blue-200"
              >
                Tekrar gönder
              </button>
            </p>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Şifrenizi hatırladınız mı?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-300 hover:text-blue-200"
          >
            Giriş yapın
          </Link>
        </p>
      </section>
    </main>
  );
}
