package com.btk.staj.VIPTransferProject.dto.loyalty;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTierConfigRequest {
    @Min(value = 0, message = "Minimum puan negatif olamaz.")
    private int minPoints;

    @NotNull(message = "Puan kazanım oranı zorunludur.")
    @DecimalMin(value = "0.00", message = "Puan kazanım oranı negatif olamaz.")
    private BigDecimal earnRate;

    @NotNull(message = "İndirim yüzdesi zorunludur.")
    @DecimalMin(value = "0.00", message = "İndirim yüzdesi negatif olamaz.")
    @DecimalMax(value = "100.00", message = "İndirim yüzdesi 100'den büyük olamaz.")
    private BigDecimal discountPercentage;

    private boolean prioritySupport;

    @Size(max = 255, message = "Açıklama en fazla 255 karakter olabilir.")
    private String description;

}
