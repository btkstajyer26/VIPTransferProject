package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.NotificationPreferenceResponse;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.UserNotificationPreference;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.repository.UserNotificationPreferenceRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final UserNotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    @Transactional
    public NotificationPreferenceResponse update(
            String authenticatedPhoneNumber,
            NotificationChannel channel,
            boolean enabled
    ) {
        validateOptionalChannel(channel);

        User user = userRepository.findByPhoneNumber(authenticatedPhoneNumber)
                .orElseThrow(() -> new IllegalStateException(
                        "Kimligi dogrulanan kullanici bulunamadi."
                ));

        UserNotificationPreference preference = preferenceRepository
                .findByUserIdAndChannel(user.getId(), channel)
                .orElseGet(() -> UserNotificationPreference.builder()
                        .user(user)
                        .channel(channel)
                        .build());

        preference.setEnabled(enabled);
        UserNotificationPreference savedPreference =
                preferenceRepository.save(preference);

        return new NotificationPreferenceResponse(
                savedPreference.getChannel(),
                savedPreference.isEnabled()
        );
    }

    public boolean isEnabled(
            Long userId,
            NotificationChannel channel
    ) {
        /*
         * EMAIL ve SMS için ayrıca izin kontrolü yapılmaz.
         */
        if (channel == NotificationChannel.EMAIL
                || channel == NotificationChannel.SMS) {
            return true;
        }

        /*
         * PUSH ve WHATSAPP için enabled=true kaydı bulunmalıdır.
         * Kayıt yoksa sonuç false olur.
         */
        return preferenceRepository
                .existsByUserIdAndChannelAndEnabledTrue(
                        userId,
                        channel
                );
    }

    private void validateOptionalChannel(NotificationChannel channel) {
        if (channel != NotificationChannel.PUSH
                && channel != NotificationChannel.WHATSAPP) {
            throw new IllegalArgumentException(
                    "Yalnizca PUSH ve WHATSAPP bildirim tercihleri degistirilebilir."
            );
        }
    }
}
