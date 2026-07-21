package com.btk.staj.VIPTransferProject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.btk.staj.VIPTransferProject.config.IletiMerkeziProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

<<<<<<< HEAD
@SpringBootApplication(excludeName = {
		"org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
		"org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
=======
@SpringBootApplication
@EnableConfigurationProperties(IletiMerkeziProperties.class)
>>>>>>> 8116755f26bb7b118b8945c2b69c2d1a90b9c8e9
public class VipTransferProjectApplication {

	public static void main(String[] args) {
		SpringApplication.run(VipTransferProjectApplication.class, args);
	}

}