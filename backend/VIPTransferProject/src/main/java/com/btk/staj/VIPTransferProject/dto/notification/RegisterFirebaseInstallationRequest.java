package com.btk.staj.VIPTransferProject.dto.notification;

import com.btk.staj.VIPTransferProject.enums.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterFirebaseInstallationRequest(
        @NotBlank(message = "Firebase Installation ID bilgisi zorunludur.")
        @Size(max = 255, message = "Firebase Installation ID 255 karakterden uzun olamaz.")
        String fid,
        @NotNull(message = "Cihaz platform bilgisi zorunludur.")
        DevicePlatform platform
) {
}
