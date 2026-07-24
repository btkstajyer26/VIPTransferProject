package com.btk.staj.VIPTransferProject.dto.campaign;

import com.btk.staj.VIPTransferProject.enums.DiscountType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CampaignRequestDto {

    @NotBlank(message = "code boş olamaz")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "name boş olamaz")
    @Size(max = 150)
    private String name;

    @Size(max = 500)
    private String description;

    @NotNull(message = "discountType zorunludur")
    private DiscountType discountType;

    @NotNull(message = "discountValue zorunludur")
    @DecimalMin(value = "0.01", message = "discountValue 0'dan büyük olmalıdır")
    private BigDecimal discountValue;

    private BigDecimal maxDiscountAmount;

    private BigDecimal minOrderAmount;

    private Integer maxUses;

    private Integer maxUsesPerUser;

    @NotNull(message = "validFrom zorunludur")
    private OffsetDateTime validFrom;

    @NotNull(message = "validTo zorunludur")
    private OffsetDateTime validTo;

    private Long createdById;
}