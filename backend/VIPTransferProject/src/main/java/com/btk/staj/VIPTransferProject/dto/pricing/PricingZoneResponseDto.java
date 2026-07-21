package com.btk.staj.VIPTransferProject.dto.pricing;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
public class PricingZoneResponseDto {

    private Long id;
    private String name;
    private String description;
    private GeoJsonPolygonDto polygon;
    private BigDecimal basePrice;
    private BigDecimal minPrice;
    private BigDecimal pricePerKm;
    private String currency;
    private boolean active;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
