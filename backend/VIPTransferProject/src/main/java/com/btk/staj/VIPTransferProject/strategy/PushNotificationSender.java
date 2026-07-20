package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import org.springframework.stereotype.Component;

@Component
public class PushNotificationSender implements NotificationSender {

    @Override
    public NotificationChannel getSupportedChannel() {
        return NotificationChannel.PUSH;
    }

    @Override
    public void send(Notification notification) {
        throw new UnsupportedOperationException(
                "Push gönderimi henüz implement edilmedi."
        );
    }
}