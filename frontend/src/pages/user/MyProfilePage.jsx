import { useEffect, useState } from "react";
import { LoaderCircle, Save, ShieldCheck, UserRound } from "lucide-react";

import {
  getCurrentUser,
  updateCurrentUser,
} from "@/api/userServices";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  preferredLang: "tr",
};

function MyProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCurrentUser();
        setProfile(data);
        setForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          preferredLang: data.preferredLang || "tr",
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const updated = await updateCurrentUser(form);
      setProfile(updated);
      setSuccess("Profil bilgileriniz başarıyla güncellendi.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-[28px] bg-white">
        <LoaderCircle className="mr-2 animate-spin text-blue-600" />
        Profil yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Kişisel bilgiler</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-[#071a32]">
          Profil Bilgilerim
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Rezervasyonlarda kullanılacak iletişim bilgilerinizi güncel tutun.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-8"
        >
          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Ad"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              maxLength={100}
            />
            <Field
              label="Soyad"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              maxLength={100}
            />
            <Field
              label="E-posta"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              maxLength={150}
              className="sm:col-span-2"
            />
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="preferredLang">
                Tercih edilen dil
              </label>
              <select
                id="preferredLang"
                name="preferredLang"
                value={form.preferredLang}
                onChange={handleChange}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="sq">Shqip</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Telefon</label>
              <div className="mt-2 flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500">
                {profile?.phoneNumber || "-"}
              </div>
              <p className="mt-2 text-xs text-slate-400">Telefon numarası giriş kimliğiniz olduğu için değiştirilemez.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
            Değişiklikleri kaydet
          </button>
        </form>

        <aside className="h-fit rounded-[28px] bg-[#071a32] p-6 text-white shadow-[0_20px_60px_rgba(7,26,50,0.18)]">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600">
            <UserRound size={22} />
          </div>
          <h3 className="mt-5 text-xl font-bold">Hesap güvenliği</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Profil bilgileriniz yalnızca rezervasyon ve transfer iletişimi için kullanılır.
          </p>
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/10 p-4">
            <ShieldCheck className="mt-0.5 shrink-0 text-blue-300" size={19} />
            <p className="text-xs leading-5 text-slate-300">
              Oturumunuz JWT ile korunuyor. Şifrenizi veya doğrulama kodunuzu kimseyle paylaşmayın.
            </p>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Üyelik tarihi: {formatDate(profile?.createdAt)}
          </p>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="text-sm font-semibold text-slate-700" htmlFor={props.name}>
        {label}
      </label>
      <input
        id={props.name}
        {...props}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value))
    : "-";
}

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((item) => item.message || item.defaultMessage || item).join(" ");
  }
  return data?.message || error?.message || "Profil güncellenemedi.";
}

export default MyProfilePage;
