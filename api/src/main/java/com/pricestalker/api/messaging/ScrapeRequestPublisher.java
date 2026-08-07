package com.pricestalker.api.messaging;

import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.RoutingKeys;
import com.pricestalker.core.event.ScrapeRequestedEvent;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class ScrapeRequestPublisher {
    private final RabbitTemplate rabbitTemplate;

    public ScrapeRequestPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(ScrapeRequestedEvent event) {
        this.rabbitTemplate.convertAndSend(
                ExchangeNames.MAIN,
                RoutingKeys.SCRAPE_REQUESTED,
                event
        );
    }
}
