package com.btk.staj.VIPTransferProject.security.config;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import com.btk.staj.VIPTransferProject.security.filter.JwtAuthenticationFilter;
import com.btk.staj.VIPTransferProject.security.filter.RateLimitingFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final RateLimitingFilter rateLimitingFilter;
    private final JwtAuthenticationFilter jwtAuthFilter;
    private final ObjectMapper objectMapper;
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        log.info("Guvenlik duvari (SecurityFilterChain) yapilandiriliyor...");

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF Korumasını Kapat: Token tabanlı (Stateless) çalıştığımız için buna ihtiyacımız yok
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // --- YENİ EKLENEN KISIM: SPRING SECURITY HATALARINI JSON'A ÇEVİR ---
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(unauthorizedEntryPoint())
                )

                .authorizeHttpRequests(auth -> auth
                        // OPTIONS isteklerine (Preflight) her zaman izin ver ki tarayıcı CORS kontrolü yapabilsin
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/reservations").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/reservations/guest/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/translations/**").permitAll()
                        // Monitoring için
                        .requestMatchers("/actuator/**").permitAll()
                        // Swagger / OpenAPI UI
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                        ).permitAll()
                        //araç listesi için 
                        .requestMatchers(HttpMethod.GET, "/api/v1/vehicles").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        log.info("Guvenlik duvari basariyla ayarlandi ve aktif edildi.");
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        log.info("CORS ayarlari yapilandiriliyor...");
        CorsConfiguration configuration = new CorsConfiguration();

        // React/Frontend uygulamasının çalıştığı adresleri buraya ekliyoruz
        // Canlıya çıkarken buraya gerçek domain adresini de (örn: https://viptransfer.com) eklemelisin
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:5173"));

        // Frontend'in atabileceği HTTP metotları
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // İzin verilen Header'lar. Authorization ve Content-Type mutlaka olmalı.
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));

        // Kimlik bilgisi (Cookie veya Header üzerinden) taşınmasına izin ver
        configuration.setAllowCredentials(true);

        // Bu CORS ayarlarını tüm uç noktalar (/**) için geçerli kıl
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    // Kimliksiz (Anonim) biri korumalı URL'ye istek atarsa 401 JSON döner
    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, authException) -> {
            log.warn("[AUTH-401] [EntryPoint] Kimlik doğrulama başarısız (Kimliksiz İstek): Hedef URL ->  {}", request.getRequestURI());

            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            ApiResponse<String> apiResponse = ApiResponse.<String>builder()
                    .status(401)
                    .message("Bu işlemi gerçekleştirmek için giriş yapmalısınız.")
                    .timestamp(OffsetDateTime.now())
                    .build();

            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        };
    }
    @Bean
    public PasswordEncoder passwordEncoder() {
        log.debug("Sistem icin BCrypt Password Encoder bean'i olusturuldu.");
        return new BCryptPasswordEncoder();
    }
}