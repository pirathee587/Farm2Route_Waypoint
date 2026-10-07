package com.waypoint.planning.service;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.*;
import com.waypoint.planning.port.PlanningMasterDataPort;
import org.springframework.stereotype.Service;
import java.time.*;import java.util.*;

@Service
public class DashboardService {
    private final PlanningMasterDataPort refs; private final PlanningRepository repo;
    public DashboardService(PlanningMasterDataPort refs,PlanningRepository repo){this.refs=refs;this.repo=repo;}
    public DashboardSummary get(LocalDate date){
        var orders=refs.listPlanningOrders(date); Set<UUID> a=new HashSet<>(repo.allocatedOrderIds(date)); Set<UUID>d=new HashSet<>(repo.deferredOrderIds(date));
        long unplanned=orders.stream().filter(o->"CONFIRMED".equalsIgnoreCase(o.orderStatus())).map(OrderRef::orderId).filter(id->!a.contains(id)&&!d.contains(id)).count();
        var vs=refs.listVehicles(); long avail=vs.stream().filter(v->v.active()&&v.available()).count();
        long reeferTotal=vs.stream().filter(v->!"AMBIENT".equalsIgnoreCase(v.tempCapability())).count();
        long reeferAvail=vs.stream().filter(v->!"AMBIENT".equalsIgnoreCase(v.tempCapability())&&v.available()).count();
        long active=repo.countActiveTrips(date);
        return new DashboardSummary(orders.size(),a.size(),unplanned,d.size(),avail,vs.size(),reeferAvail,reeferTotal,active,0);
    }
}
