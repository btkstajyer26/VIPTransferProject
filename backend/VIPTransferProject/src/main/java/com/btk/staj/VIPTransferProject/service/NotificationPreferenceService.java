package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.repository.UserNotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final UserNotificationPreferenceRepository preferenceRepository;

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
}