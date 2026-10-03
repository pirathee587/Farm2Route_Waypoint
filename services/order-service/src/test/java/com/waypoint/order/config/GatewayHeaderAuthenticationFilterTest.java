package com.waypoint.order.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

class GatewayHeaderAuthenticationFilterTest {

    private final GatewayHeaderAuthenticationFilter filter = new GatewayHeaderAuthenticationFilter();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesUsingGatewayHeaders() throws Exception {
        var request = requestWithHeaders();
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(authentication).isNotNull();
        assertThat(authentication.isAuthenticated()).isTrue();
        assertThat(authentication.getPrincipal())
            .isEqualTo(new GatewayHeaderAuthenticationFilter.GatewayUserPrincipal(
                "user-123", "manager@example.com"));
        assertThat(authentication.getAuthorities())
            .extracting(Object::toString)
            .containsExactly("ROLE_STORE_MANAGER");
    }

    @Test
    void rejectsRequestsWhenAnyGatewayHeaderIsMissing() throws Exception {
        var request = requestWithHeaders();
        request.removeHeader("X-User-Email");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doesNotRequireGatewayHeadersForHealthChecks() throws Exception {
        var request = new MockHttpServletRequest("GET", "/actuator/health");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private static MockHttpServletRequest requestWithHeaders() {
        var request = new MockHttpServletRequest("GET", "/api/orders");
        request.addHeader("X-User-Id", "user-123");
        request.addHeader("X-User-Role", "STORE_MANAGER");
        request.addHeader("X-User-Email", "manager@example.com");
        return request;
    }
}