package com.btk.staj.VIPTransferProject.dto.campaign;

import com.btk.staj.VIPTransferProject.enums.DiscountType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
public class CampaignResponseDto {

    private Long id;
    private String code;
    private String name;
    private String description;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minOrderAmount;
    private Integer maxUses;
    private int usedCount;
    private int maxUsesPerUser;
    private OffsetDateTime validFrom;
    private OffsetDateTime validTo;
    private boolean active;
    private Long createdById;
    private String createdByName; // admin panelinde okunabilirlik için (PricingRuleResponseDto.zoneName gibi)
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}