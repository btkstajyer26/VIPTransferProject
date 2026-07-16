package com.btk.staj.VIPTransferProject.dto.reservation;

import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateStatusRequest {

    private ReservationStatus status;
    private String note;
}
