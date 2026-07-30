package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.ChangePasswordRequest;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.exception.InvalidRequestException;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.exception.UnauthorizedException;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .passwordHash("old-password-hash")
                .active(true)
                .build();
    }

    @Test
    void changePassword_validRequest_encodesAndSavesNewPassword() {
        ChangePasswordRequest request = request("Current1!", "NewPassword1!", "NewPassword1!");
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Current1!", "old-password-hash")).thenReturn(true);
        when(passwordEncoder.matches("NewPassword1!", "old-password-hash")).thenReturn(false);
        when(passwordEncoder.encode("NewPassword1!")).thenReturn("new-password-hash");

        userService.changePassword(1L, request);

        verify(passwordEncoder).encode("NewPassword1!");
        verify(userRepository).save(user);
        org.assertj.core.api.Assertions.assertThat(user.getPasswordHash()).isEqualTo("new-password-hash");
    }

    @Test
    void changePassword_userNotFound_throwsException() {
        ChangePasswordRequest request = request("Current1!", "NewPassword1!", "NewPassword1!");
        when(userRepository.findByIdAndActiveTrue(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.changePassword(99L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");

        verifyNoInteractions(passwordEncoder);
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_currentPasswordIsWrong_throwsException() {
        ChangePasswordRequest request = request("Wrong1!", "NewPassword1!", "NewPassword1!");
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Wrong1!", "old-password-hash")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(1L, request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Mevcut şifre yanlış.");

        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_passwordConfirmationDoesNotMatch_throwsException() {
        ChangePasswordRequest request = request("Current1!", "NewPassword1!", "Different1!");
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Current1!", "old-password-hash")).thenReturn(true);

        assertThatThrownBy(() -> userService.changePassword(1L, request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("eşleşmiyor");

        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_newPasswordIsSameAsCurrent_throwsException() {
        ChangePasswordRequest request = request("SamePassword1!", "SamePassword1!", "SamePassword1!");
        when(userRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("SamePassword1!", "old-password-hash")).thenReturn(true);

        assertThatThrownBy(() -> userService.changePassword(1L, request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("aynı olamaz");

        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any());
    }

    private ChangePasswordRequest request(String currentPassword, String newPassword, String confirmPassword) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(currentPassword);
        request.setNewPassword(newPassword);
        request.setConfirmPassword(confirmPassword);
        return request;
    }
}
