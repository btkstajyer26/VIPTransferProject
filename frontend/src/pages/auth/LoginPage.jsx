import { useState } from "react";
import {Link, useNavigate,} from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Phone,
  ShieldCheck,
} from "lucide-react";

import useAuth from "@/hooks/useAuth";

const INITIAL_FORM = {
  phoneNumber: "",
  password: "",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (event) => {
    const onlyNumbers = event.target.value
      .replace(/\D/g, "")
      .slice(0, 11);

    setFormData((current) => ({
      ...current,
      phoneNumber: onlyNumbers,
    }));

    setErrors((current) => ({
      ...current,
      phoneNumber: "",
    }));

    setServerError("");
  };

  const handlePasswordChange = (event) => {
    const password = event.target.value.slice(0, 100);

    setFormData((current) => ({
      ...current,
      password,
    }));

    setErrors((current) => ({
      ...current,
      password: "",
    }));

    setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Telefon numarası zorunludur.";
    } else if (!/^05\d{9}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber =
        "Telefon numarası 05 ile başlayan 11 haneli bir numara olmalıdır.";
    }

    if (!formData.password) {
      newErrors.password = "Şifre zorunludur.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalıdır.";
    } else if (formData.password.length > 100) {
      newErrors.password = "Şifre en fazla 100 karakter olabilir.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const result = await login({
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });

      const role = result?.user?.role;

      switch (role) {
        case "ADMIN":
          navigate("/admin/dashboard", {
            replace: true,
          });
          break;

        case "CUSTOMER":
          navigate("/", {
            replace: true,
          });
          break;

        default:
          setServerError(
            "Hesabınız için tanımlanmış geçerli bir kullanıcı rolü bulunamadı."
          );
      }
    } catch (error) {
      console.error(
        "Giriş hatası:",
        error.response?.data ?? error.message
      );

      const status = error.response?.status;

      if (status === 400) {
        setServerError(
          "Gönderilen giriş bilgileri geçersiz. Lütfen alanları kontrol edin."
        );
      } else if (status === 401) {
        setServerError("Telefon numarası veya şifre hatalı.");
      } else if (status === 403) {
        setServerError("Bu hesabın sisteme giriş yetkisi bulunmuyor.");
      } else if (status === 429) {
        setServerError(
          "Çok fazla giriş denemesi yapıldı. Lütfen bir süre bekleyin."
        );
      } else if (!error.response) {
        setServerError(
          "Sunucuya ulaşılamadı. Backend servisinin çalıştığını kontrol edin."
        );
      } else {
        setServerError(
          error.response?.data?.message ||
            "Giriş işlemi sırasında beklenmeyen bir hata oluştu."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-xl lg:grid-cols-2">
        <div className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-blue-600/20 via-indigo-500/10 to-transparent p-10 lg:flex">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
              <ShieldCheck className="h-7 w-7 text-blue-300" />
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-blue-300">
                VIP Transfer
              </p>

              <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight text-white">
                Yolculuk deneyiminizi kolayca yönetin.
              </h1>

              <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
                Rezervasyonlarınıza erişin, transfer süreçlerinizi takip edin
                ve hesabınıza özel hizmetleri tek platform üzerinden kullanın.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-sm leading-6 text-slate-300">
              Hesabınıza güvenli şekilde giriş yaparak devam edin.
            </p>
          </div>
        </div>

        <div className="flex min-h-[620px] items-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20">
                <ShieldCheck className="h-6 w-6 text-blue-300" />
              </div>
            </div>

            <div className="mt-6 lg:mt-0">
              <p className="text-sm font-medium text-blue-300">
                VIP Transfer
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Hoş geldiniz
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Devam etmek için telefon numaranız ve şifrenizle giriş yapın.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-8 space-y-5"
            >
              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <span>{serverError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Telefon numarası
                </label>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="05XX XXX XX XX"
                    maxLength={11}
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.phoneNumber)}
                    aria-describedby={
                      errors.phoneNumber ? "phoneNumber-error" : undefined
                    }
                    className={`h-12 w-full rounded-xl border bg-white/5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 ${
                      errors.phoneNumber
                        ? "border-red-500/60 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                        : "border-white/10 focus:border-blue-500/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                    }`}
                  />
                </div>

                {errors.phoneNumber && (
                  <p
                    id="phoneNumber-error"
                    className="mt-2 text-xs leading-5 text-red-300"
                  >
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Şifre
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Şifrenizi girin"
                    minLength={6}
                    maxLength={100}
                    value={formData.password}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    className={`h-12 w-full rounded-xl border bg-white/5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 ${
                      errors.password
                        ? "border-red-500/60 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                        : "border-white/10 focus:border-blue-500/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={
                      showPassword ? "Şifreyi gizle" : "Şifreyi göster"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p
                    id="password-error"
                    className="mt-2 text-xs leading-5 text-red-300"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-blue-600"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Giriş yapılıyor
                  </>
                ) : (
                  "Giriş Yap"
                )}
              </button>
                <p className="mt-6 text-center text-sm text-slate-400">
                Henüz hesabınız yok mu?{" "}
                <Link
                  to="/register"
                  className="font-medium text-blue-300 transition hover:text-blue-200"
                >
                  Kayıt olun
                </Link>
              </p>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-slate-500">
              Giriş işlemleriniz güvenli bağlantı üzerinden
              gerçekleştirilmektedir.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}