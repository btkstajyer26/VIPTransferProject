package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.entity.Reservation;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import com.btk.staj.VIPTransferProject.event.ReservationNotificationEvent;
import com.btk.staj.VIPTransferProject.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationNotificationService {

    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;
    private final NotificationPreferenceService preferenceService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ReservationNotificationEvent event) {
        Reservation reservation =
                reservationRepository.findOneById(event.reservationId());

        if (reservation == null || reservation.getUser() == null) {
            log.warn(
                    "Rezervasyon bildirimi atlandı. reservationId={}, kullanıcı bulunamadı.",
                    event.reservationId()
            );
            return;
        }

        String templateCode = resolveTemplateCode(event);
        Map<String, String> variables =
                buildVariables(reservation, event);

        for (NotificationChannel channel :
                resolveChannels(reservation.getUser(), templateCode)) {
            send(reservation, templateCode, channel, variables);
        }
    }

    private void send(
            Reservation reservation,
            String templateCode,
            NotificationChannel channel,
            Map<String, String> variables
    ) {
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setUserId(reservation.getUser().getId());
        request.setReservationId(reservation.getId());
        request.setTemplateCode(templateCode);
        request.setChannel(channel);
        request.setLangCode(resolveLanguage(reservation.getUser()));
        request.setVariables(variables);
        request.setSendImmediately(true);

        try {
            notificationService.create(request);
        } catch (RuntimeException exception) {
            log.warn(
                    "Rezervasyon bildirimi gönderilemedi. reservationId={}, channel={}, hata={}",
                    reservation.getId(),
                    channel,
                    exception.getMessage()
            );
        }
    }

    private Set<NotificationChannel> resolveChannels(
            User user,
            String templateCode
    ) {
        Set<NotificationChannel> channels =
                EnumSet.noneOf(NotificationChannel.class);

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            channels.add(NotificationChannel.EMAIL);
        }

        if ("RESERVATION_CREATED".equals(templateCode)
                || "RESERVATION_CANCELLED".equals(templateCode)) {
            channels.add(NotificationChannel.SMS);
        }

        if (!"RESERVATION_COMPLETED".equals(templateCode)
                && preferenceService.isEnabled(
                        user.getId(),
                        NotificationChannel.WHATSAPP
                )) {
            channels.add(NotificationChannel.WHATSAPP);
        }

        if (preferenceService.isEnabled(
                user.getId(),
                NotificationChannel.PUSH
        )) {
            channels.add(NotificationChannel.PUSH);
        }

        return channels;
    }

    private String resolveTemplateCode(ReservationNotificationEvent event) {
        if (event.previousStatus() == null) {
            return "RESERVATION_CREATED";
        }
        if (event.newStatus() == ReservationStatus.CANCELLED) {
            return "RESERVATION_CANCELLED";
        }
        if (event.newStatus() == ReservationStatus.COMPLETED) {
            return "RESERVATION_COMPLETED";
        }
        return "RESERVATION_STATUS_CHANGED";
    }

    private Map<String, String> buildVariables(
            Reservation reservation,
            ReservationNotificationEvent event
    ) {
        Map<String, String> variables = new LinkedHashMap<>();
        variables.put(
                "firstName",
                valueOrDefault(reservation.getUser().getFirstName(), "Misafir")
        );
        variables.put("bookingReference", reservation.getBookingReference());
        variables.put("scheduledTime", String.valueOf(reservation.getScheduledTime()));
        variables.put("pickupAddress", reservation.getPickupAddress());
        variables.put("dropoffAddress", reservation.getDropoffAddress());
        variables.put(
                "vehicleName",
                reservation.getVehicle() == null
                        ? "Belirtilmedi"
                        : (valueOrDefault(reservation.getVehicle().getBrand(), "")
                        + " "
                        + valueOrDefault(reservation.getVehicle().getModel(), "")).trim()
        );
        variables.put(
                "passengerCount",
                String.valueOf(reservation.getPassengerCount())
        );
        variables.put("calculatedPrice", String.valueOf(reservation.getCalculatedPrice()));
        variables.put("currency", valueOrDefault(reservation.getCurrency(), "TRY"));
        variables.put(
                "oldStatus",
                event.previousStatus() == null ? "" : event.previousStatus().name()
        );
        variables.put("newStatus", event.newStatus().name());
        variables.put(
                "cancellationReason",
                valueOrDefault(
                        reservation.getCancellationReason(),
                        "Kullanıcı veya operasyon tarafından iptal edildi."
                )
        );
        return variables;
    }

    private String resolveLanguage(User user) {
        return "en".equalsIgnoreCase(user.getPreferredLang()) ? "en" : "tr";
    }

    private String valueOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }
}
