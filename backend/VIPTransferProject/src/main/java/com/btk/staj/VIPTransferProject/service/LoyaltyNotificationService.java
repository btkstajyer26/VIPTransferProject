package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.CreateNotificationRequest;
import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.event.LoyaltyPointsAccruedEvent;
import com.btk.staj.VIPTransferProject.repository.LoyaltyTierConfigRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
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
public class LoyaltyNotificationService {

    private final UserRepository userRepository;
    private final LoyaltyTierConfigRepository tierConfigRepository;
    private final NotificationService notificationService;
    private final NotificationPreferenceService preferenceService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(LoyaltyPointsAccruedEvent event) {
        User user = userRepository.findByIdAndActiveTrue(event.userId())
                .orElse(null);

        if (user == null) {
            log.warn(
                    "Loyalty bildirimi atlandı. userId={} bulunamadı.",
                    event.userId()
            );
            return;
        }

        if (event.earnedPoints() > 0
                && preferenceService.isEnabled(
                        user.getId(),
                        NotificationChannel.PUSH
                )) {
            send(
                    user,
                    "LOYALTY_POINTS_EARNED",
                    NotificationChannel.PUSH,
                    pointsVariables(event)
            );
        }

        if (event.previousTier() != event.newTier()) {
            sendTierUpgradeNotifications(user, event);
        }
    }

    private void sendTierUpgradeNotifications(
            User user,
            LoyaltyPointsAccruedEvent event
    ) {
        LoyaltyTierConfig config =
                tierConfigRepository.findByTier(event.newTier()).orElse(null);

        if (config == null) {
            log.warn(
                    "Tier yükseltme bildirimi atlandı. tier={} yapılandırması bulunamadı.",
                    event.newTier()
            );
            return;
        }

        Map<String, String> variables =
                tierVariables(user, event, config);

        for (NotificationChannel channel : tierChannels(user)) {
            send(user, "LOYALTY_TIER_UPGRADED", channel, variables);
        }
    }

    private void send(
            User user,
            String templateCode,
            NotificationChannel channel,
            Map<String, String> variables
    ) {
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setUserId(user.getId());
        request.setTemplateCode(templateCode);
        request.setChannel(channel);
        request.setLangCode(resolveLanguage(user));
        request.setVariables(variables);
        request.setSendImmediately(true);

        try {
            notificationService.create(request);
        } catch (RuntimeException exception) {
            log.warn(
                    "Loyalty bildirimi gönderilemedi. userId={}, channel={}, hata={}",
                    user.getId(),
                    channel,
                    exception.getMessage()
            );
        }
    }

    private Set<NotificationChannel> tierChannels(User user) {
        Set<NotificationChannel> channels =
                EnumSet.noneOf(NotificationChannel.class);

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            channels.add(NotificationChannel.EMAIL);
        }
        if (preferenceService.isEnabled(
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

    private Map<String, String> pointsVariables(
            LoyaltyPointsAccruedEvent event
    ) {
        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("earnedPoints", String.valueOf(event.earnedPoints()));
        variables.put("lifetimePoints", String.valueOf(event.lifetimePoints()));
        return variables;
    }

    private Map<String, String> tierVariables(
            User user,
            LoyaltyPointsAccruedEvent event,
            LoyaltyTierConfig config
    ) {
        Map<String, String> variables = new LinkedHashMap<>();
        variables.put(
                "firstName",
                valueOrDefault(user.getFirstName(), "Misafir")
        );
        variables.put("oldTier", event.previousTier().name());
        variables.put("newTier", event.newTier().name());
        variables.put("lifetimePoints", String.valueOf(event.lifetimePoints()));
        variables.put(
                "discountPercentage",
                String.valueOf(config.getDiscountPercentage())
        );
        variables.put(
                "prioritySupport",
                config.isPrioritySupport() ? "Evet" : "Hayır"
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
