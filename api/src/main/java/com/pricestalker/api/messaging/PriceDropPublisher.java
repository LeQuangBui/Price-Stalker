package com.pricestalker.api.messaging;

import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.PriceDroppedEvent;
import com.pricestalker.core.event.RoutingKeys;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class PriceDropPublisher {
    private final RabbitTemplate rabbitTemplate;

    public PriceDropPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(PriceDroppedEvent event) {
        this.rabbitTemplate.convertAndSend(
                ExchangeNames.MAIN,
                RoutingKeys.PRICE_DROPPED,
                event
        );
    }
}
