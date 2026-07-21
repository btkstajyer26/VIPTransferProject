package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
import lombok.RequiredArgsConstructor;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component

@ConditionalOnProperty(name = "spring.mail.host") 

@RequiredArgsConstructor
public class EmailNotificationSender implements NotificationSender {

    private final JavaMailSender mailSender;

    @Override
    public NotificationChannel getSupportedChannel() {
        return NotificationChannel.EMAIL;
    }

    @Override
    public void send(Notification notification) {

        validateNotification(notification);

        String recipientEmail = notification.getUser().getEmail();

        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setTo(recipientEmail);
        mailMessage.setSubject(notification.getTitle());
        mailMessage.setText(notification.getMessage());

        try {
            mailSender.send(mailMessage);
        } catch (MailException exception) {
            throw new NotificationSendException(
                    notification.getId(),
                    notification.getChannel(),
                    exception.getMessage(),
                    exception
            );
        }
    }

    private void validateNotification(Notification notification) {

        if (notification == null) {
            throw new IllegalArgumentException(
                    "Gonderilecek notification null olamaz."
            );
        }

        if (notification.getUser() == null) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.EMAIL,
                    "Bildirime bagli kullanici bulunamadi."
            );
        }

        if (!StringUtils.hasText(notification.getUser().getEmail())) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.EMAIL,
                    "Kullanicinin email adresi bulunamadi."
            );
        }

        /*
         * Misafir kullanicida email dogrulamasi aranmaz.
         * Kayitli kullanicida email adresi dogrulanmis olmalidir.
         */
        if (!notification.getUser().isGuest()
                && !notification.getUser().isEmailVerified()) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.EMAIL,
                    "Kayitli kullanicinin email adresi dogrulanmamis."
            );
        }

        if (!StringUtils.hasText(notification.getTitle())) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.EMAIL,
                    "Email basligi bos olamaz."
            );
        }

        if (!StringUtils.hasText(notification.getMessage())) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.EMAIL,
                    "Email icerigi bos olamaz."
            );
        }
    }
}