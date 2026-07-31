package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.event.LoyaltyPointsAccruedEvent;
import com.btk.staj.VIPTransferProject.repository.LoyaltyTierConfigRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LoyaltyNotificationServiceTest {

    private UserRepository userRepository;
    private LoyaltyTierConfigRepository tierConfigRepository;
    private NotificationService notificationService;
    private NotificationPreferenceService preferenceService;
    private LoyaltyNotificationService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        tierConfigRepository = mock(LoyaltyTierConfigRepository.class);
        notificationService = mock(NotificationService.class);
        preferenceService = mock(NotificationPreferenceService.class);
        service = new LoyaltyNotificationService(
                userRepository,
                tierConfigRepository,
                notificationService,
                preferenceService
        );
    }

    @Test
    void handle_pointsEarned_sendsPushWhenUserEnabledIt() {
        when(userRepository.findByIdAndActiveTrue(7L))
                .thenReturn(Optional.of(user(null)));
        when(preferenceService.isEnabled(7L, NotificationChannel.PUSH))
                .thenReturn(true);

        service.handle(event(LoyaltyTier.BRONZE, LoyaltyTier.BRONZE));

        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService).create(captor.capture());
        assertThat(captor.getValue().getTemplateCode())
                .isEqualTo("LOYALTY_POINTS_EARNED");
        assertThat(captor.getValue().getChannel())
                .isEqualTo(NotificationChannel.PUSH);
        assertThat(captor.getValue().getVariables())
                .containsEntry("earnedPoints", "125")
                .containsEntry("lifetimePoints", "1125");
    }

    @Test
    void handle_tierUpgrade_sendsSupportedChannelsAndPointsPush() {
        when(userRepository.findByIdAndActiveTrue(7L))
                .thenReturn(Optional.of(user("user@example.com")));
        when(preferenceService.isEnabled(7L, NotificationChannel.PUSH))
                .thenReturn(true);
        when(preferenceService.isEnabled(7L, NotificationChannel.WHATSAPP))
                .thenReturn(true);
        when(tierConfigRepository.findByTier(LoyaltyTier.SILVER))
                .thenReturn(Optional.of(tierConfig()));

        service.handle(event(LoyaltyTier.BRONZE, LoyaltyTier.SILVER));

        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService, times(4)).create(captor.capture());

        List<CreateNotificationRequest> requests = captor.getAllValues();
        assertThat(requests)
                .extracting(CreateNotificationRequest::getTemplateCode)
                .containsExactlyInAnyOrder(
                        "LOYALTY_POINTS_EARNED",
                        "LOYALTY_TIER_UPGRADED",
                        "LOYALTY_TIER_UPGRADED",
                        "LOYALTY_TIER_UPGRADED"
                );
        assertThat(requests)
                .filteredOn(request ->
                        "LOYALTY_TIER_UPGRADED".equals(request.getTemplateCode()))
                .extracting(CreateNotificationRequest::getChannel)
                .containsExactlyInAnyOrder(
                        NotificationChannel.EMAIL,
                        NotificationChannel.WHATSAPP,
                        NotificationChannel.PUSH
                );
    }

    private LoyaltyPointsAccruedEvent event(
            LoyaltyTier previousTier,
            LoyaltyTier newTier
    ) {
        return new LoyaltyPointsAccruedEvent(
                7L,
                125,
                1125,
                previousTier,
                newTier
        );
    }

    private User user(String email) {
        return User.builder()
                .id(7L)
                .firstName("Ada")
                .email(email)
                .preferredLang("tr")
                .build();
    }

    private LoyaltyTierConfig tierConfig() {
        return LoyaltyTierConfig.builder()
                .tier(LoyaltyTier.SILVER)
                .discountPercentage(new BigDecimal("5.00"))
                .prioritySupport(true)
                .build();
    }
}
