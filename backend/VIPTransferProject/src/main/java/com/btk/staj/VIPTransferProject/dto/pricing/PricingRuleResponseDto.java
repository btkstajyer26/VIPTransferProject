package com.btk.staj.VIPTransferProject.dto.pricing;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Getter
@Builder
public class PricingRuleResponseDto {

    private Long id;
    private Long zoneId;
    private String zoneName; // admin panelinde "hangi bölge" göstermek için kolaylık
    private String name;
    private Short dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal multiplier;
    private String reason;
    private LocalDate validFrom;
    private LocalDate validTo;
    private boolean active;
    private OffsetDateTime createdAt;
}