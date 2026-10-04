package com.waypoint.planning.service;

import com.waypoint.planning.constraint.ConstraintEngine;
import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.*;
import com.waypoint.planning.port.PlanningMasterDataPort;
import org.springframework.stereotype.Service;
import java.time.*;import java.util.*;

@Service
public class SuggestionService {
    private final PlanningMasterDataPort refs; private final PlanningRepository repo; private final ConstraintEngine engine;
    public SuggestionService(PlanningMasterDataPort refs,PlanningRepository repo,ConstraintEngine engine){this.refs=refs;this.repo=repo;this.engine=engine;}
    public SuggestionResponse suggest(LocalDate date){
        Set<UUID> allocated=new HashSet<>(repo.allocatedOrderIds(date));Set<UUID> deferred=new HashSet<>(repo.deferredOrderIds(date));
        List<OrderRef> remaining=new ArrayList<>(refs.listPlanningOrders(date).stream().filter(o->!allocated.contains(o.orderId())&&!deferred.contains(o.orderId())).toList());
        List<SuggestedTrip> trips=new ArrayList<>();
        for(VehicleRef v:refs.listVehicles()){
            if(!v.available()||repo.tripCount(v.vehicleId(),date)>=2)continue;
            for(int route=repo.tripCount(v.vehicleId(),date);route<2 && !remaining.isEmpty();route++){
                List<OrderRef> candidates=remaining.stream().filter(o->compatibleBase(o,v))
                        .sorted(Comparator.comparing(OrderRef::windowClose, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
                if(candidates.isEmpty())break; List<OrderRef> chosen=new ArrayList<>(); ValidationResult last=null;
                for(OrderRef o:candidates){List<OrderRef> test=new ArrayList<>(chosen);test.add(o);var vr=engine.validate(test,v,date,List.of());if(vr.feasible()){chosen.add(o);last=vr;}}
                if(chosen.isEmpty())break; trips.add(new SuggestedTrip(v.vehicleId(),chosen.stream().map(OrderRef::orderId).toList(),last)); remaining.removeAll(chosen);
            }
        }
        return new SuggestionResponse(date,List.copyOf(trips),remaining.stream().map(OrderRef::orderId).toList());
    }
    private boolean compatibleBase(OrderRef o,VehicleRef v){
        return o.depot()!=null && v.depot()!=null && o.brand()!=null && v.brand()!=null
                && o.depot().equalsIgnoreCase(v.depot()) && o.brand().equalsIgnoreCase(v.brand());
    }
}
