package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.dto.RegisterRequestDto;
import com.btk.staj.VIPTransferProject.dto.RegisterResponseDto;
import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.VerificationToken;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.exception.BusinessRuleException;
import com.btk.staj.VIPTransferProject.exception.UnauthorizedException;
import com.btk.staj.VIPTransferProject.repository.RefreshTokenRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import com.btk.staj.VIPTransferProject.repository.VerificationTokenRepository;
import com.btk.staj.VIPTransferProject.exception.TokenRefreshException;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final EmailService emailService;
    private final LoyaltyService loyaltyService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService; // Yeni eklendi

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String deviceInfo) {
        log.info("Giriş denemesi başlatıldı. Email: {}, Telefon: {}", request.getEmail(), request.getPhoneNumber());

        User user;

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> {
                        log.warn("Güvenlik - Başarısız Giriş: Bulunamayan e-posta ({})", request.getEmail());
                        return new UnauthorizedException("Kullanıcı adı veya şifre hatalı!");
                    });
        } else if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                    .orElseThrow(() -> {
                        log.warn("Güvenlik - Başarısız Giriş: Bulunamayan telefon numarası ({})", request.getPhoneNumber());
                        return new UnauthorizedException("Kullanıcı adı veya şifre hatalı!");
                    });
        } else {
            throw new BusinessRuleException("Lütfen e-posta adresinizi veya telefon numaranızı giriniz!");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Güvenlik - Başarısız Giriş: Hatalı şifre denemesi ({})", user.getEmail() != null ? user.getEmail() : user.getPhoneNumber());
            throw new UnauthorizedException("Kullanıcı adı veya şifre hatalı!");
        }

        if (!user.isEmailVerified()) {
            log.warn("Güvenlik - Onaysız Giriş Denemesi: E-posta henüz doğrulanmamış ({})", user.getEmail());
            throw new UnauthorizedException("Lütfen önce e-posta adresinizi doğrulayın!");
        }

        String identifier = user.getPhoneNumber() != null ? user.getPhoneNumber() : user.getEmail();

        RefreshToken refreshToken=refreshTokenService.createRefreshToken(user.getId(),ipAddress,deviceInfo);

        String refreshTokenString = refreshToken.getToken();

        Long sessionId=(refreshToken.getId());

        String accessToken = jwtUtil.generateToken(identifier, user.getId(), user.getRole().name(),sessionId);



        log.info("Güvenlik - Başarılı Giriş: Kullanıcı ({}) için token üretildi.", identifier);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenString)
                .tokenType("Bearer")
                .userId(user.getId())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public AuthResponse refreshAccessToken(String refreshTokenRequest, String currentIpAddress, String currentDeviceInfo) {
        // Hata yakalama işi burada (Eskiden Controller'da RuntimeException ile yapıyordun)
        RefreshToken token = refreshTokenService.findByToken(refreshTokenRequest)
                .orElseThrow(() -> new TokenRefreshException("Refresh token sistemde bulunamadı veya geçersiz!"));

        // Güvenlik doğrulaması
        refreshTokenService.verifyExpiration(token, currentIpAddress, currentDeviceInfo);

        User user = token.getUser();
        String identifier = user.getPhoneNumber() != null ? user.getPhoneNumber() : user.getEmail();

        // Yeni token üretimi
        String newAccessToken = jwtUtil.generateToken(identifier, user.getId(), user.getRole().name(),token.getId());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshTokenRequest)
                .tokenType("Bearer")
                .userId(user.getId())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public void logout(String refreshTokenRequest) {
        RefreshToken token = refreshTokenService.findByToken(refreshTokenRequest)
                .orElseThrow(() -> new TokenRefreshException("Geçersiz ya da süresi dolmuş token."));

        refreshTokenService.revokeToken(token);
        log.info("Kullanıcı çıkış yaptı. İptal edilen Token ID: {}", token.getId());
    }

    @Transactional
    public RegisterResponseDto register(RegisterRequestDto request) {
        // ... (Bu metotta bir değişiklik yok, senin gönderdiğin haliyle kalacak)
        log.info("Yeni kayıt denemesi. Email: {}, Telefon: {}", request.getEmail(), request.getPhoneNumber());

        userRepository.findByEmail(request.getEmail()).ifPresent(existingUser -> {
            if (!existingUser.isGuest() || !existingUser.getPhoneNumber().equals(request.getPhoneNumber())) {
                throw new BusinessRuleException("Bu e-posta adresi zaten kullanımda!");
            }
        });

        User userToSave;
        Optional<User> existingUserOpt = userRepository.findByPhoneNumber(request.getPhoneNumber());

        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();

            if (existingUser.isGuest()) {
                log.info("Misafir kullanıcı tespit edildi, üyeliğe dönüştürülüyor. Telefon: {}", request.getPhoneNumber());

                existingUser.setFirstName(request.getFirstName());
                existingUser.setLastName(request.getLastName());
                existingUser.setEmail(request.getEmail());
                existingUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                existingUser.setRole(UserRole.CUSTOMER);
                existingUser.setGuest(false);
                existingUser.setEmailVerified(false);

                userToSave = existingUser;
            } else {
                throw new BusinessRuleException("Bu telefon numarası zaten kullanımda!");
            }
        } else {
            log.info("Yeni kullanıcı oluşturuluyor. Telefon: {}", request.getPhoneNumber());

            userToSave = User.builder()
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .email(request.getEmail())
                    .phoneNumber(request.getPhoneNumber())
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .role(UserRole.CUSTOMER)
                    .guest(false)
                    .emailVerified(false)
                    .build();
        }

        User savedUser = userRepository.save(userToSave);

        try {
            loyaltyService.createLoyaltyAccount(savedUser.getId());
            log.info("Kullanıcı (ID: {}) için sadakat hesabı oluşturuldu.", savedUser.getId());
        } catch (Exception e) {
            log.warn("Sadakat hesabı oluşturulurken veya kontroller sırasında durum oluştu: {}", e.getMessage());
        }

        verificationTokenRepository.findByUser(savedUser)
                .ifPresent(verificationTokenRepository::delete);

        String token = UUID.randomUUID().toString();
        VerificationToken verificationToken = VerificationToken.builder()
                .token(token)
                .user(savedUser)
                .expiryDate(LocalDateTime.now().plusMinutes(30))
                .build();

        verificationTokenRepository.save(verificationToken);

        emailService.sendVerificationEmail(savedUser.getEmail(), token);
        log.info("Kayıt/Dönüşüm başarılı, doğrulama maili gönderildi: {}", savedUser.getEmail());

        return RegisterResponseDto.builder()
                .message("Kayıt başarılı! Lütfen e-postanıza gönderilen doğrulama bağlantısına tıklayın.")
                .emailVerificationRequired(true)
                .build();
    }

    @Transactional
    public String verifyEmail(String token) {
        log.info("E-posta doğrulama isteği token: {}", token);

        VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new BusinessRuleException("Geçersiz doğrulama bağlantısı!"));

        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BusinessRuleException("Doğrulama bağlantısının süresi dolmuş!");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        user.setPhoneVerified(true);

        userRepository.save(user);
        verificationTokenRepository.delete(verificationToken);

        log.info("E-posta ve telefon başarıyla doğrulandı: {}", user.getEmail());
        return "E-posta ve telefon numaranız başarıyla doğrulandı! Artık giriş yapabilirsiniz.";
    }
}