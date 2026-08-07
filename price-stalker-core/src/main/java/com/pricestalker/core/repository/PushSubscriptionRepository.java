package com.pricestalker.core.repository;

import com.pricestalker.core.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, String> {
    Optional<PushSubscription> findByEndpointHash(String endpointHash);

    List<PushSubscription> findByUserId(String userId);

    void deleteByEndpointHashAndUserId(String endpointHash, String userId);
}
