package com.btk.staj.VIPTransferProject.security.filter;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // Farklı uç noktalar için IP bazlı ayrı kovalar tutuyoruz
    private final Map<String, Bucket> loginCache = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalCache = new ConcurrentHashMap<>();

    // Nesneleri JSON'a çevirmek için Jackson ObjectMapper
    private final ObjectMapper objectMapper;

    public RateLimitingFilter() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule()); // OffsetDateTime dönüşümü için gerekli
    }

    // Login (Auth) için kural: Dakikada maksimum 5 istek (Brute-force'u engeller)
    private Bucket createLoginBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1))))
                .build();
    }

    // Genel API istekleri için kural: Dakikada maksimum 100 istek
    private Bucket createGeneralBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Muaf tutulan yollar
        if (path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs") || path.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        // İstek atan kullanıcının IP adresini alıyoruz
        // Not: Docker veya Nginx kullanıyorsan "X-Forwarded-For" header'ına bakmak daha güvenilir olabilir.
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }

        Bucket bucket;
        // İstek Auth işlemi mi (Login, Refresh, Logout) yoksa genel bir veri isteği mi?
        if (path.startsWith("/api/v1/auth/")) {
            bucket = loginCache.computeIfAbsent(ip, k -> createLoginBucket());
        } else {
            bucket = generalCache.computeIfAbsent(ip, k -> createGeneralBucket());
        }

        // Kovadan 1 jeton tüketmeyi dene
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            // GÜVENLİK LOGU: IP adresi spam yapıyor
            log.warn("RATE LIMIT AŞILDI! IP: {}, Path: {}", ip, path);

            // Standart ApiResponse formatında hata dönüşü
            ApiResponse<String> apiResponse = ApiResponse.<String>builder()
                    .status(429)
                    .message("Çok fazla istek attınız. Lütfen bir süre bekleyip tekrar deneyin.")
                    .timestamp(OffsetDateTime.now())
                    .build();

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        }
    }
}