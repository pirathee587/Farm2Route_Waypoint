package com.waypoint.planning.jpa;
import com.waypoint.planning.entity.PlanningDecisionEntity;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface PlanningDecisionJpaRepository extends JpaRepository<PlanningDecisionEntity,UUID>{}
