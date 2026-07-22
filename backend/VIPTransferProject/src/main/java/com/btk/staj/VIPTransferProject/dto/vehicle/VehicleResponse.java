package com.btk.staj.VIPTransferProject.dto.vehicle;

import com.btk.staj.VIPTransferProject.enums.VehicleClass;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
public class VehicleResponse {
    private Long id;
    private String plateNumber;
    private String brand;
    private String model;
    private VehicleClass vehicleClass;
    private Short year;
    private String color;
    private String photoUrl;
    private Short capacity;
    private BigDecimal openingPrice;
    private BigDecimal basePriceMultiplier;
    private boolean active;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
