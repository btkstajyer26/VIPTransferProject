export const mockUser = {
  name: 'Merve',
  loyaltyPoint: 1250,
  loyaltyLevel: 'GOLD',
};

export const mockReservations = [
  {
    id: '1',
    pickup: 'Istanbul Airport',
    destination: 'Besiktas Hotel',
    date: '18 Temmuz 2026 - 14:30',
    status: 'PENDING',
    price: '578 TL',
  },
  {
    id: '2',
    pickup: 'Kadikoy',
    destination: 'Sabiha Gokcen Airport',
    date: '10 Temmuz 2026 - 09:00',
    status: 'COMPLETED',
    price: '720 TL',
  },
  {
    id: '3',
    pickup: 'Levent',
    destination: 'Galataport',
    date: '02 Temmuz 2026 - 20:15',
    status: 'COMPLETED',
    price: '430 TL',
  },
];

export const vehicleTypes = ['Economy', 'Business', 'VIP'];
