package com.btk.staj.VIPTransferProject.auth.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
}