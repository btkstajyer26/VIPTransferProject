package com.btk.staj.VIPTransferProject.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserRequest {

    @Size(max = 100, message = "Ad en fazla 100 karakter olabilir.")
    private String firstName;

    @Size(max = 100, message = "Soyad en fazla 100 karakter olabilir.")
    private String lastName;

    @Email(message = "Geçerli bir e-posta adresi giriniz.")
    @Size(max = 150, message = "E-posta en fazla 150 karakter olabilir.")
    private String email;

    @Pattern(
            regexp = "^[a-z]{2}(-[A-Z]{2})?$",
            message = "Dil kodu tr, en veya tr-TR biçiminde olmalıdır."
    )
    private String preferredLang;
}