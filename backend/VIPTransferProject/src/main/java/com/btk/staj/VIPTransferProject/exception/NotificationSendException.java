package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;

public class NotificationSendException extends RuntimeException {

    public NotificationSendException(
            Long notificationId,
            NotificationChannel channel,
            String message
    ) {
        super(buildMessage(notificationId, channel, message));
    }

    public NotificationSendException(
            Long notificationId,
            NotificationChannel channel,
            String message,
            Throwable cause
    ) {
        super(
                buildMessage(notificationId, channel, message),
                cause
        );
    }

    private static String buildMessage(
            Long notificationId,
            NotificationChannel channel,
            String message
    ) {
        return "Bildirim gönderilemedi. Notification ID: "
                + notificationId
                + ", channel: "
                + channel
                + ", reason: "
                + message;
    }
}