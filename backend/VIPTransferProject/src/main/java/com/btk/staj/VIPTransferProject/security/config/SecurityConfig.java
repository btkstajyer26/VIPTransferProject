package com.btk.staj.VIPTransferProject.security.config;

import com.btk.staj.VIPTransferProject.security.filter.JwtAuthenticationFilter;
import com.btk.staj.VIPTransferProject.security.filter.RateLimitingFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfig {
private final RateLimitingFilter rateLimitingFilter;
    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        log.info("Guvenlik duvari (SecurityFilterChain) yapilandiriliyor...");

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF Korumasını Kapat: Token tabanlı (Stateless) çalıştığımız için buna ihtiyacımız yok
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // OPTIONS isteklerine (Preflight) her zaman izin ver ki tarayıcı CORS kontrolü yapabilsin
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/reservations").permitAll()
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

    @Bean
    public PasswordEncoder passwordEncoder() {
        log.debug("Sistem icin BCrypt Password Encoder bean'i olusturuldu.");
        return new BCryptPasswordEncoder();
    }
}