package com.btk.staj.VIPTransferProject.config;

import com.google.maps.GeoApiContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GeoApiContextConfig {

    @Bean(destroyMethod = "shutdown")
    public GeoApiContext geoApiContext(@Value("${google.maps.api-key}") String apiKey) {
        return new GeoApiContext.Builder()
                .apiKey(apiKey)
                .build();
    }
}
