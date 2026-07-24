import { Text, View } from 'react-native';

function locationName(location, fallback) {
  return location?.displayName || location?.address || fallback;
}

export default function ReservationSummaryCard({
  reservation,
  selectedVehicle,
  styles,
  transferDetails,
}) {
  const exactPrice = Number(reservation?.calculatedPrice);
  const openingPrice = Number(selectedVehicle?.openingPrice);
  const hasExactPrice = Number.isFinite(exactPrice) && exactPrice >= 0;
  const displayedPrice = hasExactPrice ? exactPrice : openingPrice;
  const currency = reservation?.currency || 'TRY';

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryAccent} />
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.cardEyebrow}>YOLCULUK ÖZETİ</Text>
          <Text style={styles.cardTitle}>Transfer Detayları</Text>
        </View>
        <View style={styles.passengerBadge}>
          <Text style={styles.passengerValue}>{transferDetails?.passengerCount ?? 1}</Text>
          <Text style={styles.passengerLabel}>YOLCU</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.markerColumn}>
          <View style={styles.pickupMarker} />
          <View style={styles.routeLine} />
          <View style={styles.dropoffMarker} />
        </View>
        <View style={styles.locationColumn}>
          <View>
            <Text style={styles.locationLabel}>BAŞLANGIÇ</Text>
            <Text style={styles.locationValue}>
              {locationName(transferDetails?.pickupLocation, 'Başlangıç noktası')}
            </Text>
          </View>
          <View>
            <Text style={styles.locationLabel}>VARIŞ</Text>
            <Text style={styles.locationValue}>
              {locationName(transferDetails?.dropoffLocation, 'Varış noktası')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.vehicleRow}>
        <View style={styles.vehicleMonogram}>
          <Text style={styles.vehicleMonogramText}>VIP</Text>
        </View>
        <View style={styles.vehicleText}>
          <Text style={styles.vehicleLabel}>SEÇİLEN ARAÇ</Text>
          <Text numberOfLines={1} style={styles.vehicleName}>
            {selectedVehicle
              ? `${selectedVehicle.brand} ${selectedVehicle.model}`
              : 'Araç bilgisi bulunamadı'}
          </Text>
        </View>
      </View>

      <View style={styles.priceBox}>
        <View>
          <Text style={styles.priceLabel}>
            {hasExactPrice ? 'HESAPLANAN TOPLAM' : 'BAŞLANGIÇ TAHMİNİ'}
          </Text>
          <Text style={styles.priceHint}>
            {hasExactPrice
              ? 'Rota mesafesine göre hesaplandı'
              : 'Kesin fiyat rezervasyon sırasında hesaplanır'}
          </Text>
        </View>
        <Text style={styles.priceValue}>
          {Number.isFinite(displayedPrice) ? `₺${displayedPrice.toLocaleString('tr-TR')}` : '—'}
        </Text>
      </View>
      {hasExactPrice && currency !== 'TRY' ? (
        <Text style={styles.currencyText}>Para birimi: {currency}</Text>
      ) : null}
    </View>
  );
}
