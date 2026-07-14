package com.btk.staj.VIPTransferProject.mapper;

import com.btk.staj.VIPTransferProject.dto.notification.NotificationResponse;
import com.btk.staj.VIPTransferProject.entity.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationResponse toResponse(Notification notification) {
        throw new UnsupportedOperationException(
                "Notification mapping henüz implement edilmedi."
        );
    }
}