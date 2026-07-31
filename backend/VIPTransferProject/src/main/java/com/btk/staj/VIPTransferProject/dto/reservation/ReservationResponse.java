package com.btk.staj.VIPTransferProject.dto.reservation;

import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
public class ReservationResponse {

    private Long id;
    private String bookingReference;

    private Long userId;
    private String guestPhone;

    private String pickupAddress;
    private String dropoffAddress;

    private OffsetDateTime scheduledTime;
    private String vehicleName;
    private Long vehicleId;
    private String vehiclePlateNumber;
    private String vehicleClass;
    private String requestedVehicleClass;
    private short passengerCount;
    private BigDecimal basePrice;
    private BigDecimal loyaltyDiscount;
    private BigDecimal discountAmount;
    private BigDecimal calculatedPrice;
    private String currency;

    private ReservationStatus status;

    private String flightNumber;
    private String notes;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime cancelledAt;
    private String cancellationReason;
    private OffsetDateTime completedAt;
}
