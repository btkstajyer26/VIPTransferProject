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
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Phone,
  Route,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  createReservation,
  previewReservationPrice,
} from "@/api/reservationApi";
import { getCurrentUser } from "@/api/userServices";
import { useAuth } from "@/context/AuthContext";

function ReservationConfirm() {
  const navigate = useNavigate();

  const reservationDraft = useMemo(() => {
    try {
      const storedDraft =
        sessionStorage.getItem(
          "reservationDraft",
        );

      return storedDraft
        ? JSON.parse(storedDraft)
        : null;
    } catch (error) {
      console.error(
        "Rezervasyon taslağı okunamadı:",
        error,
      );

      return null;
    }
  }, []);

  const { isAuthenticated } = useAuth();

  const [isProfileLoading, setIsProfileLoading] =
    useState(false);

  const [formData, setFormData] = useState({
    guestName: "",
    guestPhone: "",
    flightNumber: "",
    campaignCode:
      reservationDraft?.campaignCode || "",
    notes: "",
  });

  const [appliedCampaignCode, setAppliedCampaignCode] =
    useState(reservationDraft?.campaignCode || "");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [createdReservation, setCreatedReservation] =
    useState(null);

  const pickup =
    reservationDraft?.pickup || {};

  const dropoff =
    reservationDraft?.dropoff || {};

  const selectedVehicle =
    reservationDraft?.vehicle || {};

  const pickupLat = Number(
    pickup.lat ??
      pickup.latitude,
  );

  const pickupLon = Number(
    pickup.lng ??
      pickup.lon ??
      pickup.longitude,
  );

  const dropoffLat = Number(
    dropoff.lat ??
      dropoff.latitude,
  );

  const dropoffLon = Number(
    dropoff.lng ??
      dropoff.lon ??
      dropoff.longitude,
  );

  const vehicleId =
    reservationDraft?.vehicleId ??
    selectedVehicle.id ??
    selectedVehicle.vehicleId;

  const [pricePreview, setPricePreview] = useState(
    () =>
      reservationDraft?.pricePreview ??
      reservationDraft?.pricing ??
      {},
  );

  const [isPriceLoading, setIsPriceLoading] =
    useState(false);

  const [campaignCodeWarning, setCampaignCodeWarning] =
    useState("");

  const scheduledTime =
    reservationDraft?.scheduledDateTime ||
    createScheduledTime(
      reservationDraft?.scheduledDate,
      reservationDraft?.scheduledTime,
    );

  const finalPrice =
    getPreviewPrice(
      pricePreview,
      reservationDraft,
      selectedVehicle,
    );

  const distanceKm =
    getPreviewDistance(
      pricePreview,
      reservationDraft,
    );

  useEffect(() => {
    if (
      !reservationDraft ||
      !Number.isFinite(pickupLat) ||
      !Number.isFinite(pickupLon) ||
      !Number.isFinite(dropoffLat) ||
      !Number.isFinite(dropoffLon) ||
      !vehicleId ||
      !scheduledTime
    ) {
      return;
    }

    if (
      getPreviewPrice(
        pricePreview,
        reservationDraft,
        selectedVehicle,
      ) !== null
    ) {
      return;
    }

    let cancelled = false;

    async function loadPricePreview() {
      try {
        setIsPriceLoading(true);

        const response = await previewReservationPrice({
          pickupLat,
          pickupLon,
          dropoffLat,
          dropoffLon,
          vehicleId: Number(vehicleId),
          scheduledTime,
          campaignCode:
            appliedCampaignCode.trim() || null,
        });

        if (!cancelled) {
          setPricePreview(response || {});
          setCampaignCodeWarning("");
        }
      } catch (priceError) {
        console.error(
          "Fiyat önizlemesi alınamadı:",
          priceError?.response?.data ||
            priceError,
        );

        if (cancelled) {
          return;
        }

        if (appliedCampaignCode.trim()) {
          try {
            const fallback = await previewReservationPrice({
              pickupLat,
              pickupLon,
              dropoffLat,
              dropoffLon,
              vehicleId: Number(vehicleId),
              scheduledTime,
              campaignCode: null,
            });

            if (!cancelled) {
              setPricePreview(fallback || {});
              setAppliedCampaignCode("");
              setFormData((prev) => ({
                ...prev,
                campaignCode: "",
              }));
              setCampaignCodeWarning(
                "Kampanya kodu geçersiz veya bu rezervasyona uygulanamadı. Fiyat kampanyasız hesaplandı.",
              );
            }
          } catch (fallbackError) {
            if (!cancelled) {
              setError(
                getRequestErrorMessage(
                  fallbackError,
                  "Fiyat hesaplanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.",
                ),
              );
            }
          }
        } else {
          setError(
            getRequestErrorMessage(
              priceError,
              "Fiyat hesaplanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsPriceLoading(false);
        }
      }
    }

    loadPricePreview();

    return () => {
      cancelled = true;
    };
  }, [
    reservationDraft,
    pickupLat,
    pickupLon,
    dropoffLat,
    dropoffLon,
    vehicleId,
    scheduledTime,
    appliedCampaignCode,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        setIsProfileLoading(true);

        const raw = await getCurrentUser();

        if (!cancelled) {
          const profile = raw?.data ?? raw;

          setFormData((prev) => ({
            ...prev,
            guestName:
              getUserFullName(profile) ||
              prev.guestName,
            guestPhone:
              getUserPhone(profile) ||
              prev.guestPhone,
          }));
        }
      } catch (profileError) {
        console.error(
          "Kullanıcı profili alınamadı:",
          profileError,
        );
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleApplyCampaign = () => {
    setAppliedCampaignCode(
      formData.campaignCode.trim(),
    );
    setPricePreview({});
    setError("");
    setCampaignCodeWarning("");
  };

  const handleRemoveCampaign = () => {
    setFormData((prev) => ({
      ...prev,
      campaignCode: "",
    }));
    setAppliedCampaignCode("");
    setPricePreview({});
    setError("");
    setCampaignCodeWarning("");
  };

  const handlePhoneChange = (event) => {
    const formattedPhone = formatPhoneInput(
      event.target.value,
    );

    setFormData((currentData) => ({
      ...currentData,
      guestPhone: formattedPhone,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.guestName.trim()) {
      setError(
        isAuthenticated
          ? "Hesabınızda ad soyad bilgisi bulunamadı."
          : "Lütfen yolcu adını ve soyadını girin.",
      );

      return;
    }

    const normalizedPhone = normalizePhone(
      formData.guestPhone,
    );

    if (!normalizedPhone) {
      setError(
        isAuthenticated
          ? "Hesabınızda geçerli bir telefon numarası bulunamadı."
          : "Lütfen geçerli bir telefon numarası girin.",
      );

      return;
    }

    if (
      !pickup.address ||
      !dropoff.address
    ) {
      setError(
        "Başlangıç veya varış adresi eksik.",
      );

      return;
    }

    if (
      !Number.isFinite(pickupLat) ||
      !Number.isFinite(pickupLon) ||
      !Number.isFinite(dropoffLat) ||
      !Number.isFinite(dropoffLon)
    ) {
      console.error("Eksik koordinatlar:", {
        pickup,
        dropoff,
      });

      setError(
        "Konum koordinatları eksik. Lütfen aramayı yeniden yapın.",
      );

      return;
    }

    if (!vehicleId) {
      console.error(
        "Araç ID bulunamadı:",
        reservationDraft,
      );

      setError(
        "Seçilen araç bilgisi bulunamadı.",
      );

      return;
    }

    if (!scheduledTime) {
      setError(
        "Rezervasyon tarih ve saat bilgisi bulunamadı.",
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        pickupAddress: pickup.address,
        pickupLat,
        pickupLon,

        dropoffAddress: dropoff.address,
        dropoffLat,
        dropoffLon,

        scheduledTime,

        vehicleId: Number(vehicleId),

        passengerCount: Number(
          reservationDraft.passengerCount,
        ),

        guestName: formData.guestName.trim(),

        campaignCode:
          appliedCampaignCode.trim() || null,

        flightNumber:
          formData.flightNumber.trim() || null,

        notes:
          formData.notes.trim() || null,
      };

      const response = await createReservation(
        payload,
        isAuthenticated
          ? null
          : normalizedPhone,
      );

      setCreatedReservation(response);

      sessionStorage.removeItem(
        "reservationSearch",
      );

      sessionStorage.removeItem(
        "reservationDraft",
      );
    } catch (requestError) {
      console.error(
        "Rezervasyon oluşturulamadı:",
        requestError,
      );

      setError(
        getRequestErrorMessage(requestError),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reservationDraft) {
    return (
      <Navigate
        to="/reservation"
        replace
      />
    );
  }

  if (createdReservation) {
    return (
      <ReservationSuccess
        reservation={createdReservation}
        onHome={() => navigate("/")}
        isGuest={!isAuthenticated}
        onTrack={(ref) => navigate(`/track?ref=${encodeURIComponent(ref)}`)}
      />
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() =>
            navigate("/reservation")
          }
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={17} />
          Araç seçimine dön
        </button>

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            <span className="h-px w-7 bg-blue-600" />
            Rezervasyon onayı
          </div>

          <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#0b1f3a] sm:text-4xl">
            Bilgilerinizi Tamamlayın
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Yolcu bilgilerinizi girerek
            rezervasyonunuzu tamamlayın.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main>
            <form
              onSubmit={handleSubmit}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8"
            >
              <div>
                <h2 className="text-xl font-bold text-[#0b1f3a]">
                  Yolcu Bilgileri
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isAuthenticated
                    ? "Hesabınızdaki ad soyad ve telefon bilgileri otomatik kullanılır."
                    : "Rezervasyon sahibinin ad soyad ve telefon bilgilerini girin."}
                </p>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Ad Soyad"
                  required
                >
                  <input
                    type="text"
                    name="guestName"
                    value={formData.guestName}
                    onChange={handleChange}
                    placeholder="Örneğin: Özgür Talas"
                    autoComplete="name"
                    maxLength={120}
                    readOnly={isAuthenticated}
                    aria-readonly={isAuthenticated}
                    className={
                      isAuthenticated
                        ? readOnlyInputClassName
                        : inputClassName
                    }
                  />
                </FormField>

                <FormField
                  label="Telefon Numarası"
                  required
                >
                  <div className="relative">
                    <Phone
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="tel"
                      name="guestPhone"
                      value={formData.guestPhone}
                      onChange={handlePhoneChange}
                      placeholder="05XX XXX XX XX"
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={14}
                      readOnly={isAuthenticated}
                      aria-readonly={isAuthenticated}
                      className={`${
                        isAuthenticated
                          ? readOnlyInputClassName
                          : inputClassName
                      } pl-11`}
                    />
                  </div>
                </FormField>

                {isAuthenticated && (
                  <div className="sm:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                    Ad soyad ve telefon bilgileriniz hesabınızdan alınmıştır ve bu ekranda değiştirilemez.
                  </div>
                )}

                <FormField label="Uçuş Numarası">
                  <input
                    type="text"
                    name="flightNumber"
                    value={
                      formData.flightNumber
                    }
                    onChange={handleChange}
                    placeholder="Örneğin: TK2026"
                    maxLength={50}
                    className={inputClassName}
                  />
                </FormField>

                <div>
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Kampanya Kodu
                  </span>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="campaignCode"
                      value={formData.campaignCode}
                      onChange={handleChange}
                      placeholder="Varsa kampanya kodu"
                      maxLength={50}
                      className={`${inputClassName} flex-1`}
                    />

                    {formData.campaignCode.trim() &&
                      formData.campaignCode.trim() !==
                        appliedCampaignCode && (
                        <button
                          type="button"
                          onClick={handleApplyCampaign}
                          disabled={isPriceLoading}
                          className="shrink-0 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          Uygula
                        </button>
                      )}

                    {appliedCampaignCode &&
                      formData.campaignCode.trim() ===
                        appliedCampaignCode && (
                        <button
                          type="button"
                          onClick={handleRemoveCampaign}
                          className="shrink-0 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          Kaldır
                        </button>
                      )}
                  </div>

                  {appliedCampaignCode &&
                    formData.campaignCode.trim() ===
                      appliedCampaignCode && (
                      <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                        ✓ Kampanya kodu uygulandı
                      </p>
                    )}

                  {campaignCodeWarning && (
                    <p className="mt-1.5 text-xs font-semibold text-amber-600">
                      ⚠ {campaignCodeWarning}
                    </p>
                  )}
                </div>

                <FormField
                  label="Ek Not"
                  className="sm:col-span-2"
                >
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Çocuk koltuğu, ek bagaj veya diğer taleplerinizi yazabilirsiniz."
                    maxLength={500}
                    rows={5}
                    className={`${inputClassName} resize-none`}
                  />
                </FormField>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle
                    size={20}
                    className="mt-0.5 shrink-0"
                  />

                  <p className="leading-6">
                    {error}
                  </p>
                </div>
              )}

              <div className="mt-7 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0"
                />

                <p className="leading-6">
                  Rezervasyonunuz
                  oluşturulduktan sonra transfer
                  bilgileri kayıt altına
                  alınacaktır.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  isPriceLoading ||
                  isProfileLoading
                }
                className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#155eef] to-[#2979ff] px-7 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      size={19}
                      className="animate-spin"
                    />
                    Rezervasyon
                    oluşturuluyor
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Rezervasyonu Onayla
                  </>
                )}
              </button>
            </form>
          </main>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <ReservationSummary
              draft={reservationDraft}
              vehicle={selectedVehicle}
              pricePreview={pricePreview}
              finalPrice={finalPrice}
              distanceKm={distanceKm}
              isPriceLoading={isPriceLoading}
              campaignCodeWarning={campaignCodeWarning}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}

function ReservationSummary({
  draft,
  vehicle,
  pricePreview,
  finalPrice,
  distanceKm,
  isPriceLoading,
  campaignCodeWarning,
}) {
  const p = pricePreview?.data ?? pricePreview ?? {};
  const flagFee = toNumber(p.flagFee);
  const distanceFee = toNumber(p.distanceFee);
  const basePrice = toNumber(p.basePrice);
  const vehicleAdjustedPrice = toNumber(p.vehicleAdjustedPrice);
  const surgeMultiplier = toNumber(p.surgeMultiplier) || 1;
  const priceAfterSurge = toNumber(p.priceAfterSurge);
  const campaignDiscount = toNumber(p.campaignDiscount);
  const loyaltyDiscount = toNumber(p.loyaltyDiscount);

  const hasBreakdown =
    priceAfterSurge > 0 || basePrice > 0 || flagFee > 0 || distanceFee > 0;
  const hasSurge = surgeMultiplier > 1.005;
  const hasDiscount =
    campaignDiscount > 0 || loyaltyDiscount > 0;

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
      <div className="bg-gradient-to-br from-[#0b1f3a] to-[#155eef] p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15">
            <Route size={21} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
              Rezervasyon özeti
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Transfer Bilgileri
            </h2>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-5">
          <SummaryLocation
            label="Nereden"
            address={
              draft.pickup?.address
            }
          />

          <SummaryLocation
            label="Nereye"
            address={
              draft.dropoff?.address
            }
          />
        </div>

        <div className="my-6 h-px bg-slate-100" />

        <div className="grid gap-4">
          <SummaryRow
            icon={CalendarDays}
            label="Tarih"
            value={formatDate(
              draft.scheduledDate,
            )}
          />

          <SummaryRow
            icon={Clock3}
            label="Saat"
            value={draft.scheduledTime}
          />

          <SummaryRow
            icon={UsersRound}
            label="Yolcu"
            value={`${draft.passengerCount} kişi`}
          />

          {distanceKm !== null && (
            <SummaryRow
              icon={Route}
              label="Mesafe"
              value={`${formatNumber(
                distanceKm,
              )} km`}
            />
          )}
        </div>

        <div className="my-6 h-px bg-slate-100" />

        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
            {getVehicleImage(vehicle) ? (
              <img
                src={getVehicleImage(
                  vehicle,
                )}
                alt={getVehicleName(
                  vehicle,
                )}
                className="h-full w-full object-cover"
              />
            ) : (
              <CarFront
                size={28}
                className="text-slate-400"
              />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">
              Seçilen araç
            </p>

            <p className="mt-1 truncate font-bold text-[#0b1f3a]">
              {getVehicleName(vehicle)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          {isPriceLoading ? (
            <p className="text-sm font-medium text-slate-400">
              Fiyat hesaplanıyor...
            </p>
          ) : finalPrice === null ? (
            <p className="text-sm font-medium text-slate-400">
              Fiyat hesaplanamadı
            </p>
          ) : (
            <>
              {hasBreakdown && (
                <div className="mb-4 space-y-2.5">
                  {flagFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Açılış ücreti</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(flagFee)}</span>
                    </div>
                  )}

                  {distanceFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        Km ücreti
                        {distanceKm !== null && (
                          <span className="ml-1 text-xs text-slate-400">({formatNumber(distanceKm)} km)</span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-700">{formatCurrency(distanceFee)}</span>
                    </div>
                  )}

                  {vehicleAdjustedPrice > 0 && vehicleAdjustedPrice !== basePrice && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Araç fiyatı</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(vehicleAdjustedPrice)}</span>
                    </div>
                  )}

                  {hasSurge && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-600">⏰ Yoğun saat (×{formatNumber(surgeMultiplier)})</span>
                      <span className="font-semibold text-amber-600">{formatCurrency(priceAfterSurge || finalPrice)}</span>
                    </div>
                  )}

                  {!hasSurge && priceAfterSurge > 0 && (hasDiscount || flagFee === 0) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Transfer ücreti</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(priceAfterSurge)}</span>
                    </div>
                  )}

                  {campaignDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-600">🏷 Kampanya indirimi</span>
                      <span className="font-semibold text-emerald-600">−{formatCurrency(campaignDiscount)}</span>
                    </div>
                  )}

                  {loyaltyDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-600">⭐ Sadakat indirimi</span>
                      <span className="font-semibold text-emerald-600">−{formatCurrency(loyaltyDiscount)}</span>
                    </div>
                  )}

                  <div className="h-px bg-slate-200" />
                </div>
              )}

              <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
                Toplam tutar
              </p>

              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#0b1f3a]">
                {formatCurrency(finalPrice)}
              </p>

              {campaignCodeWarning && (
                <p className="mt-3 text-xs font-semibold text-amber-600">
                  ⚠ {campaignCodeWarning}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryLocation({
  label,
  address,
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <MapPin size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
          {address || "-"}
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

function FormField({
  label,
  required = false,
  className = "",
  children,
}) {
  return (
    <label
      className={`block ${className}`}
    >
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function ReservationSuccess({
  reservation,
  onHome,
  isGuest,
  onTrack,
}) {
  const reservationNumber =
    reservation.bookingReference ??
    reservation.data?.bookingReference ??
    reservation.reservationNumber ??
    reservation.referenceNumber ??
    reservation.code ??
    reservation.id ??
    "-";

  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-20">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-12">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={42} />
        </div>

        <h1 className="mt-7 text-3xl font-bold tracking-[-0.04em] text-[#0b1f3a]">
          Rezervasyonunuz Alındı
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Transfer rezervasyonunuz başarıyla
          oluşturuldu.
        </p>

        <div className="mt-7 rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Rezervasyon numarası
          </p>

          <p className="mt-2 break-all text-xl font-extrabold text-[#0b1f3a]">
            {reservationNumber}
          </p>
        </div>

        {isGuest && reservationNumber !== "-" && (
          <button
            type="button"
            onClick={() => onTrack(reservationNumber)}
            className="mt-4 inline-flex min-h-13 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-6 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
          >
            Rezervasyonumu Takip Et
          </button>
        )}

        <button
          type="button"
          onClick={onHome}
          className="mt-3 inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    </section>
  );
}

const inputClassName =
  "min-h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const readOnlyInputClassName =
  "min-h-13 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 outline-none";


function getUserFullName(user) {
  if (!user) {
    return "";
  }

  const directName =
    user.fullName ??
    user.nameSurname ??
    user.displayName ??
    user.name;

  if (
    typeof directName === "string" &&
    directName.trim()
  ) {
    return directName.trim();
  }

  return [
    user.firstName ??
      user.firstname ??
      user.given_name,
    user.lastName ??
      user.lastname ??
      user.family_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getUserPhone(user) {
  if (!user) {
    return "";
  }

  return String(
    user.phoneNumber ??
      user.phone ??
      user.mobilePhone ??
      user.mobile ??
      user.telephone ??
      "",
  ).trim();
}

function formatPhoneInput(value) {
  let digits = String(value || "").replace(
    /\D/g,
    "",
  );

  if (digits.startsWith("90")) {
    digits = `0${digits.slice(2)}`;
  }

  if (digits.startsWith("5")) {
    digits = `0${digits}`;
  }

  digits = digits.slice(0, 11);

  const part1 = digits.slice(0, 4);
  const part2 = digits.slice(4, 7);
  const part3 = digits.slice(7, 9);
  const part4 = digits.slice(9, 11);

  return [part1, part2, part3, part4]
    .filter(Boolean)
    .join(" ");
}

function normalizePhone(value) {
  let digits = String(value || "").replace(
    /\D/g,
    "",
  );

  if (digits.startsWith("90")) {
    digits = `0${digits.slice(2)}`;
  }

  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `0${digits}`;
  }

  if (!/^05\d{9}$/.test(digits)) {
    return null;
  }

  return digits;
}

function getRequestErrorMessage(
  error,
  fallbackMessage = "Rezervasyon oluşturulurken bir hata oluştu.",
) {
  const data = error?.response?.data;
  const status = error?.response?.status;

  console.error("Backend hata cevabı:", {
    status,
    data,
  });

  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data;
  }

  if (Array.isArray(data?.errors)) {
    const messages = data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message ??
            item?.defaultMessage ??
            item?.detail,
      )
      .filter(Boolean);

    if (messages.length) {
      return messages.join(" ");
    }
  }

  if (
    data?.errors &&
    typeof data.errors === "object"
  ) {
    const messages = Object.values(
      data.errors,
    )
      .flat()
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message ??
            item?.defaultMessage ??
            item?.detail,
      )
      .filter(Boolean);

    if (messages.length) {
      return messages.join(" ");
    }
  }

  return (
    data?.detail ||
    data?.message ||
    data?.error ||
    data?.title ||
    (status === 409
      ? "Bu işlem mevcut rezervasyon veya kampanya kurallarıyla çakışıyor. Kampanya kodunu kaldırıp tekrar deneyin."
      : null) ||
    error?.message ||
    fallbackMessage
  );
}

function createScheduledTime(
  date,
  time,
) {
  if (!date || !time) {
    return null;
  }

  const dt = new Date(`${date}T${time}:00`);
  const offsetMinutes = -dt.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hh = String(
    Math.floor(absMinutes / 60),
  ).padStart(2, "0");
  const mm = String(
    absMinutes % 60,
  ).padStart(2, "0");

  return `${date}T${time}:00${sign}${hh}:${mm}`;
}

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

function getPreviewPrice(
  pricePreview,
  reservationDraft = {},
  vehicle = {},
) {
  const candidates = [
    pricePreview?.finalPrice,
    pricePreview?.totalPrice,
    pricePreview?.price,
    pricePreview?.calculatedPrice,
    pricePreview?.amount,
    pricePreview?.data?.finalPrice,
    pricePreview?.data?.totalPrice,
    pricePreview?.data?.price,
    reservationDraft?.finalPrice,
    reservationDraft?.totalPrice,
    reservationDraft?.price,
    reservationDraft?.calculatedPrice,
    reservationDraft?.estimatedPrice,
    reservationDraft?.pricePreview?.finalPrice,
    reservationDraft?.pricePreview?.totalPrice,
    reservationDraft?.pricePreview?.price,
    vehicle?.finalPrice,
    vehicle?.totalPrice,
    vehicle?.price,
  ];

  for (const candidate of candidates) {
    if (
      candidate === null ||
      candidate === undefined ||
      candidate === ""
    ) {
      continue;
    }

    const numericPrice = Number(candidate);

    if (Number.isFinite(numericPrice)) {
      return numericPrice;
    }
  }

  return null;
}

function getPreviewDistance(
  pricePreview,
  reservationDraft = {},
) {
  const candidates = [
    pricePreview?.distanceKm,
    pricePreview?.distance,
    pricePreview?.totalDistanceKm,
    pricePreview?.data?.distanceKm,
    pricePreview?.data?.distance,
    reservationDraft?.distanceKm,
    reservationDraft?.distance,
    reservationDraft?.pricePreview?.distanceKm,
  ];

  for (const candidate of candidates) {
    if (
      candidate === null ||
      candidate === undefined ||
      candidate === ""
    ) {
      continue;
    }

    const numericDistance = Number(candidate);

    if (Number.isFinite(numericDistance)) {
      return numericDistance;
    }
  }

  return null;
}

function getVehicleName(vehicle) {
  return (
    vehicle.name ||
    vehicle.vehicleName ||
    vehicle.title ||
    [
      vehicle.brand,
      vehicle.model,
    ]
      .filter(Boolean)
      .join(" ") ||
    "VIP Transfer Aracı"
  );
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

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR", {
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

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

export default ReservationConfirm;