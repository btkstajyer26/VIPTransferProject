package com.btk.staj.VIPTransferProject.config;

import com.btk.staj.VIPTransferProject.service.LocalizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.support.AbstractMessageSource;
import org.springframework.stereotype.Component;

import java.text.MessageFormat;
import java.util.Locale;

@Component("messageSource")
@RequiredArgsConstructor
public class DatabaseMessageSource extends AbstractMessageSource {

    private final LocalizationService localizationService;

    @Override
    protected MessageFormat resolveCode(String code, Locale locale) {
        String langCode = locale.getLanguage();
        if (langCode == null || langCode.isEmpty()) {
            langCode = "tr";
        }
        
        String message = localizationService.getTranslation(code, langCode, null);
        
        if (message == null) {
            return null;
        }
        
        return new MessageFormat(message, locale);
    }
}
