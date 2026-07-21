package com.btk.staj.VIPTransferProject.exception;

public class DuplicatePlateException extends RuntimeException {

    public DuplicatePlateException(String plateNumber) {
        super("Bu plaka zaten kayıtlı: " + plateNumber);
    }
}
