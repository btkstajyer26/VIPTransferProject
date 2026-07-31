package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.notification.NotificationPreferenceResponse;
import com.btk.staj.VIPTransferProject.dto.notification.UpdateNotificationPreferenceRequest;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.NotificationPreferenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notification-preferences")
@RequiredArgsConstructor
public class NotificationPreferenceController {

    private final NotificationPreferenceService preferenceService;

    @GetMapping
    public ResponseEntity<List<NotificationPreferenceResponse>> getAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(preferenceService.getAll(principal.phoneNumber()));
    }

    @PutMapping("/{channel}")
    public ResponseEntity<NotificationPreferenceResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable NotificationChannel channel,
            @Valid @RequestBody UpdateNotificationPreferenceRequest request
    ) {
        return ResponseEntity.ok(
                preferenceService.update(
                        principal.phoneNumber(),
                        channel,
                        request.enabled()
                )
        );
    }
}
