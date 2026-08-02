package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.dto.RegisterRequestDto;
import com.btk.staj.VIPTransferProject.dto.RegisterResponseDto;
import com.btk.staj.VIPTransferProject.dto.auth.ForgotPasswordRequest;
import com.btk.staj.VIPTransferProject.dto.auth.ResetPasswordRequest;
import com.btk.staj.VIPTransferProject.dto.auth.VerifyEmailRequest;
import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.VerificationCode;
import com.btk.staj.VIPTransferProject.enums.CodePurpose;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.exception.BusinessRuleException;
import com.btk.staj.VIPTransferProject.exception.TokenRefreshException;
import com.btk.staj.VIPTransferProject.exception.UnauthorizedException;
import com.btk.staj.VIPTransferProject.exception.UserUnverifiedException;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import com.btk.staj.VIPTransferProject.repository.VerificationCodeRepository;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.micrometer.core.instrument.MeterRegistry;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final EmailService emailService;
    private final LoyaltyService loyaltyService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final MeterRegistry meterRegistry;

    private final SecureRandom secureRandom = new SecureRandom();

    // ==========================================
    // YARDIMCI METOTLAR (KOD ÜRETİMİ VE KAYIT)
    // ==========================================

    private String generateCode() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }

    private void saveVerificationCode(User user, CodePurpose purpose, int expiryMinutes) {
        // Varsa aynı kullanıcı ve amaç için oluşturulmuş eski kodu sil
        verificationCodeRepository.deleteByUserAndPurpose(user, purpose);

        String code = generateCode();

        VerificationCode verificationCode = VerificationCode.builder()
                .user(user)
                .code(code)
                .purpose(purpose)
                .expiryDate(LocalDateTime.now().plusMinutes(expiryMinutes))
                .attemptCount(0)
                .build();

        verificationCodeRepository.save(verificationCode);

        // E-posta gönderimi
        if (purpose == CodePurpose.EMAIL_VERIFICATION) {
            emailService.sendVerificationEmail(user.getEmail(), code);
        } else if (purpose == CodePurpose.PASSWORD_RESET) {
            emailService.sendPasswordResetEmail(user.getEmail(), code);
        }
    }

    // ==========================================
    // GİRİŞ & OTURUM İŞLEMLERİ
    // ==========================================

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String deviceInfo) {
        log.info("Giriş denemesi başlatıldı. Email: {}, Telefon: {}", request.getEmail(), request.getPhoneNumber());

        User user;

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> {
                        log.warn("Güvenlik - Başarısız Giriş: Bulunamayan e-posta ({})", request.getEmail());
                        meterRegistry.counter("soc_security_alerts_total", "reason", "BAD_CREDENTIALS").increment();
                        return new UnauthorizedException("Kullanıcı adı veya şifre hatalı!");
                    });
        } else if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                    .orElseThrow(() -> {
                        log.warn("Güvenlik - Başarısız Giriş: Bulunamayan telefon numarası ({})", request.getPhoneNumber());
                        meterRegistry.counter("soc_security_alerts_total", "reason", "BAD_CREDENTIALS").increment();
                        return new UnauthorizedException("Kullanıcı adı veya şifre hatalı!");
                    });
        } else {
            throw new BusinessRuleException("Lütfen e-posta adresinizi veya telefon numaranızı giriniz!");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Güvenlik - Başarısız Giriş: Hatalı şifre denemesi ({})", user.getEmail() != null ? user.getEmail() : user.getPhoneNumber());
            meterRegistry.counter("soc_security_alerts_total", "reason", "BAD_CREDENTIALS").increment();
            throw new UnauthorizedException("Kullanıcı adı veya şifre hatalı!");
        }

        if (!user.isEmailVerified()) {
            log.warn("Güvenlik - Onaysız Giriş Denemesi: E-posta henüz doğrulanmamış ({})", user.getEmail());
            throw new UserUnverifiedException("Lütfen önce e-posta adresinizi doğrulayın!", user.getEmail());
        }

        String identifier = user.getPhoneNumber() != null ? user.getPhoneNumber() : user.getEmail();

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId(), ipAddress, deviceInfo);
        String refreshTokenString = refreshToken.getToken();
        Long sessionId = refreshToken.getId();

        String accessToken = jwtUtil.generateToken(user.getId(),sessionId);

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
        RefreshToken token = refreshTokenService.findByToken(refreshTokenRequest)
                .orElseThrow(() -> new TokenRefreshException("Refresh token sistemde bulunamadı veya geçersiz!"));

        refreshTokenService.verifyExpiration(token, currentIpAddress, currentDeviceInfo);

        User user = token.getUser();
        String identifier = user.getPhoneNumber() != null ? user.getPhoneNumber() : user.getEmail();

        String newAccessToken = jwtUtil.generateToken(user.getId(),token.getId());

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

    // ==========================================
    // KAYIT & E-POSTA DOĞRULAMA İŞLEMLERİ
    // ==========================================

    @Transactional
    public RegisterResponseDto register(RegisterRequestDto request) {

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

        // 15 dakika geçerli E-posta Doğrulama Kodu (OTP) oluştur ve kaydet
        saveVerificationCode(savedUser, CodePurpose.EMAIL_VERIFICATION, 15);
        log.info("Kayıt/Dönüşüm başarılı, doğrulama kodu e-postaya gönderildi: {}", savedUser.getEmail());

        return RegisterResponseDto.builder()
                .message("Kayıt başarılı! Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu girin.")
                .emailVerificationRequired(true)
                .build();
    }

    @Transactional(noRollbackFor = BusinessRuleException.class)
    public void verifyEmail(VerifyEmailRequest request) {
        log.info("E-posta doğrulama isteği başlatıldı. Email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessRuleException("Kullanıcı bulunamadı."));

        VerificationCode verificationCode = verificationCodeRepository
                .findByUserAndPurpose(user, CodePurpose.EMAIL_VERIFICATION)
                .orElseThrow(() -> new BusinessRuleException("Geçerli bir doğrulama kodu bulunamadı."));

        // 1. Süre Kontrolü
        if (verificationCode.getExpiryDate().isBefore(LocalDateTime.now())) {
            verificationCodeRepository.delete(verificationCode);
            throw new BusinessRuleException("Kodun süresi dolmuş. Lütfen yeni doğrulama kodu talep edin.");
        }

        // 2. Kod Eşleşme ve Brute-Force Koruması Kontrolü
        if (!verificationCode.getCode().equals(request.getCode())) {
            int newAttemptCount = verificationCode.getAttemptCount() + 1;
            verificationCode.setAttemptCount(newAttemptCount);

            if (newAttemptCount >= 5) {
                verificationCodeRepository.delete(verificationCode);
                throw new BusinessRuleException("Çok fazla yanlış deneme. Lütfen yeni doğrulama kodu talep edin.");
            } else {
                verificationCodeRepository.save(verificationCode);
                int remaining = 5 - newAttemptCount;
                throw new BusinessRuleException("Hatalı kod. " + remaining + " deneme hakkınız kaldı.");
            }
        }

        // 3. Başarılı Doğrulama
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        userRepository.save(user);

        verificationCodeRepository.delete(verificationCode);
        log.info("E-posta ve telefon başarıyla doğrulandı: {}", user.getEmail());
    }
    @Transactional
    public void resendVerificationCode(String email) {
        log.info("Yeni doğrulama kodu talebi alındı. Email: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessRuleException("Kullanıcı bulunamadı."));

        if (user.isEmailVerified()) {
            throw new BusinessRuleException("Bu hesap zaten doğrulanmış. Lütfen giriş yapmayı deneyin.");
        }

        // Eski kod varsa veritabanında çakışma olmaması için siliyoruz
        verificationCodeRepository.findByUserAndPurpose(user, CodePurpose.EMAIL_VERIFICATION)
                .ifPresent(verificationCodeRepository::delete);

        // Register metodunda kullandığın aynı fonksiyonu çağırıyoruz!
        // Bu metodun içinde zaten yeni kod oluşturulup e-postaya gönderiliyor.
        saveVerificationCode(user, CodePurpose.EMAIL_VERIFICATION, 15);

        log.info("Kullanıcının isteği üzerine yeni doğrulama kodu gönderildi: {}", email);
    }

    // ==========================================
    // ŞİFRE SIFIRLAMA İŞLEMLERİ (YENİ)
    // ==========================================

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        log.info("Şifre sıfırlama talebi alındı. Email: {}", request.getEmail());

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());

        // Email Enumeration Koruması:
        // Kullanıcı veritabanında olmasa veya misafir olsa bile hata fırlatmıyoruz.
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (!user.isGuest()) {
                saveVerificationCode(user, CodePurpose.PASSWORD_RESET, 10);
                log.info("Şifre sıfırlama kodu oluşturuldu ve gönderildi. Email: {}", user.getEmail());
            }
        }
    }

    @Transactional(noRollbackFor = BusinessRuleException.class)
    public void resetPassword(ResetPasswordRequest request) {
        log.info("Şifre sıfırlama tamamlama isteği alındı. Email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessRuleException("Kullanıcı bulunamadı."));

        VerificationCode verificationCode = verificationCodeRepository
                .findByUserAndPurpose(user, CodePurpose.PASSWORD_RESET)
                .orElseThrow(() -> new BusinessRuleException("Geçerli bir şifre sıfırlama kodu bulunamadı."));

        // 1. Süre Kontrolü
        if (verificationCode.getExpiryDate().isBefore(LocalDateTime.now())) {
            verificationCodeRepository.delete(verificationCode);
            throw new BusinessRuleException("Kodun süresi dolmuş. Lütfen tekrar şifre sıfırlama isteği oluşturun.");
        }

        // 2. Kod Kontrolü ve Brute-Force Koruması
        if (!verificationCode.getCode().equals(request.getCode())) {
            int newAttemptCount = verificationCode.getAttemptCount() + 1;
            verificationCode.setAttemptCount(newAttemptCount);

            if (newAttemptCount >= 5) {
                verificationCodeRepository.delete(verificationCode);
                throw new BusinessRuleException("Çok fazla yanlış deneme. Lütfen tekrar şifre sıfırlama isteği oluşturun.");
            } else {
                verificationCodeRepository.save(verificationCode);
                int remaining = 5 - newAttemptCount;
                throw new BusinessRuleException("Hatalı kod. " + remaining + " deneme hakkınız kaldı.");
            }
        }

        // 3. Şifreyi Güncelle
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Kullanılan sıfırlama kodunu sil
        verificationCodeRepository.delete(verificationCode);
        log.info("Şifre başarıyla değiştirildi. Email: {}", user.getEmail());
    }
}