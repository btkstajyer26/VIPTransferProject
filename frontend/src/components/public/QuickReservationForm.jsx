import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  Clock3,
  MapPin,
  Search,
  UsersRound,
} from "lucide-react";

const initialForm = {
  pickupAddress: "",
  dropoffAddress: "",
  scheduledDate: "",
  scheduledTime: "",
  passengerCount: 1,
};

function QuickReservationForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialForm);
  const [isRoundTrip, setIsRoundTrip] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const swapLocations = () => {
    setFormData((current) => ({
      ...current,
      pickupAddress: current.dropoffAddress,
      dropoffAddress: current.pickupAddress,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const searchParams = new URLSearchParams({
      pickupAddress: formData.pickupAddress,
      dropoffAddress: formData.dropoffAddress,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      passengerCount: String(formData.passengerCount),
      roundTrip: String(isRoundTrip),
    });

    navigate(`/reservation?${searchParams.toString()}`);
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
              Hızlı Rezervasyon
            </div>

            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#0b1f3a]">
              Transferinizi planlayın
            </h2>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              Dönüş transferi ekle
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isRoundTrip}
              onClick={() =>
                setIsRoundTrip((current) => !current)
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
          </label>
        </div>

 
<div className="grid gap-4">
  {/* Adresler */}
  <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
    <FormField label="Nereden" icon={MapPin}>
      <input
        type="text"
        name="pickupAddress"
        value={formData.pickupAddress}
        onChange={handleChange}
        placeholder="Havalimanı, otel veya adres seçin"
        className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        required
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

    <FormField label="Nereye" icon={MapPin}>
      <input
        type="text"
        name="dropoffAddress"
        value={formData.dropoffAddress}
        onChange={handleChange}
        placeholder="Havalimanı, otel veya adres seçin"
        className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        required
      />
    </FormField>
  </div>

  {/* Tarih, saat, yolcu ve buton */}
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.9fr_auto]">
    <FormField label="Tarih" icon={CalendarDays}>
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

    <FormField label="Saat" icon={Clock3}>
      <input
        type="time"
        name="scheduledTime"
        value={formData.scheduledTime}
        onChange={handleChange}
        className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
        required
      />
    </FormField>

    <FormField label="Yolcu" icon={UsersRound}>
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
            {count} Yolcu
          </option>
        ))}
      </select>
    </FormField>

    <button
      type="submit"
      className="group flex min-h-[72px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#155eef] to-[#2979ff] px-7 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 xl:w-auto"
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
    <label className="flex min-h-[72px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/70">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>

        <div className="min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </label>
  );
}

export default QuickReservationForm;