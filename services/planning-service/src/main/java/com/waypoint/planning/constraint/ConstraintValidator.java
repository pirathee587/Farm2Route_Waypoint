package com.waypoint.planning.constraint;

import com.waypoint.planning.model.PlanningModels.ConstraintCheck;

public interface ConstraintValidator {
    String code();
    ConstraintCheck validate(PlanningContext context);
}
