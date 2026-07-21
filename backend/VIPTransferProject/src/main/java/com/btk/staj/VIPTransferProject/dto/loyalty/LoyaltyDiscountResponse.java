package com.btk.staj.VIPTransferProject.dto.loyalty;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class LoyaltyDiscountResponse {
    private long userId;
    private String tier;
    private BigDecimal discountPercentage;
    private BigDecimal discountAmount;
}
