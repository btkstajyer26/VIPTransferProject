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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignNotificationService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final NotificationPreferenceService preferenceService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(CampaignPublishedEvent event) {
        Campaign campaign = campaignRepository.findById(event.campaignId())
                .orElse(null);

        if (campaign == null || !campaign.isActive()) {
            log.warn(
                    "Kampanya bildirimi atlandı. campaignId={} bulunamadı veya aktif değil.",
                    event.campaignId()
            );
            return;
        }

        for (User user : userRepository.findAllByActiveTrue()) {
            if (user.getRole() != UserRole.CUSTOMER
                    || !preferenceService.isEnabled(
                            user.getId(),
                            NotificationChannel.PUSH
                    )) {
                continue;
            }

            send(user, campaign);
        }
    }

    private void send(User user, Campaign campaign) {
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setUserId(user.getId());
        request.setTemplateCode("CAMPAIGN_PUBLISHED");
        request.setChannel(NotificationChannel.PUSH);
        request.setLangCode(resolveLanguage(user));
        request.setVariables(buildVariables(campaign));
        request.setSendImmediately(true);

        try {
            notificationService.create(request);
        } catch (RuntimeException exception) {
            log.warn(
                    "Kampanya bildirimi gönderilemedi. campaignId={}, userId={}, hata={}",
                    campaign.getId(),
                    user.getId(),
                    exception.getMessage()
            );
        }
    }

    private Map<String, String> buildVariables(Campaign campaign) {
        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("campaignName", campaign.getName());
        variables.put("campaignCode", campaign.getCode());
        variables.put(
                "description",
                valueOrDefault(campaign.getDescription(), "")
        );
        variables.put("discount", formatDiscount(campaign));
        variables.put(
                "validTo",
                campaign.getValidTo().format(DATE_TIME_FORMATTER)
        );
        return variables;
    }

    private String formatDiscount(Campaign campaign) {
        String value = normalizedNumber(campaign.getDiscountValue());
        return campaign.getDiscountType() == DiscountType.PERCENTAGE
                ? "%" + value
                : value + " TRY";
    }

    private String normalizedNumber(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private String resolveLanguage(User user) {
        return "en".equalsIgnoreCase(user.getPreferredLang()) ? "en" : "tr";
    }

    private String valueOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }
}
