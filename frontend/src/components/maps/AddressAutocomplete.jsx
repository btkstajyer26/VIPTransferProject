import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  LoaderCircle,
  MapPin,
} from "lucide-react";

import { searchAddress } from "../../api/nominatimApi";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_DELAY = 450;

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Adres arayın",
  disabled = false,
}) {
  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] =
    useState(false);
  const [isOpen, setIsOpen] =
    useState(false);
  const [error, setError] =
    useState("");

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target,
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  useEffect(() => {
    const query = value.trim();

    if (query.length < MIN_QUERY_LENGTH) {
      abortControllerRef.current?.abort();

      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      setError("");

      return undefined;
    }

    const timeoutId = window.setTimeout(
      async () => {
        abortControllerRef.current?.abort();

        const controller =
          new AbortController();

        abortControllerRef.current =
          controller;

        try {
          setIsLoading(true);
          setError("");

          const locations =
            await searchAddress(
              query,
              controller.signal,
            );

          setResults(locations);
          setIsOpen(true);
        } catch (requestError) {
          if (
            requestError?.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Adres arama hatası:",
            requestError,
          );

          setResults([]);
          setIsOpen(true);
          setError(
            requestError?.message ||
              "Adresler aranırken bir hata oluştu.",
          );
        } finally {
          if (
            abortControllerRef.current ===
            controller
          ) {
            setIsLoading(false);
          }
        }
      },
      DEBOUNCE_DELAY,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleInputChange = (event) => {
    onChange(event.target.value);
    setError("");
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (
      value.trim().length >=
        MIN_QUERY_LENGTH &&
      (results.length > 0 || error)
    ) {
      setIsOpen(true);
    }
  };

  const handleSelect = (location) => {
    abortControllerRef.current?.abort();

    setResults([]);
    setIsOpen(false);
    setError("");

    onSelect(location);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showDropdown =
    isOpen &&
    value.trim().length >=
      MIN_QUERY_LENGTH;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
    >
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className="w-full min-w-0 bg-transparent pr-7 text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        required
      />

      {isLoading && (
        <LoaderCircle
          size={16}
          className="absolute right-0 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
        />
      )}

      {showDropdown && (
        <div className="absolute left-[-56px] right-[-16px] top-[42px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 text-sm text-red-700">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {!error &&
            !isLoading &&
            results.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">
                Adres sonucu bulunamadı.
              </div>
            )}

          {!error &&
            results.length > 0 && (
              <ul className="max-h-72 overflow-y-auto py-2">
                {results.map(
                  (location) => (
                    <li
                      key={
                        location.placeId ||
                        `${location.latitude}-${location.longitude}`
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSelect(
                            location,
                          )
                        }
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <MapPin
                            size={17}
                          />
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-5 text-slate-900">
                            {
                              location.address
                            }
                          </span>

                          <span className="mt-1 block text-xs text-slate-500">
                            {location.latitude.toFixed(
                              5,
                            )}
                            ,{" "}
                            {location.longitude.toFixed(
                              5,
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;