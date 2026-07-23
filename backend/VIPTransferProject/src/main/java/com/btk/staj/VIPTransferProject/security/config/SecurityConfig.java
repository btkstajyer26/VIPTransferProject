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
    //private final ObjectMapper objectMapper;
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        log.info("Guvenlik duvari (SecurityFilterChain) yapilandiriliyor...");

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF KorumasÄ±nÄ± Kapat: Token tabanlÄ± (Stateless) Ã§alÄ±ÅŸtÄ±ÄŸÄ±mÄ±z iÃ§in buna ihtiyacÄ±mÄ±z yok
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // --- YENİ EKLENEN KISIM: SPRING SECURITY HATALARINI JSON'A ÇEVİR ---
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(unauthorizedEntryPoint())
                )

                .authorizeHttpRequests(auth -> auth
                        // OPTIONS isteklerine (Preflight) her zaman izin ver ki tarayÄ±cÄ± CORS kontrolÃ¼ yapabilsin
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/reservations").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reservations/guest/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/translations/**").permitAll()
                        // Monitoring iÃ§in
                        .requestMatchers("/actuator/**").permitAll()
                        // Swagger / OpenAPI UI
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                        ).permitAll()
                        //araÃ§ listesi iÃ§in 
                        .requestMatchers(HttpMethod.GET, "/api/vehicles").permitAll()
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

        // React/Frontend uygulamasÄ±nÄ±n Ã§alÄ±ÅŸtÄ±ÄŸÄ± adresleri buraya ekliyoruz
        // CanlÄ±ya Ã§Ä±karken buraya gerÃ§ek domain adresini de (Ã¶rn: https://viptransfer.com) eklemelisin
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:5173" , "http://192.168.*.*:5173"));

        // Frontend'in atabileceÄŸi HTTP metotlarÄ±
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Ä°zin verilen Header'lar. Authorization ve Content-Type mutlaka olmalÄ±.
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));

        // Kimlik bilgisi (Cookie veya Header Ã¼zerinden) taÅŸÄ±nmasÄ±na izin ver
        configuration.setAllowCredentials(true);

        // Bu CORS ayarlarÄ±nÄ± tÃ¼m uÃ§ noktalar (/**) iÃ§in geÃ§erli kÄ±l
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

            String timestamp = OffsetDateTime.now().toString();
            String message = "Bu işlemi gerçekleştirmek için giriş yapmalısınız.";

            // Text block ile JSON şablonu
            String jsonResponse = """
                    {
                      "timestamp": "%s",
                      "status": 401,
                      "message": "%s",
                      "data": null
                    }
                    """.formatted(timestamp, message);

            response.getWriter().write(jsonResponse);
        };
    }
    @Bean
    public PasswordEncoder passwordEncoder() {
        log.debug("Sistem icin BCrypt Password Encoder bean'i olusturuldu.");
        return new BCryptPasswordEncoder();
    }
}