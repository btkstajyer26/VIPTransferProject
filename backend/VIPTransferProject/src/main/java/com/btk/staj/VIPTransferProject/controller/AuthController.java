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

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtUtil jwtUtil;

    // 1. GÄ°RÄ°Å YAP METODU
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request,HttpServletRequest httpRequest) {

        AuthResponse authResponse = authService.login(request);

        // IP ve Cihaz bilgisini HTTP isteÄŸinden Ã§ekiyoruz
        String ipAddress = httpRequest.getRemoteAddr();
        String deviceInfo = httpRequest.getHeader("User-Agent"); // Ã–rn: Mozilla/5.0 (Windows NT 10.0...)

        // Token'Ä± IP ve Cihaz bilgisiyle Ã¼retiyoruz
        String refreshTokenString = refreshTokenService.createRefreshToken(authResponse.getUserId(), ipAddress, deviceInfo).getToken();
        authResponse.setRefreshToken(refreshTokenString);
//        Cookie cookie = new Cookie("refreshToken", refreshTokenString);
//        cookie.setPath("/api/auth");
//        cookie.setHttpOnly(true);
//        cookie.setMaxAge(7 * 24 * 60 * 60);
//        response.addCookie(cookie);

        return ResponseEntity.ok(authResponse);
    }

    // 2. YENÄ° ACCESS TOKEN ALMA (frontend'den gelen Request'teki Refresh Token okunarak yapÄ±lÄ±r)
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshAccessToken(@Valid @RequestBody RefreshTokenRequest refreshRequest,HttpServletRequest httpRequest) {
        String refreshTokenRequest = refreshRequest.getRefreshToken();

        // Ä°steÄŸi yapanÄ±n anlÄ±k bilgilerini alÄ±yoruz
        String currentIpAddress = httpRequest.getRemoteAddr();
        String currentDeviceInfo = httpRequest.getHeader("User-Agent");

        return refreshTokenService.findByToken(refreshTokenRequest)
                // TÃ¼m gÃ¼venlik (sÃ¼re, iptal, hÄ±rsÄ±zlÄ±k) doÄŸrulamalarÄ±nÄ± tek satÄ±rda yapÄ±yoruz
                .map(token -> refreshTokenService.verifyExpiration(token, currentIpAddress, currentDeviceInfo))
                .map(RefreshToken::getUser)
                .map(user -> {
                    // GÃ¼venlik testlerini geÃ§ti, yeni Access Token Ã¼retiliyor
                    String newAccessToken = jwtUtil.generateToken(user.getPhoneNumber(), user.getId(), user.getRole().name());

                    return ResponseEntity.ok(AuthResponse.builder()
                            .accessToken(newAccessToken)
                            .refreshToken(refreshTokenRequest) // AynÄ± refresh token ile devam ediliyor
                            .tokenType("Bearer")
                            .userId(user.getId())
                            .build());
                })
                .orElseThrow(() -> new RuntimeException("Refresh token sistemde bulunamadÄ±!"));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logoutUser(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        String refreshTokenRequest = refreshRequest.getRefreshToken();

        // Token veritabanÄ±nda varsa bul ve 'revoked' (iptal) durumuna Ã§ek
        refreshTokenService.findByToken(refreshTokenRequest)
                .ifPresent(refreshTokenService::revokeToken);

        return ResponseEntity.ok("BaÅŸarÄ±yla Ã§Ä±kÄ±ÅŸ yapÄ±ldÄ±.");
    }
}