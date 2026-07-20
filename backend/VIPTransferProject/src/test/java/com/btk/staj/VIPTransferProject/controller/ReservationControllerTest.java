package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.reservation.*;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.ReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationControllerTest {

    @Mock ReservationService reservationService;
    @InjectMocks ReservationController controller;

    private UserPrincipal musteriPrincipal;
    private UserPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        musteriPrincipal = new UserPrincipal(2L, "5551112233");
        adminPrincipal  = new UserPrincipal(1L, "5559998877");
    }

    // ---- Sabitler ----

    private ReservationResponse ornekYanit() {
        return ReservationResponse.builder()
                .id(100L).status(ReservationStatus.PENDING)
                .userId(2L).pickupAddress("İstanbul").dropoffAddress("Ankara")
                .calculatedPrice(new BigDecimal("500.00")).currency("TRY")
                .createdAt(OffsetDateTime.now()).build();
    }

    private GuestReservationResponse ornekMisafirYanit() {
        return GuestReservationResponse.builder()
                .id(100L).status(ReservationStatus.PENDING)
                .pickupAddress("İstanbul").dropoffAddress("Ankara")
                .calculatedPrice(new BigDecimal("500.00")).currency("TRY")
                .createdAt(OffsetDateTime.now()).build();
    }

    private CreateReservationRequest ornekIstek() {
        CreateReservationRequest req = new CreateReservationRequest();
        req.setVehicleId(10L);
        req.setPickupAddress("İstanbul");   req.setPickupLat(41.0);   req.setPickupLon(28.9);
        req.setDropoffAddress("Ankara");    req.setDropoffLat(39.9);  req.setDropoffLon(32.8);
        req.setScheduledTime(OffsetDateTime.now().plusDays(1));
        req.setPassengerCount((short) 1);
        return req;
    }

    // =================================================================
    // createReservation
    // =================================================================

    @Test
    void createReservation_kayitliKullanici_userIdTokendanAlir() {
        when(reservationService.createReservation(any(), eq(2L), isNull()))
                .thenReturn(ornekYanit());

        ResponseEntity<ReservationResponse> yanit = controller.createReservation(
                musteriPrincipal, null, ornekIstek());

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(yanit.getBody().getId()).isEqualTo(100L);
        assertThat(yanit.getBody().getStatus()).isEqualTo(ReservationStatus.PENDING);
        verify(reservationService).createReservation(any(), eq(2L), isNull());
    }

    @Test
    void createReservation_misafir_telefonIleCalisiyor() {
        // principal null → userId null → guest yolu
        when(reservationService.createReservation(any(), isNull(), eq("5551112233")))
                .thenReturn(ornekYanit());

        ResponseEntity<ReservationResponse> yanit = controller.createReservation(
                null, "5551112233", ornekIstek());

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        verify(reservationService).createReservation(any(), isNull(), eq("5551112233"));
    }

    @Test
    void createReservation_principalNullse_userIdNullGecilir() {
        // principal null olunca userId null; servis guest dalına girer
        when(reservationService.createReservation(any(), isNull(), any()))
                .thenReturn(ornekYanit());

        controller.createReservation(null, "05559999", ornekIstek());

        verify(reservationService).createReservation(any(), isNull(), eq("05559999"));
    }

    // =================================================================
    // getAllReservations
    // =================================================================

    @Test
    void getAllReservations_servisListeyiDondurunce_200Doner() {
        when(reservationService.getAllReservations()).thenReturn(List.of(ornekYanit()));

        ResponseEntity<List<ReservationResponse>> yanit = controller.getAllReservations();

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(yanit.getBody()).hasSize(1);
        verify(reservationService).getAllReservations();
    }

    @Test
    void getAllReservations_bos_listeDondurunce_200Doner() {
        when(reservationService.getAllReservations()).thenReturn(List.of());

        ResponseEntity<List<ReservationResponse>> yanit = controller.getAllReservations();

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(yanit.getBody()).isEmpty();
    }
    // Not: @PreAuthorize("hasRole('ADMIN')") kısıtı AOP proxy üzerinden çalışır;
    // doğrudan metod çağrısında aktif olmaz. Güvenlik testi entegrasyon testinde yapılmalı.

    // =================================================================
    // getMyReservations
    // =================================================================

    @Test
    void getMyReservations_userIdTokendanAlir() {
        when(reservationService.getMyReservations(2L)).thenReturn(List.of(ornekYanit()));

        ResponseEntity<List<ReservationResponse>> yanit =
                controller.getMyReservations(musteriPrincipal);

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(yanit.getBody()).hasSize(1);
        verify(reservationService).getMyReservations(2L);
    }

    @Test
    void getMyReservations_adminPrincipal_adminIdKullanir() {
        when(reservationService.getMyReservations(1L)).thenReturn(List.of());

        controller.getMyReservations(adminPrincipal);

        verify(reservationService).getMyReservations(1L);
    }

    // =================================================================
    // getReservationById
    // =================================================================

    @Test
    void getReservationById_sahipOlarak_200Doner() {
        when(reservationService.getReservationById(100L, 2L)).thenReturn(ornekYanit());

        ResponseEntity<ReservationResponse> yanit =
                controller.getReservationById(100L, musteriPrincipal);

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(yanit.getBody().getId()).isEqualTo(100L);
    }

    @Test
    void getReservationById_yetkisizKullanici_serviceExceptionIletilir() {
        when(reservationService.getReservationById(100L, 2L))
                .thenThrow(new RuntimeException("Bu rezervasyona erişim yetkiniz yok."));

        assertThatThrownBy(() -> controller.getReservationById(100L, musteriPrincipal))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("erişim yetkiniz yok");
    }

    // =================================================================
    // updateStatus
    // =================================================================

    @Test
    void updateStatus_adminOlarak_dogruParametrelerIleServiseCagirir() {
        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.ASSIGNED);
        req.setNote("Araç atandı");
        when(reservationService.updateStatus(100L, req, 1L)).thenReturn(ornekYanit());

        ResponseEntity<ReservationResponse> yanit =
                controller.updateStatus(100L, adminPrincipal, req);

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(reservationService).updateStatus(100L, req, 1L);
    }

    @Test
    void updateStatus_musteriOlarak_serviceExceptionIletilir() {
        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ReservationStatus.ASSIGNED);
        when(reservationService.updateStatus(eq(100L), any(), eq(2L)))
                .thenThrow(new RuntimeException("Durum güncelleme yetkisi yok. Yalnızca ADMIN."));

        assertThatThrownBy(() -> controller.updateStatus(100L, musteriPrincipal, req))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("ADMIN");
    }

    // =================================================================
    // cancelReservation
    // =================================================================

    @Test
    void cancelReservation_sahipOlarak_204DonerVeServiseCagirir() {
        doNothing().when(reservationService).cancelReservation(100L, 2L);

        ResponseEntity<Void> yanit = controller.cancelReservation(100L, musteriPrincipal);

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(reservationService).cancelReservation(100L, 2L);
    }

    @Test
    void cancelReservation_pendingDegil_serviceExceptionIletilir() {
        doThrow(new RuntimeException("Sadece PENDING durumundaki rezervasyon iptal edilebilir."))
                .when(reservationService).cancelReservation(100L, 2L);

        assertThatThrownBy(() -> controller.cancelReservation(100L, musteriPrincipal))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("PENDING");
    }

    // =================================================================
    // getGuestReservation (public endpoint)
    // =================================================================

    @Test
    void getGuestReservation_dogruTelefon_200DonerVePIISizmaz() {
        when(reservationService.getGuestReservation("BTK-20260000001", "5551112233"))
                .thenReturn(ornekMisafirYanit());

        ResponseEntity<GuestReservationResponse> yanit =
                controller.getGuestReservation("BTK-20260000001", "5551112233");

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(yanit.getBody().getId()).isEqualTo(100L);
        assertThat(yanit.getBody().getStatus()).isEqualTo(ReservationStatus.PENDING);
        // GuestReservationResponse'da guestPhone ve userId alanları tanımsız olduğundan PII sızmaz
        assertThat(GuestReservationResponse.class.getDeclaredFields())
                .extracting("name")
                .doesNotContain("guestPhone", "userId");
    }

    @Test
    void getGuestReservation_yanlisTelefon_serviceExceptionIletilir() {
        when(reservationService.getGuestReservation("BTK-20260000001", "0000000000"))
                .thenThrow(new RuntimeException("Rezervasyon bulunamadı veya doğrulama başarısız."));

        assertThatThrownBy(() -> controller.getGuestReservation("BTK-20260000001", "0000000000"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("doğrulama başarısız");
    }

    @Test
    void getGuestReservation_kayitliKullanicininRezervasyonu_serviceExceptionIletilir() {
        when(reservationService.getGuestReservation("BTK-20260000001", "5551112233"))
                .thenThrow(new RuntimeException("Bu rezervasyon bir hesaba bağlı."));

        assertThatThrownBy(() -> controller.getGuestReservation("BTK-20260000001", "5551112233"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("hesaba bağlı");
    }

    // =================================================================
    // getStatusHistory
    // =================================================================

    @Test
    void getStatusHistory_sahipOlarak_200DonerveTarihListesiDoner() {
        ReservationStatusHistoryResponse kayit = ReservationStatusHistoryResponse.builder()
                .id(1L).reservationId(100L).status(ReservationStatus.PENDING)
                .note("Rezervasyon oluşturuldu.").changedAt(OffsetDateTime.now()).build();
        when(reservationService.getStatusHistory(100L, 2L)).thenReturn(List.of(kayit));

        ResponseEntity<List<ReservationStatusHistoryResponse>> yanit =
                controller.getStatusHistory(100L, musteriPrincipal);

        assertThat(yanit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(yanit.getBody()).hasSize(1);
        assertThat(yanit.getBody().get(0).getReservationId()).isEqualTo(100L);
        verify(reservationService).getStatusHistory(100L, 2L);
    }

    @Test
    void getStatusHistory_yetkisizKullanici_serviceExceptionIletilir() {
        when(reservationService.getStatusHistory(100L, 2L))
                .thenThrow(new RuntimeException("Bu rezervasyona erişim yetkiniz yok."));

        assertThatThrownBy(() -> controller.getStatusHistory(100L, musteriPrincipal))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("erişim yetkiniz yok");
    }
}
