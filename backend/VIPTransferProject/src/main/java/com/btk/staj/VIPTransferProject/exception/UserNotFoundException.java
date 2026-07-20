package com.btk.staj.VIPTransferProject.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(Long id) {
        super("Kullanıcı bulunamadı. ID: " + id);
    }
}