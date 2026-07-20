package com.btk.staj.VIPTransferProject.mapper;

import com.btk.staj.VIPTransferProject.dto.UpdateUserRequest;
import com.btk.staj.VIPTransferProject.dto.UserResponse;
import com.btk.staj.VIPTransferProject.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .profilePhoto(user.getProfilePhoto())
                .preferredLang(user.getPreferredLang())
                .role(user.getRole())
                .guest(user.isGuest())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

    public void updateEntity(
            UpdateUserRequest request,
            User user) {

        if (hasText(request.getFirstName())) {
            user.setFirstName(request.getFirstName().trim());
        }

        if (hasText(request.getLastName())) {
            user.setLastName(request.getLastName().trim());
        }

        if (hasText(request.getEmail())) {
            user.setEmail(request.getEmail().trim().toLowerCase());
        }

        if (hasText(request.getPreferredLang())) {
            user.setPreferredLang(request.getPreferredLang().trim());
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}