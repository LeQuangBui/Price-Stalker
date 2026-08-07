package com.pricestalker.api.security;
import java.util.Arrays;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.pricestalker.api.filter.AuthRateLimitFilter;
import com.pricestalker.api.filter.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
	@Value("${cors.allowed.origin}")
    private String allowedOrigin;

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthRateLimitFilter authRateLimitFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter, AuthRateLimitFilter authRateLimitFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.authRateLimitFilter = authRateLimitFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(
        		authorizeHttp -> {
                    authorizeHttp.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll();
                    authorizeHttp.requestMatchers("/error").permitAll();
                    authorizeHttp.requestMatchers("/healthz").permitAll();
        			// Public BROWSE only (GET). POST /products + POST /products/extractions now fall
        			// through to anyRequest().authenticated() so URL-submission to the crawler requires a
        			// logged-in account (no anonymous scrape-job injection / amplification).
        			authorizeHttp.requestMatchers(org.springframework.http.HttpMethod.GET, "/products/**").permitAll();
        			authorizeHttp.requestMatchers("/auth/**").permitAll();
        			authorizeHttp.requestMatchers(org.springframework.http.HttpMethod.GET, "/push/vapid-public-key").permitAll();
	            	authorizeHttp.anyRequest().authenticated();
            })
            .sessionManagement(session -> session
            		.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        		)
            // Return 401 (not Spring's default 403) when an unauthenticated request hits a protected
            // endpoint, so the SPA's expired-session recovery (client.js fires only on 401) triggers
            // a clean token purge + redirect instead of getting stuck on repeated 403s.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                (request, response, authException) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            // Rate-limit auth endpoints early. Both custom filters anchor to the built-in
            // UsernamePasswordAuthenticationFilter — Spring Security can only order a filter relative to a
            // filter class it knows, so anchoring to the other custom filter (JwtAuthenticationFilter)
            // would fail at startup. Relative order between the two is irrelevant for the permitAll
            // /auth/** paths the limiter targets (the JWT filter is a no-op there).
            .addFilterBefore(authRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
    
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigin));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    
    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}