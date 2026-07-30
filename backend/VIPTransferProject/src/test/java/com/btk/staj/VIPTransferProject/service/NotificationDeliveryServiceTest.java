package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.enums.NotificationStatus;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
import com.btk.staj.VIPTransferProject.factory.NotificationSenderFactory;
import com.btk.staj.VIPTransferProject.repository.NotificationRepository;
import com.btk.staj.VIPTransferProject.strategy.NotificationSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationDeliveryServiceTest {

    private NotificationSenderFactory senderFactory;
    private NotificationRepository repository;
    private NotificationPreferenceService preferenceService;
    private NotificationDeliveryService service;

    @BeforeEach
    void setUp() {
        senderFactory = mock(NotificationSenderFactory.class);
        repository = mock(NotificationRepository.class);
        preferenceService = mock(NotificationPreferenceService.class);
        service = new NotificationDeliveryService(
                senderFactory,
                repository,
                preferenceService
        );
    }

    @Test
    void deliver_success_marksNotificationAsSent() {
        Notification notification = notification();
        NotificationSender sender = mock(NotificationSender.class);
        when(preferenceService.isEnabled(7L, NotificationChannel.SMS))
                .thenReturn(true);
        when(senderFactory.getSender(NotificationChannel.SMS))
                .thenReturn(sender);
        when(repository.save(notification)).thenReturn(notification);

        Notification result = service.deliver(notification);

        assertThat(result.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(result.getSentAt()).isNotNull();
        assertThat(result.getFailureReason()).isNull();
        verify(sender).send(notification);
    }

    @Test
    void deliver_providerFailure_persistsOnlyControlledReason() {
        Notification notification = notification();
        NotificationSender sender = mock(NotificationSender.class);
        when(preferenceService.isEnabled(7L, NotificationChannel.SMS))
                .thenReturn(true);
        when(senderFactory.getSender(NotificationChannel.SMS))
                .thenReturn(sender);
        doThrow(new NotificationSendException(
                12L,
                NotificationChannel.SMS,
                "SMS servisine gonderim sirasinda hata olustu."
        )).when(sender).send(notification);

        assertThatThrownBy(() -> service.deliver(notification))
                .isInstanceOf(NotificationSendException.class);

        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.FAILED);
        assertThat(notification.getFailureReason())
                .isEqualTo("SMS servisine gonderim sirasinda hata olustu.")
                .doesNotContain("Notification ID");
        verify(repository).save(notification);
    }

    @Test
    void deliver_unexpectedFailure_doesNotPersistRawExceptionMessage() {
        Notification notification = notification();
        NotificationSender sender = mock(NotificationSender.class);
        when(preferenceService.isEnabled(7L, NotificationChannel.SMS))
                .thenReturn(true);
        when(senderFactory.getSender(NotificationChannel.SMS))
                .thenReturn(sender);
        doThrow(new IllegalStateException("secret-provider-detail"))
                .when(sender).send(notification);

        assertThatThrownBy(() -> service.deliver(notification))
                .isInstanceOf(NotificationSendException.class);

        assertThat(notification.getFailureReason())
                .doesNotContain("secret-provider-detail");
    }

    private Notification notification() {
        User user = User.builder().id(7L).build();
        return Notification.builder()
                .id(12L)
                .user(user)
                .channel(NotificationChannel.SMS)
                .title("Baslik")
                .message("Mesaj")
                .status(NotificationStatus.PENDING)
                .build();
    }
}
