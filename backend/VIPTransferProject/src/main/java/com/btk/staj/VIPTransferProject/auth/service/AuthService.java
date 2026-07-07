package com.btk.staj.VIPTransferProject.auth.service;

import com.btk.staj.VIPTransferProject.auth.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.auth.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.auth.entity.User;
import com.btk.staj.VIPTransferProject.auth.repository.UserRepository;
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
        log.info("Giriş denemesi başlatıldı: {}", request.getUsername());
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.warn("Güvenlik - Başarısız Giriş: Bulunamayan kullanıcı adı ({})", request.getUsername());
                    return new RuntimeException("Kullanıcı adı veya şifre hatalı!");
                });

        // Şifreyi BCrypt ile doğrula (Düz metin şifre ile veritabanındaki hash'i kıyaslar)
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Güvenlik - Başarısız Giriş: Hatalı şifre denemesi ({})", request.getUsername());
            throw new RuntimeException("Kullanıcı adı veya şifre hatalı!");
        }
        String token = jwtUtil.generateToken(user.getUsername());
        log.info("Güvenlik - Başarılı Giriş: Kullanıcı ({}) için token üretildi.", user.getUsername());
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .role(user.getRole())
                .build();
    }
}