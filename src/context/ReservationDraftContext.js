import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ReservationDraftContext = createContext(undefined);

function hasValidCoordinate(location) {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    latitude !== 0 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    longitude !== 0
  );
}

export function isValidReservationDraft(draft) {
  const transferDetails = draft?.transferDetails;
  const scheduledTime = new Date(transferDetails?.scheduledTime);
  const passengerCount = Number(transferDetails?.passengerCount);
  const vehicleId = Number(draft?.selectedVehicle?.id);

  return (
    hasValidCoordinate(transferDetails?.pickupLocation) &&
    hasValidCoordinate(transferDetails?.dropoffLocation) &&
    Number.isFinite(scheduledTime.getTime()) &&
    Number.isFinite(passengerCount) &&
    passengerCount >= 1 &&
    Number.isFinite(vehicleId)
  );
}

export function ReservationDraftProvider({ children }) {
  const [reservationDraft, setReservationDraft] = useState(null);

  const saveReservationDraft = useCallback((draft) => setReservationDraft(draft), []);
  const clearReservationDraft = useCallback(() => setReservationDraft(null), []);

  const value = useMemo(
    () => ({ reservationDraft, saveReservationDraft, clearReservationDraft }),
    [clearReservationDraft, reservationDraft, saveReservationDraft],
  );

  return (
    <ReservationDraftContext.Provider value={value}>
      {children}
    </ReservationDraftContext.Provider>
  );
}

export function useReservationDraft() {
  const context = useContext(ReservationDraftContext);

  if (context === undefined) {
    throw new Error('useReservationDraft, ReservationDraftProvider içinde kullanılmalıdır.');
  }

  return context;
}
