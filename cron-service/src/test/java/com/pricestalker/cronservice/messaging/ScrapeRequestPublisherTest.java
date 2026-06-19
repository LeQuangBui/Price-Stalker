package com.pricestalker.cronservice.messaging;

import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.RoutingKeys;
import com.pricestalker.core.event.ScrapeRequestedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ScrapeRequestPublisherTest {
    @Test
    void publishSendsScrapeRequestedEventToMainExchange() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        ScrapeRequestedEvent event = new ScrapeRequestedEvent(
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                true,
                "https://gearvn.com/products/mouse",
                "product-1"
        );

        ScrapeRequestPublisher publisher = new ScrapeRequestPublisher(rabbitTemplate);

        publisher.publish(event);

        verify(rabbitTemplate).convertAndSend(
                ExchangeNames.MAIN,
                RoutingKeys.SCRAPE_REQUESTED,
                event
        );
    }
}
