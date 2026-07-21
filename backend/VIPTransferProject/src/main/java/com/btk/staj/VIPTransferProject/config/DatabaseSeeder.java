package com.btk.staj.VIPTransferProject.config;

import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        log.info("Sistem başlatılıyor, varsayılan kullanıcılar kontrol ediliyor...");

        // 1. ADMIN KULLANICISI (Sadece yoksa ekler)
        if (userRepository.findByEmail("admin@admin.com").isEmpty()) {
            User adminUser = User.builder()
                    .email("admin@admin.com")
                    .phoneNumber("05551111111")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.ADMIN)
                    .isEmailVerified(true)
                    .build();

            userRepository.save(adminUser);
            log.info("Varsayılan ADMIN kullanıcısı oluşturuldu: admin@admin.com");
        }

        // 2. CUSTOMER KULLANICISI (Sadece yoksa ekler)
        if (userRepository.findByEmail("customer@test.com").isEmpty()) {
            User customerUser = User.builder()
                    .email("customer@test.com")
                    .phoneNumber("05551111112")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.CUSTOMER)
                    .isEmailVerified(true)
                    .build();

            userRepository.save(customerUser);
            log.info("Varsayılan CUSTOMER kullanıcısı oluşturuldu: customer@test.com");
        }
    }
}