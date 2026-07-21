package com.btk.staj.VIPTransferProject.dto.pricing;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PricingRuleRequestDto {

    @NotNull(message = "zoneId zorunludur")
    private Long zoneId;

    @Size(max = 100)
    private String name;

    @Min(value = 0, message = "dayOfWeek 0 ile 6 arasında olmalıdır (0=Pazar)")
    @Max(value = 6, message = "dayOfWeek 0 ile 6 arasında olmalıdır (0=Pazar)")
    private Short dayOfWeek; // null = her gün geçerli

    @NotNull(message = "startTime zorunludur")
    private LocalTime startTime;

    @NotNull(message = "endTime zorunludur")
    private LocalTime endTime;

    @NotNull(message = "multiplier zorunludur")
    @DecimalMin(value = "0.01", inclusive = true, message = "multiplier 0'dan büyük olmalıdır")
    @Digits(integer = 2, fraction = 2)
    private BigDecimal multiplier;

    @Size(max = 100)
    private String reason;

    private LocalDate validFrom; // null = başlangıç sınırı yok

    private LocalDate validTo;   // null = bitiş sınırı yok
}