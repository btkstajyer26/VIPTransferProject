package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.service.AuthService;
import com.btk.staj.VIPTransferProject.service.RefreshTokenService;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest, // İsteği yakalıyoruz
                                              HttpServletResponse response) {

        AuthResponse authResponse = authService.login(request);

        // IP ve Cihaz bilgisini HTTP isteğinden çekiyoruz
        String ipAddress = httpRequest.getRemoteAddr();
        String deviceInfo = httpRequest.getHeader("User-Agent"); // Örn: Mozilla/5.0 (Windows NT 10.0...)

        // Token'ı IP ve Cihaz bilgisiyle üretiyoruz
        String refreshTokenString = refreshTokenService.createRefreshToken(authResponse.getUserId(), ipAddress, deviceInfo).getToken();

        Cookie cookie = new Cookie("refreshToken", refreshTokenString);
        cookie.setPath("/api/v1/auth");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(7 * 24 * 60 * 60);
        response.addCookie(cookie);

        return ResponseEntity.ok(authResponse);
    }

    // 2. YENİ ACCESS TOKEN ALMA (Sadece Cookie'deki Refresh Token okunarak yapılır)
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshAccessToken(HttpServletRequest request) {
        String requestRefreshToken = null;

        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    requestRefreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (requestRefreshToken == null || requestRefreshToken.isEmpty()) {
            throw new RuntimeException("Refresh Token bulunamadı! Lütfen tekrar giriş yapın.");
        }

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    // Kullanıcıdan tekrar ID ve Rol alıp yeni Access Token üretiyoruz
                    String newAccessToken = jwtUtil.generateToken(user.getPhoneNumber(), user.getId(), user.getRole().name());

                    return ResponseEntity.ok(AuthResponse.builder().accessToken(newAccessToken).build());
                })
                .orElseThrow(() -> new RuntimeException("Refresh token geçersiz!"));
    }

    // 3. GÜVENLİ ÇIKIŞ METODU (Değişti)
    @PostMapping("/logout")
    public ResponseEntity<String> logoutUser(HttpServletRequest request, HttpServletResponse response) {
        String requestRefreshToken = null;

        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    requestRefreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (requestRefreshToken != null) {
            // Artık kullanıcının tüm oturumlarını silmek yerine, SADECE çıkış yaptığı cihazdaki token'ı iptal ediyoruz (Revoke)
            refreshTokenService.findByToken(requestRefreshToken)
                    .ifPresent(refreshTokenService::revokeToken);
        }

        Cookie cookie = new Cookie("refreshToken", null);
        cookie.setPath("/api/v1/auth");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok("Başarıyla çıkış yapıldı.");
    }
}