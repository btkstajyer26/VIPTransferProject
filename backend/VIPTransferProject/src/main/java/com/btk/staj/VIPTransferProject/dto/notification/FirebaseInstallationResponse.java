package com.btk.staj.VIPTransferProject.dto.notification;

import com.btk.staj.VIPTransferProject.enums.DevicePlatform;
import java.time.OffsetDateTime;

public record FirebaseInstallationResponse(
        Long id,
        DevicePlatform platform,
        boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
