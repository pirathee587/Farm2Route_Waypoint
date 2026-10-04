package com.waypoint.planning.controller;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.ReferenceRepository;
import com.waypoint.planning.service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.*;import java.util.*;

@RestController
@RequestMapping("/api/planning")
public class PlanningController {
    private final DashboardService dashboard;private final TripService trips;private final DeferralService deferrals;private final SuggestionService suggestions;private final ShortfallService shortfalls;private final ReferenceRepository refs;
    public PlanningController(DashboardService dashboard,TripService trips,DeferralService deferrals,SuggestionService suggestions,ShortfallService shortfalls,ReferenceRepository refs){this.dashboard=dashboard;this.trips=trips;this.deferrals=deferrals;this.suggestions=suggestions;this.shortfalls=shortfalls;this.refs=refs;}

    @GetMapping("/dashboard") public DashboardSummary dashboard(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return dashboard.get(date);}
    @GetMapping("/orders") public List<OrderRef> orders(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return refs.listPlanningOrders(date);}
    @GetMapping("/orders/{id}") public OrderRef order(@PathVariable UUID id){return refs.getOrder(id);}
    @PostMapping("/trips/validate") public ValidationResult validate(@RequestBody TripDraftRequest r){return trips.validate(r);}
    @PostMapping("/trips/confirm") public ResponseEntity<TripView> confirm(@RequestBody TripDraftRequest r,@RequestHeader(value="X-User-Id",required=false)String user){return ResponseEntity.status(201).body(trips.confirm(r,user));}
    @PutMapping("/drafts/{id}") public Map<String,Object> saveDraft(@PathVariable UUID id,@RequestBody TripDraftRequest r,@RequestHeader(value="X-User-Id",required=false)String user){return Map.of("draftId",trips.saveDraft(id,r,user),"status","SAVED");}
    @PostMapping("/suggestions") public SuggestionResponse suggest(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return suggestions.suggest(date);}
    @GetMapping("/shortfalls") public ShortfallSummary shortfalls(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return shortfalls.get(date);}
    @GetMapping("/deferred") public List<DeferralView> deferred(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return deferrals.list(date);}
    @PostMapping("/orders/{id}/defer") public ResponseEntity<Map<String,Object>> defer(@PathVariable UUID id,@RequestBody DeferralRequest r,@RequestHeader(value="X-User-Id",required=false)String user){UUID d=deferrals.defer(id,r,user);return ResponseEntity.status(201).body(Map.of("deferralId",d,"orderId",id,"status","DEFERRED"));}
    @PostMapping("/orders/{id}/return-to-planning") public Map<String,Object> returnToPlanning(@PathVariable UUID id){deferrals.returnToPlanning(id);return Map.of("orderId",id,"planningStatus","UNPLANNED");}
}
