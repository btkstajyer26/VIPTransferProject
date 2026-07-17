package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.reservation.CreateReservationRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationStatusHistoryResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.UpdateStatusRequest;
import com.btk.staj.VIPTransferProject.entity.*;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.repository.*;
import com.btk.staj.VIPTransferProject.util.BookingReferenceGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock private ReservationRepository reservationRepository;
    @Mock private ReservationStatusHistoryRepository statusHistoryRepository;
    @Mock private UserRepository userRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private CampaignRepository campaignRepository;
    @Mock private BookingReferenceGenerator bookingReferenceGenerator;

    @InjectMocks
    private ReservationService service;

    private User adminUser;
    private User customerUser;
    private Vehicle vehicle;
    private Reservation pendingReservation;
    private Reservation assignedReservation;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setRole(UserRole.ADMIN);

        customerUser = new User();
        customerUser.setId(2L);
        customerUser.setRole(UserRole.CUSTOMER);

        vehicle = new Vehicle();
        vehicle.setId(10L);
        vehicle.setBrand("Mercedes");
        vehicle.setModel("E200");
        vehicle.setOpeningPrice(new BigDecimal("500.00"));
        vehicle.setBasePriceMultiplier(new BigDecimal("1.00"));

        pendingReservation = new Reservation();
        pendingReservation.setId(100L);
        pendingReservation.setStatus(ReservationStatus.PENDING);
        pendingReservation.setUser(customerUser);
        pendingReservation.setPickupAddress("İstanbul");
        pendingReservation.setDropoffAddress("Ankara");
        pendingReservation.setCalculatedPrice(new BigDecimal("500.00"));
        pendingReservation.setCurrency("TRY");

        assignedReservation = new Reservation();
        assignedReservation.setId(101L);
        assignedReservation.setStatus(ReservationStatus.ASSIGNED);
        assignedReservation.setUser(customerUser);
        assignedReservation.setPickupAddress("İstanbul");
        assignedReservation.setDropoffAddress("Ankara");
        assignedReservation.setCalculatedPrice(new BigDecimal("500.00"));
        assignedReservation.setCurrency("TRY");
    }

    // =================================================================
    // createReservation
    // =================================================================

    @Test
    void createReservation_vehicleNotFound_throwsException() {
        when(vehicleRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createReservation(buildCreateRequest(), 2L, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Araç bulunamadı");
    }

    @Test
    void createReservation_userNotFound_throwsException() {
        when(vehicleRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(vehicle));
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createReservation(buildCreateRequest(), 2L, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Kullanıcı bulunamadı");
    }

    @Test
    void createReservation_asRegisteredUser_savesReservationAndHistory() {
        when(bookingReferenceGenerator.generate()).thenReturn("BTK-2026-TEST01");
        when(vehicleRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(vehicle));
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));
        when(reservationRepository.save(any())).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(100L);
            return r;
        });

        ReservationResponse response = service.createReservation(buildCreateRequest(), 2L, null);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getStatus()).isEqualTo(ReservationStatus.PENDING);
        assertThat(response.getUserId()).isEqualTo(2L);
        assertThat(response.getBookingReference()).isEqualTo("BTK-2026-TEST01");
        verify(statusHistoryRepository).save(any(ReservationStatusHistory.class));
    }

    @Test
    void createReservation_asGuest_savesWithGuestPhone() {
        when(bookingReferenceGenerator.generate()).thenReturn("BTK-2026-TEST02");
        when(vehicleRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(vehicle));
        when(reservationRepository.save(any())).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(100L);
            return r;
        });

        ReservationResponse response = service.createReservation(buildCreateRequest(), null, "05551234567");

        assertThat(response.getGuestPhone()).isEqualTo("05551234567");
        assertThat(response.getUserId()).isNull();
        assertThat(response.getBookingReference()).isEqualTo("BTK-2026-TEST02");
    }

    @Test
    void createReservation_priceCalculation_basePriceEqualsOpeningPrice() {
        when(bookingReferenceGenerator.generate()).thenReturn("BTK-2026-TEST03");
        when(vehicleRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(vehicle));
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));
        when(reservationRepository.save(any())).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(100L);
            return r;
        });

        ReservationResponse response = service.createReservation(buildCreateRequest(), 2L, null);

        // basePriceMultiplier = 1.00, kampanya yok → calculatedPrice = openingPrice
        assertThat(response.getCalculatedPrice()).isEqualByComparingTo(new BigDecimal("500.00"));
    }

    // =================================================================
    // getAllReservations
    // =================================================================

    @Test
    void getAllReservations_returnsAllSortedByScheduledTime() {
        when(reservationRepository.findAllByOrderByScheduledTimeDesc())
                .thenReturn(List.of(pendingReservation, assignedReservation));

        List<ReservationResponse> result = service.getAllReservations();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(100L);
        assertThat(result.get(1).getId()).isEqualTo(101L);
    }

    // =================================================================
    // getMyReservations
    // =================================================================

    @Test
    void getMyReservations_userExists_returnsOwnReservations() {
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));
        when(reservationRepository.findByUserIdOrderByScheduledTimeDesc(2L))
                .thenReturn(List.of(pendingReservation));

        List<ReservationResponse> result = service.getMyReservations(2L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(100L);
    }

    @Test
    void getMyReservations_userNotFound_throwsException() {
        when(userRepository.findByIdAndActiveTrue(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMyReservations(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("99");
    }

    // =================================================================
    // getReservationById
    // =================================================================

    @Test
    void getReservationById_asOwner_returnsReservation() {
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        ReservationResponse result = service.getReservationById(100L, 2L);

        assertThat(result.getId()).isEqualTo(100L);
    }

    @Test
    void getReservationById_asAdmin_returnsAnyReservation() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        ReservationResponse result = service.getReservationById(100L, 1L);

        assertThat(result.getId()).isEqualTo(100L);
    }

    @Test
    void getReservationById_asOtherCustomer_throwsAccessDenied() {
        User other = new User();
        other.setId(3L);
        other.setRole(UserRole.CUSTOMER);
        when(userRepository.findByIdAndActiveTrue(3L)).thenReturn(Optional.of(other));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        assertThatThrownBy(() -> service.getReservationById(100L, 3L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("erişim yetkiniz yok");
    }

    @Test
    void getReservationById_reservationNotFound_throwsException() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(999L)).thenReturn(null);

        assertThatThrownBy(() -> service.getReservationById(999L, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("999");
    }

    // =================================================================
    // cancelReservation
    // =================================================================

    @Test
    void cancelReservation_pendingReservation_setsStatusAndSaves() {
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        service.cancelReservation(100L, 2L);

        assertThat(pendingReservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(pendingReservation.getCancelledAt()).isNotNull();
        verify(reservationRepository).save(pendingReservation);
        verify(statusHistoryRepository).save(any(ReservationStatusHistory.class));
    }

    @Test
    void cancelReservation_notPendingStatus_throwsException() {
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));
        when(reservationRepository.findOneById(101L)).thenReturn(assignedReservation);

        assertThatThrownBy(() -> service.cancelReservation(101L, 2L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("PENDING");
    }

    @Test
    void cancelReservation_byOtherCustomer_throwsAccessDenied() {
        User other = new User();
        other.setId(3L);
        other.setRole(UserRole.CUSTOMER);
        when(userRepository.findByIdAndActiveTrue(3L)).thenReturn(Optional.of(other));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        assertThatThrownBy(() -> service.cancelReservation(100L, 3L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("erişim yetkiniz yok");
    }

    @Test
    void cancelReservation_byAdmin_successEvenIfNotOwner() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        service.cancelReservation(100L, 1L);

        assertThat(pendingReservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    }

    // =================================================================
    // updateStatus — yetki
    // =================================================================

    @Test
    void updateStatus_byNonAdmin_throwsException() {
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.ASSIGNED);

        assertThatThrownBy(() -> service.updateStatus(100L, req, 2L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("ADMIN");
    }

    @Test
    void updateStatus_reservationNotFound_throwsException() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(999L)).thenReturn(null);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.ASSIGNED);

        assertThatThrownBy(() -> service.updateStatus(999L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("999");
    }

    // =================================================================
    // updateStatus — geçerli geçişler
    // =================================================================

    @Test
    void updateStatus_pendingToAssigned_succeeds() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.ASSIGNED);
        req.setNote("Araç atandı");

        service.updateStatus(100L, req, 1L);

        assertThat(pendingReservation.getStatus()).isEqualTo(ReservationStatus.ASSIGNED);
        verify(statusHistoryRepository).save(any(ReservationStatusHistory.class));
    }

    @Test
    void updateStatus_pendingToCancelled_setsCancelledAt() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.CANCELLED);

        service.updateStatus(100L, req, 1L);

        assertThat(pendingReservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(pendingReservation.getCancelledAt()).isNotNull();
    }

    @Test
    void updateStatus_assignedToCompleted_setsCompletedAt() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(101L)).thenReturn(assignedReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.COMPLETED);

        service.updateStatus(101L, req, 1L);

        assertThat(assignedReservation.getStatus()).isEqualTo(ReservationStatus.COMPLETED);
        assertThat(assignedReservation.getCompletedAt()).isNotNull();
    }

    @Test
    void updateStatus_assignedToNoShow_succeeds() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(101L)).thenReturn(assignedReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.NO_SHOW);

        service.updateStatus(101L, req, 1L);

        assertThat(assignedReservation.getStatus()).isEqualTo(ReservationStatus.NO_SHOW);
    }

    // =================================================================
    // updateStatus — geçersiz geçişler (state-machine)
    // =================================================================

    @Test
    void updateStatus_pendingToCompleted_throwsInvalidTransition() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.COMPLETED);

        assertThatThrownBy(() -> service.updateStatus(100L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Geçersiz durum geçişi");
    }

    @Test
    void updateStatus_pendingToNoShow_throwsInvalidTransition() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.NO_SHOW);

        assertThatThrownBy(() -> service.updateStatus(100L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Geçersiz durum geçişi");
    }

    @Test
    void updateStatus_assignedToPending_throwsInvalidTransition() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(101L)).thenReturn(assignedReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.PENDING);

        assertThatThrownBy(() -> service.updateStatus(101L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Geçersiz durum geçişi");
    }

    @Test
    void updateStatus_terminalStatus_completedToAnything_throwsException() {
        Reservation completed = new Reservation();
        completed.setId(102L);
        completed.setStatus(ReservationStatus.COMPLETED);
        completed.setUser(customerUser);
        completed.setCalculatedPrice(new BigDecimal("500.00"));
        completed.setCurrency("TRY");
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(102L)).thenReturn(completed);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.ASSIGNED);

        assertThatThrownBy(() -> service.updateStatus(102L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Geçersiz durum geçişi");
    }

    @Test
    void updateStatus_terminalStatus_cancelledToAnything_throwsException() {
        Reservation cancelled = new Reservation();
        cancelled.setId(103L);
        cancelled.setStatus(ReservationStatus.CANCELLED);
        cancelled.setUser(customerUser);
        cancelled.setCalculatedPrice(new BigDecimal("500.00"));
        cancelled.setCurrency("TRY");
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(103L)).thenReturn(cancelled);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.PENDING);

        assertThatThrownBy(() -> service.updateStatus(103L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Geçersiz durum geçişi");
    }

    @Test
    void updateStatus_sameStatus_throwsException() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.PENDING);

        assertThatThrownBy(() -> service.updateStatus(100L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("zaten");
    }

    @Test
    void updateStatus_nullTargetStatus_throwsException() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(null);

        assertThatThrownBy(() -> service.updateStatus(100L, req, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("belirtilmedi");
    }

    // =================================================================
    // getStatusHistory
    // =================================================================

    @Test
    void getStatusHistory_asOwner_returnsHistory() {
        when(userRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(customerUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);
        ReservationStatusHistory entry = new ReservationStatusHistory();
        entry.setReservation(pendingReservation);
        when(statusHistoryRepository.findByReservationIdOrderByChangedAtAsc(100L))
                .thenReturn(List.of(entry));

        List<ReservationStatusHistoryResponse> result = service.getStatusHistory(100L, 2L);

        assertThat(result).hasSize(1);
    }

    @Test
    void getStatusHistory_asAdmin_returnsHistory() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);
        ReservationStatusHistory e1 = new ReservationStatusHistory();
        e1.setReservation(pendingReservation);
        ReservationStatusHistory e2 = new ReservationStatusHistory();
        e2.setReservation(pendingReservation);
        when(statusHistoryRepository.findByReservationIdOrderByChangedAtAsc(100L))
                .thenReturn(List.of(e1, e2));

        List<ReservationStatusHistoryResponse> result = service.getStatusHistory(100L, 1L);

        assertThat(result).hasSize(2);
    }

    @Test
    void getStatusHistory_asOtherCustomer_throwsAccessDenied() {
        User other = new User();
        other.setId(3L);
        other.setRole(UserRole.CUSTOMER);
        when(userRepository.findByIdAndActiveTrue(3L)).thenReturn(Optional.of(other));
        when(reservationRepository.findOneById(100L)).thenReturn(pendingReservation);

        assertThatThrownBy(() -> service.getStatusHistory(100L, 3L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("erişim yetkiniz yok");
    }

    @Test
    void getStatusHistory_reservationNotFound_throwsException() {
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(adminUser));
        when(reservationRepository.findOneById(999L)).thenReturn(null);

        assertThatThrownBy(() -> service.getStatusHistory(999L, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("999");
    }

    // =================================================================
    // Test yardımcıları
    // =================================================================

    private CreateReservationRequest buildCreateRequest() {
        CreateReservationRequest req = new CreateReservationRequest();
        req.setVehicleId(10L);
        req.setPickupAddress("İstanbul");
        req.setPickupLat(41.0);
        req.setPickupLon(28.9);
        req.setDropoffAddress("Ankara");
        req.setDropoffLat(39.9);
        req.setDropoffLon(32.8);
        req.setScheduledTime(OffsetDateTime.now().plusDays(1));
        req.setPassengerCount((short) 1);
        return req;
    }
}
