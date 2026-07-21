package com.btk.staj.VIPTransferProject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.btk.staj.VIPTransferProject.config.IletiMerkeziProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(IletiMerkeziProperties.class)
public class VipTransferProjectApplication {

	public static void main(String[] args) {
		SpringApplication.run(VipTransferProjectApplication.class, args);
	}

}
