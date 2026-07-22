import {
  CalendarCheck2,
  CarFront,
  MapPinned,
  MoveRight,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MapPinned,
    title: "Rotanızı belirleyin",
    description:
      "Alınış ve varış adresinizi, tarih ve saat bilgilerinizi girin.",
  },
  {
    number: "02",
    icon: CarFront,
    title: "Aracınızı seçin",
    description:
      "Yolcu sayınıza ve ihtiyacınıza uygun premium aracı seçin.",
  },
  {
    number: "03",
    icon: CalendarCheck2,
    title: "Rezervasyonu tamamlayın",
    description:
      "İletişim bilgilerinizi ekleyerek transferinizi güvence altına alın.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="overflow-hidden bg-[#071a32] py-24 text-white sm:py-28"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Nasıl çalışır?
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            Üç adımda transferinizi planlayın
          </h2>

          <p className="mt-5 text-base leading-7 text-slate-300">
            Karmaşık işlemler olmadan, birkaç dakika
            içerisinde rezervasyonunuzu oluşturun.
          </p>
        </div>

        <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="relative"
              >
                <article className="relative h-full rounded-[28px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/[0.09]">
                  <div className="flex items-start justify-between">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30">
                      <Icon size={25} />
                    </div>

                    <span className="text-4xl font-semibold text-white/10">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-8 text-xl font-semibold">
                    {step.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    {step.description}
                  </p>
                </article>

                {index < steps.length - 1 && (
                  <div className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 lg:flex">
                    <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#102846] text-blue-300">
                      <MoveRight size={18} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;