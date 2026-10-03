package com.waypoint.planning.config;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

@Configuration
public class RabbitConfig {
    @Bean Jackson2JsonMessageConverter jsonMessageConverter(){ return new Jackson2JsonMessageConverter(); }
    @Bean TopicExchange waypointExchange(@Value("${waypoint.rabbitmq.exchange}") String name){return new TopicExchange(name,true,false);}
}
