package com.btk.staj.VIPTransferProject.dto.routing;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class RouteInfoDto {
    private final String encodedPolyline;
    private final BigDecimal distanceKm;
}
