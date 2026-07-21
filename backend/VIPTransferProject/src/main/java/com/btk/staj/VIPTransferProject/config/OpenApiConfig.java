package com.btk.staj.VIPTransferProject.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@SecurityScheme(
        name = "Bearer Authentication",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "/api/v1/auth/login'den alınan accessToken'ı buraya girin (Bearer prefix olmadan)."
)
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("VIP Transfer API")
                        .version("v1")
                        .description("""
                                VIP Transfer rezervasyon platformu REST API'si.

                                **Kimlik doğrulama:** Önce /api/v1/auth/login ile giriş yapın,
                                dönen accessToken'ı sağ üstteki "Authorize" butonuna girin.
                                """))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"));
    }
}
