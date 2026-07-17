package com.btk.staj.VIPTransferProject.dto.loyalty;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class AccurePointsRequests {
    private long userId;
    private BigDecimal fareAmount;
}