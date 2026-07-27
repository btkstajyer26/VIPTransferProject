import { useState } from "react";
import { AlertCircle, LoaderCircle, MailCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { verifyEmail } from "@/api/authApi";

export default function VerifyEmailPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Lütfen 6 haneli doğrulama kodunu eksiksiz girin.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await verifyEmail(email, code);
      navigate("/login", {
        replace: true,
        state: { verified: true },
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Kod hatalı veya süresi dolmuş. Lütfen tekrar deneyin.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
          <MailCheck className="h-7 w-7 text-blue-300" />
        </div>

        <h1 className="mt-6 text-center text-2xl font-semibold text-white">
          E-postanızı doğrulayın
        </h1>

        <p className="mt-3 text-center text-sm leading-6 text-slate-400">
          <span className="font-medium text-blue-300">{email}</span> adresine
          gönderilen 6 haneli kodu girin.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
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
              onChange={handleChange}
              autoFocus
              disabled={isLoading}
              className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Doğrulanıyor...
              </>
            ) : (
              "Doğrula"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Kodu almadınız mı?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-300 hover:text-blue-200"
          >
            Tekrar kayıt olun
          </Link>
        </p>
      </section>
    </main>
  );
}
