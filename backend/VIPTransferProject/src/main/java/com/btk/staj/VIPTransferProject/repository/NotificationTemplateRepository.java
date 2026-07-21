
package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.NotificationTemplate;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationTemplateRepository
        extends JpaRepository<NotificationTemplate, Long> {

    Optional<NotificationTemplate> findByCodeAndChannelAndLangCode(
            String code,
            NotificationChannel channel,
            String langCode
    );
}