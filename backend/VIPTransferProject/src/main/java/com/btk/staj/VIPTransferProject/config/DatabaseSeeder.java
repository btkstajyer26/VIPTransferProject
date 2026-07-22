package com.btk.staj.VIPTransferProject.config;

import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.Vehicle;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.enums.VehicleClass;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import com.btk.staj.VIPTransferProject.repository.VehicleRepository;
import com.btk.staj.VIPTransferProject.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoyaltyService loyaltyService;

    @Override
    public void run(String... args) throws Exception {
<<<<<<< HEAD
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
=======
        seedUsers();
        seedVehicles();
    }

    private void seedUsers() {
        if (userRepository.findByPhoneNumber("05551111111").isEmpty()) {
            User admin = userRepository.save(User.builder()
                    .phoneNumber("05551111111")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.ADMIN)
                    .build());
            loyaltyService.createLoyaltyAccount(admin.getId());
            log.info("Admin kullanici olusturuldu: 05551111111 / 123456");
        }

        if (userRepository.findByPhoneNumber("05551111112").isEmpty()) {
            User customer = userRepository.save(User.builder()
                    .phoneNumber("05551111112")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.CUSTOMER)
                    .build());
            loyaltyService.createLoyaltyAccount(customer.getId());
            log.info("Test musteri kullanicisi olusturuldu: 05551111112 / 123456");
>>>>>>> 9a99721f982383d36bf36d72aed453e54d11f9b8
        }
    }

    private void seedVehicles() {
        if (vehicleRepository.count() > 0) {
            log.info("Araclar zaten mevcut, vehicle seeding atlandi.");
            return;
        }

        List<Vehicle> vehicles = List.of(
                Vehicle.builder()
                        .plateNumber("34BTK001").brand("Toyota").model("Corolla")
                        .vehicleClass(VehicleClass.ECONOMY).capacity((short) 4)
                        .basePriceMultiplier(new BigDecimal("0.80"))
                        .openingPrice(new BigDecimal("200.00")).year((short) 2022).build(),
                Vehicle.builder()
                        .plateNumber("34BTK002").brand("Mercedes-Benz").model("C 200")
                        .vehicleClass(VehicleClass.STANDARD).capacity((short) 4)
                        .basePriceMultiplier(new BigDecimal("1.00"))
                        .openingPrice(new BigDecimal("350.00")).year((short) 2023).build(),
                Vehicle.builder()
                        .plateNumber("34BTK003").brand("Mercedes-Benz").model("E 220 d")
                        .vehicleClass(VehicleClass.BUSINESS).capacity((short) 4)
                        .basePriceMultiplier(new BigDecimal("1.30"))
                        .openingPrice(new BigDecimal("500.00")).year((short) 2023).build(),
                Vehicle.builder()
                        .plateNumber("34BTK004").brand("BMW").model("7 Serisi 740i")
                        .vehicleClass(VehicleClass.VIP).capacity((short) 4)
                        .basePriceMultiplier(new BigDecimal("1.60"))
                        .openingPrice(new BigDecimal("750.00")).year((short) 2024).build(),
                Vehicle.builder()
                        .plateNumber("34BTK005").brand("Mercedes-Benz").model("S 450 4MATIC")
                        .vehicleClass(VehicleClass.LUXURY).capacity((short) 4)
                        .basePriceMultiplier(new BigDecimal("2.00"))
                        .openingPrice(new BigDecimal("1200.00")).year((short) 2024).build(),
                Vehicle.builder()
                        .plateNumber("34BTK006").brand("Volkswagen").model("Caravelle")
                        .vehicleClass(VehicleClass.MINIVAN).capacity((short) 8)
                        .basePriceMultiplier(new BigDecimal("1.20"))
                        .openingPrice(new BigDecimal("600.00")).year((short) 2022).build()
        );

        vehicleRepository.saveAll(vehicles);
        log.info("{} arac seed'lendi.", vehicles.size());
    }
}
