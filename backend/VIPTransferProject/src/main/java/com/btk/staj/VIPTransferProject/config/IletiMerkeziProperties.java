package com.btk.staj.VIPTransferProject.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "iletimerkezi")
public class IletiMerkeziProperties {

    private String apiUrl;
    private String apiKey;
    private String apiHash;
    private String sender;
}