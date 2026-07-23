import { useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "@/api/authApi";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  passwordConfirmation: "",
};

function getBackendError(error) {
  const responseData = error.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.error ||
    "Kayıt işlemi sırasında beklenmeyen bir hata oluştu."
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    let normalizedValue = value;

    if (name === "phoneNumber") {
      normalizedValue = value.replace(/\D/g, "").slice(0, 11);
    }

    if (
      name === "password" ||
      name === "passwordConfirmation"
    ) {
      normalizedValue = value.slice(0, 100);
    }

    setFormData((current) => ({
      ...current,
      [name]: normalizedValue,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Ad alanı zorunludur.";
    } else if (formData.firstName.trim().length > 100) {
      newErrors.firstName = "Ad en fazla 100 karakter olabilir.";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Soyad alanı zorunludur.";
    } else if (formData.lastName.trim().length > 100) {
      newErrors.lastName =
        "Soyad en fazla 100 karakter olabilir.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "E-posta alanı zorunludur.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email.trim(),
      )
    ) {
      newErrors.email = "Geçerli bir e-posta adresi girin.";
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Telefon numarası zorunludur.";
    } else if (!/^05\d{9}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber =
        "Telefon numarası 05 ile başlayan 11 haneli olmalıdır.";
    }

    if (!formData.password) {
      newErrors.password = "Şifre alanı zorunludur.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalıdır.";
    }

    if (!formData.passwordConfirmation) {
      newErrors.passwordConfirmation =
        "Şifre tekrarı zorunludur.";
    } else if (
      formData.passwordConfirmation !== formData.password
    ) {
      newErrors.passwordConfirmation = "Şifreler eşleşmiyor.";
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

      const response = await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });

      navigate("/verify-email-pending", {
        replace: true,
        state: {
          email: formData.email.trim().toLowerCase(),
          message: response?.message,
        },
      });
    } catch (error) {
      console.error(
        "Kayıt hatası:",
        error.response?.data ?? error.message,
      );

      if (!error.response) {
        setServerError(
          "Sunucuya ulaşılamadı. Backend servisinin çalıştığını kontrol edin.",
        );
      } else {
        setServerError(getBackendError(error));
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
      </div>

      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">
        <div className="mx-auto max-w-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20">
            <UserPlus className="h-6 w-6 text-blue-300" />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-blue-300">
              VIP Transfer
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Yeni hesap oluşturun
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Rezervasyonlarınızı takip etmek ve sadakat
              avantajlarından yararlanmak için kayıt olun.
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

            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput
                name="firstName"
                label="Ad"
                placeholder="Adınız"
                value={formData.firstName}
                error={errors.firstName}
                icon={User}
                disabled={isLoading}
                onChange={handleChange}
                autoComplete="given-name"
              />

              <FormInput
                name="lastName"
                label="Soyad"
                placeholder="Soyadınız"
                value={formData.lastName}
                error={errors.lastName}
                icon={User}
                disabled={isLoading}
                onChange={handleChange}
                autoComplete="family-name"
              />
            </div>

            <FormInput
              name="email"
              type="email"
              label="E-posta"
              placeholder="ornek@mail.com"
              value={formData.email}
              error={errors.email}
              icon={Mail}
              disabled={isLoading}
              onChange={handleChange}
              autoComplete="email"
            />

            <FormInput
              name="phoneNumber"
              type="tel"
              label="Telefon numarası"
              placeholder="05XX XXX XX XX"
              value={formData.phoneNumber}
              error={errors.phoneNumber}
              icon={Phone}
              disabled={isLoading}
              onChange={handleChange}
              autoComplete="tel"
              inputMode="numeric"
              maxLength={11}
            />

            <PasswordInput
              name="password"
              label="Şifre"
              placeholder="En az 6 karakter"
              value={formData.password}
              error={errors.password}
              disabled={isLoading}
              showPassword={showPassword}
              onTogglePassword={() =>
                setShowPassword((current) => !current)
              }
              onChange={handleChange}
              autoComplete="new-password"
            />

            <PasswordInput
              name="passwordConfirmation"
              label="Şifre tekrarı"
              placeholder="Şifrenizi tekrar girin"
              value={formData.passwordConfirmation}
              error={errors.passwordConfirmation}
              disabled={isLoading}
              showPassword={showPassword}
              onTogglePassword={() =>
                setShowPassword((current) => !current)
              }
              onChange={handleChange}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Hesap oluşturuluyor
                </>
              ) : (
                "Kayıt Ol"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Zaten hesabınız var mı?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-300 hover:text-blue-200"
            >
              Giriş yapın
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function FormInput({
  name,
  type = "text",
  label,
  placeholder,
  value,
  error,
  icon: Icon,
  disabled,
  onChange,
  ...inputProps
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          className={`h-12 w-full rounded-xl border bg-white/5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? "border-red-500/60 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
              : "border-white/10 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10"
          }`}
          {...inputProps}
        />
      </div>

      {error && (
        <p className="mt-2 text-xs leading-5 text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordInput({
  name,
  label,
  placeholder,
  value,
  error,
  disabled,
  showPassword,
  onTogglePassword,
  onChange,
  ...inputProps
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

        <input
          id={name}
          name={name}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={onChange}
          minLength={6}
          maxLength={100}
          aria-invalid={Boolean(error)}
          className={`h-12 w-full rounded-xl border bg-white/5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? "border-red-500/60 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
              : "border-white/10 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10"
          }`}
          {...inputProps}
        />

        <button
          type="button"
          onClick={onTogglePassword}
          disabled={disabled}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
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

      {error && (
        <p className="mt-2 text-xs leading-5 text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}