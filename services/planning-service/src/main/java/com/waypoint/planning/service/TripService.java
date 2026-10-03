package com.waypoint.planning.service;

import com.waypoint.planning.constraint.ConstraintEngine;
import com.waypoint.planning.exception.PlanningException;
import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.*;
import com.waypoint.planning.messaging.PlanningEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service
public class TripService {
    private final ReferenceRepository refs; private final PlanningRepository repo; private final ConstraintEngine engine; private final PlanningEventPublisher events;
    public TripService(ReferenceRepository refs,PlanningRepository repo,ConstraintEngine engine,PlanningEventPublisher events){this.refs=refs;this.repo=repo;this.engine=engine;this.events=events;}

    public ValidationResult validate(TripDraftRequest req){
        if(req.orderIds()==null||req.orderIds().isEmpty()) throw new PlanningException(400,"At least one order is required");
        if(req.vehicleId()==null||req.vehicleId().isBlank()) throw new PlanningException(400,"vehicleId is required");
        var orders=refs.getOrders(req.orderIds()); var vehicle=refs.getVehicle(req.vehicleId());
        return engine.validate(orders,vehicle,req.deliveryDate(),req.stopOrderIds());
    }

    @Transactional
    public TripView confirm(TripDraftRequest req,String userId){
        var orders=refs.getOrders(req.orderIds()); var vehicle=refs.getVehicle(req.vehicleId());
        var validation=engine.validate(orders,vehicle,req.deliveryDate(),req.stopOrderIds());
        if(!validation.feasible()) throw new PlanningException(409,"Trip is infeasible. Resolve failed constraints before confirmation.");
        int tripNo=repo.tripCount(vehicle.vehicleId(),req.deliveryDate())+1;
        if(tripNo>2) throw new PlanningException(409,"Vehicle already has two routes for this day");
        UUID tripId=repo.createTrip(vehicle.vehicleId(),vehicle.driverId(),tripNo,req.deliveryDate(),validation.totalWeightKg(),validation.totalVolumeM3(),validation.stops().stream().map(StopPlan::outletId).toList());
        for(StopPlan s:validation.stops()) repo.createAllocation(s.orderId(),tripId,vehicle.vehicleId(),s.sequence(),s.plannedArrival(),userId);
        events.allocationCompleted(tripId,vehicle.vehicleId(),req.orderIds(),req.deliveryDate());
        return new TripView(tripId,vehicle.vehicleId(),vehicle.driverId(),tripNo,req.deliveryDate(),"PLANNED",validation.totalWeightKg(),validation.totalVolumeM3(),validation.stops());
    }

    public UUID saveDraft(UUID id,TripDraftRequest req,String userId){UUID draft=id==null?UUID.randomUUID():id;repo.saveDraft(draft,req,userId);return draft;}
}
