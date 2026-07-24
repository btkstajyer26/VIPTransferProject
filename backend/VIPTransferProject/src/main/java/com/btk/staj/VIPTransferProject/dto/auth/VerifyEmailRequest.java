package com.btk.staj.VIPTransferProject.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VerifyEmailRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank(message = "Doğrulama kodu boş olamaz.")
    @Size(min = 6, max = 6, message = "Doğrulama kodu 6 haneli olmalıdır.")
    private String code;
}