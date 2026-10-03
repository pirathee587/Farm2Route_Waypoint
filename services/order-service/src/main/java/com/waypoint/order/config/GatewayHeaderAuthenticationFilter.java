package com.waypoint.order.config;

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

/**
 * Trusts the identity headers injected by the authenticated API gateway.
 * JWT parsing and signature validation remain exclusively in the gateway.
 */
public final class GatewayHeaderAuthenticationFilter extends OncePerRequestFilter {

    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String USER_ROLE_HEADER = "X-User-Role";
    private static final String USER_EMAIL_HEADER = "X-User-Email";

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
        String userId = request.getHeader(USER_ID_HEADER);
        String role = request.getHeader(USER_ROLE_HEADER);
        String email = request.getHeader(USER_EMAIL_HEADER);

        if (isBlank(userId) || isBlank(role) || isBlank(email)) {
            writeUnauthorized(response);
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

    private static void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
            "{\"error\":\"Unauthorized\",\"message\":\"Trusted gateway identity headers are required.\"}");
    }

    public record GatewayUserPrincipal(String userId, String email) {
    }
}