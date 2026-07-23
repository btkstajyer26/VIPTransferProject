import { useEffect, useState } from "react";
import {
  CircleCheck,
  CircleX,
  LoaderCircle,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { verifyEmail } from "@/api/authApi";

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [status, setStatus] = useState(STATUS.LOADING);
  const [message, setMessage] = useState(
    "E-posta adresiniz doğrulanıyor...",
  );

  useEffect(() => {
    let redirectTimer;

    const confirmEmail = async () => {
      if (!token) {
        setStatus(STATUS.ERROR);
        setMessage("Doğrulama tokenı bulunamadı.");
        return;
      }

      try {
        const response = await verifyEmail(token);

        setStatus(STATUS.SUCCESS);
        setMessage(
          response?.message ||
            "E-posta adresiniz başarıyla doğrulandı.",
        );

        redirectTimer = window.setTimeout(() => {
          navigate("/login", {
            replace: true,
          });
        }, 3000);
      } catch (error) {
        console.error("E-posta doğrulama hatası:", error);

        const responseData = error.response?.data;

        setStatus(STATUS.ERROR);
        setMessage(
          typeof responseData === "string"
            ? responseData
            : responseData?.message ||
                "Doğrulama bağlantısı geçersiz veya süresi dolmuş.",
        );
      }
    };

    confirmEmail();

    return () => {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [token, navigate]);

  const isLoading = status === STATUS.LOADING;
  const isSuccess = status === STATUS.SUCCESS;
  const isError = status === STATUS.ERROR;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        {isLoading && (
          <LoaderCircle
            className="mx-auto h-14 w-14 animate-spin text-blue-300"
            aria-hidden="true"
          />
        )}

        {isSuccess && (
          <CircleCheck
            className="mx-auto h-16 w-16 text-emerald-400"
            aria-hidden="true"
          />
        )}

        {isError && (
          <CircleX
            className="mx-auto h-16 w-16 text-red-400"
            aria-hidden="true"
          />
        )}

        <h1 className="mt-6 text-3xl font-semibold text-white">
          {isLoading
            ? "Doğrulanıyor"
            : isSuccess
              ? "Doğrulama başarılı"
              : "Doğrulama başarısız"}
        </h1>

        <p
          className="mt-4 leading-7 text-slate-400"
          aria-live="polite"
        >
          {message}
        </p>

        {isSuccess && (
          <p className="mt-3 text-sm text-slate-500">
            3 saniye içinde giriş sayfasına
            yönlendirileceksiniz.
          </p>
        )}

        {!isLoading && (
          <Link
            to="/login"
            replace
            className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Giriş sayfasına git
          </Link>
        )}
      </section>
    </main>
  );
}