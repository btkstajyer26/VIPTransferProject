package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.dto.notification.NotificationResponse;
import com.btk.staj.VIPTransferProject.dto.notification.UpdateNotificationStatusRequest;
import com.btk.staj.VIPTransferProject.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<NotificationResponse> create(
            @Valid @RequestBody CreateNotificationRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(notificationService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll() {
        return ResponseEntity.ok(notificationService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> getById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                notificationService.getById(id)
        );
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<NotificationResponse> send(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                notificationService.send(id)
        );
    }

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