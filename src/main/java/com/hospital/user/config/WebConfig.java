package com.hospital.user.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {

        // 프론트는 게이트웨이(localhost:8088 등)를 통해 접속하므로 단일 origin 고정은 위험하다.
        // 패턴(*)으로 모든 origin 을 허용한다(실제 CORS 검증은 SecurityConfig 의
        // CorsConfigurationSource 가 담당하며, 여기는 MVC 핸들러 레벨 보조).
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("*")
                .allowedHeaders("*");
    }
}