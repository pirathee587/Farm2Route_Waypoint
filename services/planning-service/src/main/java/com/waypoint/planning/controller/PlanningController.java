package com.waypoint.planning.controller;

import com.waypoint.planning.config.GatewayTrustFilter;import com.waypoint.planning.dto.PlanningModels.*;import com.waypoint.planning.service.PlanningService;import jakarta.servlet.http.HttpServletRequest;import org.springframework.dao.EmptyResultDataAccessException;import org.springframework.format.annotation.DateTimeFormat;import org.springframework.http.*;import org.springframework.web.bind.annotation.*;import java.time.LocalDate;import java.util.*;

@RestController @RequestMapping("/api/planning")
public class PlanningController {
  private final PlanningService service;public PlanningController(PlanningService service){this.service=service;}
  @GetMapping("/queue") public List<QueueGroup> queue(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate date){return service.queue(date);}
  @PostMapping("/allocate") public AllocationResult allocate(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate date,HttpServletRequest req){GatewayTrustFilter.requireDispatcher(req);return service.allocate(date,user(req));}
  @PostMapping("/manual-override") public ManualOverrideResponse manual(@RequestBody ManualOverrideRequest body,HttpServletRequest req){GatewayTrustFilter.requireDispatcher(req);return service.validate(body);}
  @PostMapping("/publish") public PublishResponse publish(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate date,HttpServletRequest req){GatewayTrustFilter.requireDispatcher(req);return service.publish(date,user(req));}
  @GetMapping("/deferrals") public List<DeferralHistory> deferrals(@RequestParam(required=false)String outletId){return service.deferrals(outletId);}
  @GetMapping("/progress") public List<ProgressRow> progress(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate date){return service.progress(date);}
  @DeleteMapping("/trips/{tripId}/stops/{stopId}") public Map<String,Object> removeStop(@PathVariable UUID tripId,@PathVariable UUID stopId,HttpServletRequest req){GatewayTrustFilter.requireDispatcher(req);return service.removeStop(tripId,stopId,user(req));}
  private String user(HttpServletRequest req){String id=req.getHeader("X-User-Id");return id==null?"dispatcher":id;}
  @ExceptionHandler(GatewayTrustFilter.ForbiddenException.class) @ResponseStatus(HttpStatus.FORBIDDEN) Map<String,String> forbidden(){return Map.of("code","FORBIDDEN","message","DISPATCHER role required");}
  @ExceptionHandler(com.waypoint.planning.repository.PlanningRepository.ConflictException.class) public ResponseEntity<Map<String,String>> conflict(com.waypoint.planning.repository.PlanningRepository.ConflictException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("code",e.getCode(),"message",e.getMessage()));}
  @ExceptionHandler(Exception.class) ResponseEntity<Map<String,String>> error(Exception e){HttpStatus status=e instanceof EmptyResultDataAccessException?HttpStatus.NOT_FOUND:HttpStatus.UNPROCESSABLE_ENTITY;return ResponseEntity.status(status).body(Map.of("code","PLANNING_ERROR","message",Objects.toString(e.getMessage(),e.getClass().getSimpleName())));}
}
