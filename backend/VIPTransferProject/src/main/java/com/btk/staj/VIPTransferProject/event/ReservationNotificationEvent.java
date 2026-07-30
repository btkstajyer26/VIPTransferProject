package com.btk.staj.VIPTransferProject.event;

import com.btk.staj.VIPTransferProject.enums.ReservationStatus;

public record ReservationNotificationEvent(
        Long reservationId,
        ReservationStatus previousStatus,
        ReservationStatus newStatus
) {
}
