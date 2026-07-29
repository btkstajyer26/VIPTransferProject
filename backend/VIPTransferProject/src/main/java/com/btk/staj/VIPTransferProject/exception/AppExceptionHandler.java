package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import io.micrometer.core.instrument.MeterRegistry;
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

    private final MeterRegistry meterRegistry;

    // Constructor Injection ile MeterRegistry alınıyor
    public AppExceptionHandler(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    // ── 404 Not Found ────────────────────────────────────────────────────────
    @ExceptionHandler({
            ResourceNotFoundException.class,
            VehicleNotFoundException.class,
            UserNotFoundException.class,
            NotificationNotFoundException.class,
            NotificationTemplateNotFoundException.class,
            TierConfigNotFoundException.class
    })
    public ResponseEntity<ApiResponse<String>> handleNotFound(RuntimeException ex) {
        log.warn("404 Not Found: {}", ex.getMessage());
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // ── 403 Forbidden ────────────────────────────────────────────────────────
    @ExceptionHandler({
            ForbiddenOperationException.class,
            TokenRefreshException.class
    })
    public ResponseEntity<ApiResponse<String>> handleForbidden(RuntimeException ex) {
        log.warn("403 Forbidden: {}", ex.getMessage());

        // SOC SENSÖRÜ: 403 Yetki Aşımı Metriği
        meterRegistry.counter("soc_security_alerts_total",
                "alert_type", "forbidden_access",
                "reason", ex.getClass().getSimpleName()).increment();

        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    // ── 401 Unauthorized ─────────────────────────────────────────────────────
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<String>> handleUnauthorized(UnauthorizedException ex) {
        log.warn("401 Unauthorized: {}", ex.getMessage());

        // SOC SENSÖRÜ: 401 Yetkisiz Giriş / Hatalı Şifre Metriği
        meterRegistry.counter("soc_security_alerts_total",
                "alert_type", "unauthorized_access",
                "reason", "BAD_CREDENTIALS").increment();

        return build(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    // ── 409 Conflict ─────────────────────────────────────────────────────────
    @ExceptionHandler({
            BusinessRuleException.class,
            DuplicatePlateException.class,
            IllegalStateException.class
    })
    public ResponseEntity<ApiResponse<String>> handleConflict(RuntimeException ex) {
        log.warn("409 Conflict: {}", ex.getMessage());
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    // ── 400 Bad Request ──────────────────────────────────────────────────────
    @ExceptionHandler({
            InvalidRequestException.class,
            IllegalArgumentException.class,
            UnsupportedNotificationChannelException.class,
            InvalidTierConfigException.class
    })
    public ResponseEntity<ApiResponse<String>> handleBadRequest(RuntimeException ex) {
        log.warn("400 Bad Request: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // ── 502 Bad Gateway ──────────────────────────────────────────────────────
    @ExceptionHandler(NotificationSendException.class)
    public ResponseEntity<ApiResponse<String>> handleNotificationSend(NotificationSendException ex) {
        log.error("502 Bad Gateway — bildirim teslim hatası: {}", ex.getMessage());
        return build(HttpStatus.BAD_GATEWAY, "Bildirim gönderilemedi. Lütfen daha sonra tekrar deneyin.");
    }

    // ── Ortak yardımcı ───────────────────────────────────────────────────────
    private ResponseEntity<ApiResponse<String>> build(HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .body(ApiResponse.<String>builder()
                        .status(status.value())
                        .message(message)
                        .timestamp(OffsetDateTime.now())
                        .build());
    }
}