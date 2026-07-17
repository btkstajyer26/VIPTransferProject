package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse login(LoginRequest request) {
        log.info("Giriş denemesi başlatıldı: {}", request.getPhoneNumber());
        User user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                .orElseThrow(() -> {
                    log.warn("Güvenlik - Başarısız Giriş: Bulunamayan telefon numarası ({})", request.getPhoneNumber());
                    return new RuntimeException("Kullanıcı adı veya şifre hatalı!");
                });

        // Şifreyi BCrypt ile doğrula (Düz metin şifre ile veritabanındaki hash'i kıyaslar)
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Güvenlik - Başarısız Giriş: Hatalı şifre denemesi ({})", request.getPhoneNumber());
            throw new RuntimeException("Kullanıcı adı veya şifre hatalı!");
        }
        String token = jwtUtil.generateToken(user.getPhoneNumber(),user.getId(),user.getRole().name());
        log.info("Güvenlik - Başarılı Giriş: Kullanıcı ({}) için token üretildi.", user.getPhoneNumber());
        return AuthResponse.builder()
                .accessToken(token)
                .userId(user.getId())
                .role(user.getRole().name())
                .build();
    }
}