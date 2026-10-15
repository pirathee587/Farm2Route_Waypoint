package com.waypoint.planning.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class GatewayHeaderAuthenticationFilterTest {
    private final GatewayHeaderAuthenticationFilter filter = new GatewayHeaderAuthenticationFilter();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsRequestWithoutGatewayHeaders() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/planning/dashboard");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void acceptsValidGatewayHeaders() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/planning/dashboard");
        request.addHeader("X-Gateway-Verified", "true");
        request.addHeader("X-User-Id", "user-123");
        request.addHeader("X-User-Role", "DISPATCHER");
        request.addHeader("X-User-Email", "dispatcher@example.com");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void allowsHealthWithoutGatewayHeaders() throws Exception {
        var request = new MockHttpServletRequest("GET", "/actuator/health");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
