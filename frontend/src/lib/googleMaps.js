let googleMapsPromise = null;

export function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "VITE_GOOGLE_MAPS_API_KEY tanımlanmamış.",
      ),
    );
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      const existingScript = document.querySelector(
        'script[data-google-maps-loader="true"]',
      );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(window.google),
          { once: true },
        );

        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Google Maps yüklenemedi.",
              ),
            ),
          { once: true },
        );

        return;
      }

      const callbackName =
        "__vipTransferGoogleMapsLoaded";

      window[callbackName] = () => {
        delete window[callbackName];
        resolve(window.google);
      };

      const script =
        document.createElement("script");

      script.src =
        `https://maps.googleapis.com/maps/api/js` +
        `?key=${encodeURIComponent(apiKey)}` +
        `&loading=async` +
        `&libraries=places` +
        `&language=tr` +
        `&region=TR` +
        `&callback=${callbackName}`;

      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = "true";

      script.onerror = () => {
        delete window[callbackName];

        reject(
          new Error(
            "Google Maps scripti yüklenemedi.",
          ),
        );
      };

      document.head.appendChild(script);
    },
  );

  return googleMapsPromise;
}