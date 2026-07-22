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
        description = "/api/auth/login'den alÄ±nan accessToken'Ä± buraya girin (Bearer prefix olmadan)."
)
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("VIP Transfer API")
                        .version("1.0")
                        .description("""
                                VIP Transfer rezervasyon platformu REST API'si.

                                **Kimlik doÄŸrulama:** Ã–nce /api/auth/login ile giriÅŸ yapÄ±n,
                                dÃ¶nen accessToken'Ä± saÄŸ Ã¼stteki "Authorize" butonuna girin.
                                """))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"));
    }
}
