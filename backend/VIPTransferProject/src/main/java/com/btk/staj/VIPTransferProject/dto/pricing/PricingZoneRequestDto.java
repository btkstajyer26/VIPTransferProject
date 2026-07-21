package com.btk.staj.VIPTransferProject.dto.pricing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PricingZoneRequestDto {

    @NotBlank(message = "name boş olamaz")
    @Size(max = 150)
    private String name;

    @Size(max = 255)
    private String description;

    @NotNull(message = "polygon zorunludur")
    @Valid
    private GeoJsonPolygonDto polygon;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true, message = "basePrice negatif olamaz")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal basePrice;

    @DecimalMin(value = "0.0", inclusive = true, message = "minPrice negatif olamaz")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal minPrice;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true, message = "pricePerKm negatif olamaz")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal pricePerKm;

    @Size(min = 3, max = 3, message = "currency 3 karakter olmalıdır (örn: TRY)")
    private String currency;
}