package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.entity.Campaign;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.DiscountType;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.event.CampaignPublishedEvent;
import com.btk.staj.VIPTransferProject.repository.CampaignRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CampaignNotificationServiceTest {

    private CampaignRepository campaignRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;
    private NotificationPreferenceService preferenceService;
    private CampaignNotificationService service;

    @BeforeEach
    void setUp() {
        campaignRepository = mock(CampaignRepository.class);
        userRepository = mock(UserRepository.class);
        notificationService = mock(NotificationService.class);
        preferenceService = mock(NotificationPreferenceService.class);
        service = new CampaignNotificationService(
                campaignRepository,
                userRepository,
                notificationService,
                preferenceService
        );
    }

    @Test
    void handle_sendsPushOnlyToEnabledCustomers() {
        User enabledCustomer = user(7L, UserRole.CUSTOMER, "tr");
        User disabledCustomer = user(8L, UserRole.CUSTOMER, "tr");
        User admin = user(9L, UserRole.ADMIN, "tr");

        when(campaignRepository.findById(21L))
                .thenReturn(Optional.of(campaign()));
        when(userRepository.findAllByActiveTrue())
                .thenReturn(List.of(enabledCustomer, disabledCustomer, admin));
        when(preferenceService.isEnabled(7L, NotificationChannel.PUSH))
                .thenReturn(true);
        when(preferenceService.isEnabled(8L, NotificationChannel.PUSH))
                .thenReturn(false);

        service.handle(new CampaignPublishedEvent(21L));

        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService).create(captor.capture());

        CreateNotificationRequest request = captor.getValue();
        assertThat(request.getUserId()).isEqualTo(7L);
        assertThat(request.getTemplateCode()).isEqualTo("CAMPAIGN_PUBLISHED");
        assertThat(request.getChannel()).isEqualTo(NotificationChannel.PUSH);
        assertThat(request.getLangCode()).isEqualTo("tr");
        assertThat(request.getVariables())
                .containsEntry("campaignName", "Yaz İndirimi")
                .containsEntry("campaignCode", "YAZ20")
                .containsEntry("discount", "%20")
                .containsEntry("validTo", "31.08.2026 23:59");
        verify(preferenceService, never())
                .isEnabled(9L, NotificationChannel.PUSH);
    }

    @Test
    void handle_continuesWhenOneUsersNotificationFails() {
        User firstUser = user(7L, UserRole.CUSTOMER, "tr");
        User secondUser = user(8L, UserRole.CUSTOMER, "en");

        when(campaignRepository.findById(21L))
                .thenReturn(Optional.of(campaign()));
        when(userRepository.findAllByActiveTrue())
                .thenReturn(List.of(firstUser, secondUser));
        when(preferenceService.isEnabled(7L, NotificationChannel.PUSH))
                .thenReturn(true);
        when(preferenceService.isEnabled(8L, NotificationChannel.PUSH))
                .thenReturn(true);
        doThrow(new IllegalStateException("push unavailable"))
                .doReturn(null)
                .when(notificationService)
                .create(org.mockito.ArgumentMatchers.any());

        service.handle(new CampaignPublishedEvent(21L));

        verify(notificationService, times(2))
                .create(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void handle_skipsInactiveCampaign() {
        Campaign campaign = campaign();
        campaign.setActive(false);
        when(campaignRepository.findById(21L))
                .thenReturn(Optional.of(campaign));

        service.handle(new CampaignPublishedEvent(21L));

        verify(userRepository, never()).findAllByActiveTrue();
        verify(notificationService, never())
                .create(org.mockito.ArgumentMatchers.any());
    }

    private User user(Long id, UserRole role, String language) {
        return User.builder()
                .id(id)
                .role(role)
                .preferredLang(language)
                .active(true)
                .build();
    }

    private Campaign campaign() {
        return Campaign.builder()
                .id(21L)
                .code("YAZ20")
                .name("Yaz İndirimi")
                .description("Tüm transferlerde geçerli.")
                .discountType(DiscountType.PERCENTAGE)
                .discountValue(new BigDecimal("20.00"))
                .validFrom(OffsetDateTime.parse("2026-08-01T00:00:00+03:00"))
                .validTo(OffsetDateTime.parse("2026-08-31T23:59:00+03:00"))
                .active(true)
                .build();
    }
}
