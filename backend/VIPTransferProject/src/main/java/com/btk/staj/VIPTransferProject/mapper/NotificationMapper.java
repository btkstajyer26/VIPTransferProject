package com.btk.staj.VIPTransferProject.mapper;

import com.btk.staj.VIPTransferProject.dto.notification.NotificationResponse;
import com.btk.staj.VIPTransferProject.entity.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationResponse toResponse(Notification notification) {

        Long reservationId = null;

        if (notification.getReservation() != null) {
            reservationId = notification.getReservation().getId();
        }

        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUser().getId())
                .reservationId(reservationId)
                .channel(notification.getChannel())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .status(notification.getStatus())
                .sentAt(notification.getSentAt())
                .failureReason(notification.getFailureReason())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}