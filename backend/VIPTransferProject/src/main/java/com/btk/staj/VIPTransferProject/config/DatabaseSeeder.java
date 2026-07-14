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
        if (userRepository.findByPhoneNumber("05551111111").isEmpty()) {

            log.info("Sistemde admin kullanicisi bulunamadi. Varsayilan admin olusturuluyor...");

            User adminUser = User.builder()
                    .phoneNumber("05551111111")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.ADMIN)
                    .build();


            userRepository.save(adminUser);

            log.info("Varsayilan admin kullanicisi basariyla veritabanina kaydedildi.");
        } else {
            log.info("Veritabaninda admin kullanicisi mevcut. Seeding islemi atlandi.");
        }
    }
}