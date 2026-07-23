package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.entity.UserFirebaseInstallation;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
import com.btk.staj.VIPTransferProject.repository.UserFirebaseInstallationRepository;
import com.btk.staj.VIPTransferProject.service.FirebasePushClient;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PushNotificationSender implements NotificationSender {

    private final FirebasePushClient firebasePushClient;
    private final UserFirebaseInstallationRepository installationRepository;

    @Override
    public NotificationChannel getSupportedChannel() {
        return NotificationChannel.PUSH;
    }

    @Override
    public void send(Notification notification) {
        validateNotification(notification);

        List<UserFirebaseInstallation> activeInstallations = installationRepository
                .findAllByUserIdAndActiveTrue(notification.getUser().getId());

        if (activeInstallations.isEmpty()) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.PUSH,
                    "Kullanicinin aktif Firebase installation kaydi bulunmuyor."
            );
        }

        int successCount = 0;
        String lastFailureReason = null;

        for (UserFirebaseInstallation installation : activeInstallations) {
            try {
                String firebaseMessageId = firebasePushClient.send(
                        installation.getFid(),
                        notification
                );
                successCount++;

                log.info(
                        "Push bildirimi Firebase'e iletildi. notificationId={}, installationId={}, firebaseMessageId={}",
                        notification.getId(),
                        installation.getId(),
                        firebaseMessageId
                );
            } catch (FirebaseMessagingException exception) {
                lastFailureReason = getFailureReason(exception);

                if (isInvalidInstallation(exception)) {
                    installation.setActive(false);
                    installationRepository.save(installation);
                }

                log.warn(
                        "Push bildirimi cihaza gonderilemedi. notificationId={}, installationId={}, reason={}",
                        notification.getId(),
                        installation.getId(),
                        lastFailureReason
                );
            }
        }

        if (successCount == 0) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.PUSH,
                    lastFailureReason == null
                            ? "Firebase push bildirimini kabul etmedi."
                            : lastFailureReason
            );
        }
    }

    private void validateNotification(Notification notification) {
        if (notification == null) {
            throw new NotificationSendException(
                    null,
                    NotificationChannel.PUSH,
                    "Bildirim bilgisi bulunamadi."
            );
        }

        if (notification.getUser() == null
                || notification.getUser().getId() == null) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.PUSH,
                    "Bildirime bagli kullanici bulunamadi."
            );
        }

        if (!StringUtils.hasText(notification.getTitle())) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.PUSH,
                    "Push bildirim basligi bos olamaz."
            );
        }

        if (!StringUtils.hasText(notification.getMessage())) {
            throw new NotificationSendException(
                    notification.getId(),
                    NotificationChannel.PUSH,
                    "Push bildirim mesaji bos olamaz."
            );
        }
    }

    private boolean isInvalidInstallation(FirebaseMessagingException exception) {
        return exception.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                || exception.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT;
    }

    private String getFailureReason(FirebaseMessagingException exception) {
        if (exception.getMessagingErrorCode() != null) {
            return "Firebase hata kodu: " + exception.getMessagingErrorCode();
        }

        return StringUtils.hasText(exception.getMessage())
                ? exception.getMessage()
                : "Firebase push gonderimi sirasinda bilinmeyen hata olustu.";
    }
}
