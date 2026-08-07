import { Text, View } from 'react-native';

function locationName(location, fallback) {
  return location?.displayName || location?.address || fallback;
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function currencySymbol(currency) {
  return currency === 'TRY' ? '₺' : currency;
}

function formatMoney(value, currency) {
  const number = numericValue(value);
  return number === null
    ? '—'
    : `${number.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currencySymbol(currency)}`;
}

function PriceRow({ label, styles, value, valueStyle }) {
  return (
    <View style={styles.priceDetailRow}>
      <Text style={styles.priceDetailLabel}>{label}</Text>
      <Text style={[styles.priceDetailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

export default function ReservationSummaryCard({
  pricePreview,
  reservation,
  selectedVehicle,
  styles,
  transferDetails,
}) {
  const currency = reservation?.currency || 'TRY';
  const pricing = pricePreview?.data ?? pricePreview ?? {};
  const finalPrice = numericValue(reservation?.finalPrice ?? reservation?.calculatedPrice);
  const campaignDiscount = numericValue(
    reservation?.campaignDiscount ?? reservation?.discountAmount,
  );
  const loyaltyDiscount = numericValue(reservation?.loyaltyDiscount);
  const distanceKm = numericValue(pricing?.distanceKm ?? reservation?.distanceKm);
  const flagFee = numericValue(pricing?.flagFee ?? reservation?.flagFee);
  const distanceFee = numericValue(pricing?.distanceFee ?? reservation?.distanceFee);
  const basePrice = numericValue(pricing?.basePrice ?? reservation?.basePrice);
  const vehicleAdjustedPrice = numericValue(pricing?.vehicleAdjustedPrice);
  const surgeMultiplier = numericValue(pricing?.surgeMultiplier);
  const priceAfterSurge = numericValue(pricing?.priceAfterSurge);
  const vehicleAdjustment =
    basePrice !== null && vehicleAdjustedPrice !== null
      ? vehicleAdjustedPrice - basePrice
      : null;
  const vehicleAdjustmentPercent =
    basePrice !== null && basePrice !== 0 && vehicleAdjustedPrice !== null
      ? Math.round(Math.abs((vehicleAdjustedPrice / basePrice - 1) * 100))
      : null;
  const surgeAdjustment =
    vehicleAdjustedPrice !== null && priceAfterSurge !== null
      ? priceAfterSurge - vehicleAdjustedPrice
      : null;
  const hasExactPrice = finalPrice !== null && finalPrice >= 0;
  const openingEstimate = numericValue(selectedVehicle?.openingPrice);
  const pickupAddress =
    reservation?.pickupAddress ||
    locationName(transferDetails?.pickupLocation, 'Başlangıç noktası');
  const dropoffAddress =
    reservation?.dropoffAddress ||
    locationName(transferDetails?.dropoffLocation, 'Varış noktası');

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
              {pickupAddress}
            </Text>
          </View>
          <View>
            <Text style={styles.locationLabel}>VARIŞ</Text>
            <Text style={styles.locationValue}>
              {dropoffAddress}
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

      {hasExactPrice ? (
        <View style={styles.priceBreakdown}>
          <Text style={styles.priceBreakdownTitle}>FİYAT ÖZETİ</Text>
          <Text style={styles.priceBreakdownHint}>Araç seçimi ve indirimler dahil son hesaplama</Text>
          {distanceKm !== null ? (
            <PriceRow
              label="Toplam Mesafe"
              styles={styles}
              value={`${distanceKm.toLocaleString('tr-TR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })} km`}
            />
          ) : null}
          <PriceRow
            label="Açılış Ücreti"
            styles={styles}
            value={formatMoney(flagFee, currency)}
          />
          <PriceRow
            label="Mesafe Ücreti"
            styles={styles}
            value={formatMoney(distanceFee, currency)}
          />
          <PriceRow label="Yolculuk Ara Toplamı" styles={styles} value={formatMoney(basePrice, currency)} />
          {vehicleAdjustment !== null && Math.abs(vehicleAdjustment) >= 0.005 ? (
            <PriceRow
              label={vehicleAdjustment < 0
                ? `Araç Seçimi İndirimi${vehicleAdjustmentPercent ? ` (%${vehicleAdjustmentPercent})` : ''}`
                : `Araç Sınıfı Farkı${vehicleAdjustmentPercent ? ` (%${vehicleAdjustmentPercent})` : ''}`}
              styles={styles}
              value={`${vehicleAdjustment < 0 ? '-' : '+'}${formatMoney(Math.abs(vehicleAdjustment), currency)}`}
              valueStyle={vehicleAdjustment < 0 ? styles.discountValue : undefined}
            />
          ) : null}
          {surgeMultiplier !== null && surgeMultiplier !== 1 && surgeAdjustment !== null ? (
            <PriceRow
              label="Yoğun Saat Farkı"
              styles={styles}
              value={`${surgeAdjustment < 0 ? '-' : '+'}${formatMoney(Math.abs(surgeAdjustment), currency)}`}
            />
          ) : null}
          {campaignDiscount > 0 ? (
            <PriceRow
              label="Kampanya İndirimi"
              styles={styles}
              value={`-${formatMoney(campaignDiscount, currency)}`}
              valueStyle={styles.discountValue}
            />
          ) : null}
          {loyaltyDiscount > 0 ? (
            <PriceRow
              label="Sadakat İndirimi"
              styles={styles}
              value={`-${formatMoney(loyaltyDiscount, currency)}`}
              valueStyle={styles.discountValue}
            />
          ) : null}
          <View style={styles.priceTotalDivider} />
          <PriceRow
            label="Toplam Tutar"
            styles={styles}
            value={formatMoney(finalPrice, currency)}
            valueStyle={styles.priceTotalValue}
          />
          <PriceRow label="Para Birimi" styles={styles} value={currency} />
        </View>
      ) : (
        <View style={styles.priceBox}>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>BAŞLANGIÇ TAHMİNİ</Text>
            <Text style={styles.priceHint}>
              Kesin ücret, rota ve seçtiğiniz araca göre rezervasyon sırasında hesaplanır
            </Text>
          </View>
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.priceValue}>
            {openingEstimate !== null ? formatMoney(openingEstimate, currency) : '—'}
          </Text>
        </View>
      )}
    </View>
  );
}
