import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CurrencySelector({ variant = "admin" }) {
  const { currency, changeCurrency } = useCurrency();

  const isPublic = variant === "public";

  const triggerClasses = isPublic
    ? "flex items-center gap-2 text-white/80 hover:text-white transition outline-none focus:outline-none"
    : "flex items-center gap-2 text-[#071a32]/80 hover:text-[#071a32] transition outline-none focus:outline-none font-semibold";

  const contentClasses = isPublic
    ? "bg-[#071a32]/95 backdrop-blur-xl text-white border-white/10 rounded-xl mt-2 p-2 shadow-2xl z-50"
    : "bg-white border-gray-200 rounded-xl mt-2 p-2 shadow-xl z-50";

  const itemClasses = isPublic
    ? "hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg py-2 px-4 transition-colors"
    : "hover:bg-slate-100 focus:bg-slate-100 cursor-pointer rounded-lg py-2 px-4 transition-colors text-sm font-medium text-slate-700";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClasses}>
        {currency}
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={contentClasses}>
        <DropdownMenuItem className={itemClasses} onClick={() => changeCurrency("TRY")}>
          TRY - Türk Lirası
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClasses} onClick={() => changeCurrency("USD")}>
          USD - US Dollar
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClasses} onClick={() => changeCurrency("EUR")}>
          EUR - Euro
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClasses} onClick={() => changeCurrency("ALL")}>
          ALL - Albanian Lek
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClasses} onClick={() => changeCurrency("RUB")}>
          RUB - Russian Ruble
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CurrencySelector;
