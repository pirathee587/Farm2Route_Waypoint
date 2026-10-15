package com.waypoint.planning.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public final class GatewayHeaderAuthenticationFilter extends OncePerRequestFilter {
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "/actuator/health".equals(path) || "/actuator/info".equals(path);
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain) throws ServletException, IOException {
        String verified = request.getHeader("X-Gateway-Verified");
        String userId = request.getHeader("X-User-Id");
        String role = request.getHeader("X-User-Role");
        String email = request.getHeader("X-User-Email");

        if (!"true".equalsIgnoreCase(verified == null ? "" : verified.trim())
            || isBlank(userId) || isBlank(role) || isBlank(email)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"error\":\"Unauthorized\",\"message\":\"Trusted gateway identity headers are required.\"}");
            return;
        }

        var principal = new GatewayUserPrincipal(userId, email);
        var authority = new SimpleGrantedAuthority("ROLE_" + role.trim().toUpperCase());
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
            principal, null, List.of(authority));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record GatewayUserPrincipal(String userId, String email) { }
}
