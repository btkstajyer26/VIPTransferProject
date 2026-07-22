package com.btk.staj.VIPTransferProject.config;

import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.Vehicle;
import com.btk.staj.VIPTransferProject.enums.UserRole;
import com.btk.staj.VIPTransferProject.enums.VehicleClass;
import com.btk.staj.VIPTransferProject.repository.LoyaltyTierConfigRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import com.btk.staj.VIPTransferProject.repository.VehicleRepository;
import com.btk.staj.VIPTransferProject.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final LoyaltyTierConfigRepository loyaltyTierConfigRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        seedLoyaltyTierConfigs();
        seedUsers();
        seedVehicles();
    }

    private void seedLoyaltyTierConfigs() {
        if (loyaltyTierConfigRepository.count() > 0) {
            log.info("Loyalty tier config kayitlari zaten mevcut, atlandi.");
            return;
        }

        String sql = "INSERT INTO loyalty_tier_config (tier, min_points, earn_rate, discount_percentage, priority_support, description) " +
                     "VALUES (CAST(? AS loyalty_tier), ?, ?, ?, ?, ?)";

        List<Object[]> configs = List.of(
            new Object[]{"BRONZE",      0,     new BigDecimal("1.00"), new BigDecimal("0.00"),  false, "Başlangıç seviyesi"},
            new Object[]{"SILVER",   1000,     new BigDecimal("1.50"), new BigDecimal("5.00"),  false, "Orta seviye"},
            new Object[]{"GOLD",     5000,     new BigDecimal("2.00"), new BigDecimal("10.00"), false, "İleri seviye"},
            new Object[]{"PLATINUM", 15000,    new BigDecimal("2.50"), new BigDecimal("15.00"), true,  "Premium seviye"},
            new Object[]{"VIP",      50000,    new BigDecimal("3.00"), new BigDecimal("20.00"), true,  "En üst seviye"}
        );

        for (Object[] c : configs) {
            jdbcTemplate.update(sql, c[0], c[1], c[2], c[3], c[4], c[5]);
        }

        log.info("Loyalty tier config kayitlari olusturuldu (5 tier).");
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

        for (Long userId : List.of(1L, 5L)) {
            if (userRepository.existsById(userId)) {
                loyaltyService.createLoyaltyAccount(userId);
            }
        }

        if (userRepository.findByPhoneNumber("05551111112").isEmpty()) {
            User customer = userRepository.save(User.builder()
                    .phoneNumber("05551111112")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .role(UserRole.CUSTOMER)
                    .build());
            loyaltyService.createLoyaltyAccount(customer.getId());
            log.info("Test musteri kullanicisi olusturuldu: 05551111112 / 123456");
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
