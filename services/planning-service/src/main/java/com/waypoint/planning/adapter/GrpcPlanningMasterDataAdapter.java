package com.waypoint.planning.adapter;

import com.waypoint.order.grpc.*;import com.waypoint.planning.exception.PlanningException;import com.waypoint.planning.model.PlanningModels.*;import com.waypoint.planning.port.PlanningMasterDataPort;import net.devh.boot.grpc.client.inject.GrpcClient;import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;import org.springframework.context.annotation.Primary;import org.springframework.stereotype.Component;
import java.time.*;import java.util.*;

@Component @Primary @ConditionalOnProperty(name="waypoint.planning.master-data.mode",havingValue="grpc")
public class GrpcPlanningMasterDataAdapter implements PlanningMasterDataPort {
 @GrpcClient("order-service") private OrderServiceGrpc.OrderServiceBlockingStub client;
 public OrderRef getOrder(UUID id){try{var o=client.getOrder(GetOrderRequest.newBuilder().setOrderId(id.toString()).build()).getOrder();var outlet=client.getOutlet(GetOutletRequest.newBuilder().setOutletId(o.getOutletId()).build()).getOutlet();return map(o,outlet);}catch(RuntimeException ex){throw new PlanningException(502,"Order Service gRPC lookup failed");}}
 public List<OrderRef> getOrders(Collection<UUID> ids){return ids.stream().map(this::getOrder).toList();}
 public List<OrderRef> listPlanningOrders(LocalDate date){try{return client.listOrders(ListOrdersRequest.newBuilder().setDate(date.toString()).setPageSize(1000).build()).getOrdersList().stream().map(o->{var x=client.getOutlet(GetOutletRequest.newBuilder().setOutletId(o.getOutletId()).build()).getOutlet();return map(o,x);}).toList();}catch(RuntimeException ex){throw new PlanningException(502,"Order Service gRPC list-orders failed");}}
 public VehicleRef getVehicle(String id){try{return map(client.getVehicle(GetVehicleRequest.newBuilder().setVehicleId(id).build()).getVehicle());}catch(RuntimeException ex){throw new PlanningException(502,"Order Service gRPC vehicle lookup failed");}}
 public List<VehicleRef> listVehicles(){try{return client.listVehicles(ListVehiclesRequest.newBuilder().build()).getVehiclesList().stream().map(this::map).toList();}catch(RuntimeException ex){throw new PlanningException(502,"Order Service must implement ListVehicles for Planning");}}
 private OrderRef map(com.waypoint.order.grpc.Order o,Outlet x){return new OrderRef(UUID.fromString(o.getOrderId()),o.getOutletId(),x.getName(),x.getDistrict(),x.getDepot(),x.getParkingType(),x.getLat(),x.getLng(),o.getProductCode(),o.getQuantity(),o.getWeightKg(),o.getVolumeM3(),o.getBrand(),o.getTempRequirement(),LocalDate.parse(o.getPreferredDate()),LocalTime.parse(o.getWindowOpen()),LocalTime.parse(o.getWindowClose()),o.getStatus());}
 private VehicleRef map(Vehicle v){UUID driver=v.getDriverId().isBlank()?null:UUID.fromString(v.getDriverId());return new VehicleRef(v.getVehicleId(),v.getRegistration(),v.getType(),v.getWeightCapKg(),v.getVolumeCapM3(),v.getTempCapability(),v.getDepot(),v.getBrand(),driver,v.getActive(),v.getAvailable(),v.getWeeklyFuelQuotaL(),v.getWeeklyFuelUsedL());}
}
