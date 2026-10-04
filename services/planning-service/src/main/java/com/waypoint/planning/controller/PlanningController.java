package com.waypoint.planning.controller;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.dto.DraftTripDtos.*;
import com.waypoint.planning.port.PlanningMasterDataPort;
import com.waypoint.planning.service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.*;import java.util.*;

@RestController
@RequestMapping("/api/planning")
public class PlanningController {
    private final DashboardService dashboard;private final TripService trips;private final DraftTripService drafts;private final DeferralService deferrals;private final SuggestionService suggestions;private final ShortfallService shortfalls;private final PlanningMasterDataPort refs;
    public PlanningController(DashboardService dashboard,TripService trips,DraftTripService drafts,DeferralService deferrals,SuggestionService suggestions,ShortfallService shortfalls,PlanningMasterDataPort refs){this.dashboard=dashboard;this.trips=trips;this.drafts=drafts;this.deferrals=deferrals;this.suggestions=suggestions;this.shortfalls=shortfalls;this.refs=refs;}

    @GetMapping("/dashboard") public DashboardSummary dashboard(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return dashboard.get(date==null?LocalDate.now():date);}
    @GetMapping({"/orders","/orders/unplanned"}) public List<OrderRef> orders(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return refs.listPlanningOrders(date==null?LocalDate.now():date);}
    @GetMapping("/orders/{id}") public OrderRef order(@PathVariable UUID id){return refs.getOrder(id);}
    @PostMapping("/trips") public ResponseEntity<PersistedTripResponse> createTrip(@Valid @RequestBody CreateTripRequest r){return ResponseEntity.status(201).body(drafts.create(r));}
    @GetMapping("/trips/{id}") public PersistedTripResponse trip(@PathVariable UUID id){return drafts.get(id);}
    @PutMapping("/trips/{id}") public PersistedTripResponse updateTrip(@PathVariable UUID id,@RequestBody UpdateTripRequest r){return drafts.update(id,r);}
    @PostMapping("/trips/{id}/orders") public PersistedTripResponse addOrder(@PathVariable UUID id,@Valid @RequestBody AddOrderRequest r,@RequestHeader(value="X-User-Id",required=false)String user){return drafts.addOrder(id,r,user);}
    @DeleteMapping("/trips/{id}/orders/{orderId}") public PersistedTripResponse removeOrder(@PathVariable UUID id,@PathVariable UUID orderId){return drafts.removeOrder(id,orderId);}
    @PutMapping("/trips/{id}/vehicle") public PersistedTripResponse assignVehicle(@PathVariable UUID id,@Valid @RequestBody AssignVehicleRequest r){return drafts.assignVehicle(id,r);}
    @PutMapping("/trips/{id}/stops") public PersistedTripResponse reorderStops(@PathVariable UUID id,@Valid @RequestBody UpdateStopsRequest r){return drafts.reorder(id,r);}
    @PostMapping("/trips/{id}/validate") public TripValidationResponse validatePersisted(@PathVariable UUID id){return drafts.validate(id);}
    @PostMapping("/trips/{id}/confirm") public PersistedTripResponse confirmPersisted(@PathVariable UUID id,@RequestHeader(value="X-User-Id",required=false)String user){return drafts.confirm(id,user);}
    @PostMapping("/trips/validate") public ValidationResult validate(@RequestBody TripDraftRequest r){return trips.validate(r);}
    @PostMapping("/suggestions") public SuggestionResponse suggest(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return suggestions.suggest(date);}
    @GetMapping("/shortfalls") public ShortfallSummary shortfalls(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return shortfalls.get(date);}
    @GetMapping("/deferred") public List<DeferralView> deferred(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return deferrals.list(date==null?LocalDate.now():date);}
    @PostMapping("/orders/{id}/defer") public ResponseEntity<Map<String,Object>> defer(@PathVariable UUID id,@RequestBody DeferralRequest r,@RequestHeader(value="X-User-Id",required=false)String user){UUID d=deferrals.defer(id,r,user);return ResponseEntity.status(201).body(Map.of("deferralId",d,"orderId",id,"status","DEFERRED"));}
    @PostMapping("/orders/{id}/return-to-planning") public Map<String,Object> returnToPlanning(@PathVariable UUID id){deferrals.returnToPlanning(id);return Map.of("orderId",id,"planningStatus","UNPLANNED");}
    @PostMapping("/deferred/{id}/return-to-planning") public Map<String,Object> returnDeferred(@PathVariable UUID id){return returnToPlanning(id);}
    @PatchMapping("/deferred/{id}/next-date") public Map<String,Object> updateNextDate(@PathVariable UUID id,@RequestBody UpdateNextPlannedDateRequest r){deferrals.updateNextDate(id,r);return Map.of("orderId",id,"nextPlannedDate",r.nextPlannedDate(),"planningStatus","DEFERRED");}
    @PostMapping("/orders/{id}/replan") public Map<String,Object> replan(@PathVariable UUID id){deferrals.returnToPlanning(id);return Map.of("orderId",id,"planningStatus","UNPLANNED");}
}
