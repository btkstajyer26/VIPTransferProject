package com.btk.staj.VIPTransferProject.dto.translation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityTranslationDto {
    private Long id;
    private String entityType;
    private Long entityId;
    private String fieldName;
    private String langCode;
    private String value;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
