package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.enums.NotificationStatus;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
import com.btk.staj.VIPTransferProject.factory.NotificationSenderFactory;
import com.btk.staj.VIPTransferProject.repository.NotificationRepository;
import com.btk.staj.VIPTransferProject.strategy.NotificationSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDeliveryService {

    private static final int MAX_FAILURE_REASON_LENGTH = 255;

    private final NotificationSenderFactory senderFactory;
    private final NotificationRepository notificationRepository;

    @Transactional(noRollbackFor = NotificationSendException.class)
    public Notification deliver(Notification notification) {

        try {
            NotificationSender sender =
                    senderFactory.getSender(notification.getChannel());

            sender.send(notification);

            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(OffsetDateTime.now());
            notification.setFailureReason(null);

            Notification sentNotification =
                    notificationRepository.save(notification);

            log.info(
                    "Notification başarıyla gönderildi. id={}, channel={}",
                    notification.getId(),
                    notification.getChannel()
            );

            return sentNotification;

        } catch (NotificationSendException exception) {

            markAsFailed(notification, exception.getMessage());

            log.error(
                    "Notification gönderilemedi. id={}, channel={}",
                    notification.getId(),
                    notification.getChannel(),
                    exception
            );

            throw exception;

        } catch (RuntimeException exception) {

            String reason = exception.getMessage() == null
                    ? "Beklenmeyen bir gönderim hatası oluştu."
                    : exception.getMessage();

            markAsFailed(notification, reason);

            log.error(
                    "Notification gönderimi sırasında beklenmeyen hata oluştu. id={}, channel={}",
                    notification.getId(),
                    notification.getChannel(),
                    exception
            );

            throw new NotificationSendException(
                    notification.getId(),
                    notification.getChannel(),
                    reason,
                    exception
            );
        }
    }

    private void markAsFailed(
            Notification notification,
            String failureReason
    ) {
        notification.setStatus(NotificationStatus.FAILED);
        notification.setSentAt(null);
        notification.setFailureReason(
                shortenFailureReason(failureReason)
        );

        notificationRepository.save(notification);
    }

    private String shortenFailureReason(String message) {

        if (message == null || message.isBlank()) {
            return "Bilinmeyen gönderim hatası.";
        }

        if (message.length() <= MAX_FAILURE_REASON_LENGTH) {
            return message;
        }

        return message.substring(0, MAX_FAILURE_REASON_LENGTH);
    }
}