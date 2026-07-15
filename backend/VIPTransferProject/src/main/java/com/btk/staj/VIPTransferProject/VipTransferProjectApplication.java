package com.btk.staj.VIPTransferProject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(excludeName = {
		"org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
		"org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
public class VipTransferProjectApplication {

	public static void main(String[] args) {
		SpringApplication.run(VipTransferProjectApplication.class, args);
	}

}