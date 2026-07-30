package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;

@Slf4j
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AppExceptionHandler {

    // ── 404 Not Found (Data yok -> Void) ─────────────────────────────────────
    @ExceptionHandler({
            ResourceNotFoundException.class,
            VehicleNotFoundException.class,
            UserNotFoundException.class,
            NotificationNotFoundException.class,
            NotificationTemplateNotFoundException.class,
            TierConfigNotFoundException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleNotFound(RuntimeException ex) {
        log.warn("404 Not Found: {}", ex.getMessage());
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // ── 403 Forbidden (Data yok -> Void) ─────────────────────────────────────
    @ExceptionHandler({
            ForbiddenOperationException.class,
            TokenRefreshException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleForbidden(RuntimeException ex) {
        log.warn("403 Forbidden: {}", ex.getMessage());
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    // ── 401 Unauthorized (Mail Onaysız Durumu) ───────────────────────────────
    @ExceptionHandler(UserUnverifiedException.class)
    // DİKKAT: Map yerine sadece String dönüyoruz
    public ResponseEntity<ApiResponse<String>> handleUserUnverified(UserUnverifiedException ex) {
        log.warn("401 Unauthorized (Unverified): {} - Email: {}", ex.getMessage(), ex.getEmail());

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.<String>builder()
                        .status(HttpStatus.UNAUTHORIZED.value())
                        .errorCode("USER_UNVERIFIED")
                        .message(ex.getMessage())
                        .data(ex.getEmail())      // Doğrudan string: "ornek@email.com"
                        .timestamp(OffsetDateTime.now())
                        .build());
    }

    // ── 401 Unauthorized (Diğer Tüm Yetki/Şifre Hataları) ────────────────────
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        log.warn("401 Unauthorized: {}", ex.getMessage());
        // Normal yetkisizliklerde BAD_CREDENTIALS dönüyoruz
        return build(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", ex.getMessage());
    }

    // ── 409 Conflict (Data yok -> Void) ──────────────────────────────────────
    @ExceptionHandler({
            BusinessRuleException.class,
            DuplicatePlateException.class,
            IllegalStateException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleConflict(RuntimeException ex) {
        log.warn("409 Conflict: {}", ex.getMessage());
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    // ── 400 Bad Request (Data yok -> Void) ───────────────────────────────────
    @ExceptionHandler({
            InvalidRequestException.class,
            IllegalArgumentException.class,
            UnsupportedNotificationChannelException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(RuntimeException ex) {
        log.warn("400 Bad Request: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(InvalidTierConfigException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidTierConfig(InvalidTierConfigException ex) {
        log.warn("400 Bad Request: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, "Tier config is invalid.");
    }

    // ── 502 Bad Gateway (Data yok -> Void) ───────────────────────────────────
    @ExceptionHandler(NotificationSendException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotificationSend(NotificationSendException ex) {
        log.error("502 Bad Gateway — bildirim teslim hatası: {}", ex.getMessage());
        return build(HttpStatus.BAD_GATEWAY, "Bildirim gönderilemedi. Lütfen daha sonra tekrar deneyin.");
    }

    // ── Ortak yardımcı 1 (Sadece Mesaj Dönen Standart Hatalar İçin) ──────────
    private ResponseEntity<ApiResponse<Void>> build(HttpStatus status, String message) {
        return build(status, null, message); // errorCode null gidiyor
    }

    // ── Ortak yardımcı 2 (Mesaj + Özel Hata Kodu Dönenler İçin) ──────────────
    private ResponseEntity<ApiResponse<Void>> build(HttpStatus status, String errorCode, String message) {
        return ResponseEntity.status(status)
                .body(ApiResponse.<Void>builder()
                        .status(status.value())
                        .errorCode(errorCode) // Frontend'in yakalayacağı kod
                        .message(message)
                        .timestamp(OffsetDateTime.now())
                        .build()); // data() alanı hiç setlenmediği için hep null
    }
}