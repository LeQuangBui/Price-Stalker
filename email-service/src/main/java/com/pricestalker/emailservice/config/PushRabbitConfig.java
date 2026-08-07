package com.pricestalker.emailservice.config;

import com.pricestalker.core.event.QueueNames;
import com.pricestalker.core.event.RoutingKeys;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Web push queues (E4): a 2nd consumer off the same {@code price.dropped} event the email queue
 * uses, plus a {@code push.test} queue for the "send test notification" button. Mirrors the email
 * queue/DLQ/binding pattern and reuses the exchanges + DLX defined in {@link RabbitConfig}.
 */
@Configuration
public class PushRabbitConfig {
    public static final String PUSH_PRICE_DROP_DLQ = QueueNames.PUSH_PRICE_DROP + ".dlq";
    public static final String PUSH_TEST_DLQ = QueueNames.PUSH_TEST + ".dlq";

    @Bean
    public Queue pushPriceDropQueue() {
        return QueueBuilder.durable(QueueNames.PUSH_PRICE_DROP)
            .deadLetterExchange(RabbitConfig.DEAD_LETTER_EXCHANGE)
            .deadLetterRoutingKey(PUSH_PRICE_DROP_DLQ)
            .build();
    }

    @Bean
    public Queue pushTestQueue() {
        return QueueBuilder.durable(QueueNames.PUSH_TEST)
            .deadLetterExchange(RabbitConfig.DEAD_LETTER_EXCHANGE)
            .deadLetterRoutingKey(PUSH_TEST_DLQ)
            .build();
    }

    @Bean
    public Queue pushPriceDropDlq() {
        return QueueBuilder.durable(PUSH_PRICE_DROP_DLQ).build();
    }

    @Bean
    public Queue pushTestDlq() {
        return QueueBuilder.durable(PUSH_TEST_DLQ).build();
    }

    @Bean
    public Binding pushPriceDropBinding(
        @Qualifier("pushPriceDropQueue") Queue pushPriceDropQueue,
        TopicExchange priceStalkerExchange
    ) {
        return BindingBuilder.bind(pushPriceDropQueue).to(priceStalkerExchange).with(RoutingKeys.PRICE_DROPPED);
    }

    @Bean
    public Binding pushTestBinding(
        @Qualifier("pushTestQueue") Queue pushTestQueue,
        TopicExchange priceStalkerExchange
    ) {
        return BindingBuilder.bind(pushTestQueue).to(priceStalkerExchange).with(RoutingKeys.PUSH_TEST);
    }

    @Bean
    public Binding pushPriceDropDlqBinding(
        @Qualifier("pushPriceDropDlq") Queue pushPriceDropDlq,
        DirectExchange priceStalkerDeadLetterExchange
    ) {
        return BindingBuilder.bind(pushPriceDropDlq).to(priceStalkerDeadLetterExchange).with(PUSH_PRICE_DROP_DLQ);
    }

    @Bean
    public Binding pushTestDlqBinding(
        @Qualifier("pushTestDlq") Queue pushTestDlq,
        DirectExchange priceStalkerDeadLetterExchange
    ) {
        return BindingBuilder.bind(pushTestDlq).to(priceStalkerDeadLetterExchange).with(PUSH_TEST_DLQ);
    }
}
