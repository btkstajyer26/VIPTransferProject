import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CarFront,
  LoaderCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { getVehicles } from "@/api/vehicleServices";
import { getVehicleImage } from "@/constants/vehicleImages";

const classes = ["ALL", "ECONOMY", "STANDARD", "BUSINESS", "VIP", "LUXURY", "MINIVAN"];

function FleetPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState("ALL");

  useEffect(() => {
    let active = true;

    getVehicles()
      .then((response) => {
        if (!active) return;
        const list = Array.isArray(response)
          ? response
          : response?.content || response?.data || response?.vehicles || [];
        setVehicles(Array.isArray(list) ? list.filter((item) => item.active !== false) : []);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError?.response?.data?.message ||
              "Araç filosu şu anda yüklenemiyor.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredVehicles = useMemo(
    () =>
      selectedClass === "ALL"
        ? vehicles
        : vehicles.filter((vehicle) => vehicle.vehicleClass === selectedClass),
    [selectedClass, vehicles],
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-20 pt-28">
      <header className="bg-[#071a32] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600">
            <CarFront size={22} />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            Araç filomuz
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            Her yolculuğa uygun konfor sınıfı
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-slate-300">
            Bu sayfadaki araçlar doğrudan sistemdeki aktif araç kayıtlarından
            getirilmektedir.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {classes.map((vehicleClass) => (
            <button
              key={vehicleClass}
              type="button"
              onClick={() => setSelectedClass(vehicleClass)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                selectedClass === vehicleClass
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {classLabel(vehicleClass)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <LoaderCircle className="mr-3 animate-spin text-blue-600" />
            Araçlar yükleniyor...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Bu sınıfta aktif araç bulunmuyor.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <article
                key={vehicle.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]"
              >
                <div className="relative h-64 overflow-hidden bg-slate-200">
                  <img
                    src={getVehicleImage(vehicle)}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-5 top-5 rounded-full bg-[#071a32]/85 px-4 py-2 text-xs font-bold text-white backdrop-blur">
                    {classLabel(vehicle.vehicleClass)}
                  </span>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-[#071a32]">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {vehicle.year || "Güncel model"} · {vehicle.color || "Premium"}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <Feature icon={UsersRound} text={`${vehicle.capacity || 1} yolcu`} />
                    <Feature icon={BriefcaseBusiness} text="Bagaj alanı" />
                    <Feature icon={ShieldCheck} text="Güvenli sürüş" />
                    <Feature icon={CarFront} text="Bakımlı araç" />
                  </div>
                  <Link
                    to="/#reservation-form"
                    className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-bold text-white"
                  >
                    Rezervasyon yap <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={17} className="text-blue-600" /> {text}
    </div>
  );
}

function classLabel(value) {
  return (
    {
      ALL: "Tüm araçlar",
      ECONOMY: "Ekonomi",
      STANDARD: "Standart",
      BUSINESS: "Business",
      VIP: "VIP",
      LUXURY: "Luxury",
      MINIVAN: "Minivan",
    }[value] ||
    value ||
    "Araç"
  );
}

export default FleetPage;
