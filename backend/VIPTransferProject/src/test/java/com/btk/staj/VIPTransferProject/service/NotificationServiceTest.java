package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.dto.notification.NotificationResponse;
import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.entity.NotificationTemplate;
import com.btk.staj.VIPTransferProject.entity.Reservation;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.enums.NotificationStatus;
import com.btk.staj.VIPTransferProject.mapper.NotificationMapper;
import com.btk.staj.VIPTransferProject.repository.NotificationRepository;
import com.btk.staj.VIPTransferProject.repository.ReservationRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import com.btk.staj.VIPTransferProject.exception.NotificationNotFoundException;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private UserRepository userRepository;
    private ReservationRepository reservationRepository;
    private NotificationTemplateService templateService;
    private NotificationDeliveryService deliveryService;
    private NotificationMapper mapper;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(UserRepository.class);
        reservationRepository = mock(ReservationRepository.class);
        templateService = mock(NotificationTemplateService.class);
        deliveryService = mock(NotificationDeliveryService.class);
        mapper = new NotificationMapper();
        service = new NotificationService(
                notificationRepository,
                userRepository,
                reservationRepository,
                templateService,
                deliveryService,
                mapper
        );
    }

    @Test
    void create_sendImmediatelyFalse_savesPendingWithoutCallingProvider() {
        CreateNotificationRequest request = request(false);
        User user = User.builder().id(7L).build();
        NotificationTemplate template = mock(NotificationTemplate.class);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(templateService.findTemplate("WELCOME", NotificationChannel.SMS, "tr"))
                .thenReturn(template);
        when(templateService.renderSubject(template, request.getVariables()))
                .thenReturn("Baslik");
        when(templateService.renderContent(template, request.getVariables()))
                .thenReturn("Mesaj");
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> {
                    Notification notification = invocation.getArgument(0);
                    notification.setId(12L);
                    return notification;
                });

        NotificationResponse response = service.create(request);

        assertThat(response.getStatus()).isEqualTo(NotificationStatus.PENDING);
        verify(deliveryService, never()).deliver(any());
    }

    @Test
    void create_sendImmediatelyTrue_delegatesToDeliveryService() {
        CreateNotificationRequest request = request(true);
        User user = User.builder().id(7L).build();
        NotificationTemplate template = mock(NotificationTemplate.class);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(templateService.findTemplate("WELCOME", NotificationChannel.SMS, "tr"))
                .thenReturn(template);
        when(templateService.renderSubject(template, request.getVariables()))
                .thenReturn("Baslik");
        when(templateService.renderContent(template, request.getVariables()))
                .thenReturn("Mesaj");
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> {
                    Notification notification = invocation.getArgument(0);
                    notification.setId(12L);
                    return notification;
                });
        when(deliveryService.deliver(any(Notification.class)))
                .thenAnswer(invocation -> {
                    Notification notification = invocation.getArgument(0);
                    notification.setStatus(NotificationStatus.SENT);
                    return notification;
                });

        NotificationResponse response = service.create(request);

        assertThat(response.getStatus()).isEqualTo(NotificationStatus.SENT);
        verify(deliveryService).deliver(any(Notification.class));
    }

    @Test
    void getAllForUser_queriesOnlyAuthenticatedUsersNotifications() {
        User user = User.builder().id(7L).build();
        Notification notification = Notification.builder()
                .id(12L)
                .user(user)
                .channel(NotificationChannel.SMS)
                .title("Baslik")
                .message("Mesaj")
                .status(NotificationStatus.SENT)
                .build();
        when(notificationRepository.findAllByUserIdOrderByCreatedAtDesc(7L))
                .thenReturn(List.of(notification));

        List<NotificationResponse> responses = service.getAllForUser(7L);

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().getId()).isEqualTo(12L);
        verify(notificationRepository)
                .findAllByUserIdOrderByCreatedAtDesc(7L);
        verify(notificationRepository, never()).findAll();
    }

    @Test
    void getByIdForUser_doesNotReturnAnotherUsersNotification() {
        when(notificationRepository.findByIdAndUserId(12L, 7L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getByIdForUser(12L, 7L))
                .isInstanceOf(NotificationNotFoundException.class);

        verify(notificationRepository).findByIdAndUserId(12L, 7L);
        verify(notificationRepository, never()).findById(12L);
    }

    @Test
    void create_withReservationId_linksNotificationToOwnedReservation() {
        CreateNotificationRequest request = request(false);
        request.setReservationId(21L);
        User user = User.builder().id(7L).build();
        Reservation reservation = Reservation.builder()
                .id(21L)
                .user(user)
                .build();
        NotificationTemplate template = mock(NotificationTemplate.class);

        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(reservationRepository.findById(21L))
                .thenReturn(Optional.of(reservation));
        when(templateService.findTemplate(
                "WELCOME",
                NotificationChannel.SMS,
                "tr"
        )).thenReturn(template);
        when(templateService.renderSubject(template, request.getVariables()))
                .thenReturn("Baslik");
        when(templateService.renderContent(template, request.getVariables()))
                .thenReturn("Mesaj");
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        NotificationResponse response = service.create(request);

        assertThat(response.getReservationId()).isEqualTo(21L);
    }

    private CreateNotificationRequest request(boolean sendImmediately) {
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setUserId(7L);
        request.setTemplateCode("WELCOME");
        request.setChannel(NotificationChannel.SMS);
        request.setLangCode("tr");
        request.setSendImmediately(sendImmediately);
        return request;
    }
}
