import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { vehicleTypes } from '../data/mockData';
import colors from '../theme/colors';

export default function ReservationScreen() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleType, setVehicleType] = useState('Economy');
  const [dateTime, setDateTime] = useState('');
  const [price, setPrice] = useState(null);

  function handleCalculatePrice() {
    // Daha sonra Pricing Service fiyat hesaplama API cagrisi burada yapilabilir.
    setPrice('578 TL');
  }

  function handleCreateReservation() {
    // Daha sonra Reservation Service rezervasyon olusturma API cagrisi burada yapilabilir.
    Alert.alert('Bilgi', 'Rezervasyon istegi olusturuldu');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yeni rezervasyon</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Alis adresi"
          value={pickup}
          onChangeText={setPickup}
        />

        <TextInput
          style={styles.input}
          placeholder="Varis adresi"
          value={destination}
          onChangeText={setDestination}
        />

        <Text style={styles.label}>Arac tipi</Text>
        <View style={styles.vehicleRow}>
          {vehicleTypes.map((type) => {
            const isSelected = vehicleType === type;

            return (
              <Pressable
                key={type}
                style={[styles.vehicleButton, isSelected && styles.vehicleButtonSelected]}
                onPress={() => setVehicleType(type)}
              >
                <Text
                  style={[
                    styles.vehicleButtonText,
                    isSelected && styles.vehicleButtonTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Tarih / saat"
          value={dateTime}
          onChangeText={setDateTime}
        />

        <Pressable style={styles.calculateButton} onPress={handleCalculatePrice}>
          <Text style={styles.calculateButtonText}>Fiyat Hesapla</Text>
        </Pressable>

        {price && (
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Tahmini fiyat</Text>
            <Text style={styles.price}>{price}</Text>
          </View>
        )}

        <Pressable style={styles.createButton} onPress={handleCreateReservation}>
          <Text style={styles.createButtonText}>Rezervasyon Olustur</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: 12,
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  form: {
    marginTop: 22,
    gap: 14,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vehicleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  vehicleButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.primary,
  },
  vehicleButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  vehicleButtonTextSelected: {
    color: colors.accent,
  },
  calculateButton: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  priceBox: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFF7E0',
    borderColor: '#F3D37A',
    borderWidth: 1,
  },
  priceLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  price: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  createButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
});
