package com.pricestalker.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.RoutingKeys;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
    public static final String DEAD_LETTER_EXCHANGE = "price-stalker.dlx";
    public static final String SCRAPE_REQUEST_QUEUE = "crawler.scrape.requests";
    public static final String SCRAPE_RESULTS_QUEUE = "api.scrape.results";
    public static final String SCRAPE_RESULTS_DLQ = SCRAPE_RESULTS_QUEUE + ".dlq";

    @Bean
    public TopicExchange priceStalkerExchange() {
        return new TopicExchange(ExchangeNames.MAIN, true, false);
    }

    @Bean
    public DirectExchange priceStalkerDeadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    public Queue scrapeResultsQueue() {
        return QueueBuilder
            .durable(SCRAPE_RESULTS_QUEUE)
            .deadLetterExchange(DEAD_LETTER_EXCHANGE)
            .deadLetterRoutingKey(SCRAPE_RESULTS_DLQ)
            .build();
    }

    @Bean
    public Queue scrapeRequestQueue() {
        return QueueBuilder.durable(SCRAPE_REQUEST_QUEUE).build();
    }

    @Bean
    public Queue scrapeResultsDlq() {
        return QueueBuilder.durable(SCRAPE_RESULTS_DLQ).build();
    }

    @Bean
    public Binding scrapeCompletedBinding(
        @Qualifier("scrapeResultsQueue") Queue scrapeResultsQueue,
        TopicExchange priceStalkerExchange
    ) {
        return BindingBuilder
            .bind(scrapeResultsQueue)
            .to(priceStalkerExchange)
            .with(RoutingKeys.SCRAPE_COMPLETED);
    }

    @Bean
    public Binding scrapeFailedBinding(
        @Qualifier("scrapeResultsQueue") Queue scrapeResultsQueue,
        TopicExchange priceStalkerExchange
    ) {
        return BindingBuilder
            .bind(scrapeResultsQueue)
            .to(priceStalkerExchange)
            .with(RoutingKeys.SCRAPE_FAILED);
    }

    @Bean
    public Binding scrapeRequestBinding(
        @Qualifier("scrapeRequestQueue") Queue scrapeRequestQueue,
        TopicExchange priceStalkerExchange
    ) {
        return BindingBuilder
            .bind(scrapeRequestQueue)
            .to(priceStalkerExchange)
            .with(RoutingKeys.SCRAPE_REQUESTED);
    }

    @Bean
    public Binding scrapeResultsDlqBinding(
        @Qualifier("scrapeResultsDlq") Queue scrapeResultsDlq,
        DirectExchange priceStalkerDeadLetterExchange
    ) {
        return BindingBuilder
            .bind(scrapeResultsDlq)
            .to(priceStalkerDeadLetterExchange)
            .with(SCRAPE_RESULTS_DLQ);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf, MessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(cf);
        template.setMessageConverter(converter);
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
        ConnectionFactory connectionFactory,
        MessageConverter jsonMessageConverter,
        @Value("${spring.rabbitmq.listener.simple.auto-startup:true}") boolean listenerAutoStartup
    ) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter);
        factory.setDefaultRequeueRejected(false);
        factory.setAutoStartup(listenerAutoStartup);
        return factory;
    }
}
