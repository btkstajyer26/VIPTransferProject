
package com.btk.staj.VIPTransferProject.dto.notification;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.enums.NotificationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class NotificationResponse {

    private Long id;

    private Long userId;

    private Long reservationId;

    private NotificationChannel channel;

    private String title;

    private String message;

    private NotificationStatus status;

    private OffsetDateTime sentAt;

    private String failureReason;

    private OffsetDateTime createdAt;
}