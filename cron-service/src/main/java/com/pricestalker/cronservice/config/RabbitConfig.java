package com.pricestalker.cronservice.config;

import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.RoutingKeys;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
    public static final String SCRAPE_REQUEST_QUEUE = "crawler.scrape.requests";

    @Bean
    public TopicExchange priceStalkerExchange() {
        return new TopicExchange(ExchangeNames.MAIN, true, false);
    }

    @Bean
    public Queue scrapeRequestQueue() {
        return QueueBuilder.durable(SCRAPE_REQUEST_QUEUE).build();
    }

    @Bean
    public Binding scrapeRequestBinding(Queue scrapeRequestQueue, TopicExchange priceStalkerExchange) {
        return BindingBuilder
                .bind(scrapeRequestQueue)
                .to(priceStalkerExchange)
                .with(RoutingKeys.SCRAPE_REQUESTED);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf, MessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(cf);
        template.setMessageConverter(converter);
        return  template;
    }
}
