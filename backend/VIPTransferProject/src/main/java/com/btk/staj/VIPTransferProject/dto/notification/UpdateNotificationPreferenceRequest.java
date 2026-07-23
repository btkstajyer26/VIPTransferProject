package com.btk.staj.VIPTransferProject.dto.notification;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationPreferenceRequest(
        @NotNull(message = "Bildirim tercih bilgisi zorunludur.")
        Boolean enabled
) {
}
