package com.btk.staj.VIPTransferProject.dto.loyalty;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class LoyaltyAccountResponse {
    private long userId;
    private Integer lifetimePoints;
    private String tier;
}
