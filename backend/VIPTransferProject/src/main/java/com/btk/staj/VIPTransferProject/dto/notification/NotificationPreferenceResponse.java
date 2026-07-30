package com.btk.staj.VIPTransferProject.dto.notification;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;

public record NotificationPreferenceResponse(
        NotificationChannel channel,
        boolean enabled
) {
}
