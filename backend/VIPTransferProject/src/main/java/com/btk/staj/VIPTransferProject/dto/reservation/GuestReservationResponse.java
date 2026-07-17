package com.btk.staj.VIPTransferProject.dto.reservation;

import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
public class GuestReservationResponse {

    private Long id;
    private String bookingReference;
    private String pickupAddress;
    private String dropoffAddress;
    private OffsetDateTime scheduledTime;
    private String vehicleName;
    private short passengerCount;
    private BigDecimal calculatedPrice;
    private String currency;
    private ReservationStatus status;
    private String flightNumber;
    private String notes;
    private OffsetDateTime createdAt;
}
