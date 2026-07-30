package com.btk.staj.VIPTransferProject.config;

import com.google.maps.GeoApiContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class GeoApiContextConfig {

    @Bean(destroyMethod = "shutdown")
    public GeoApiContext geoApiContext(
            @Value("${google.maps.api-key}") String apiKey,
            @Value("${google.maps.connect-timeout-ms:2000}") long connectTimeoutMs,
            @Value("${google.maps.read-timeout-ms:3000}") long readTimeoutMs,
            @Value("${google.maps.query-rate-limit:10}") int queryRateLimit) {
        return new GeoApiContext.Builder()
                .apiKey(apiKey)
                .connectTimeout(connectTimeoutMs, TimeUnit.MILLISECONDS)
                .readTimeout(readTimeoutMs, TimeUnit.MILLISECONDS)
                .queryRateLimit(queryRateLimit)
                .build();
    }
}
