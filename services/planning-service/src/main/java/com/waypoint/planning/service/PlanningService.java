package com.waypoint.planning.service;

import com.waypoint.planning.dto.PlanningModels.*;
import com.waypoint.planning.repository.PlanningRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;import java.util.*;

@Service
public class PlanningService {
  private final PlanningRepository repo; private final AllocationEngine engine;
  public PlanningService(PlanningRepository repo,AllocationEngine engine){this.repo=repo;this.engine=engine;}
  public List<QueueGroup> queue(LocalDate date){Map<String,List<OrderInput>> grouped=new LinkedHashMap<>();for(OrderInput o:repo.orders(date))grouped.computeIfAbsent(o.brand()+"|"+o.outlet().district(),ignored->new ArrayList<>()).add(o);return grouped.values().stream().map(o->new QueueGroup(o.getFirst().brand(),o.getFirst().outlet().district(),o.stream().anyMatch(OrderInput::deferredYesterday),o.stream().mapToInt(OrderInput::daysSinceLastServed).max().orElse(0),List.copyOf(o))).toList();}
  public AllocationResult allocate(LocalDate date,String user){var result=engine.allocate(date,repo.orders(date),repo.vehicles(),repo.travel(),repo.allowances());repo.saveDraft(date,result,user);return result;}
  public ManualOverrideResponse validate(ManualOverrideRequest request){Map<String,VehicleInput> vehicles=new HashMap<>();for(var v:repo.vehicles())vehicles.put(v.vehicleId(),v);var violations=engine.validateTrip(request.trip(),vehicles,repo.travel(),repo.allowances());return new ManualOverrideResponse(violations.isEmpty(),violations);}
  public PublishResponse publish(LocalDate date,String user){return repo.publish(date,repo.draft(date),user);}
  public List<DeferralHistory> deferrals(String outlet){return repo.deferrals(outlet);}
  public List<ProgressRow> progress(LocalDate date){return repo.progress(date);}
  public Map<String,Object> trip(UUID id){return repo.trip(id);}
}
