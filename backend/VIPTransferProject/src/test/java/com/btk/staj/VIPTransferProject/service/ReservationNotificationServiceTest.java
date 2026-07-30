package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.entity.Reservation;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.Vehicle;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import com.btk.staj.VIPTransferProject.event.ReservationNotificationEvent;
import com.btk.staj.VIPTransferProject.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReservationNotificationServiceTest {

    private ReservationRepository reservationRepository;
    private NotificationService notificationService;
    private NotificationPreferenceService preferenceService;
    private ReservationNotificationService service;

    @BeforeEach
    void setUp() {
        reservationRepository = mock(ReservationRepository.class);
        notificationService = mock(NotificationService.class);
        preferenceService = mock(NotificationPreferenceService.class);
        service = new ReservationNotificationService(
                reservationRepository,
                notificationService,
                preferenceService
        );
    }

    @Test
    void handle_createdReservation_sendsSmsAndLinksReservation() {
        when(reservationRepository.findOneById(21L))
                .thenReturn(reservation(null));

        service.handle(new ReservationNotificationEvent(
                21L,
                null,
                ReservationStatus.PENDING
        ));

        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService).create(captor.capture());

        CreateNotificationRequest request = captor.getValue();
        assertThat(request.getTemplateCode()).isEqualTo("RESERVATION_CREATED");
        assertThat(request.getChannel()).isEqualTo(NotificationChannel.SMS);
        assertThat(request.getReservationId()).isEqualTo(21L);
        assertThat(request.getUserId()).isEqualTo(7L);
        assertThat(request.getVariables())
                .containsEntry("bookingReference", "VIP-123")
                .containsEntry("vehicleName", "Mercedes Vito")
                .containsEntry("passengerCount", "3");
    }

    @Test
    void handle_completedReservation_usesOnlySupportedEnabledChannels() {
        Reservation reservation = reservation("user@example.com");
        when(reservationRepository.findOneById(21L)).thenReturn(reservation);
        when(preferenceService.isEnabled(7L, NotificationChannel.PUSH))
                .thenReturn(true);

        service.handle(new ReservationNotificationEvent(
                21L,
                ReservationStatus.ASSIGNED,
                ReservationStatus.COMPLETED
        ));

        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService, times(2)).create(captor.capture());

        List<CreateNotificationRequest> requests = captor.getAllValues();
        assertThat(requests)
                .extracting(CreateNotificationRequest::getTemplateCode)
                .containsOnly("RESERVATION_COMPLETED");
        assertThat(requests)
                .extracting(CreateNotificationRequest::getChannel)
                .containsExactlyInAnyOrder(
                        NotificationChannel.EMAIL,
                        NotificationChannel.PUSH
                );
    }

    @Test
    void handle_channelFailure_continuesWithRemainingChannels() {
        Reservation reservation = reservation("user@example.com");
        when(reservationRepository.findOneById(21L)).thenReturn(reservation);
        doThrow(new IllegalStateException("mail unavailable"))
                .doReturn(null)
                .when(notificationService)
                .create(any(CreateNotificationRequest.class));

        service.handle(new ReservationNotificationEvent(
                21L,
                null,
                ReservationStatus.PENDING
        ));

        verify(notificationService, times(2))
                .create(any(CreateNotificationRequest.class));
    }

    private Reservation reservation(String email) {
        User user = User.builder()
                .id(7L)
                .firstName("Ada")
                .email(email)
                .preferredLang("tr")
                .build();

        return Reservation.builder()
                .id(21L)
                .user(user)
                .vehicle(Vehicle.builder()
                        .brand("Mercedes")
                        .model("Vito")
                        .build())
                .passengerCount((short) 3)
                .bookingReference("VIP-123")
                .scheduledTime(OffsetDateTime.parse("2026-08-01T10:00:00+03:00"))
                .pickupAddress("Havalimanı")
                .dropoffAddress("Otel")
                .calculatedPrice(new BigDecimal("1250.00"))
                .currency("TRY")
                .status(ReservationStatus.PENDING)
                .build();
    }
}
