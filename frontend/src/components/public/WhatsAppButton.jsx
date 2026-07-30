import { FaWhatsapp } from "react-icons/fa";

function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/905555555555?text=Merhaba%2C%20VIP%20transfer%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp üzerinden bize ulaşın"
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_14px_40px_rgba(37,211,102,0.4)] transition hover:-translate-y-1 hover:scale-105 sm:bottom-7 sm:right-7 sm:size-16"
    >
      <FaWhatsapp size={32} />
      <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-xl bg-[#071a32] px-3 py-2 text-xs font-bold text-white shadow-lg lg:block">
        WhatsApp desteği
      </span>
    </a>
  );
}

export default WhatsAppButton;
