package com.waypoint.order.repository;

import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;

@Repository
public class UserProfileRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public Optional<String> findOutletIdByUserId(UUID userId) {
        return entityManager.createNativeQuery(
                "SELECT outlet_id FROM public.user_profiles WHERE id = :userId")
            .setParameter("userId", userId)
            .getResultStream()
            .map(Object::toString)
            .findFirst();
    }
}