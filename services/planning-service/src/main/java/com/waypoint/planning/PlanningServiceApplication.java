package com.waypoint.planning;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PlanningServiceApplication {
  public static void main(String[] args){SpringApplication.run(PlanningServiceApplication.class,args);}
}
