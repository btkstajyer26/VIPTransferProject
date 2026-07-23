import {
  CheckCircle2,
  Clock3,
  Headphones,
  ShieldCheck,
} from "lucide-react";

import QuickReservationForm from "./QuickReservationForm";

const trustItems = [
  {
    icon: Clock3,
    text: "7/24 Hizmet",
  },
  {
    icon: ShieldCheck,
    text: "Güvenli Yolculuk",
  },
  {
    icon: CheckCircle2,
    text: "Sabit Fiyat",
  },
  {
    icon: Headphones,
    text: "Canlı Destek",
  },
];

function HeroSection() {
  return (
    <section className="relative bg-[#071a32]">
      {/* Sadece arka plan ve hero içeriği kesilsin */}
      <div className="relative min-h-[760px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=2200&q=90')",
          }}
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,20,40,0.96)_0%,rgba(7,31,61,0.84)_45%,rgba(7,31,61,0.38)_100%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,15,30,0.45)_0%,rgba(3,15,30,0.05)_50%,rgba(3,15,30,0.72)_100%)]" />

        <div className="absolute -left-24 top-32 size-96 rounded-full bg-blue-500/15 blur-[100px]" />

        <div className="absolute right-0 top-0 size-[500px] rounded-full bg-cyan-400/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-44 pt-36 sm:px-6 lg:px-8 lg:pb-48 lg:pt-44">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-sm font-medium text-blue-100 backdrop-blur-md">
              <span className="size-2 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
              Premium VIP Transfer Deneyimi
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[68px]">
              Yolculuğunuzun her anında
              <span className="block bg-gradient-to-r from-[#7cb8ff] to-[#dceeff] bg-clip-text text-transparent">
                konfor ve ayrıcalık.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Havalimanı ve şehir içi transferlerinizi profesyonel
              sürücüler, premium araçlar ve şeffaf fiyatlarla kolayca
              planlayın.
            </p>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-4">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.text}
                    className="flex items-center gap-2.5 text-sm font-medium text-slate-100"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/10">
                      <Icon
                        size={16}
                        className="text-blue-300"
                      />
                    </div>

                    {item.text}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Form artık overflow-hidden dışında */}
      <div className="relative z-30 mx-auto -mt-[94px] max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <QuickReservationForm />
      </div>
    </section>
  );
}

export default HeroSection;