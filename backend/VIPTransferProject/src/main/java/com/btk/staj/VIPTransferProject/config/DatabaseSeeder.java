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
        log.info("Sistem başlatılıyor, varsayılan veriler kontrol ediliyor...");

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
        // 1. ADMIN KULLANICISI
        if (userRepository.findByPhoneNumber("05551111111").isEmpty()) {
            User admin = User.builder()
                    .email("admin@admin.com")
                    .phoneNumber("05551111111")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .firstName("System")
                    .lastName("Admin")
                    .role(UserRole.ADMIN)
                    .emailVerified(true)
                    .phoneVerified(true)
                    .guest(false)
                    .active(true)
                    .build();

            User savedAdmin = userRepository.save(admin);

            try {
                loyaltyService.createLoyaltyAccount(savedAdmin.getId());
            } catch (Exception e) {
                log.warn("Admin için loyalty hesabı oluşturulurken durum oluştu: {}", e.getMessage());
            }

            log.info("Varsayılan ADMIN kullanıcısı oluşturuldu: admin@admin.com / 05551111111");
        }

        for (Long userId : List.of(1L, 5L)) {
            if (userRepository.existsById(userId)) {
                loyaltyService.createLoyaltyAccount(userId);
            }
        }

        // 2. CUSTOMER KULLANICISI
        if (userRepository.findByPhoneNumber("05551111112").isEmpty()) {
            User customer = User.builder()
                    .email("evlayorulmaz@gmail.com")
                    .phoneNumber("05551111112")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .firstName("Test")
                    .lastName("Müşteri")
                    .role(UserRole.CUSTOMER)
                    .emailVerified(true)
                    .phoneVerified(true)
                    .guest(false)
                    .active(true)
                    .build();

            User savedCustomer = userRepository.save(customer);

            try {
                loyaltyService.createLoyaltyAccount(savedCustomer.getId());
            } catch (Exception e) {
                log.warn("Müşteri için loyalty hesabı oluşturulurken durum oluştu: {}", e.getMessage());
            }

            log.info("Varsayılan CUSTOMER kullanıcısı oluşturuldu: customer@test.com / 05551111112");
        }
    }

    private void seedVehicles() {
        List<Vehicle> vehicles = List.of(
                Vehicle.builder()
                        .plateNumber("34VIP101").brand("Volkswagen").model("Caravelle")
                        .vehicleClass(VehicleClass.STANDARD).capacity((short) 6)
                        .basePriceMultiplier(new BigDecimal("0.80"))
                        .openingPrice(new BigDecimal("300.00")).year((short) 2023).color("Gri").build(),
                Vehicle.builder()
                        .plateNumber("34VIP102").brand("Mercedes-Benz").model("Vito Tourer")
                        .vehicleClass(VehicleClass.BUSINESS).capacity((short) 6)
                        .basePriceMultiplier(new BigDecimal("1.00"))
                        .openingPrice(new BigDecimal("400.00")).year((short) 2024).color("Siyah").build(),
                Vehicle.builder()
                        .plateNumber("34VIP103").brand("Mercedes-Benz").model("V-Class")
                        .vehicleClass(VehicleClass.VIP).capacity((short) 6)
                        .basePriceMultiplier(new BigDecimal("1.30"))
                        .openingPrice(new BigDecimal("550.00")).year((short) 2024).color("Siyah").build(),
                Vehicle.builder()
                        .plateNumber("34VIP104").brand("Mercedes-Benz").model("Sprinter VIP")
                        .vehicleClass(VehicleClass.MINIVAN).capacity((short) 15)
                        .basePriceMultiplier(new BigDecimal("1.60"))
                        .openingPrice(new BigDecimal("750.00")).year((short) 2024).color("Siyah").build()
        );

        List<String> fleetPlates = vehicles.stream()
                .map(Vehicle::getPlateNumber)
                .toList();

        List<Vehicle> existingVehicles = vehicleRepository.findAll();
        existingVehicles.stream()
                .filter(vehicle -> !fleetPlates.contains(vehicle.getPlateNumber()))
                .forEach(vehicle -> vehicle.setActive(false));
        vehicleRepository.saveAll(existingVehicles);

        for (Vehicle fleetVehicle : vehicles) {
            Vehicle vehicle = vehicleRepository.findByPlateNumber(fleetVehicle.getPlateNumber())
                    .orElse(fleetVehicle);

            vehicle.setBrand(fleetVehicle.getBrand());
            vehicle.setModel(fleetVehicle.getModel());
            vehicle.setVehicleClass(fleetVehicle.getVehicleClass());
            vehicle.setCapacity(fleetVehicle.getCapacity());
            vehicle.setBasePriceMultiplier(fleetVehicle.getBasePriceMultiplier());
            vehicle.setOpeningPrice(fleetVehicle.getOpeningPrice());
            vehicle.setYear(fleetVehicle.getYear());
            vehicle.setColor(fleetVehicle.getColor());
            vehicle.setActive(true);
            vehicleRepository.save(vehicle);
        }

        log.info("VIP filo senkronize edildi: 4 aktif araç; diğer araçlar pasif.");
    }

}
