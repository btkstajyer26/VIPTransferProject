package com.btk.staj.VIPTransferProject.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "E-posta boş olamaz.")
    @Email(message = "Geçerli bir e-posta adresi girin.")
    private String email;

    @NotBlank(message = "Doğrulama kodu boş olamaz.")
    @Size(min = 6, max = 6, message = "Doğrulama kodu 6 haneli olmalıdır.")
    private String code;

    @NotBlank(message = "Yeni şifre boş olamaz.")
    @Size(min = 6, max = 100, message = "Şifre en az 6 karakter olmalıdır.")
    private String newPassword;
}