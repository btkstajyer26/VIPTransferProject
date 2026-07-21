package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.UpdateUserRequest;
import com.btk.staj.VIPTransferProject.dto.UserResponse;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.exception.InvalidRequestException;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

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
}
