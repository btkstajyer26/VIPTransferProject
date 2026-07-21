package com.btk.staj.VIPTransferProject.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "whatsapp")
public class WhatsappProperties {

    private String apiUrl;
    private String apiVersion;
    private String accessToken;
    private String phoneNumberId;
}
