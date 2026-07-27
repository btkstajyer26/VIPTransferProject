package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.loyalty.AccruePointsRequests;
import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.dto.pricing.PriceBreakdownResponseDto;
import com.btk.staj.VIPTransferProject.dto.reservation.CreateReservationRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.GuestReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.PricePreviewRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.PricePreviewResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationStatusHistoryResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.UpdateStatusRequest;
import com.btk.staj.VIPTransferProject.dto.routing.RouteInfoDto;
import com.btk.staj.VIPTransferProject.entity.*;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.exception.BusinessRuleException;
import com.btk.staj.VIPTransferProject.exception.ForbiddenOperationException;
import com.btk.staj.VIPTransferProject.exception.InvalidPricingRuleException;
import com.btk.staj.VIPTransferProject.exception.InvalidRequestException;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.repository.*;
import com.btk.staj.VIPTransferProject.repository.pricing.PricingZoneRepository;
import com.btk.staj.VIPTransferProject.util.BookingReferenceGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationStatusHistoryRepository statusHistoryRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final CampaignRepository campaignRepository;
    private final PricingZoneRepository pricingZoneRepository;
    private final PricingCalculationService pricingCalculationService;
    private final GoogleMapsService googleMapsService;
    private final BookingReferenceGenerator bookingReferenceGenerator;
    private final UserService userService;
    private final LoyaltyService loyaltyService;
    private final NotificationService notificationService;

    private static final GeometryFactory GEO_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional
    public ReservationResponse createReservation(CreateReservationRequest request, Long userId, String phoneNumber) {

        // 1. Araç kontrolü
        Vehicle vehicle = vehicleRepository.findByIdAndActiveTrue(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Araç bulunamadı veya aktif değil: " + request.getVehicleId()));

        // 2. Kullanıcı veya misafir tespiti
        User user;
        if (userId != null) {
            user = userRepository.findByIdAndActiveTrue(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı veya aktif değil: " + userId));
        } else {
            user = userService.findOrCreateGuestUser(phoneNumber, request.getGuestName());
        }

        // 3. Google Maps: rota polyline + mesafe (backend hesaplar)
        RouteInfoDto route = googleMapsService.getRoute(
                request.getPickupLat(), request.getPickupLon(),
                request.getDropoffLat(), request.getDropoffLon());

        // 4. JTS Point oluştur (lon, lat sırası — JTS standardı)
        Point pickupPoint  = GEO_FACTORY.createPoint(new Coordinate(request.getPickupLon(),  request.getPickupLat()));
        Point dropoffPoint = GEO_FACTORY.createPoint(new Coordinate(request.getDropoffLon(), request.getDropoffLat()));

        // 5. Pickup zone zorunlu — hizmet dışı noktadan rezervasyon kabul edilmez
        PricingZone pickupZone = pricingZoneRepository
                .findZoneContainingPoint(request.getPickupLon(), request.getPickupLat())
                .orElseThrow(() -> new BusinessRuleException(
                        "Başlangıç noktası hizmet bölgesi dışında. Bu konumdan rezervasyon oluşturulamaz."));

        // Dropoff zone isteğe bağlı — rota birden fazla zone geçebilir, hesap intersection ile yapılır
        PricingZone dropoffZone = pricingZoneRepository
                .findZoneContainingPoint(request.getDropoffLon(), request.getDropoffLat())
                .orElse(null);

        // 6. Kampanya lookup (validasyon calculatePrice içinde yapılır)
        Campaign campaign = null;
        if (request.getCampaignCode() != null && !request.getCampaignCode().isBlank()) {
            campaign = campaignRepository.findByCodeAndActiveTrue(request.getCampaignCode())
                    .orElseThrow(() -> new BusinessRuleException(
                            "Geçersiz veya süresi dolmuş kampanya kodu: " + request.getCampaignCode()));
        }

        // 7. Fiyat hesabı için geçici Reservation nesnesi — kaydedilmez
        Reservation forPricing = Reservation.builder()
                .user(user)
                .vehicle(vehicle)
                .pickupPoint(pickupPoint)
                .dropoffPoint(dropoffPoint)
                .pickupZone(pickupZone)
                .scheduledTime(request.getScheduledTime())
                .routePolyline(route.getEncodedPolyline())
                .campaign(campaign)
                .build();

        PriceBreakdownResponseDto breakdown;
        try {
            breakdown = pricingCalculationService.calculatePrice(forPricing);
        } catch (InvalidPricingRuleException e) {
            throw new BusinessRuleException(e.getMessage());
        }

        // 8. Gerçek Reservation oluştur ve kaydet
        Reservation reservation = Reservation.builder()
                .bookingReference(bookingReferenceGenerator.generate())
                .user(user)
                .pickupAddress(request.getPickupAddress())
                .pickupPoint(pickupPoint)
                .dropoffAddress(request.getDropoffAddress())
                .dropoffPoint(dropoffPoint)
                .pickupZone(pickupZone)
                .dropoffZone(dropoffZone)
                .scheduledTime(request.getScheduledTime())
                .vehicle(vehicle)
                .passengerCount(request.getPassengerCount())
                .routePolyline(route.getEncodedPolyline())
                .distanceKm(route.getDistanceKm())
                .openingPrice(vehicle.getOpeningPrice())
                .basePrice(breakdown.getBasePrice())
                .surgeMultiplier(breakdown.getSurgeMultiplier())
                .loyaltyDiscount(breakdown.getLoyaltyDiscount())
                .discountAmount(breakdown.getCampaignDiscount())
                .calculatedPrice(breakdown.getFinalPrice())
                .campaign(campaign)
                .flightNumber(request.getFlightNumber())
                .notes(request.getNotes())
                .status(ReservationStatus.PENDING)
                .build();

        // TODO(pricing-team): Rezervasyon kaydedildikten sonra campaigns.used_count +1 artırılmalı.
        // Şu an used_count hiç güncellenmiyor; max_uses limiti hiçbir zaman dolmuyor.
        // Öneri: CampaignRepository.incrementUsedCount(campaignId) — @Modifying @Query ile.

        try {
            reservation = reservationRepository.save(reservation);
        } catch (DataIntegrityViolationException e) {
            log.warn("bookingReference çarpışması, yeniden deneniyor. ref={}", reservation.getBookingReference());
            reservation.setBookingReference(bookingReferenceGenerator.generate());
            reservation = reservationRepository.save(reservation);
        }

        log.info("Rezervasyon oluşturuldu. id={}, bookingRef={}, zone={}, finalPrice={}",
                reservation.getId(), reservation.getBookingReference(),
                pickupZone.getName(), breakdown.getFinalPrice());

        // 9. İlk durum geçmişi kaydı
        statusHistoryRepository.save(ReservationStatusHistory.builder()
                .reservation(reservation)
                .status(ReservationStatus.PENDING)
                .changedBy(user)
                .note("Rezervasyon oluşturuldu.")
                .build());

        return toResponse(reservation);
    }

    @Transactional(readOnly = true)
    public PricePreviewResponse previewPrice(PricePreviewRequest request, Long userId) {

        RouteInfoDto route = googleMapsService.getRoute(
                request.getPickupLat(), request.getPickupLon(),
                request.getDropoffLat(), request.getDropoffLon());

        Vehicle vehicle = vehicleRepository.findByIdAndActiveTrue(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Araç bulunamadı: " + request.getVehicleId()));

        User user = userId != null
                ? userRepository.findByIdAndActiveTrue(userId).orElse(null)
                : null;

        Point pickupPoint  = GEO_FACTORY.createPoint(new Coordinate(request.getPickupLon(),  request.getPickupLat()));
        Point dropoffPoint = GEO_FACTORY.createPoint(new Coordinate(request.getDropoffLon(), request.getDropoffLat()));

        PricingZone pickupZone = pricingZoneRepository
                .findZoneContainingPoint(request.getPickupLon(), request.getPickupLat())
                .orElseThrow(() -> new BusinessRuleException("Başlangıç noktası hizmet bölgesi dışında."));

        Campaign campaign = null;
        if (request.getCampaignCode() != null && !request.getCampaignCode().isBlank()) {
            campaign = campaignRepository.findByCodeAndActiveTrue(request.getCampaignCode())
                    .orElseThrow(() -> new BusinessRuleException(
                            "Geçersiz veya süresi dolmuş kampanya kodu: " + request.getCampaignCode()));
        }

        Reservation forPricing = Reservation.builder()
                .user(user)
                .vehicle(vehicle)
                .pickupPoint(pickupPoint)
                .dropoffPoint(dropoffPoint)
                .pickupZone(pickupZone)
                .scheduledTime(request.getScheduledTime())
                .routePolyline(route.getEncodedPolyline())
                .campaign(campaign)
                .build();

        try {
            PriceBreakdownResponseDto b = pricingCalculationService.calculatePrice(forPricing);
            return PricePreviewResponse.builder()
                    .distanceKm(route.getDistanceKm())
                    .distanceFee(b.getDistanceFee())
                    .flagFee(b.getFlagFee())
                    .basePrice(b.getBasePrice())
                    .vehicleAdjustedPrice(b.getVehicleAdjustedPrice())
                    .surgeMultiplier(b.getSurgeMultiplier())
                    .priceAfterSurge(b.getPriceAfterSurge())
                    .campaignDiscount(b.getCampaignDiscount())
                    .loyaltyDiscount(b.getLoyaltyDiscount())
                    .finalPrice(b.getFinalPrice())
                    .currency(b.getCurrency())
                    .build();
        } catch (InvalidPricingRuleException e) {
            throw new BusinessRuleException(e.getMessage());
        }
    }

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
            throw new ResourceNotFoundException("Rezervasyon bulunamadı: " + id);
        }
        validateReservationAccess(reservation, requester);
        return toResponse(reservation);
    }

    @Transactional
    public ReservationResponse updateStatus(Long id, UpdateStatusRequest request, Long userId) {
        User requester = findUserByUserId(userId);
        if (requester.getRole() != UserRole.ADMIN) {
            throw new ForbiddenOperationException("Durum güncelleme yetkisi yok. Yalnızca ADMIN.");
        }
        Reservation reservation = reservationRepository.findOneById(id);
        if (reservation == null) {
            throw new ResourceNotFoundException("Rezervasyon bulunamadı: " + id);
        }
        ReservationStatus current = reservation.getStatus();
        ReservationStatus target = request.getStatus();
        validateStatusTransition(current, target);

        reservation.setStatus(target);
        if (target == ReservationStatus.COMPLETED) {
            reservation.setCompletedAt(OffsetDateTime.now());
        } else if (target == ReservationStatus.CANCELLED) {
            reservation.setCancelledAt(OffsetDateTime.now());
        }
        reservationRepository.save(reservation);

        if (target == ReservationStatus.COMPLETED
                && reservation.getUser() != null
                && !reservation.getUser().isGuest()) {
            try {
                AccruePointsRequests accrueReq = new AccruePointsRequests();
                accrueReq.setUserId(reservation.getUser().getId());
                accrueReq.setFareAmount(reservation.getCalculatedPrice());
                loyaltyService.AccruePoints(accrueReq);
            } catch (Exception e) {
                log.warn("Loyalty puan eklenemedi. reservationId={}, hata={}", id, e.getMessage());
            }
        }

        statusHistoryRepository.save(ReservationStatusHistory.builder()
                .reservation(reservation)
                .status(target)
                .changedBy(requester)
                .note(request.getNote())
                .build());

        log.info("Rezervasyon durumu güncellendi. id={}, {} -> {}", id, current, target);

        sendStatusChangeNotifications(reservation, current, target, request.getNote());

        return toResponse(reservation);
    }

    private void sendStatusChangeNotifications(
            Reservation reservation,
            ReservationStatus oldStatus,
            ReservationStatus newStatus,
            String note) {

        User user = reservation.getUser();
        if (user == null || user.isGuest()) {
            return;
        }

        String langCode = user.getPreferredLang() != null ? user.getPreferredLang() : "tr";
        String templateCode = resolveTemplateCode(newStatus);
        List<NotificationChannel> channels = resolveNotificationChannels(newStatus);
        Map<String, String> variables = buildNotificationVariables(reservation, oldStatus, newStatus, note);

        for (NotificationChannel channel : channels) {
            try {
                CreateNotificationRequest req = new CreateNotificationRequest();
                req.setUserId(user.getId());
                req.setReservationId(reservation.getId());
                req.setTemplateCode(templateCode);
                req.setChannel(channel);
                req.setLangCode(langCode);
                req.setVariables(variables);
                req.setSendImmediately(true);
                notificationService.create(req);
            } catch (Exception e) {
                log.warn("Bildirim gönderilemedi. channel={}, reservationId={}, hata={}",
                        channel, reservation.getId(), e.getMessage());
            }
        }
    }

    private String resolveTemplateCode(ReservationStatus status) {
        return switch (status) {
            case CANCELLED -> "RESERVATION_CANCELLED";
            case COMPLETED -> "RESERVATION_COMPLETED";
            default -> "RESERVATION_STATUS_CHANGED";
        };
    }

    private List<NotificationChannel> resolveNotificationChannels(ReservationStatus status) {
        return switch (status) {
            case CANCELLED -> List.of(
                    NotificationChannel.EMAIL,
                    NotificationChannel.SMS,
                    NotificationChannel.PUSH
            );
            case COMPLETED -> List.of(
                    NotificationChannel.EMAIL,
                    NotificationChannel.PUSH
            );
            default -> List.of(
                    NotificationChannel.EMAIL,
                    NotificationChannel.PUSH
            );
        };
    }

    private Map<String, String> buildNotificationVariables(
            Reservation reservation,
            ReservationStatus oldStatus,
            ReservationStatus newStatus,
            String note) {

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
        User user = reservation.getUser();

        Map<String, String> vars = new HashMap<>();
        vars.put("firstName", user.getFirstName() != null ? user.getFirstName() : "");
        vars.put("bookingReference", reservation.getBookingReference() != null ? reservation.getBookingReference() : "");
        vars.put("oldStatus", oldStatus.name());
        vars.put("newStatus", newStatus.name());
        vars.put("pickupAddress", reservation.getPickupAddress() != null ? reservation.getPickupAddress() : "");
        vars.put("dropoffAddress", reservation.getDropoffAddress() != null ? reservation.getDropoffAddress() : "");
        vars.put("scheduledTime", reservation.getScheduledTime() != null
                ? reservation.getScheduledTime().format(formatter) : "");
        vars.put("calculatedPrice", reservation.getCalculatedPrice() != null
                ? reservation.getCalculatedPrice().toPlainString() : "");
        vars.put("currency", reservation.getCurrency() != null ? reservation.getCurrency() : "TRY");
        vars.put("vehicleName", reservation.getVehicle() != null && reservation.getVehicle().getModel() != null
                ? reservation.getVehicle().getModel() : "");
        vars.put("passengerCount", String.valueOf(reservation.getPassengerCount()));
        vars.put("cancellationReason", note != null ? note : "");
        return vars;
    }

    @Transactional
    public void cancelReservation(Long id, Long userId) {
        User requester = findUserByUserId(userId);
        Reservation reservation = reservationRepository.findOneById(id);
        if (reservation == null) {
            throw new ResourceNotFoundException("Rezervasyon bulunamadı: " + id);
        }
        validateReservationAccess(reservation, requester);
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new BusinessRuleException(
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

    @Transactional(readOnly = true)
    public List<ReservationStatusHistoryResponse> getStatusHistory(Long reservationId, Long userId) {
        User requester = findUserByUserId(userId);
        Reservation reservation = reservationRepository.findOneById(reservationId);
        if (reservation == null) {
            throw new ResourceNotFoundException("Rezervasyon bulunamadı: " + reservationId);
        }
        validateReservationAccess(reservation, requester);
        return statusHistoryRepository.findByReservationIdOrderByChangedAtAsc(reservationId)
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GuestReservationResponse getGuestReservation(String bookingReference, String phone) {
        if (phone == null || phone.isBlank()) {
            throw new InvalidRequestException("Telefon numarası zorunludur.");
        }
        Reservation reservation = reservationRepository.findByBookingReference(bookingReference);
        if (reservation == null) {
            throw new ResourceNotFoundException("Rezervasyon bulunamadı veya doğrulama başarısız.");
        }
        User owner = reservation.getUser();
        String ownerPhone = (owner != null) ? owner.getPhoneNumber() : reservation.getGuestPhone();
        boolean isGuestReservation = (owner == null) || owner.isGuest();
        if (!isGuestReservation) {
            throw new ForbiddenOperationException("Bu rezervasyon bir hesaba bağlı. Lütfen giriş yaparak görüntüleyin.");
        }
        if (ownerPhone == null || !normalize(ownerPhone).equals(normalize(phone))) {
            throw new ResourceNotFoundException("Rezervasyon bulunamadı veya doğrulama başarısız.");
        }
        return toGuestResponse(reservation);
    }

    // --- Ortak yardımcı metodlar ---

    private void validateStatusTransition(ReservationStatus current, ReservationStatus target) {
        if (target == null) {
            throw new InvalidRequestException("Hedef durum belirtilmedi.");
        }
        if (current == target) {
            throw new BusinessRuleException("Rezervasyon zaten " + current + " durumunda.");
        }
        boolean valid = switch (current) {
            case PENDING  -> target == ReservationStatus.ASSIGNED || target == ReservationStatus.CANCELLED;
            case ASSIGNED -> target == ReservationStatus.COMPLETED || target == ReservationStatus.NO_SHOW;
            case COMPLETED, CANCELLED, NO_SHOW -> false;
        };
        if (!valid) {
            throw new BusinessRuleException("Geçersiz durum geçişi: " + current + " -> " + target);
        }
    }

    private User findUserByUserId(Long userId) {
        return userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı veya aktif değil: " + userId));
    }

    private void validateReservationAccess(Reservation reservation, User requester) {
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;
        boolean isOwner = reservation.getUser() != null && reservation.getUser().getId().equals(requester.getId());
        if (!isAdmin && !isOwner) {
            throw new ForbiddenOperationException("Bu rezervasyona erişim yetkiniz yok.");
        }
    }

    private String normalize(String phone) {
        return phone.replaceAll("\\s+", "");
    }

    private GuestReservationResponse toGuestResponse(Reservation r) {
        String vehicleName = r.getVehicle() != null
                ? r.getVehicle().getBrand() + " " + r.getVehicle().getModel() : null;
        return GuestReservationResponse.builder()
                .id(r.getId())
                .bookingReference(r.getBookingReference())
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
                .build();
    }

    private ReservationStatusHistoryResponse toHistoryResponse(ReservationStatusHistory h) {
        User changedBy = h.getChangedBy();
        String changedByName = changedBy != null
                ? (changedBy.getFirstName() != null ? changedBy.getFirstName() : "") +
                  (changedBy.getLastName() != null ? " " + changedBy.getLastName() : "")
                : null;
        return ReservationStatusHistoryResponse.builder()
                .id(h.getId())
                .reservationId(h.getReservation().getId())
                .status(h.getStatus())
                .changedById(changedBy != null ? changedBy.getId() : null)
                .changedByName(changedByName != null ? changedByName.trim() : null)
                .note(h.getNote())
                .changedAt(h.getChangedAt())
                .build();
    }

    private ReservationResponse toResponse(Reservation r) {
        String vehicleName = r.getVehicle() != null
                ? r.getVehicle().getBrand() + " " + r.getVehicle().getModel()
                : null;
        return ReservationResponse.builder()
                .id(r.getId())
                .bookingReference(r.getBookingReference())
                .userId(r.getUser() != null ? r.getUser().getId() : null)
                .guestPhone(r.getUser() != null && r.getUser().isGuest()
                        ? r.getUser().getPhoneNumber()
                        : r.getGuestPhone())
                .pickupAddress(r.getPickupAddress())
                .dropoffAddress(r.getDropoffAddress())
                .scheduledTime(r.getScheduledTime())
                .vehicleName(vehicleName)
                .passengerCount(r.getPassengerCount())
                .basePrice(r.getBasePrice())
                .loyaltyDiscount(r.getLoyaltyDiscount())
                .discountAmount(r.getDiscountAmount())
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
