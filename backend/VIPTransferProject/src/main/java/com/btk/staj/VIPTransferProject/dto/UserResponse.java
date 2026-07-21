package com.btk.staj.VIPTransferProject.dto;

import com.btk.staj.VIPTransferProject.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private Long id;
    private String phoneNumber;
    private String email;
    private String firstName;
    private String lastName;
    private String profilePhoto;
    private String preferredLang;
    private UserRole role;
    private boolean guest;
    private boolean active;
    private OffsetDateTime createdAt;
}
