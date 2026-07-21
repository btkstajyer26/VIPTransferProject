package com.btk.staj.VIPTransferProject.dto.notification;

import java.util.List;

public record IletiMerkeziSmsRequest(
        Request request
) {

    public record Request(
            Authentication authentication,
            Order order
    ) {
    }

    public record Authentication(
            String key,
            String hash
    ) {
    }

    public record Order(
            String sender,
            String iys,
            Message message
    ) {
    }

    public record Message(
            String text,
            Receipents receipents
    ) {
    }

    /*
     * İleti Merkezi API bu alanı "receipents"
     * şeklinde bekliyor. "recipients" olarak değiştirme.
     */
    public record Receipents(
            List<String> number
    ) {
    }
}