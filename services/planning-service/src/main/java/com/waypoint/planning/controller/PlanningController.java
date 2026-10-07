package com.waypoint.planning.controller;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.dto.DraftTripDtos.*;
import com.waypoint.planning.port.PlanningMasterDataPort;
import com.waypoint.planning.repository.PlanningRepository;
import com.waypoint.planning.service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.*;import java.util.*;

@RestController
@RequestMapping("/api/planning")
public class PlanningController {
    private final DashboardService dashboard;private final TripService trips;private final DraftTripService drafts;private final DeferralService deferrals;private final SuggestionService suggestions;private final ShortfallService shortfalls;private final PlanningMasterDataPort refs;private final PlanningRepository planning;private final OperationsReadService operations;
    public PlanningController(DashboardService dashboard,TripService trips,DraftTripService drafts,DeferralService deferrals,SuggestionService suggestions,ShortfallService shortfalls,PlanningMasterDataPort refs,PlanningRepository planning,OperationsReadService operations){this.dashboard=dashboard;this.trips=trips;this.drafts=drafts;this.deferrals=deferrals;this.suggestions=suggestions;this.shortfalls=shortfalls;this.refs=refs;this.planning=planning;this.operations=operations;}

    @GetMapping("/dashboard") public DashboardSummary dashboard(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return dashboard.get(date==null?LocalDate.now():date);}
    @GetMapping("/orders") public List<OrderRef> orders(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return refs.listPlanningOrders(date==null?LocalDate.now():date);}
    @GetMapping("/orders/unplanned") public List<OrderRef> unplannedOrders(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){LocalDate day=date==null?LocalDate.now():date;Set<UUID> unavailable=new HashSet<>(planning.allocatedOrderIds(day));unavailable.addAll(planning.deferredOrderIds(day));return refs.listPlanningOrders(day).stream().filter(o->"CONFIRMED".equalsIgnoreCase(o.orderStatus())&&!unavailable.contains(o.orderId())).toList();}
    @GetMapping("/orders/{id}") public OrderRef order(@PathVariable UUID id){return refs.getOrder(id);}
    @GetMapping("/vehicles") public List<VehicleRef> vehicles(){return refs.listVehicles();}
    @GetMapping("/fleet") public List<Map<String,Object>> fleet(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return operations.fleet(date==null?LocalDate.now():date);}
    @GetMapping("/tracking") public List<Map<String,Object>> tracking(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){return operations.tracking(date==null?LocalDate.now():date);}
    @GetMapping("/forecast") public List<Map<String,Object>> forecast(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,@RequestParam(defaultValue="8")int weeks){return operations.forecast(from==null?LocalDate.now():from,weeks);}
    @PostMapping("/trips") public ResponseEntity<PersistedTripResponse> createTrip(@Valid @RequestBody CreateTripRequest r){return ResponseEntity.status(201).body(drafts.create(r));}
    @GetMapping("/trips/{id}") public PersistedTripResponse trip(@PathVariable UUID id){return drafts.get(id);}
    @PutMapping("/trips/{id}") public PersistedTripResponse updateTrip(@PathVariable UUID id,@RequestBody UpdateTripRequest r){return drafts.update(id,r);}
    @PostMapping("/trips/{id}/orders") public PersistedTripResponse addOrder(@PathVariable UUID id,@Valid @RequestBody AddOrderRequest r,@RequestHeader(value="X-User-Id",required=false)String user){return drafts.addOrder(id,r,user);}
    @DeleteMapping("/trips/{id}/orders/{orderId}") public PersistedTripResponse removeOrder(@PathVariable UUID id,@PathVariable UUID orderId){return drafts.removeOrder(id,orderId);}
    @PutMapping("/trips/{id}/vehicle") public PersistedTripResponse assignVehicle(@PathVariable UUID id,@Valid @RequestBody AssignVehicleRequest r){return drafts.assignVehicle(id,r);}
    @PutMapping("/trips/{id}/driver") public PersistedTripResponse assignDriver(@PathVariable UUID id,@Valid @RequestBody AssignDriverRequest r){return drafts.assignDriver(id,r);}
    @PutMapping("/trips/{id}/stops") public PersistedTripResponse reorderStops(@PathVariable UUID id,@Valid @RequestBody UpdateStopsRequest r){return drafts.reorder(id,r);}
    @PostMapping("/trips/{id}/validate") public TripValidationResponse validatePersisted(@PathVariable UUID id){return drafts.validate(id);}
    @PostMapping("/trips/{id}/confirm") public PersistedTripResponse confirmPersisted(@PathVariable UUID id,@RequestParam(defaultValue="false")boolean force,@RequestHeader(value="X-User-Id",required=false)String user){return drafts.confirm(id,user,force);}
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
