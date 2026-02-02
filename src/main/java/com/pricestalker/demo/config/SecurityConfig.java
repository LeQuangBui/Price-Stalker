package com.pricestalker.demo.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(
        		authorizeHttp -> {
        			authorizeHttp.requestMatchers("/").permitAll();
        			authorizeHttp.requestMatchers("/product/**").permitAll();
        			authorizeHttp.requestMatchers("/auth/**").permitAll();
	            	authorizeHttp.requestMatchers("/css/**", "/js/**", "/images/**", "/layouts/**").permitAll();
	            	authorizeHttp.anyRequest().authenticated();
	            }
            )
            .formLogin(l -> l
                .loginPage("/auth/login")
                .defaultSuccessUrl("/", true)
                .failureUrl("/auth/login?error=true")
                .permitAll()
            )
            .logout(l -> l
                .logoutUrl("/auth/logout")
                .logoutSuccessUrl("/")
                .permitAll()
            )
            .build();
    }
}