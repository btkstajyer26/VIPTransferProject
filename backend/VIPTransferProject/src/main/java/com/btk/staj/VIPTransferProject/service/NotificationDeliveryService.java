package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.factory.NotificationSenderFactory;
import com.btk.staj.VIPTransferProject.repository.NotificationRepository;
import com.btk.staj.VIPTransferProject.strategy.NotificationSender;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationDeliveryService {

    private final NotificationSenderFactory senderFactory;
    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification deliver(Notification notification) {
        NotificationSender sender =
                senderFactory.getSender(notification.getChannel());

        sender.send(notification);

        throw new UnsupportedOperationException(
                "Gönderim sonrası durum yönetimi henüz implement edilmedi."
        );
    }
}