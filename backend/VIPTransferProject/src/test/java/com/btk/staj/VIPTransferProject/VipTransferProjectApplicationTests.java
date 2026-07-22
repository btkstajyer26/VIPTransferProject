package com.btk.staj.VIPTransferProject;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class VIPTransferProjectApplicationTests {

    // 1. Kendi kullandığın PostGIS imajını aynen buraya veriyorsun
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgis/postgis:15-3.3")
            .withDatabaseName("vip_transfer_db")
            .withUsername("postgres")
            .withPassword("vip_password");

    // 2. Spring'in normal application.properties'deki URL'yi ezip, 
    // Testcontainers'ın rastgele açtığı porta bağlanmasını sağlıyorsun
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void contextLoads() {
        // Bu test çalıştığında arka planda şu işlemler sırayla otomatik olur:
        // 1. postgis/postgis:15-3.3 imajı çekilir ve çalıştırılır.
        // 2. Uygulama bu geçici veritabanına bağlanır.
        // 3. Test başarılı/başarısız biter.
        // 4. Konteyner otomatik olarak silinir ve arkada çöp bırakmaz.
    }
}