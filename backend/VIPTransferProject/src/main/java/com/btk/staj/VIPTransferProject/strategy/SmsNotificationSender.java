package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.service.IletiMerkeziSmsClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SmsNotificationSender implements NotificationSender {

    private final IletiMerkeziSmsClient smsClient;

    @Override
    public NotificationChannel getSupportedChannel() {
        return NotificationChannel.SMS;
    }

    @Override
    public void send(Notification notification) {

        smsClient.sendSms(
                notification.getUser().getPhoneNumber(),
                notification.getMessage()
        );
    }
}