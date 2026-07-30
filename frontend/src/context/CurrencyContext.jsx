import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CurrencyContext = createContext();

// Using exchangerate-api for free live rates. Base is TRY.
const API_URL = "https://api.exchangerate-api.com/v4/latest/TRY";

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(
    localStorage.getItem("preferredCurrency") || "TRY"
  );
  const [rates, setRates] = useState({ TRY: 1, USD: 0.035, EUR: 0.033, ALL: 3.3, RUB: 3.2 }); // Fallback rates
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data && data.rates) {
          setRates(data.rates);
        }
      } catch (error) {
        console.error("Failed to fetch exchange rates, using fallbacks:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRates();
  }, []);

  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem("preferredCurrency", newCurrency);
  };

  const formatPrice = useCallback(
    (priceInTRY) => {
      const numericPrice = Number(priceInTRY);
      if (Number.isNaN(numericPrice)) {
        return "-";
      }

      // If price is in TRY, convert to selected currency using the rate.
      // API gives rate like 1 TRY = 0.035 USD. So price * rate.
      const convertedPrice = numericPrice * (rates[currency] || 1);

      let locale = "tr-TR";
      if (currency === "USD") locale = "en-US";
      else if (currency === "EUR") locale = "de-DE";
      else if (currency === "ALL") locale = "sq-AL";
      else if (currency === "RUB") locale = "ru-RU";

      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
      }).format(convertedPrice);
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency, formatPrice, isLoading, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
