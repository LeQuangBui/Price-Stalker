package com.pricestalker.demo.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.pricestalker.demo.repositories.UserRepository;

@Configuration
public class SecurityConfig {

    private final UserRepository userRepository;

    public SecurityConfig(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
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
        			authorizeHttp.requestMatchers("/Home/**").permitAll();	
        			authorizeHttp.requestMatchers("/Auth/**").permitAll();
	            	authorizeHttp.requestMatchers("/css/**", "/js/**", "/images/**", "/Layouts/**").permitAll();
                    authorizeHttp.requestMatchers("/EachProduct/**","/ManyProducts/**").permitAll();
                    authorizeHttp.requestMatchers("/Bookmark/**", "/product/**").permitAll();
	            	authorizeHttp.anyRequest().authenticated();
	            }
            )
            .formLogin(l -> l
                .loginPage("/Auth/login")
                .loginProcessingUrl("/Auth/login")
                .defaultSuccessUrl("/", true)
                .failureUrl("/Auth/login?error=true")
                .permitAll()
            )
            .logout(l -> l
                .logoutUrl("/Auth/logout")
                .logoutSuccessUrl("/")
                .permitAll()
            )
            .build();
    }
}