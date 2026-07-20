package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.NotificationTemplate;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationTemplateNotFoundException;
import com.btk.staj.VIPTransferProject.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;

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

    public String renderSubject(
            NotificationTemplate template,
            Map<String, String> variables
    ) {
        return replaceVariables(template.getSubject(), variables);
    }

    public String renderContent(
            NotificationTemplate template,
            Map<String, String> variables
    ) {
        return replaceVariables(template.getContent(), variables);
    }

    private String replaceVariables(
            String text,
            Map<String, String> variables
    ) {
        if (text == null || text.isBlank()) {
            return text;
        }

        Map<String, String> safeVariables =
                variables == null ? Collections.emptyMap() : variables;

        String renderedText = text;

        for (Map.Entry<String, String> variable : safeVariables.entrySet()) {
            String placeholder = "{{" + variable.getKey() + "}}";
            String value = variable.getValue() == null ? "" : variable.getValue();

            renderedText = renderedText.replace(placeholder, value);
        }

        return renderedText;
    }
}