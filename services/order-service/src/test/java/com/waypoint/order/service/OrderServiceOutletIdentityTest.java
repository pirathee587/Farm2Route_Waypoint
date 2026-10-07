package com.waypoint.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.waypoint.order.config.GatewayHeaderAuthenticationFilter.GatewayUserPrincipal;
import com.waypoint.order.messaging.OrderEventPublisher;
import com.waypoint.order.repository.DeliveryTrackingRepository;
import com.waypoint.order.repository.IssueReportRepository;
import com.waypoint.order.repository.OrderDeferralRepository;
import com.waypoint.order.repository.OrderRepository;
import com.waypoint.order.repository.ReceiptConfirmationRepository;
import com.waypoint.order.repository.ReceiptLineRepository;
import com.waypoint.order.repository.UserProfileRepository;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class OrderServiceOutletIdentityTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesTrustedOutletClaimBeforeLegacyProfileLookup() {
        var profiles = mock(UserProfileRepository.class);
        var service = service(profiles);
        authenticate(new GatewayUserPrincipal(
            "not-a-uuid", "manager@example.com", "OUT001"));

        assertThat(service.authenticatedOutletId()).isEqualTo("OUT001");
    }

    @Test
    void missingClaimFallsBackToLegacyProfileLookup() {
        var profiles = mock(UserProfileRepository.class);
        when(profiles.findOutletIdByUserId(java.util.UUID.fromString(
            "f9d8809f-4f01-43b0-88a8-f7a56459fb23")))
            .thenReturn(Optional.of("OUT001"));
        var service = service(profiles);
        authenticate(new GatewayUserPrincipal(
            "f9d8809f-4f01-43b0-88a8-f7a56459fb23", "manager@example.com", null));

        assertThat(service.authenticatedOutletId()).isEqualTo("OUT001");
    }

    @Test
    void missingClaimAndProfileKeepsExistingValidationError() {
        var profiles = mock(UserProfileRepository.class);
        when(profiles.findOutletIdByUserId(java.util.UUID.fromString(
            "f9d8809f-4f01-43b0-88a8-f7a56459fb23")))
            .thenReturn(Optional.empty());
        var service = service(profiles);
        authenticate(new GatewayUserPrincipal(
            "f9d8809f-4f01-43b0-88a8-f7a56459fb23", "manager@example.com", null));

        assertThatThrownBy(service::authenticatedOutletId)
            .isInstanceOf(OrderValidationException.class)
            .hasMessage("authenticated user has no assigned outlet");
    }

    private static OrderService service(UserProfileRepository profiles) {
        return new OrderService(
            mock(OrderRepository.class), profiles, mock(OrderValidationService.class),
            mock(OrderEventPublisher.class), mock(DeliveryTrackingRepository.class),
            mock(OrderDeferralRepository.class), mock(ReceiptConfirmationRepository.class),
            mock(IssueReportRepository.class), mock(ReceiptLineRepository.class));
    }

    private static void authenticate(GatewayUserPrincipal principal) {
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(principal, null, java.util.List.of()));
    }
}
