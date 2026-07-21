package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
import com.btk.staj.VIPTransferProject.service.MetaWhatsappClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class WhatsappNotificationSender implements NotificationSender {

    private final MetaWhatsappClient whatsappClient;

    @Override
    public NotificationChannel getSupportedChannel() {
        return NotificationChannel.WHATSAPP;
    }

    @Override
    public void send(Notification notification) {
        validateNotification(notification);

        try {
            String providerMessageId = whatsappClient.sendTextMessage(
                    notification.getUser().getPhoneNumber(),
                    notification.getMessage()
            );

            log.info(
                    "WhatsApp mesaji Meta API'ye iletildi. notificationId={}, providerMessageId={}",
                    notification.getId(),
                    providerMessageId
            );
        } catch (NotificationSendException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            String reason = StringUtils.hasText(exception.getMessage())
                    ? exception.getMessage()
                    : "WhatsApp servisine gonderim sirasinda hata olustu.";

            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.WHATSAPP,
                    reason,
                    exception
            );
        }
    }

    private void validateNotification(Notification notification) {
        if (notification == null) {
            throw new NotificationSendException(
                    null,
                    NotificationChannel.WHATSAPP,
                    "Bildirim bilgisi bulunamadi."
            );
        }

        User user = notification.getUser();

        if (user == null) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.WHATSAPP,
                    "Kullanici bilgisi bulunamadi."
            );
        }

        if (!StringUtils.hasText(user.getPhoneNumber())) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.WHATSAPP,
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
                    NotificationChannel.WHATSAPP,
                    "Kayitli kullanicinin telefon numarasi dogrulanmamis."
            );
        }

        if (!StringUtils.hasText(notification.getMessage())) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.WHATSAPP,
                    "WhatsApp mesaji bos olamaz."
            );
        }
    }
}
