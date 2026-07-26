import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_LATITUDE = 39.9334;
const DEFAULT_LONGITUDE = 32.8597;

function normalizeCoordinate(value, minimum, maximum) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function getCoordinates(location) {
  const latitude = normalizeCoordinate(location?.latitude, -90, 90);
  const longitude = normalizeCoordinate(location?.longitude, -180, 180);

  return latitude === null || longitude === null ? null : { latitude, longitude };
}

function serialize(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function markerScript(location, color, label) {
  const coordinates = getCoordinates(location);
  if (!coordinates) return '';

  return `
    L.marker([${coordinates.latitude}, ${coordinates.longitude}], {
      icon: L.divIcon({
        className: '',
        html: '<div class="pin" style="--pin-color:${color}"><span></span></div>',
        iconSize: [28, 38],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34]
      })
    }).addTo(map).bindPopup(${serialize(location.displayName || label)});
  `;
}

function buildHtml({ pickup, dropoff, interactive, theme }) {
  const pickupCoordinates = getCoordinates(pickup);
  const dropoffCoordinates = getCoordinates(dropoff);
  const hasPickup = Boolean(pickupCoordinates);
  const hasDropoff = Boolean(dropoffCoordinates);
  const background = theme.mode === 'dark' ? '#0F172A' : '#F5F7FA';

  let viewportScript = '';
  if (hasPickup && hasDropoff) {
    viewportScript = `map.fitBounds([
      [${pickupCoordinates.latitude}, ${pickupCoordinates.longitude}],
      [${dropoffCoordinates.latitude}, ${dropoffCoordinates.longitude}]
    ], { padding: [38, 38], maxZoom: 15 });`;
  } else if (hasPickup) {
    viewportScript = `map.setView([${pickupCoordinates.latitude}, ${pickupCoordinates.longitude}], 14);`;
  } else if (hasDropoff) {
    viewportScript = `map.setView([${dropoffCoordinates.latitude}, ${dropoffCoordinates.longitude}], 14);`;
  }

  const routeScript =
    hasPickup && hasDropoff
      ? `L.polyline([
          [${pickupCoordinates.latitude}, ${pickupCoordinates.longitude}],
          [${dropoffCoordinates.latitude}, ${dropoffCoordinates.longitude}]
        ], {
          color: '#D4AF37',
          weight: 4,
          opacity: 0.85,
          dashArray: '8 8'
        }).addTo(map);`
      : '';

  const clickScript = interactive
    ? `map.on('click', function (event) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'mapPress',
          latitude: event.latlng.lat,
          longitude: event.latlng.lng
        }));
      });`
    : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    crossorigin=""
  />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; background: ${background}; }
    .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .pin {
      --pin-color: #D4AF37;
      width: 24px;
      height: 24px;
      border: 3px solid #fff;
      border-radius: 50% 50% 50% 0;
      background: var(--pin-color);
      box-shadow: 0 2px 7px rgba(15, 23, 42, .42);
      transform: rotate(-45deg);
    }
    .pin span {
      position: absolute;
      width: 7px;
      height: 7px;
      top: 6px;
      left: 6px;
      border-radius: 50%;
      background: #fff;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    crossorigin=""
  ></script>
  <script>
    (function () {
      function sendError() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapError' }));
      }

      try {
        if (!window.L) {
          sendError();
          return;
        }

        var tileErrorSent = false;
        var map = L.map('map', { zoomControl: true, attributionControl: true })
          .setView([${DEFAULT_LATITUDE}, ${DEFAULT_LONGITUDE}], 11);
        var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        });
        tiles.on('tileerror', function () {
          if (!tileErrorSent) {
            tileErrorSent = true;
            sendError();
          }
        });
        tiles.addTo(map);

        ${markerScript(pickup, '#D4AF37', 'Başlangıç')}
        ${markerScript(dropoff, '#E85D75', 'Varış')}
        ${routeScript}
        ${viewportScript}
        ${clickScript}
      } catch (error) {
        sendError();
      }
    })();
  </script>
</body>
</html>`;
}

export function MapPreview({
  pickup,
  dropoff,
  activeField,
  onMapPress,
  styles,
  theme,
}) {
  const [mapError, setMapError] = useState(false);
  const interactive = Boolean(activeField);
  const html = useMemo(
    () => buildHtml({ pickup, dropoff, interactive, theme }),
    [
      pickup?.latitude,
      pickup?.longitude,
      pickup?.displayName,
      dropoff?.latitude,
      dropoff?.longitude,
      dropoff?.displayName,
      interactive,
      theme.mode,
    ],
  );
  const mapKey = [
    pickup?.latitude ?? '',
    pickup?.longitude ?? '',
    dropoff?.latitude ?? '',
    dropoff?.longitude ?? '',
    theme.mode,
  ].join(':');

  function handleMessage(event) {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message?.type === 'mapError') {
        setMapError(true);
        return;
      }
      if (
        message?.type !== 'mapPress' ||
        !Number.isFinite(message.latitude) ||
        !Number.isFinite(message.longitude) ||
        message.latitude < -90 ||
        message.latitude > 90 ||
        message.longitude < -180 ||
        message.longitude > 180
      ) {
        return;
      }

      onMapPress(message.latitude, message.longitude);
    } catch {
      // WebView'dan gelen geçersiz mesajlar kullanıcı akışını bozmadan yok sayılır.
    }
  }

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.cardEyebrow}>HARİTADAN SEÇİM</Text>
          <Text style={styles.mapTitle}>Konum önizlemesi</Text>
        </View>
        <Text style={styles.mapTarget}>
          {activeField === 'pickupLocation'
            ? 'Başlangıç seçiliyor'
            : activeField === 'dropoffLocation'
              ? 'Varış seçiliyor'
              : 'Önce adres alanını seçin'}
        </Text>
      </View>

      <View style={styles.mapFrame}>
        <WebView
          javaScriptEnabled
          key={mapKey}
          onError={() => setMapError(true)}
          onMessage={handleMessage}
          originWhitelist={['*']}
          scrollEnabled={false}
          source={{ html }}
          style={styles.mapWebView}
        />
        {mapError ? (
          <View pointerEvents="none" style={styles.mapErrorOverlay}>
            <Text style={styles.mapErrorText}>
              Harita yüklenemedi. Adres aramasını kullanmaya devam edebilirsiniz.
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.mapHint}>
        Bir adres alanına dokunun, ardından konumu haritadan seçmek için haritaya dokunun.
      </Text>
    </View>
  );
}
