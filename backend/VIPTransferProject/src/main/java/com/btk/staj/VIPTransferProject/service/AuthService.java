package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.dto.RegisterRequestDto;
import com.btk.staj.VIPTransferProject.dto.RegisterResponseDto;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.VerificationToken;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import com.btk.staj.VIPTransferProject.repository.VerificationTokenRepository;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse login(LoginRequest request) {
        log.info("Giriş denemesi başlatıldı. Email: {}, Telefon: {}", request.getEmail(), request.getPhoneNumber());

        User user;

        // 1. Email varsa Email ile, yoksa Telefon Numarası ile Kullanıcıyı Bul
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> {
                        log.warn("Güvenlik - Başarısız Giriş: Bulunamayan e-posta ({})", request.getEmail());
                        return new RuntimeException("Kullanıcı adı veya şifre hatalı!");
                    });
        } else if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                    .orElseThrow(() -> {
                        log.warn("Güvenlik - Başarısız Giriş: Bulunamayan telefon numarası ({})", request.getPhoneNumber());
                        return new RuntimeException("Kullanıcı adı veya şifre hatalı!");
                    });
        } else {
            throw new RuntimeException("Lütfen e-posta adresinizi veya telefon numaranızı giriniz!");
        }

        // 2. Şifre Doğrulama (BCrypt)
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Güvenlik - Başarısız Giriş: Hatalı şifre denemesi ({})", user.getEmail() != null ? user.getEmail() : user.getPhoneNumber());
            throw new RuntimeException("Kullanıcı adı veya şifre hatalı!");
        }

        // 3. E-posta Doğrulama Kontrolü
        if (!user.isEmailVerified()) {
            log.warn("Güvenlik - Onaysız Giriş Denemesi: E-posta henüz doğrulanmamış ({})", user.getEmail());
            throw new RuntimeException("Lütfen önce e-posta adresinizi doğrulayın!");
        }

        // 4. JWT Token Üretme
        String identifier = user.getPhoneNumber() != null ? user.getPhoneNumber() : user.getEmail();
        String token = jwtUtil.generateToken(identifier, user.getId(), user.getRole().name());

        log.info("Güvenlik - Başarılı Giriş: Kullanıcı ({}) için token üretildi.", identifier);

        return AuthResponse.builder()
                .accessToken(token)
                .userId(user.getId())
                .role(user.getRole().name())
                .build();
    }
    @Transactional
    public RegisterResponseDto register(RegisterRequestDto request) {
        log.info("Yeni kayıt denemesi: {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Bu e-posta adresi zaten kullanımda!");
        }

        if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new RuntimeException("Bu telefon numarası zaten kullanımda!");
        }

        // 1. Yeni Kullanıcı Oluştur (isEmailVerified = false)
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.CUSTOMER)
                .build();

        User savedUser = userRepository.save(user);

        // 2. Verification Token Üret (30 dakika geçerli)
        String token = UUID.randomUUID().toString();
        VerificationToken verificationToken = VerificationToken.builder()
                .token(token)
                .user(savedUser)
                .expiryDate(LocalDateTime.now().plusMinutes(30))
                .build();

        verificationTokenRepository.save(verificationToken);

        // 3. E-posta Gönder
        emailService.sendVerificationEmail(savedUser.getEmail(), token);
        log.info("Kayıt başarılı, doğrulama maili gönderildi: {}", savedUser.getEmail());

        return RegisterResponseDto.builder()
                .message("Kayıt başarılı! Lütfen e-postanıza gönderilen doğrulama bağlantısına tıklayın.")
                .emailVerificationRequired(true)
                .build();
    }

    @Transactional
    public String verifyEmail(String token) {
        log.info("E-posta doğrulama isteği token: {}", token);

        VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Geçersiz doğrulama bağlantısı!"));

        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Doğrulama bağlantısının süresi dolmuş!");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        userRepository.save(user);

        // Kullanılan token'ı temizle
        verificationTokenRepository.delete(verificationToken);

        log.info("E-posta başarıyla doğrulandı: {}", user.getEmail());
        return "E-posta adresiniz başarıyla doğrulandı! Artık giriş yapabilirsiniz.";
    }
}