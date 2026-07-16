package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.reservation.CreateReservationRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.UpdateStatusRequest;
import com.btk.staj.VIPTransferProject.entity.*;
import com.btk.staj.VIPTransferProject.enums.DiscountType;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationStatusHistoryRepository statusHistoryRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final CampaignRepository campaignRepository;

    private static final GeometryFactory GEO_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional
    public ReservationResponse createReservation(CreateReservationRequest request, Long userId, String phoneNumber) {

        // 1. Araç kontrolü
        Vehicle vehicle = vehicleRepository.findByIdAndActiveTrue(request.getVehicleId())
                .orElseThrow(() -> new RuntimeException("Araç bulunamadı veya aktif değil: " + request.getVehicleId()));

        // 2. Kullanıcı veya misafir tespiti
        User user = null;
        String guestPhone = null;
        if (userId != null) {
            user = userRepository.findByIdAndActiveTrue(userId)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı veya aktif değil: " + userId));
        } else {
            guestPhone = phoneNumber;
        }

        // 3. JTS Point oluştur (lon, lat sırası — JTS standardı)
        Point pickupPoint = GEO_FACTORY.createPoint(new Coordinate(request.getPickupLon(), request.getPickupLat()));
        Point dropoffPoint = GEO_FACTORY.createPoint(new Coordinate(request.getDropoffLon(), request.getDropoffLat()));

        // 4. Fiyat hesabı (basitleştirilmiş — bölge bazlı hesap ilerleyen aşamada eklenecek)
        // TODO: PricingZone kesişimi ve km bazlı mesafe ücreti eklenecek
        BigDecimal openingPrice = vehicle.getOpeningPrice();
        BigDecimal basePrice = openingPrice;
        BigDecimal vehicleAdjusted = basePrice.multiply(vehicle.getBasePriceMultiplier()).setScale(2, RoundingMode.HALF_UP);

        // 5. Kampanya indirimi
        BigDecimal discountAmount = BigDecimal.ZERO;
        Campaign campaign = null;
        if (request.getCampaignCode() != null && !request.getCampaignCode().isBlank()) {
            campaign = campaignRepository.findByCodeAndActiveTrue(request.getCampaignCode())
                    .orElse(null);
            if (campaign != null && vehicleAdjusted.compareTo(campaign.getMinOrderAmount()) >= 0) {
                if (campaign.getDiscountType() == DiscountType.PERCENTAGE) {
                    discountAmount = vehicleAdjusted
                            .multiply(campaign.getDiscountValue())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    if (campaign.getMaxDiscountAmount() != null) {
                        discountAmount = discountAmount.min(campaign.getMaxDiscountAmount());
                    }
                } else {
                    discountAmount = campaign.getDiscountValue();
                }
            }
        }

        BigDecimal calculatedPrice = vehicleAdjusted.subtract(discountAmount).max(BigDecimal.ZERO);

        // 6. Reservation oluştur
        Reservation reservation = Reservation.builder()
                .user(user)
                .guestPhone(guestPhone)
                .pickupAddress(request.getPickupAddress())
                .pickupPoint(pickupPoint)
                .dropoffAddress(request.getDropoffAddress())
                .dropoffPoint(dropoffPoint)
                .scheduledTime(request.getScheduledTime())
                .vehicle(vehicle)
                .passengerCount(request.getPassengerCount())
                .openingPrice(openingPrice)
                .basePrice(basePrice)
                .discountAmount(discountAmount)
                .calculatedPrice(calculatedPrice)
                .campaign(campaign)
                .flightNumber(request.getFlightNumber())
                .notes(request.getNotes())
                .status(ReservationStatus.PENDING)
                .build();

        reservation = reservationRepository.save(reservation);
        log.info("Rezervasyon oluşturuldu. id={}, status=PENDING", reservation.getId());

        // 7. İlk durum geçmişi kaydı
        statusHistoryRepository.save(ReservationStatusHistory.builder()
                .reservation(reservation)
                .status(ReservationStatus.PENDING)
                .changedBy(user)
                .note("Rezervasyon oluşturuldu.")
                .build());

        return toResponse(reservation);
    }

    // Yetki kontrolü @PreAuthorize("hasRole('ADMIN')") ile controller katmanında yapılıyor
    public List<ReservationResponse> getAllReservations() {
        return reservationRepository.findAllByOrderByScheduledTimeDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ReservationResponse> getMyReservations(Long userId) {
        findUserByUserId(userId);
        return reservationRepository.findByUserIdOrderByScheduledTimeDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReservationResponse getReservationById(Long id, Long userId) {
        User requester = findUserByUserId(userId);
        Reservation reservation = reservationRepository.findOneById(id);
        if (reservation == null) {
            throw new RuntimeException("Rezervasyon bulunamadı: " + id);
        }
        validateReservationAccess(reservation, requester);
        return toResponse(reservation);
    }

    public ReservationResponse updateStatus(Long id, UpdateStatusRequest request, Long userId) {
        // TODO: durum geçişini doğrula (PENDING→ASSIGNED→COMPLETED/NO_SHOW, PENDING→CANCELLED)
        //       reservation_status_history'e kayıt ekle
        throw new UnsupportedOperationException("Henüz implement edilmedi");
    }

    @Transactional
    public void cancelReservation(Long id, Long userId) {
        User requester = findUserByUserId(userId);
        Reservation reservation = reservationRepository.findOneById(id);
        if (reservation == null) {
            throw new RuntimeException("Rezervasyon bulunamadı: " + id);
        }
        validateReservationAccess(reservation, requester);
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new RuntimeException(
                    "Sadece PENDING durumundaki rezervasyon iptal edilebilir. Mevcut durum: " + reservation.getStatus());
        }
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelledAt(OffsetDateTime.now());
        reservationRepository.save(reservation);

        statusHistoryRepository.save(ReservationStatusHistory.builder()
                .reservation(reservation)
                .status(ReservationStatus.CANCELLED)
                .changedBy(requester)
                .note("Rezervasyon iptal edildi.")
                .build());

        log.info("Rezervasyon iptal edildi. id={}, userId={}", id, userId);
    }

    public List<ReservationStatusHistory> getStatusHistory(Long reservationId, Long userId) {
        // TODO: sahiplik kontrolü yap
        return statusHistoryRepository.findByReservationIdOrderByChangedAtAsc(reservationId);
    }

    // --- Ortak yardımcı metodlar ---

    private User findUserByUserId(Long userId) {
        return userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı veya aktif değil: " + userId));
    }

    private void validateReservationAccess(Reservation reservation, User requester) {
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;
        boolean isOwner = reservation.getUser() != null && reservation.getUser().getId().equals(requester.getId());
        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Bu rezervasyona erişim yetkiniz yok.");
        }
    }

    private ReservationResponse toResponse(Reservation r) {
        String vehicleName = r.getVehicle() != null
                ? r.getVehicle().getBrand() + " " + r.getVehicle().getModel()
                : null;
        return ReservationResponse.builder()
                .id(r.getId())
                .bookingReference(r.getBookingReference())
                .userId(r.getUser() != null ? r.getUser().getId() : null)
                .guestPhone(r.getGuestPhone())
                .pickupAddress(r.getPickupAddress())
                .dropoffAddress(r.getDropoffAddress())
                .scheduledTime(r.getScheduledTime())
                .vehicleName(vehicleName)
                .passengerCount(r.getPassengerCount())
                .calculatedPrice(r.getCalculatedPrice())
                .currency(r.getCurrency())
                .status(r.getStatus())
                .flightNumber(r.getFlightNumber())
                .notes(r.getNotes())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
