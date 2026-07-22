import { MailCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function VerifyEmailPendingPage() {
  const location = useLocation();

  const email = location.state?.email;
  const message = location.state?.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20">
          <MailCheck className="h-8 w-8 text-blue-300" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-white">
          E-postanızı kontrol edin
        </h1>

        <p className="mt-4 leading-7 text-slate-400">
          {message ||
            "Kayıt işleminiz tamamlandı. E-posta adresinize gönderilen doğrulama bağlantısına tıklayın."}
        </p>

        {email && (
          <p className="mt-3 font-medium text-blue-300">
            {email}
          </p>
        )}

        <p className="mt-5 text-sm text-slate-500">
          Doğrulama bağlantısı 30 dakika boyunca geçerlidir.
        </p>

        <Link
          to="/login"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Giriş sayfasına dön
        </Link>
      </section>
    </main>
  );
}