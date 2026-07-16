package com.btk.staj.VIPTransferProject.dto.reservation;

import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class ReservationStatusHistoryResponse {

    private Long id;
    private Long reservationId;
    private ReservationStatus status;
    private Long changedById;
    private String changedByName;
    private String note;
    private OffsetDateTime changedAt;
}
