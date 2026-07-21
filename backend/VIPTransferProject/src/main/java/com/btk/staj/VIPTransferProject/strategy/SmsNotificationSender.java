package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
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

        if (notification == null) {
            throw new NotificationSendException(
                    null,
                    NotificationChannel.SMS,
                    "Bildirim bilgisi bulunamadi."
            );
        }

        User user = notification.getUser();

        if (user == null) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.SMS,
                    "Kullanici bilgisi bulunamadi."
            );
        }

        if (user.getPhoneNumber() == null
                || user.getPhoneNumber().isBlank()) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.SMS,
                    "Kullanicinin telefon numarasi bulunmuyor."
            );
        }

        /*
         * Misafir kullanicida telefon dogrulamasi aranmaz.
         * Kayitli kullanicida telefon numarasi dogrulanmis olmalidir.
         */
        if (!user.isGuest() && !user.isPhoneVerified()) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.SMS,
                    "Kayitli kullanicinin telefon numarasi dogrulanmamis."
            );
        }

        try {
            smsClient.sendSms(
                    user.getPhoneNumber(),
                    notification.getMessage()
            );
        } catch (NotificationSendException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.SMS,
                    "SMS servisine gonderim sirasinda hata olustu.",
                    exception
            );
        }
    }
}