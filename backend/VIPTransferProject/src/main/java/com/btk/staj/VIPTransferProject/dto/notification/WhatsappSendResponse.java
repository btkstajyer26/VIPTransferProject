package com.btk.staj.VIPTransferProject.dto.notification;

import java.util.List;

public record WhatsappSendResponse(List<Message> messages) {

    public String getMessageId() {
        if (messages == null || messages.isEmpty()) {
            return null;
        }

        return messages.getFirst().id();
    }

    public record Message(String id) {
    }
}
