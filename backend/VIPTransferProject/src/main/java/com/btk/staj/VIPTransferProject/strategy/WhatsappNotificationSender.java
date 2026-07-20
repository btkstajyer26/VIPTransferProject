package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import org.springframework.stereotype.Component;

@Component
public class WhatsappNotificationSender implements NotificationSender {

    @Override
    public NotificationChannel getSupportedChannel() {
        return NotificationChannel.WHATSAPP;
    }

    @Override
    public void send(Notification notification) {
        throw new UnsupportedOperationException(
                "WhatsApp gönderimi henüz implement edilmedi."
        );
    }
}