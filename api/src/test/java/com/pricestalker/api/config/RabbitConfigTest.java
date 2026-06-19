package com.pricestalker.api.config;

import com.pricestalker.core.event.RoutingKeys;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.MessageListener;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerEndpoint;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.listener.MessageListenerContainer;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class RabbitConfigTest {
    private final RabbitConfig config = new RabbitConfig();

    @Test
    void scrapeResultsQueueIsDurableAndDeadLettered() {
        Queue queue = config.scrapeResultsQueue();

        assertThat(queue.getName()).isEqualTo(RabbitConfig.SCRAPE_RESULTS_QUEUE);
        assertThat(queue.isDurable()).isTrue();
        assertThat(queue.getArguments())
                .containsEntry("x-dead-letter-exchange", RabbitConfig.DEAD_LETTER_EXCHANGE)
                .containsEntry("x-dead-letter-routing-key", RabbitConfig.SCRAPE_RESULTS_DLQ);
    }

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

    @Test
    void scrapeResultsQueueBindsCompletedAndFailedRoutingKeys() {
        TopicExchange exchange = config.priceStalkerExchange();
        Queue queue = config.scrapeResultsQueue();

        Binding completedBinding = config.scrapeCompletedBinding(queue, exchange);
        Binding failedBinding = config.scrapeFailedBinding(queue, exchange);

        assertThat(completedBinding.getRoutingKey()).isEqualTo(RoutingKeys.SCRAPE_COMPLETED);
        assertThat(failedBinding.getRoutingKey()).isEqualTo(RoutingKeys.SCRAPE_FAILED);
        assertThat(completedBinding.getDestination()).isEqualTo(RabbitConfig.SCRAPE_RESULTS_QUEUE);
        assertThat(failedBinding.getDestination()).isEqualTo(RabbitConfig.SCRAPE_RESULTS_QUEUE);
    }

    @Test
    void scrapeResultsDeadLetterQueueBindsToDeadLetterExchange() {
        DirectExchange exchange = config.priceStalkerDeadLetterExchange();
        Queue queue = config.scrapeResultsDlq();

        Binding binding = config.scrapeResultsDlqBinding(queue, exchange);

        assertThat(queue.getName()).isEqualTo(RabbitConfig.SCRAPE_RESULTS_DLQ);
        assertThat(binding.getRoutingKey()).isEqualTo(RabbitConfig.SCRAPE_RESULTS_DLQ);
        assertThat(binding.getExchange()).isEqualTo(RabbitConfig.DEAD_LETTER_EXCHANGE);
    }

    @Test
    void listenerFactoryCanDisableAutoStartup() {
        var factory = config.rabbitListenerContainerFactory(
                mock(ConnectionFactory.class),
                config.jsonMessageConverter(),
                false
        );
        SimpleRabbitListenerEndpoint endpoint = new SimpleRabbitListenerEndpoint();
        endpoint.setId("scrape-results-test");
        endpoint.setQueueNames(RabbitConfig.SCRAPE_RESULTS_QUEUE);
        endpoint.setMessageListener((MessageListener) message -> { });

        MessageListenerContainer container = factory.createListenerContainer(endpoint);

        assertThat(container).isInstanceOf(SimpleMessageListenerContainer.class);
        assertThat(container.isAutoStartup()).isFalse();
    }
}
