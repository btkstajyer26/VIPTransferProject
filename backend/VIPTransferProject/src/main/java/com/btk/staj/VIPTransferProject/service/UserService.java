package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.ChangePasswordRequest;
import com.btk.staj.VIPTransferProject.dto.UpdateUserRequest;
import com.btk.staj.VIPTransferProject.dto.UserResponse;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.exception.InvalidRequestException;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.exception.UnauthorizedException;
import com.btk.staj.VIPTransferProject.exception.UserNotFoundException;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateCurrentUser(Long userId, UpdateUserRequest request) {
        User user = userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));

        if (request.getFirstName() != null)    user.setFirstName(request.getFirstName());
        if (request.getLastName() != null)     user.setLastName(request.getLastName());
        if (request.getEmail() != null)        user.setEmail(request.getEmail());
        if (request.getPreferredLang() != null) user.setPreferredLang(request.getPreferredLang());

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Mevcut şifre yanlış.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new InvalidRequestException("Yeni şifre ve şifre tekrarı eşleşmiyor.");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new InvalidRequestException("Yeni şifre mevcut şifre ile aynı olamaz.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Kullanıcı şifresi değiştirildi. id={}", userId);
    }

    @Transactional
    public void deleteCurrentUser(Long userId) {
        User user = userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        user.setActive(false);
        userRepository.save(user);
        log.info("Kullanıcı pasif edildi. id={}", userId);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAllByActiveTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + id));
        return toResponse(user);
    }

    @Transactional
    public User findOrCreateGuestUser(String phoneNumber, String guestName) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new InvalidRequestException("Misafir rezervasyon için telefon numarası zorunludur.");
        }
        return userRepository.findByPhoneNumber(phoneNumber)
                .orElseGet(() -> {
                    User guest = User.builder()
                            .phoneNumber(phoneNumber)
                            .firstName(guestName)
                            .guest(true)
                            .build();
                    User saved = userRepository.save(guest);
                    log.info("Yeni misafir kullanıcı oluşturuldu. id={}, phone={}", saved.getId(), phoneNumber);
                    return saved;
                });
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .phoneNumber(u.getPhoneNumber())
                .email(u.getEmail())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .profilePhoto(u.getProfilePhoto())
                .preferredLang(u.getPreferredLang())
                .role(u.getRole())
                .guest(u.isGuest())
                .active(u.isActive())
                .createdAt(u.getCreatedAt())
                .build();
    }
    @Transactional
    public void deleteUserById(Long userId, Long adminId) {

        if (userId.equals(adminId)) {
            throw new IllegalArgumentException(
                    "Admin bu endpoint üzerinden kendi hesabını silemez."
            );
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new UserNotFoundException(userId)
                );

        if (!user.isActive()) {
            throw new UserNotFoundException(userId);
        }

        user.setActive(false);
        user.setDeletedAt(OffsetDateTime.now());

        userRepository.save(user);
    }
}
