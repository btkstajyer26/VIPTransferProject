import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  Clock3,
  MapPin,
  Search,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import AddressAutocomplete from "../maps/AddressAutocomplete";

const emptyPlace = {
  address: "",
  latitude: null,
  longitude: null,
};

const initialForm = {
  pickup: { ...emptyPlace },
  dropoff: { ...emptyPlace },
  scheduledDate: "",
  scheduledTime: "",
  passengerCount: 1,
};

function QuickReservationForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState(initialForm);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [formError, setFormError] = useState("");

  const handleAddressTextChange = (fieldName, value) => {
    setFormData((current) => ({
      ...current,
      [fieldName]: {
        address: value,
        latitude: null,
        longitude: null,
      },
    }));

    setFormError("");
  };

  const handleAddressSelect = (fieldName, selectedAddress) => {
    setFormData((current) => ({
      ...current,
      [fieldName]: {
        address: selectedAddress.address,
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
      },
    }));

    setFormError("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError("");
  };

  const swapLocations = () => {
    setFormData((current) => ({
      ...current,
      pickup: current.dropoff,
      dropoff: current.pickup,
    }));

    setFormError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    const { pickup, dropoff } = formData;

    if (!pickup.address.trim() || !dropoff.address.trim()) {
      setFormError(
        "Lütfen başlangıç ve varış adreslerini girin.",
      );
      return;
    }

    const pickupHasCoordinates =
      pickup.latitude !== null &&
      pickup.longitude !== null;

    const dropoffHasCoordinates =
      dropoff.latitude !== null &&
      dropoff.longitude !== null;

    if (
      !pickupHasCoordinates ||
      !dropoffHasCoordinates
    ) {
      setFormError(
        "Lütfen başlangıç ve varış adreslerini öneriler arasından seçin.",
      );
      return;
    }

    const reservationSearch = {
      pickup: {
        address: pickup.address,
        latitude: Number(pickup.latitude),
        longitude: Number(pickup.longitude),
      },

      dropoff: {
        address: dropoff.address,
        latitude: Number(dropoff.latitude),
        longitude: Number(dropoff.longitude),
      },

      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,

      passengerCount: Number(
        formData.passengerCount,
      ),

      roundTrip: isRoundTrip,
    };

    sessionStorage.setItem(
      "reservationSearch",
      JSON.stringify(reservationSearch),
    );

    navigate("/reservation");
  };

  return (
    <div className="mx-auto max-w-[1480px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_30px_80px_rgba(15,45,80,0.22)] sm:p-8"
      >
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-blue-600">
              <span className="h-px w-6 bg-blue-600" />
<<<<<<< HEAD
              {t("reservationForm.badge")}
=======

              Hızlı Rezervasyon
>>>>>>> feature/web-frontend-setup
            </div>

            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#0b1f3a]">
              {t("reservationForm.title")}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              {t("reservationForm.addReturn")}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isRoundTrip}
              aria-label="Dönüş transferi ekle"
              onClick={() =>
                setIsRoundTrip(
                  (current) => !current,
                )
              }
              className={`relative h-7 w-12 rounded-full transition ${
                isRoundTrip
                  ? "bg-[#155eef]"
                  : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition ${
                  isRoundTrip
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

<<<<<<< HEAD
 
<div className="grid gap-4">
  {/* Adresler */}
  <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
    <FormField label={t("reservationForm.from")} icon={MapPin}>
      <input
        type="text"
        name="pickupAddress"
        value={formData.pickupAddress}
        onChange={handleChange}
        placeholder={t("reservationForm.fromPlaceholder")}
        className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        required
      />
    </FormField>
=======
        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />
>>>>>>> feature/web-frontend-setup

            <span>{formError}</span>
          </div>
        )}

<<<<<<< HEAD
    <FormField label={t("reservationForm.to")} icon={MapPin}>
      <input
        type="text"
        name="dropoffAddress"
        value={formData.dropoffAddress}
        onChange={handleChange}
        placeholder={t("reservationForm.toPlaceholder")}
        className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        required
      />
    </FormField>
  </div>

  {/* Tarih, saat, yolcu ve buton */}
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.9fr_auto]">
    <FormField label={t("reservationForm.date")} icon={CalendarDays}>
      <input
        type="date"
        name="scheduledDate"
        value={formData.scheduledDate}
        onChange={handleChange}
        min={new Date().toISOString().split("T")[0]}
        className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
        required
      />
    </FormField>

    <FormField label={t("reservationForm.time")} icon={Clock3}>
      <input
        type="time"
        name="scheduledTime"
        value={formData.scheduledTime}
        onChange={handleChange}
        className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
        required
      />
    </FormField>

    <FormField label={t("reservationForm.passengers")} icon={UsersRound}>
      <select
        name="passengerCount"
        value={formData.passengerCount}
        onChange={handleChange}
        className="min-w-0 w-full cursor-pointer bg-transparent text-sm font-medium text-slate-900 outline-none"
      >
        {Array.from(
          { length: 16 },
          (_, index) => index + 1,
        ).map((count) => (
          <option key={count} value={count}>
            {count} {t("reservationForm.passengerCount")}
          </option>
        ))}
      </select>
    </FormField>

    <button
      type="submit"
      className="group flex min-h-[72px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#155eef] to-[#2979ff] px-7 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 xl:w-auto"
    >
      <Search size={18} />
      {t("reservationForm.searchButton")}
      <ArrowRight
        size={17}
        className="transition group-hover:translate-x-1"
      />
    </button>
  </div>
</div>
=======
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <FormField
              label="Nereden"
              icon={MapPin}
            >
              <AddressAutocomplete
                value={formData.pickup.address}
                placeholder="Havalimanı, otel veya adres seçin"
                onChange={(value) =>
                  handleAddressTextChange(
                    "pickup",
                    value,
                  )
                }
                onSelect={(selectedAddress) =>
                  handleAddressSelect(
                    "pickup",
                    selectedAddress,
                  )
                }
              />
            </FormField>

            <button
              type="button"
              onClick={swapLocations}
              className="mx-auto flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 transition hover:border-blue-200 hover:bg-blue-100"
              aria-label="Adreslerin yerini değiştir"
            >
              <ArrowUpDown size={18} />
            </button>

            <FormField
              label="Nereye"
              icon={MapPin}
            >
              <AddressAutocomplete
                value={formData.dropoff.address}
                placeholder="Havalimanı, otel veya adres seçin"
                onChange={(value) =>
                  handleAddressTextChange(
                    "dropoff",
                    value,
                  )
                }
                onSelect={(selectedAddress) =>
                  handleAddressSelect(
                    "dropoff",
                    selectedAddress,
                  )
                }
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.9fr_auto]">
            <FormField
              label="Tarih"
              icon={CalendarDays}
            >
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                className="w-full min-w-0 bg-transparent text-sm font-medium text-slate-900 outline-none"
                required
              />
            </FormField>

            <FormField
              label="Saat"
              icon={Clock3}
            >
              <input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                className="w-full min-w-0 bg-transparent text-sm font-medium text-slate-900 outline-none"
                required
              />
            </FormField>

            <FormField
              label="Yolcu"
              icon={UsersRound}
            >
              <select
                name="passengerCount"
                value={formData.passengerCount}
                onChange={handleInputChange}
                className="w-full min-w-0 cursor-pointer bg-transparent text-sm font-medium text-slate-900 outline-none"
              >
                {Array.from(
                  { length: 16 },
                  (_, index) => index + 1,
                ).map((count) => (
                  <option
                    key={count}
                    value={count}
                  >
                    {count} Yolcu
                  </option>
                ))}
              </select>
            </FormField>

            <button
              type="submit"
              className="group flex min-h-[72px] w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#155eef] to-[#2979ff] px-7 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 xl:w-auto"
            >
              <Search size={18} />

              Araçları Gör

              <ArrowRight
                size={17}
                className="transition group-hover:translate-x-1"
              />
            </button>
          </div>
        </div>
>>>>>>> feature/web-frontend-setup
      </form>
    </div>
  );
}

function FormField({
  label,
  icon: Icon,
  children,
}) {
  return (
    <div className="relative flex min-h-[72px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/70">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>

        <div className="relative min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default QuickReservationForm;