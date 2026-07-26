package com.btk.staj.VIPTransferProject.dto.reservation;

import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
public class PricePreviewRequest {

    private double pickupLat;
    private double pickupLon;

    private double dropoffLat;
    private double dropoffLon;

    private Long vehicleId;
    private OffsetDateTime scheduledTime;

    private String campaignCode;
}
