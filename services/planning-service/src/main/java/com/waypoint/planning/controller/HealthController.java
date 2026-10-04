package com.waypoint.planning.controller;
import org.springframework.web.bind.annotation.*;import java.util.*;
@RestController public class HealthController { @GetMapping("/health") public Map<String,String> health(){return Map.of("status","UP","service","planning-service");} }
