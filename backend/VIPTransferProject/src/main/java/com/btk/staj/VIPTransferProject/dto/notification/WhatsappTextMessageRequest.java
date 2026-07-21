package com.btk.staj.VIPTransferProject.dto.notification;

import com.fasterxml.jackson.annotation.JsonProperty;

public record WhatsappTextMessageRequest(
        @JsonProperty("messaging_product") String messagingProduct,
        @JsonProperty("recipient_type") String recipientType,
        String to,
        String type,
        Text text
) {
    public static WhatsappTextMessageRequest create(String phoneNumber, String message) {
        return new WhatsappTextMessageRequest(
                "whatsapp", "individual", phoneNumber, "text", new Text(message)
        );
    }

    public record Text(String body) {
    }
}
