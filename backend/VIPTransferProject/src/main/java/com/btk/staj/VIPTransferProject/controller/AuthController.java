package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.dto.RefreshTokenRequest;
import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.service.AuthService;
import com.btk.staj.VIPTransferProject.service.RefreshTokenService;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.btk.staj.VIPTransferProject.dto.RegisterRequestDto;
import com.btk.staj.VIPTransferProject.dto.RegisterResponseDto;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtUtil jwtUtil;

    // 1. GİRİŞ YAP METODU
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request,HttpServletRequest httpRequest) {

        AuthResponse authResponse = authService.login(request);

        // IP ve Cihaz bilgisini HTTP isteğinden çekiyoruz
        String ipAddress = httpRequest.getRemoteAddr();
        String deviceInfo = httpRequest.getHeader("User-Agent"); // Örn: Mozilla/5.0 (Windows NT 10.0...)

        // Token'ı IP ve Cihaz bilgisiyle üretiyoruz
        String refreshTokenString = refreshTokenService.createRefreshToken(authResponse.getUserId(), ipAddress, deviceInfo).getToken();
        authResponse.setRefreshToken(refreshTokenString);
//        Cookie cookie = new Cookie("refreshToken", refreshTokenString);
//        cookie.setPath("/api/v1/auth");
//        cookie.setHttpOnly(true);
//        cookie.setMaxAge(7 * 24 * 60 * 60);
//        response.addCookie(cookie);

        return ResponseEntity.ok(authResponse);
    }

    // 2. YENİ ACCESS TOKEN ALMA (frontend'den gelen Request'teki Refresh Token okunarak yapılır)
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshAccessToken(@Valid @RequestBody RefreshTokenRequest refreshRequest,HttpServletRequest httpRequest) {
        String refreshTokenRequest = refreshRequest.getRefreshToken();

        // İsteği yapanın anlık bilgilerini alıyoruz
        String currentIpAddress = httpRequest.getRemoteAddr();
        String currentDeviceInfo = httpRequest.getHeader("User-Agent");

        return refreshTokenService.findByToken(refreshTokenRequest)
                // Tüm güvenlik (süre, iptal, hırsızlık) doğrulamalarını tek satırda yapıyoruz
                .map(token -> refreshTokenService.verifyExpiration(token, currentIpAddress, currentDeviceInfo))
                .map(RefreshToken::getUser)
                .map(user -> {
                    // Güvenlik testlerini geçti, yeni Access Token üretiliyor
                    String newAccessToken = jwtUtil.generateToken(user.getPhoneNumber(), user.getId(), user.getRole().name());

                    return ResponseEntity.ok(AuthResponse.builder()
                            .accessToken(newAccessToken)
                            .refreshToken(refreshTokenRequest) // Aynı refresh token ile devam ediliyor
                            .tokenType("Bearer")
                            .userId(user.getId())
                            .build());
                })
                .orElseThrow(() -> new RuntimeException("Refresh token sistemde bulunamadı!"));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logoutUser(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        String refreshTokenRequest = refreshRequest.getRefreshToken();

        // Token veritabanında varsa bul ve 'revoked' (iptal) durumuna çek
        refreshTokenService.findByToken(refreshTokenRequest)
                .ifPresent(refreshTokenService::revokeToken);

        return ResponseEntity.ok("Başarıyla çıkış yapıldı.");
    }
    @PostMapping("/register")
    public ResponseEntity<RegisterResponseDto> register(@Valid @RequestBody RegisterRequestDto request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<String> verifyEmail(@RequestParam("token") String token) {
        return ResponseEntity.ok(authService.verifyEmail(token));
    }
}