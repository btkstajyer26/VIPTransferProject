package com.btk.staj.VIPTransferProject.dto.loyalty;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTierConfigRequest {
    private int minPoints;
    private BigDecimal earnRate;
    private BigDecimal discountPercentage;
    private boolean prioritySupport;
    private String description;

}
