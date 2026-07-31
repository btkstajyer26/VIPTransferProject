package com.btk.staj.VIPTransferProject.exception;

public class UserUnverifiedException extends UnauthorizedException {
    private final String email;
    public UserUnverifiedException(String message,String email) {
        super(message);
        this.email=email;
    }
    public String getEmail(){
        return email;
    }
}
