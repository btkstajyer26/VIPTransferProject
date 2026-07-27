package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;

public class NotificationSendException extends RuntimeException {

    private final String failureReason;

    public NotificationSendException(
            Long notificationId,
            NotificationChannel channel,
            String message
    ) {
        super(buildMessage(notificationId, channel, message));
        this.failureReason = normalizeReason(message);
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
        this.failureReason = normalizeReason(message);
    }

    public String getFailureReason() {
        return failureReason;
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
                + normalizeReason(message);
    }

    private static String normalizeReason(String message) {
        return message == null || message.isBlank()
                ? "Bilinmeyen gonderim hatasi."
                : message;
    }
}
