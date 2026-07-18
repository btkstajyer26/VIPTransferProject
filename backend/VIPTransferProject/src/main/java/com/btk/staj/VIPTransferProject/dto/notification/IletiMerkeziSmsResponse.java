package com.btk.staj.VIPTransferProject.dto.notification;

public record IletiMerkeziSmsResponse(
        Response response
) {

    public record Response(
            Status status,
            Order order
    ) {
    }

    public record Status(
            Integer code,
            String message
    ) {
    }

    public record Order(
            String id
    ) {
    }

    public boolean isSuccessful() {
        return response != null
                && response.status() != null
                && Integer.valueOf(200).equals(response.status().code());
    }

    public String getOrderId() {
        if (response == null || response.order() == null) {
            return null;
        }

        return response.order().id();
    }
}