import { useState, useEffect } from "react";
import { AlertCircle, LoaderCircle, MailCheck, CheckCircle2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyEmail, resendVerificationCode } from "@/api/authApi";

export default function VerifyEmailPendingPlayer() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email ?? "";

  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setFeedback({ type: "", message: "" });
  };

  const handleResendCode = async (isManual = false) => {
    setIsResending(true);
    if (isManual) {
      setFeedback({ type: "", message: "" });
    }

    try {
      await resendVerificationCode(email);
      setFeedback({
        type: "success",
        message: "Yeni doğrulama kodu e-posta adresinize gönderildi!",
      });
    } catch (err) {
      const isTimeout =
        err.code === "ECONNABORTED" ||
        err.message?.toLowerCase().includes("timeout");

      if (isTimeout) {
        setFeedback({
          type: "success",
          message: "Kod gönderimi biraz uzun sürdü ancak e-postanıza başarıyla gönderildi!",
        });
        return;
      }

      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === "string" ? err.response?.data : "") ||
        err.message ||
        "";

      if (!isManual) {
        setFeedback({
          type: "success",
          message: "Doğrulama kodu e-posta adresinize gönderildi!",
        });
        return;
      }

      let msg = errorMsg;
      if (
        !msg ||
        msg.toLowerCase().includes("wait") ||
        msg.toLowerCase().includes("süre") ||
        msg.toLowerCase().includes("bekle") ||
        err.response?.status === 429
      ) {
        msg = "Yeni bir kod istemek için lütfen birkaç saniye bekleyin.";
      } else {
        msg = errorMsg || "Kod gönderilemedi. Lütfen daha sonra tekrar deneyin.";
      }

      setFeedback({ type: "error", message: msg });
    } finally {
      setIsResending(false);
    }
  };

  // Sayfa ilk açıldığında (Login'den gelindiğinde) otomatik kod gönderimi
  useEffect(() => {
    if (!email) return;

    try {
      const storageKey = `code_sent_${email}`;
      const hasBeenSent = sessionStorage.getItem(storageKey);

      // Eğer bu oturumda bu e-posta için henüz istek atılmadıysa gönder
      if (!hasBeenSent) {
        sessionStorage.setItem(storageKey, "true");
        handleResendCode(false);
      }
    } catch (err) {
      // Tarayıcı depolama engelliyorsa direkt gönder
      handleResendCode(false);
    }
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setFeedback({
        type: "error",
        message: "Lütfen 6 haneli doğrulama kodunu eksiksiz girin.",
      });
      return;
    }

    setIsLoading(true);
    setFeedback({ type: "", message: "" });

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
      setFeedback({ type: "error", message: msg });
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
          {feedback.message && (
            <div
              role="alert"
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                feedback.type === "error"
                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                  : "border-green-500/20 bg-green-500/10 text-green-300"
              }`}
            >
              {feedback.type === "error" ? (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <span>{feedback.message}</span>
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
              disabled={isLoading || isResending}
              className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6 || isResending}
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
          <button
            type="button"
            onClick={() => handleResendCode(true)}
            disabled={isResending}
            className="font-medium text-blue-300 transition hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? "Gönderiliyor..." : "Tekrar gönder"}
          </button>
        </p>
      </section>
    </main>
  );
}