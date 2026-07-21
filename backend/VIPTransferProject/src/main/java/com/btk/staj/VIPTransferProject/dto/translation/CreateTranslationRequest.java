package com.btk.staj.VIPTransferProject.dto.translation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTranslationRequest {
    private String transKey;
    private String langCode;
    private String value;
}
