package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.notification.NotificationPreferenceResponse;
import com.btk.staj.VIPTransferProject.dto.notification.UpdateNotificationPreferenceRequest;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.service.NotificationPreferenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notification-preferences")
@RequiredArgsConstructor
public class NotificationPreferenceController {

    private final NotificationPreferenceService preferenceService;

    @PutMapping("/{channel}")
    public ResponseEntity<NotificationPreferenceResponse> update(
            Authentication authentication,
            @PathVariable NotificationChannel channel,
            @Valid @RequestBody UpdateNotificationPreferenceRequest request
    ) {
        return ResponseEntity.ok(
                preferenceService.update(
                        authentication.getName(),
                        channel,
                        request.enabled()
                )
        );
    }
}
