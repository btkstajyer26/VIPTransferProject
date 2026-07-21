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
public class TranslationDto {
    private Long id;
    private String transKey;
    private String langCode;
    private String value;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
