import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CurrencySelector({ variant = "admin", compact = false }) {
  const { currency, changeCurrency } = useCurrency();

  const isPublic = variant === "public";

  const triggerClasses = isPublic
    ? `flex items-center rounded-xl text-white/90 hover:bg-white/10 hover:text-white transition outline-none focus:outline-none ${
        compact ? "w-full justify-between gap-1.5 px-2 py-1 text-xs" : "gap-2 px-2.5 py-2"
      }`
    : "flex items-center gap-2 text-[#071a32]/80 hover:text-[#071a32] transition outline-none focus:outline-none font-semibold";

  const contentClasses = isPublic
    ? "min-w-28 bg-white text-slate-900 border-slate-100 rounded-2xl mt-2 p-2 shadow-2xl z-50"
    : "bg-white border-gray-200 rounded-xl mt-2 p-2 shadow-xl z-50";

  const itemClasses = isPublic
    ? "flex gap-3 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer rounded-xl py-2.5 px-3 transition-colors"
    : "hover:bg-slate-100 focus:bg-slate-100 cursor-pointer rounded-lg py-2 px-4 transition-colors text-sm font-medium text-slate-700";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClasses}>
        <CurrencyIcon currency={currency} compact={compact} />
        <span>{currency === "TRY" ? "TL" : currency}</span>
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={contentClasses}>
        {["TRY", "EUR", "USD", "ALL", "RUB"].map((code) => (
          <DropdownMenuItem
            key={code}
            className={itemClasses}
            onClick={() => changeCurrency(code)}
          >
            <CurrencyIcon currency={code} />
            <span>{code === "TRY" ? "TL" : code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CurrencyIcon({ currency, compact = false }) {
  const symbol = {
    TRY: "₺",
    EUR: "€",
    USD: "$",
    ALL: "L",
    RUB: "₽",
  }[currency] || currency.slice(0, 1);

  return (
    <span className={`flex shrink-0 items-center justify-center border-2 border-current font-black leading-none ${
      compact ? "size-5 rounded-md text-[10px]" : "size-7 rounded-lg text-sm"
    }`}>
      {symbol}
    </span>
  );
}

export default CurrencySelector;
