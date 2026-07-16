package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.dto.notification.NotificationResponse;
import com.btk.staj.VIPTransferProject.dto.notification.UpdateNotificationStatusRequest;
import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.entity.NotificationTemplate;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationStatus;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationNotFoundException;
import com.btk.staj.VIPTransferProject.exception.UserNotFoundException;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
import com.btk.staj.VIPTransferProject.mapper.NotificationMapper;
import com.btk.staj.VIPTransferProject.repository.NotificationRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationTemplateService templateService;
    private final NotificationDeliveryService deliveryService;
    private final NotificationMapper notificationMapper;

    @Transactional(noRollbackFor = NotificationSendException.class)
    public NotificationResponse create(CreateNotificationRequest request) {

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() ->
                        new UserNotFoundException(request.getUserId())
                );

        NotificationTemplate template =
                templateService.findTemplate(
                        request.getTemplateCode(),
                        request.getChannel(),
                        request.getLangCode()
                );

        String title = templateService.renderSubject(
                template,
                request.getVariables()
        );

        String message = templateService.renderContent(
                template,
                request.getVariables()
        );

        Notification notification = Notification.builder()
                .user(user)
                .channel(request.getChannel())
                .title(title)
                .message(message)
                .status(NotificationStatus.PENDING)
                .build();

        Notification savedNotification =
                notificationRepository.save(notification);

        if (request.isSendImmediately()) {
            savedNotification =
                    deliveryService.deliver(savedNotification);
        }

        return notificationMapper.toResponse(savedNotification);
    }

    @Transactional(readOnly = true)
    public NotificationResponse getById(Long id) {
        Notification notification = findById(id);
        return notificationMapper.toResponse(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getAll() {
        return notificationRepository.findAll()
                .stream()
                .map(notificationMapper::toResponse)
                .toList();
    }

    @Transactional
    public NotificationResponse updateStatus(
            Long id,
            UpdateNotificationStatusRequest request
    ) {
        Notification notification = findById(id);
        NotificationStatus newStatus = request.getStatus();

        if (notification.getChannel() == NotificationChannel.EMAIL
                && (newStatus == NotificationStatus.DELIVERED
                || newStatus == NotificationStatus.READ)) {
            throw new IllegalArgumentException(
                    "Email bildirimleri DELIVERED veya READ durumuna geçirilemez."
            );
        }

        notification.setStatus(newStatus);

        if (newStatus == NotificationStatus.SENT) {
            notification.setSentAt(OffsetDateTime.now());
            notification.setFailureReason(null);
        }

        if (newStatus == NotificationStatus.DELIVERED) {
            notification.setDeliveredAt(OffsetDateTime.now());
        }

        if (newStatus == NotificationStatus.READ) {
            notification.setReadAt(OffsetDateTime.now());
        }

        if (newStatus == NotificationStatus.FAILED) {
            notification.setSentAt(null);
        }

        Notification updatedNotification =
                notificationRepository.save(notification);

        return notificationMapper.toResponse(updatedNotification);
    }

    @Transactional(noRollbackFor = NotificationSendException.class)
    public NotificationResponse send(Long id) {

        Notification notification = findById(id);

        if (notification.getStatus() == NotificationStatus.SENT
                || notification.getStatus() == NotificationStatus.DELIVERED
                || notification.getStatus() == NotificationStatus.READ) {
            throw new IllegalStateException(
                    "Bu bildirim daha önce gönderilmiş."
            );
        }

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