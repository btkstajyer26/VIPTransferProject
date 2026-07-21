package com.btk.staj.VIPTransferProject.exception;

public class NotificationNotFoundException extends RuntimeException {

    public NotificationNotFoundException(Long id) {
        super("Bildirim bulunamadı. ID: " + id);
    }
}