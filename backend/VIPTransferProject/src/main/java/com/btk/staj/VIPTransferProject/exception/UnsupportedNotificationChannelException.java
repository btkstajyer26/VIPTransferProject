package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;

public class UnsupportedNotificationChannelException extends RuntimeException {

    public UnsupportedNotificationChannelException(
            NotificationChannel channel
    ) {
        super("Desteklenmeyen bildirim kanalı: " + channel);
    }
}