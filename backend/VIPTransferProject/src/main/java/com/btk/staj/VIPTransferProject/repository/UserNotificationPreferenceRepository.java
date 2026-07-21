package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.UserNotificationPreference;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserNotificationPreferenceRepository
        extends JpaRepository<UserNotificationPreference, Long> {

    boolean existsByUserIdAndChannelAndEnabledTrue(
            Long userId,
            NotificationChannel channel
    );

    Optional<UserNotificationPreference> findByUserIdAndChannel(
            Long userId,
            NotificationChannel channel
    );
}