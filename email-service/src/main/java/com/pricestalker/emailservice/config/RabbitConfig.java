package com.pricestalker.emailservice.config;

import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.QueueNames;
import com.pricestalker.core.event.RoutingKeys;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;

@Configuration
public class RabbitConfig {
    public static final String DEAD_LETTER_EXCHANGE = "price-stalker.dlx";
    public static final String EMAIL_PRICE_DROP_DLQ = QueueNames.EMAIL_PRICE_DROP + ".dlq";
    public static final String EMAIL_ALERTS_DLQ = QueueNames.EMAIL_ALERTS + ".dlq";
    private static final String ALERT_EMAIL_WILDCARD = "alert.email.*";

    @Bean
    public TopicExchange priceStalkerExchange() {
        return new TopicExchange(ExchangeNames.MAIN, true, false);
    }

    @Bean
    public DirectExchange priceStalkerDeadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    public Queue emailPriceDropQueue() {
        return QueueBuilder
            .durable(QueueNames.EMAIL_PRICE_DROP)
            .deadLetterExchange(DEAD_LETTER_EXCHANGE)
            .deadLetterRoutingKey(EMAIL_PRICE_DROP_DLQ)
            .build();
    }

    @Bean
    public Queue emailAlertsQueue() {
        return QueueBuilder
            .durable(QueueNames.EMAIL_ALERTS)
            .deadLetterExchange(DEAD_LETTER_EXCHANGE)
            .deadLetterRoutingKey(EMAIL_ALERTS_DLQ)
            .build();
    }

    @Bean
    public Queue emailPriceDropDlq() {
        return QueueBuilder.durable(EMAIL_PRICE_DROP_DLQ).build();
    }

    @Bean
    public Queue emailAlertsDlq() {
        return QueueBuilder.durable(EMAIL_ALERTS_DLQ).build();
    }

    @Bean
    public Binding emailPriceDropBinding(
        @Qualifier("emailPriceDropQueue") Queue emailPriceDropQueue,
        TopicExchange priceStalkerExchange
    ) {
        return BindingBuilder.bind(emailPriceDropQueue).to(priceStalkerExchange).with(RoutingKeys.PRICE_DROPPED);
    }

    @Bean
    public Binding emailAlertsBinding(
        @Qualifier("emailAlertsQueue") Queue emailAlertsQueue,
        TopicExchange priceStalkerExchange
    ) {
        return BindingBuilder.bind(emailAlertsQueue).to(priceStalkerExchange).with(ALERT_EMAIL_WILDCARD);
    }

    @Bean
    public Binding emailPriceDropDlqBinding(
        @Qualifier("emailPriceDropDlq") Queue emailPriceDropDlq,
        DirectExchange priceStalkerDeadLetterExchange
    ) {
        return BindingBuilder.bind(emailPriceDropDlq).to(priceStalkerDeadLetterExchange).with(EMAIL_PRICE_DROP_DLQ);
    }

    @Bean
    public Binding emailAlertsDlqBinding(
        @Qualifier("emailAlertsDlq") Queue emailAlertsDlq,
        DirectExchange priceStalkerDeadLetterExchange
    ) {
        return BindingBuilder.bind(emailAlertsDlq).to(priceStalkerDeadLetterExchange).with(EMAIL_ALERTS_DLQ);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
        ConnectionFactory connectionFactory,
        MessageConverter jsonMessageConverter
    ) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter);
        factory.setDefaultRequeueRejected(false);

        // Process one message at a time. The email send is synchronous and Spring AMQP's default
        // prefetch is 250 — setting it to 1 bounds the duplicate-send exposure and matches the
        // timeout rationale (eng review Issue 2C, surfaced by the outside voice).
        factory.setPrefetchCount(1);

        // Retry transient failures (e.g. a brief Postfix restart) in-process with exponential
        // backoff before giving up; on exhaustion RejectAndDontRequeueRecoverer rejects the message
        // so it dead-letters via the queue's DLX instead of requeue-looping. Pairs with 1A and the
        // defaultRequeueRejected(false) DLQ setup above.
        // NOTE (Issue 2C): retry re-runs the whole @Transactional listener, which sends before it
        // writes notification_log, so a post-accept timeout can re-send. Accepted for Phase A
        // (same code, low harm); the outbox/claim fix is tracked in TODOS for Phase B.
        factory.setAdviceChain(
            RetryInterceptorBuilder.stateless()
                // Spring AMQP 4.x renamed maxAttempts → maxRetries (confirmed against the 4.x Javadoc):
                // maxRetries(2) = 2 retries after the initial attempt = 3 total attempts.
                .maxRetries(2)
                .backOffOptions(1000, 2.0, 10000)
                .recoverer(new RejectAndDontRequeueRecoverer())
                .build()
        );

        return factory;
    }
}
