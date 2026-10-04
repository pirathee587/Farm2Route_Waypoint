package com.waypoint.planning.port;
import com.waypoint.planning.model.PlanningModels.*;import java.time.*;import java.util.*;
public interface PlanningMasterDataPort {OrderRef getOrder(UUID id);List<OrderRef> getOrders(Collection<UUID> ids);List<OrderRef> listPlanningOrders(LocalDate date);VehicleRef getVehicle(String id);List<VehicleRef> listVehicles();}
