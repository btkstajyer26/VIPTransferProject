package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;

public class NotificationTemplateNotFoundException extends RuntimeException {

    public NotificationTemplateNotFoundException(
            String code,
            NotificationChannel channel,
            String langCode
    ) {
        super(
                "Bildirim şablonu bulunamadı. Code: "
                        + code
                        + ", channel: "
                        + channel
                        + ", language: "
                        + langCode
        );
    }
}