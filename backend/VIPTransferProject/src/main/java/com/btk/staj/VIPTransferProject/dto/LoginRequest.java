package com.btk.staj.VIPTransferProject.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String phoneNumber;
    private String password;
}