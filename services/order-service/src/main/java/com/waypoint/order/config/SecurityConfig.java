package com.waypoint.order.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**", "/actuator/**"))
            .httpBasic(basic -> basic.disable())
            .formLogin(login -> login.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/api/orders/**").hasRole("STORE_MANAGER")
                // Role Restriction Decision for Reference Data (/api/outlets/**, /api/vehicles/**):
                // Outlets and vehicles are master reference datasets required across multiple operational roles
                // (DISPATCHER for planning routes, LOADER for staging, DRIVER for deliveries, and STORE_MANAGER for ordering).
                // Restricting these reference endpoints exclusively to STORE_MANAGER would break dispatcher planning and
                // driver routing workflows. Therefore, access is permitted to ANY authenticated user (authenticated via JWT/Gateway headers).
                .requestMatchers("/api/outlets/**", "/api/vehicles/**").authenticated()
                .anyRequest().authenticated())
            .addFilterBefore(new GatewayHeaderAuthenticationFilter(),
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}