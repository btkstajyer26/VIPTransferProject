package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.dto.notification.NotificationResponse;
import com.btk.staj.VIPTransferProject.dto.notification.UpdateNotificationStatusRequest;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<NotificationResponse> create(
            @Valid @RequestBody CreateNotificationRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(notificationService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAllForCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(
                notificationService.getAllForUser(principal.id())
        );
    }

    @GetMapping("/my")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(
                notificationService.getAllForUser(principal.id())
        );
    }

    @PostMapping("/my/{id}/read")
    public ResponseEntity<NotificationResponse> markMyNotificationRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                notificationService.markReadByOwner(id, principal.id())
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin")
    public ResponseEntity<List<NotificationResponse>> getAllForAdmin() {
        return ResponseEntity.ok(notificationService.getAllForAdmin());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> getByIdForCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                notificationService.getByIdForUser(id, principal.id())
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/send")
    public ResponseEntity<NotificationResponse> send(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                notificationService.send(id)
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<NotificationResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNotificationStatusRequest request
    ) {
        return ResponseEntity.ok(
                notificationService.updateStatus(id, request)
        );
    }
}
