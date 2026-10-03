package com.waypoint.planning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waypoint.planning.service.OutboxPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named="PLANNING_INTEGRATION", matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={"waypoint.outbox.enabled=true","waypoint.outbox.poll-ms=60000","grpc.server.port=0"})
class PlanningIntegrationTest {
  static final String QUEUE="planning.integration.allocation";
  @DynamicPropertySource static void properties(DynamicPropertyRegistry r){
    r.add("spring.datasource.url",()->System.getenv("TEST_DATABASE_URL"));
    r.add("spring.datasource.username",()->System.getenv().getOrDefault("TEST_DATABASE_USER","postgres"));
    r.add("spring.datasource.password",()->System.getenv().getOrDefault("TEST_DATABASE_PASSWORD","postgrespassword"));
    r.add("spring.rabbitmq.host",()->System.getenv().getOrDefault("TEST_RABBITMQ_HOST","localhost"));
    r.add("spring.rabbitmq.port",()->System.getenv().getOrDefault("TEST_RABBITMQ_PORT","5672"));
    r.add("spring.rabbitmq.username",()->"guest"); r.add("spring.rabbitmq.password",()->"guest"); r.add("spring.rabbitmq.virtual-host",()->"/");
  }
  @Autowired TestRestTemplate http; @Autowired RabbitAdmin admin; @Autowired RabbitTemplate rabbit;
  @Autowired OutboxPublisher outbox; @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper mapper;

  @Test void allocatesPersistsAndPublishesRealEvent() throws Exception {
    LocalDate date=LocalDate.of(2026,10,4);
    jdbc.update("DELETE FROM public.allocations WHERE order_id IN (SELECT order_id FROM public.orders WHERE planning_scenario='S1')");
    jdbc.update("DELETE FROM public.trips WHERE delivery_date=?",date);
    jdbc.update("UPDATE public.orders SET status='PENDING' WHERE planning_scenario='S1'");
    jdbc.update("DELETE FROM public.planning_drafts WHERE delivery_date=?",date);
    jdbc.update("DELETE FROM public.planning_revisions WHERE delivery_date=?",date);
    jdbc.update("DELETE FROM public.planning_outbox");
    admin.declareQueue(new Queue(QUEUE,false,false,true));
    admin.declareBinding(BindingBuilder.bind(new Queue(QUEUE,false,false,true)).to(new TopicExchange("waypoint.events",true,false)).with("allocation.completed"));
    var headers=new HttpHeaders(); headers.set("X-Gateway-Verified","true"); headers.set("X-User-Role","DISPATCHER"); headers.set("X-User-Id","integration-dispatcher");
    var allocation=http.exchange("/api/planning/allocate?date="+date,HttpMethod.POST,new HttpEntity<>(headers),JsonNode.class);
    assertThat(allocation.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(allocation.getBody().path("servedTrips").size()).isGreaterThan(0);
    var published=http.exchange("/api/planning/publish?date="+date,HttpMethod.POST,new HttpEntity<>(headers),JsonNode.class);
    assertThat(published.getStatusCode()).isEqualTo(HttpStatus.OK);
    outbox.publish();
    var message=rabbit.receive(QUEUE,5000); assertThat(message).isNotNull();
    JsonNode event=mapper.readTree(new String(message.getBody(), StandardCharsets.UTF_8));
    assertThat(event.path("date").asText()).isEqualTo(date.toString());
    assertThat(event.path("revision").asInt()).isGreaterThan(0);
    assertThat(event.path("trips").size()).isGreaterThan(0);
    assertThat(jdbc.queryForObject("SELECT count(*) FROM public.allocations a JOIN public.trips t ON t.trip_id=a.trip_id WHERE t.delivery_date=?",Integer.class,date)).isGreaterThan(0);
  }
}
