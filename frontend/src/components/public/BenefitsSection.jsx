import {
  BadgeCheck,
  Clock4,
  Headphones,
  WalletCards,
} from "lucide-react";

const benefits = [
  {
    icon: BadgeCheck,
    title: "Profesyonel Sürücüler",
    description:
      "Deneyimli ve özenle seçilmiş sürücülerle güvenli yolculuk.",
  },
  {
    icon: Clock4,
    title: "Zamanında Karşılama",
    description:
      "Uçuş ve rezervasyon bilgilerinize göre zamanında karşılama.",
  },
  {
    icon: WalletCards,
    title: "Şeffaf Fiyatlandırma",
    description:
      "Sürpriz ücretler olmadan önceden belirlenmiş sabit fiyatlar.",
  },
  {
    icon: Headphones,
    title: "7/24 Destek",
    description:
      "Rezervasyon öncesinde ve sonrasında kesintisiz destek.",
  },
];

function BenefitsSection() {
  return (
    <section
      id="services"
      className="bg-[#f7faff] pb-24 pt-52 sm:pt-56"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Neden bizi tercih etmelisiniz?
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#0b1f3a] sm:text-4xl">
            Yolculuğunuz için ihtiyacınız olan her şey
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Konfor, güvenlik ve dakiklik odaklı premium
            transfer hizmeti.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.title}
                className="group rounded-3xl border border-blue-100/70 bg-white p-7 shadow-[0_18px_50px_rgba(30,64,110,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,64,110,0.12)]"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <Icon size={22} />
                </div>

                <h3 className="mt-6 text-lg font-semibold text-[#0b1f3a]">
                  {benefit.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {benefit.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BenefitsSection;