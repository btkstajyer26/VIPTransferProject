import {
  useEffect,
  useRef,
  useState,
} from "react";

import { loadGoogleMaps } from "@/lib/googleMaps";

export default function PlacesAutocompleteInput({
  value,
  placeholder,
  onPlaceSelect,
  className = "",
}) {
  const containerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let placeSelectListener = null;

    async function initializeAutocomplete() {
      try {
        setLoading(true);
        setError("");

        const google = await loadGoogleMaps();

        const { PlaceAutocompleteElement } =
          await google.maps.importLibrary(
            "places",
          );

        if (
          disposed ||
          !containerRef.current
        ) {
          return;
        }

        const autocomplete =
          new PlaceAutocompleteElement({
            componentRestrictions: {
              country: "tr",
            },
          });

        autocomplete.placeholder =
          placeholder ?? "Adres ara";

        autocomplete.style.width = "100%";

        placeSelectListener =
          autocomplete.addEventListener(
            "gmp-select",
            async (event) => {
              try {
                const placePrediction =
                  event.placePrediction;

                if (!placePrediction) {
                  return;
                }

                const place =
                  placePrediction.toPlace();

                await place.fetchFields({
                  fields: [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location",
                  ],
                });

                onPlaceSelect({
                  address:
                    place.formattedAddress ??
                    place.displayName ??
                    "",
                  placeId: place.id ?? "",
                  latitude:
                    place.location?.lat() ??
                    null,
                  longitude:
                    place.location?.lng() ??
                    null,
                });
              } catch (selectionError) {
                console.error(
                  "Adres detayı alınamadı:",
                  selectionError,
                );

                setError(
                  "Seçilen adresin detayları alınamadı.",
                );
              }
            },
          );

        containerRef.current.replaceChildren(
          autocomplete,
        );

        autocompleteRef.current =
          autocomplete;
      } catch (initializationError) {
        console.error(
          "Google Places başlatılamadı:",
          initializationError,
        );

        setError(
          initializationError.message ||
            "Adres arama servisi yüklenemedi.",
        );
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    initializeAutocomplete();

    return () => {
      disposed = true;

      if (
        placeSelectListener &&
        typeof placeSelectListener.remove ===
          "function"
      ) {
        placeSelectListener.remove();
      }

      autocompleteRef.current = null;
    };
  }, [onPlaceSelect, placeholder]);

  useEffect(() => {
    const autocomplete =
      autocompleteRef.current;

    if (!autocomplete) {
      return;
    }

    const input =
      autocomplete.shadowRoot?.querySelector(
        "input",
      );

    if (
      input &&
      input.value !== (value ?? "")
    ) {
      input.value = value ?? "";
    }
  }, [value]);

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className={className}>
      {loading && (
        <p className="text-sm text-slate-400">
          Adres arama yükleniyor...
        </p>
      )}

      <div
        ref={containerRef}
        className={loading ? "hidden" : ""}
      />
    </div>
  );
}