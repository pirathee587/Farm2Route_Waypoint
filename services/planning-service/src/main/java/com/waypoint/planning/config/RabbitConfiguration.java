package com.waypoint.planning.config;
import org.springframework.amqp.core.*;import org.springframework.context.annotation.*;
@Configuration public class RabbitConfiguration {@Bean TopicExchange waypointExchange(){return new TopicExchange("waypoint.events",true,false);}}
