package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.dto.notification.NotificationResponse;
import com.btk.staj.VIPTransferProject.dto.notification.UpdateNotificationStatusRequest;
import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.exception.NotificationNotFoundException;
import com.btk.staj.VIPTransferProject.mapper.NotificationMapper;
import com.btk.staj.VIPTransferProject.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateService templateService;
    private final NotificationDeliveryService deliveryService;
    private final NotificationMapper notificationMapper;

    @Transactional
    public NotificationResponse create(
            CreateNotificationRequest request
    ) {
        throw new UnsupportedOperationException(
                "Bildirim oluşturma henüz implement edilmedi."
        );
    }

    @Transactional(readOnly = true)
    public NotificationResponse getById(Long id) {
        Notification notification = findById(id);
        return notificationMapper.toResponse(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getAll() {
        throw new UnsupportedOperationException(
                "Bildirim listeleme henüz implement edilmedi."
        );
    }

    @Transactional
    public NotificationResponse updateStatus(
            Long id,
            UpdateNotificationStatusRequest request
    ) {
        throw new UnsupportedOperationException(
                "Durum güncelleme henüz implement edilmedi."
        );
    }

    @Transactional
    public NotificationResponse send(Long id) {
        Notification notification = findById(id);
        Notification deliveredNotification =
                deliveryService.deliver(notification);

        return notificationMapper.toResponse(deliveredNotification);
    }

    private Notification findById(Long id) {
        return notificationRepository.findById(id)
                .orElseThrow(() ->
                        new NotificationNotFoundException(id)
                );
    }
}