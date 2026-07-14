

package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.NotificationTemplate;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationTemplateNotFoundException;
import com.btk.staj.VIPTransferProject.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationTemplateService {

    private final NotificationTemplateRepository templateRepository;

    @Transactional(readOnly = true)
    public NotificationTemplate findTemplate(
            String code,
            NotificationChannel channel,
            String langCode
    ) {
        return templateRepository
                .findByCodeAndChannelAndLangCode(code, channel, langCode)
                .orElseThrow(() ->
                        new NotificationTemplateNotFoundException(
                                code,
                                channel,
                                langCode
                        )
                );
    }
}