package com.btk.staj.VIPTransferProject.dto.translation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEntityTranslationRequest {
    // Örn: pricing_zone, campaign, pricing_rule, loyalty_tier, vehicle
    private String entityType;
    private Long entityId;
    // Örn: name, description, reason
    private String fieldName;
    private String langCode;
    private String value;
}
