package com.btk.staj.VIPTransferProject.config;

import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import com.btk.staj.VIPTransferProject.service.LoyaltyService;
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
    private final LoyaltyService loyaltyService;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByPhoneNumber("05551111111").isEmpty() ) {

            log.info("Sistemde admin kullanicisi bulunamadi. Varsayilan admin olusturuluyor...");

            User adminUser = User.builder()
                    .phoneNumber("05551111111")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.ADMIN)
                    .build();

            userRepository.save(adminUser);
            loyaltyService.createLoyaltyAccount(adminUser.getId());

            log.info("Varsayilan admin kullanicisi basariyla veritabanina kaydedildi.");
        } else if(userRepository.findByPhoneNumber("05551111112").isEmpty()){
            User c1 = User.builder()
                    .phoneNumber("05551111112")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.CUSTOMER)
                    .build();
            userRepository.save(c1);
            loyaltyService.createLoyaltyAccount(c1.getId());
        } else{
            log.info("Veritabaninda kullancılar mevcut. Seeding islemi atlandi.");

        }
    }
}