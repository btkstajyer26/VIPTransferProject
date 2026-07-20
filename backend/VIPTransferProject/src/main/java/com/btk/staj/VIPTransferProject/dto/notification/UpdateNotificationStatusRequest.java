package com.btk.staj.VIPTransferProject.dto.notification;

import com.btk.staj.VIPTransferProject.enums.NotificationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateNotificationStatusRequest {

    @NotNull(message = "Bildirim durumu zorunludur.")
    private NotificationStatus status;
}