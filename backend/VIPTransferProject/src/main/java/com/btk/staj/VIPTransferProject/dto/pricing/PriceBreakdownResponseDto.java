package com.btk.staj.VIPTransferProject.dto.pricing;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PriceBreakdownResponseDto {
    private BigDecimal distanceFee;
    private BigDecimal flagFee;
    private BigDecimal basePrice;
    private BigDecimal vehicleAdjustedPrice;
    private BigDecimal surgeMultiplier;
    private BigDecimal priceAfterSurge;
    private BigDecimal campaignDiscount;
    private BigDecimal loyaltyDiscount;
    private BigDecimal finalPrice;
    private String currency;
}