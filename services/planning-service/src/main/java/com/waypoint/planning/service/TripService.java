package com.waypoint.planning.service;
import com.waypoint.planning.constraint.ConstraintEngine;import com.waypoint.planning.exception.PlanningException;import com.waypoint.planning.model.PlanningModels.*;import com.waypoint.planning.port.PlanningMasterDataPort;import org.springframework.stereotype.Service;import java.util.*;
/** Compatibility validator for clients that have not yet created a persisted draft. Confirmation is resource-only. */
@Service public class TripService {
 private final PlanningMasterDataPort master;private final ConstraintEngine constraints;
 public TripService(PlanningMasterDataPort master,ConstraintEngine constraints){this.master=master;this.constraints=constraints;}
 public ValidationResult validate(TripDraftRequest request){requireValid(request);return constraints.validate(master.getOrders(request.orderIds()),master.getVehicle(request.vehicleId()),request.deliveryDate(),request.stopOrderIds());}
 private void requireValid(TripDraftRequest request){if(request==null)throw new PlanningException(400,"Request body is required");if(request.deliveryDate()==null)throw new PlanningException(400,"deliveryDate is required");if(request.orderIds()==null||request.orderIds().isEmpty())throw new PlanningException(400,"At least one order is required");if(new HashSet<>(request.orderIds()).size()!=request.orderIds().size())throw new PlanningException(400,"Duplicate order IDs are not allowed");if(request.vehicleId()==null||request.vehicleId().isBlank())throw new PlanningException(400,"vehicleId is required");}
}
