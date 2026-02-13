package com.pricestalker.demo.config;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.pricestalker.demo.repositories.UserRepository;

@Configuration
public class SecurityConfig {
	@Autowired
    private UserRepository userRepository;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }


    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(
        		authorizeHttp -> {
        			authorizeHttp.requestMatchers("/**").permitAll();	
        			authorizeHttp.requestMatchers("/auth/**").permitAll();
        			authorizeHttp.requestMatchers("/product/**").permitAll();
	            	authorizeHttp.requestMatchers("/css/**", "/js/**", "/images/**", "/Layouts/**").permitAll();
	            	authorizeHttp.requestMatchers("/api/**");
	            	authorizeHttp.anyRequest().authenticated();
	            }
            )
            .formLogin(l -> l
                .loginPage("/auth/login")
                .loginProcessingUrl("/auth/login")
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