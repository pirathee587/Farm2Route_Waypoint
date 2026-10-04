package com.waypoint.planning.routing;
import com.waypoint.planning.model.PlanningModels.*;import java.util.*;
public interface RouteTimingProvider {List<StopPlan> planArrivals(List<OrderRef> orderedStops);}
