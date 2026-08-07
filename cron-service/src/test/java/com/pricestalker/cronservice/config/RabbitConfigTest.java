package com.pricestalker.cronservice.config;

import com.pricestalker.core.event.RoutingKeys;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;

import static org.assertj.core.api.Assertions.assertThat;

class RabbitConfigTest {
    private final RabbitConfig config = new RabbitConfig();

    @Test
    void scrapeRequestQueueIsDurableAndBoundByRequestedRoutingKey() {
        TopicExchange exchange = config.priceStalkerExchange();
        Queue queue = config.scrapeRequestQueue();

        Binding binding = config.scrapeRequestBinding(queue, exchange);

        assertThat(queue.getName()).isEqualTo(RabbitConfig.SCRAPE_REQUEST_QUEUE);
        assertThat(queue.isDurable()).isTrue();
        assertThat(binding.getRoutingKey()).isEqualTo(RoutingKeys.SCRAPE_REQUESTED);
        assertThat(binding.getDestination()).isEqualTo(RabbitConfig.SCRAPE_REQUEST_QUEUE);
    }
}
