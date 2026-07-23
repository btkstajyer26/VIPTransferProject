package com.btk.staj.VIPTransferProject.dto.vehicle;

import com.btk.staj.VIPTransferProject.enums.VehicleClass;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PublicVehicleResponse {
    private Long id;
    private String brand;
    private String model;
    private VehicleClass vehicleClass;
    private Short year;
    private String color;
    private String photoUrl;
    private Short capacity;
    private BigDecimal openingPrice;
}
