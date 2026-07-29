<<<<<<< HEAD
import { useTranslation } from "react-i18next";

function ReservationPage() {
  const { t } = useTranslation();
  return <h1>{t("reservationSystem.title")}</h1>;
=======
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { getVehicles } from "@/api/vehicleServices";
import { previewReservationPrice } from "@/api/reservationApi";

function ReservationPage() {
  const navigate = useNavigate();

  const reservationSearch = useMemo(() => {
    try {
      const storedValue =
        sessionStorage.getItem(
          "reservationSearch",
        );

      return storedValue
        ? JSON.parse(storedValue)
        : null;
    } catch {
      return null;
    }
  }, []);

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!reservationSearch) {
      return;
    }

    loadVehicles();
  }, [reservationSearch]);

  const loadVehicles = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await getVehicles();

      /*
       * Backend şu yapılardan herhangi birini
       * döndürürse çalışır:
       *
       * [...]
       *
       * { content: [...] }
       *
       * { data: [...] }
       *
       * { vehicles: [...] }
       */

      const vehicleList = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.vehicles)
              ? response.vehicles
              : [];

      setVehicles(vehicleList);
    } catch (requestError) {
      console.error(
        "Araçlar alınamadı:",
        requestError,
      );

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Araçlar yüklenirken bir hata oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const suitableVehicles = useMemo(() => {
    if (!reservationSearch) {
      return [];
    }

    const requestedPassengerCount = Number(
      reservationSearch.passengerCount || 1,
    );

    return vehicles.filter((vehicle) => {
      const capacity = getVehicleCapacity(vehicle);

      const isActive =
        vehicle.active ??
        vehicle.isActive ??
        vehicle.available ??
        vehicle.isAvailable ??
        true;

      return (
        isActive !== false &&
        capacity >= requestedPassengerCount
      );
    });
  }, [vehicles, reservationSearch]);

  const selectedVehicle = useMemo(
    () =>
      suitableVehicles.find(
        (vehicle) =>
          getVehicleId(vehicle) ===
          selectedVehicleId,
      ) || null,
    [suitableVehicles, selectedVehicleId],
  );

  if (!reservationSearch) {
    return <Navigate to="/" replace />;
  }

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicleId(
      getVehicleId(vehicle),
    );
  };

  const handleContinue = () => {
    if (!selectedVehicle) {
      return;
    }

    const reservationDraft = {
      ...reservationSearch,
      vehicle: selectedVehicle,
      vehicleId: getVehicleId(
        selectedVehicle,
      ),
    };

    sessionStorage.setItem(
      "reservationDraft",
      JSON.stringify(reservationDraft),
    );

    /*
     * Bir sonraki rezervasyon formu hazır olduğunda
     * bu adresi değiştirebiliriz.
     */
    navigate("/reservation/confirm");
  };

  return (
    <section className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={17} />
          Aramayı değiştir
        </button>

        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <TransferSummary
              reservationSearch={
                reservationSearch
              }
            />
          </aside>

          <main className="min-w-0">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                  <span className="h-px w-7 bg-blue-600" />
                  Araç seçimi
                </div>

                <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#0b1f3a] sm:text-4xl">
                  Uygun Araçlar
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Yolcu sayınıza uygun bir araç
                  seçerek rezervasyona devam
                  edin.
                </p>
              </div>

              {!isLoading && !error && (
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                  {suitableVehicles.length} araç
                  bulundu
                </div>
              )}
            </div>

            {isLoading && <LoadingState />}

            {!isLoading && error && (
              <ErrorState
                message={error}
                onRetry={loadVehicles}
              />
            )}

            {!isLoading &&
              !error &&
              suitableVehicles.length === 0 && (
                <EmptyState
                  passengerCount={
                    reservationSearch.passengerCount
                  }
                  onBack={() => navigate("/")}
                />
              )}

            {!isLoading &&
              !error &&
              suitableVehicles.length > 0 && (
                <>
                  <div className="grid gap-5 xl:grid-cols-2">
                    {suitableVehicles.map(
                      (vehicle) => {
                        const vehicleId =
                          getVehicleId(vehicle);

                        const isSelected =
                          selectedVehicleId ===
                          vehicleId;

                        return (
                          <VehicleCard
                            key={vehicleId}
                            vehicle={vehicle}
                            isSelected={
                              isSelected
                            }
                            onSelect={() =>
                              handleVehicleSelect(
                                vehicle,
                              )
                            }
                          />
                        );
                      },
                    )}
                  </div>

                  <div className="sticky bottom-4 z-30 mt-8">
                    <div className="flex flex-col items-stretch justify-between gap-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur sm:flex-row sm:items-center sm:p-5">
                      <div className="min-w-0">
                        {selectedVehicle ? (
                          <>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                              Seçilen araç
                            </p>

                            <p className="mt-1 truncate text-base font-bold text-[#0b1f3a]">
                              {getVehicleName(
                                selectedVehicle,
                              )}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-slate-800">
                              Henüz araç seçmediniz
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Devam etmek için bir
                              araç kartına tıklayın.
                            </p>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!selectedVehicle}
                        onClick={handleContinue}
                        className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#155eef] to-[#2979ff] px-7 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        Rezervasyona Devam Et

                        <ArrowRight
                          size={18}
                          className="transition group-hover:translate-x-1"
                        />
                      </button>
                    </div>
                  </div>
                </>
              )}
          </main>
        </div>
      </div>
    </section>
  );
}

function TransferSummary({
  reservationSearch,
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
      <div className="bg-gradient-to-br from-[#0b1f3a] to-[#155eef] p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15">
            <Route size={21} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
              Transfer özeti
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Yolculuk Bilgileri
            </h2>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="relative space-y-6">
          <div className="absolute bottom-8 left-[17px] top-8 w-px bg-slate-200" />

          <LocationItem
            title="Nereden"
            address={
              reservationSearch.pickup.address
            }
            variant="pickup"
          />

          <LocationItem
            title="Nereye"
            address={
              reservationSearch.dropoff.address
            }
            variant="dropoff"
          />
        </div>

        <div className="my-6 h-px bg-slate-100" />

        <div className="grid gap-4">
          <SummaryRow
            icon={CalendarDays}
            label="Tarih"
            value={formatDate(
              reservationSearch.scheduledDate,
            )}
          />

          <SummaryRow
            icon={Clock3}
            label="Saat"
            value={
              reservationSearch.scheduledTime
            }
          />

          <SummaryRow
            icon={UsersRound}
            label="Yolcu"
            value={`${reservationSearch.passengerCount} kişi`}
          />
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p className="leading-6">
            Yalnızca yolcu kapasitenize uygun ve
            müsait araçlar gösterilir.
          </p>
        </div>
      </div>
    </div>
  );
}

function LocationItem({
  title,
  address,
  variant,
}) {
  const isPickup = variant === "pickup";

  return (
    <div className="relative flex gap-4">
      <div
        className={`relative z-10 mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border-4 border-white ${
          isPickup
            ? "bg-blue-600"
            : "bg-emerald-500"
        }`}
      >
        <span className="size-2 rounded-full bg-white" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
          {title}
        </p>

        <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
          {address}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={18} />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-bold text-slate-800">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  isSelected,
  onSelect,
}) {
  const imageUrl = getVehicleImage(vehicle);
  const capacity = getVehicleCapacity(vehicle);
  const luggageCapacity =
    getLuggageCapacity(vehicle);

  const price = getVehiclePrice(vehicle);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-[26px] border bg-white text-left transition duration-200 ${
        isSelected
          ? "border-blue-500 shadow-[0_20px_50px_rgba(21,94,239,0.18)] ring-4 ring-blue-100"
          : "border-slate-200 shadow-sm hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
      }`}
    >
      {isSelected && (
        <div className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
          <Check size={17} strokeWidth={3} />
        </div>
      )}

      <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={getVehicleName(vehicle)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />
        ) : (
          <CarFront
            size={72}
            strokeWidth={1.3}
            className="text-slate-300"
          />
        )}

        <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
          {getVehicleType(vehicle)}
        </div>
      </div>

      <div className="p-5">
        <h3 className="pr-8 text-xl font-bold tracking-[-0.03em] text-[#0b1f3a]">
          {getVehicleName(vehicle)}
        </h3>

        {getVehicleDescription(vehicle) && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {getVehicleDescription(vehicle)}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <VehicleFeature
            icon={UsersRound}
            value={`${capacity} yolcu`}
          />

          <VehicleFeature
            icon={BriefcaseBusiness}
            value={`${luggageCapacity} bagaj`}
          />
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-5">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Transfer ücreti
            </p>

            <p className="mt-1 text-xl font-extrabold text-[#0b1f3a]">
              {price !== null
                ? formatCurrency(price)
                : "Fiyat hesaplanacak"}
            </p>
          </div>

          <span
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              isSelected
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
            }`}
          >
            {isSelected ? "Seçildi" : "Seç"}
          </span>
        </div>
      </div>
    </button>
  );
}

function VehicleFeature({
  icon: Icon,
  value,
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600">
      <Icon
        size={17}
        className="shrink-0 text-blue-600"
      />

      {value}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <LoaderCircle
          size={30}
          className="animate-spin"
        />
      </div>

      <h2 className="mt-5 text-xl font-bold text-[#0b1f3a]">
        Araçlar hazırlanıyor
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Yolculuğunuza uygun araçlar
        kontrol ediliyor.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[28px] border border-red-100 bg-white p-8 text-center shadow-sm">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertCircle size={30} />
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-900">
        Araçlar yüklenemedi
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        <RefreshCw size={17} />
        Tekrar Dene
      </button>
    </div>
  );
}

function EmptyState({
  passengerCount,
  onBack,
}) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <CarFront size={30} />
      </div>

      <h2 className="mt-5 text-xl font-bold text-[#0b1f3a]">
        Uygun araç bulunamadı
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {passengerCount} yolcu için uygun ve
        müsait bir araç bulunamadı. Yolcu sayısını
        veya transfer bilgilerini değiştirebilirsiniz.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
      >
        <ArrowLeft size={17} />
        Aramayı Değiştir
      </button>
    </div>
  );
}

/*
 * Backend alan isimleri tam olarak belli olmadığı için
 * aşağıdaki yardımcı fonksiyonlar farklı isimleri destekler.
 */

function getVehicleId(vehicle) {
  return (
    vehicle.id ??
    vehicle.vehicleId ??
    vehicle.uuid
  );
}

function getVehicleName(vehicle) {
  const directName =
    vehicle.name ||
    vehicle.vehicleName ||
    vehicle.title;

  if (directName) {
    return directName;
  }

  return [
    vehicle.brand,
    vehicle.model,
  ]
    .filter(Boolean)
    .join(" ") || "VIP Transfer Aracı";
}

function getVehicleType(vehicle) {
  return (
    vehicle.vehicleType ||
    vehicle.type ||
    vehicle.category ||
    "VIP Araç"
  );
}

function getVehicleCapacity(vehicle) {
  const capacity =
    vehicle.passengerCapacity ??
    vehicle.capacity ??
    vehicle.seatCapacity ??
    vehicle.maxPassengerCount ??
    vehicle.maxPassengers ??
    vehicle.numberOfSeats ??
    0;

  return Number(capacity);
}

function getLuggageCapacity(vehicle) {
  const capacity =
    vehicle.luggageCapacity ??
    vehicle.baggageCapacity ??
    vehicle.bagCapacity ??
    vehicle.maxLuggage ??
    0;

  return Number(capacity);
}

function getVehicleImage(vehicle) {
  return (
    vehicle.photoUrl ||
    vehicle.imageUrl ||
    vehicle.image ||
    vehicle.photo ||
    vehicle.vehicleImageUrl ||
    vehicle.imagePath ||
    ""
  );
}

function getVehicleDescription(vehicle) {
  return (
    vehicle.description ||
    vehicle.vehicleDescription ||
    ""
  );
}

function getVehiclePrice(vehicle) {
  const price =
    vehicle.price ??
    vehicle.basePrice ??
    vehicle.transferPrice ??
    vehicle.dailyPrice ??
    null;

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {
    return null;
  }

  const numericPrice = Number(price);

  return Number.isFinite(numericPrice)
    ? numericPrice
    : null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(
    `${dateValue}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
>>>>>>> feature/web-frontend-setup
}

export default ReservationPage;