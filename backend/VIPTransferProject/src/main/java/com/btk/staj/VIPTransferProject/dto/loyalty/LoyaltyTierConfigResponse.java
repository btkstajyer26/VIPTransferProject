package com.btk.staj.VIPTransferProject.dto.loyalty;

import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class LoyaltyTierConfigResponse {
    private Integer id;
    private LoyaltyTier tier;
    private int minPoints;
    private BigDecimal earnRate;
    private BigDecimal discountPercentage;
    private boolean prioritySupport;
    private String description;
}
