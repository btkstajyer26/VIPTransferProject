import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  UsersRound,
} from "lucide-react";

const vehicles = [
  {
    id: 1,
    name: "Mercedes-Benz Vito",
    category: "VIP Minivan",
    passengerCapacity: 7,
    luggageCapacity: 7,
    image:
      "https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?auto=format&fit=crop&w=1200&q=85",
    features: [
      "Deri koltuklar",
      "Ücretsiz Wi-Fi",
      "Klima",
      "Telefon şarjı",
    ],
  },
  {
    id: 2,
    name: "Mercedes-Benz E-Class",
    category: "Business Sedan",
    passengerCapacity: 3,
    luggageCapacity: 3,
    image:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=85",
    features: [
      "Business konfor",
      "Deri koltuklar",
      "Klima",
      "Şişe su",
    ],
  },
  {
    id: 3,
    name: "Mercedes-Benz Sprinter",
    category: "VIP Minibüs",
    passengerCapacity: 16,
    luggageCapacity: 16,
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=85",
    features: [
      "Geniş iç hacim",
      "Grup transferi",
      "Klima",
      "Geniş bagaj",
    ],
  },
];

function VehicleShowcase() {
  return (
    <section
      id="vehicles"
      className="bg-white py-24 sm:py-28"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              <span className="h-px w-8 bg-blue-600" />
              Araç filomuz
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#0b1f3a] sm:text-4xl lg:text-5xl">
              Her yolculuk için doğru araç
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Bireysel, aile veya grup transferleri için
              konforlu ve modern araç seçeneklerini
              inceleyin.
            </p>
          </div>

          <Link
            to="/reservation"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:gap-3 hover:text-blue-700"
          >
            Tüm araçları görüntüle
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(30,64,110,0.08)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(30,64,110,0.15)]"
            >
              <div className="relative h-60 overflow-hidden bg-slate-100">
                <img
                  src={vehicle.image}
                  alt={vehicle.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#06162b]/55 via-transparent to-transparent" />

                <span className="absolute left-5 top-5 rounded-full border border-white/20 bg-[#071b35]/75 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">
                  {vehicle.category}
                </span>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#0b1f3a]">
                  {vehicle.name}
                </h3>

                <div className="mt-5 flex items-center gap-5 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <UsersRound
                      size={18}
                      className="text-blue-600"
                    />
                    {vehicle.passengerCapacity} yolcu
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BriefcaseBusiness
                      size={18}
                      className="text-blue-600"
                    />
                    {vehicle.luggageCapacity} bagaj
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {vehicle.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Check size={12} strokeWidth={3} />
                      </div>

                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  to="/reservation"
                  className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b1f3a] px-5 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  Bu araçla rezervasyon yap
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default VehicleShowcase;