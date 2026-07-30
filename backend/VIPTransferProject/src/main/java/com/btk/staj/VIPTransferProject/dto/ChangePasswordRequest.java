package com.btk.staj.VIPTransferProject.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Mevcut şifre boş bırakılamaz")
    private String currentPassword;

    @NotBlank(message = "Yeni şifre boş bırakılamaz")
    @Size(min = 8, message = "Yeni şifre en az 8 karakter olmalıdır")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).+$",
            message = "Yeni şifre en az 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir"
    )
    private String newPassword;

    @NotBlank(message = "Şifre tekrarı boş bırakılamaz")
    private String confirmPassword;
}
