import { FlatList, StyleSheet, Text, View } from 'react-native';
import { mockReservations } from '../data/mockData';
import colors from '../theme/colors';

export default function ReservationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rezervasyonlarim</Text>

      <FlatList
        data={mockReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.route}>
              {item.pickup} -> {item.destination}
            </Text>
            <Text style={styles.date}>{item.date}</Text>

            <View style={styles.row}>
              <Text
                style={[
                  styles.status,
                  item.status === 'COMPLETED' ? styles.completed : styles.pending,
                ]}
              >
                {item.status}
              </Text>
              <Text style={styles.price}>{item.price}</Text>
            </View>
          </View>
        )}
      />
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
  list: {
    paddingTop: 20,
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  route: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  date: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
  },
  row: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '800',
  },
  pending: {
    color: colors.warning,
    backgroundColor: '#FEF3C7',
  },
  completed: {
    color: colors.success,
    backgroundColor: '#DCFCE7',
  },
  price: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
});
