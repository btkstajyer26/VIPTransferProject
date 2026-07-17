package com.btk.staj.VIPTransferProject.dto.reservation;

import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
public class CreateReservationRequest {

    private String pickupAddress;
    private double pickupLat;
    private double pickupLon;

    private String dropoffAddress;
    private double dropoffLat;
    private double dropoffLon;

    private OffsetDateTime scheduledTime;
    private Long vehicleId;
    private short passengerCount;

    private String campaignCode;
    private String flightNumber;
    private String notes;
}
