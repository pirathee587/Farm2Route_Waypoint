package com.waypoint.planning.service;

import com.waypoint.planning.constraint.ConstraintEngine;
import com.waypoint.planning.model.PlanningModels.*;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class VehicleEligibilityService {
    private final ConstraintEngine constraints;
    public VehicleEligibilityService(ConstraintEngine constraints){this.constraints=constraints;}
    public EligibilityResult evaluate(List<OrderRef> orders,VehicleRef vehicle,LocalDate date,List<UUID> sequence){
        ValidationResult result=constraints.validate(orders,vehicle,date,sequence);
        return new EligibilityResult(result.feasible(),result.checks(),result.blockingReasons());
    }
    public record EligibilityResult(boolean eligible,List<ConstraintCheck> constraintResults,List<String> reasons){}
}
