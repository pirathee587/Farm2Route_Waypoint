package com.waypoint.order.service;
import com.waypoint.order.dto.OrderModels.*;import com.waypoint.order.exception.ApiException;import com.waypoint.order.repository.OrderRepository;import org.springframework.beans.factory.annotation.Value;import org.springframework.http.HttpStatus;import org.springframework.stereotype.Service;
import java.time.*;import java.util.*;
@Service public class OrderService {
 private final OrderRepository repo;private final Clock clock;private final LocalTime cutoff;
 public OrderService(OrderRepository r,Clock c,@Value("${waypoint.cutoff:16:00}")String cutoff){repo=r;clock=c;this.cutoff=LocalTime.parse(cutoff);}
 public PlaceOrderResponse place(UUID user,String role,PlaceOrderRequest req){if(!role.equals("STORE_MANAGER"))throw forbidden();var now=ZonedDateTime.now(clock);if(req.requestedDeliveryDate().isBefore(now.toLocalDate().plusDays(1)))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_DELIVERY_DATE","Requested delivery date must be at least tomorrow");if(req.requestedDeliveryDate().equals(now.toLocalDate().plusDays(1))&&!now.toLocalTime().isBefore(cutoff))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"CUTOFF_PASSED","16:00 cutoff passed; order will be eligible for the following planning run",Map.of("nextEligibleDate",now.toLocalDate().plusDays(2)));String outlet=managerOutlet(user);UUID id=repo.place(outlet,user,req,now.toInstant());return new PlaceOrderResponse(id,"Order confirmed for "+req.requestedDeliveryDate(),"CONFIRMED",req.requestedDeliveryDate());}
 public List<OrderView> list(UUID user,String role,String status){return repo.list(scope(user,role),status);}
 public OrderView get(UUID id,UUID user,String role){authorize(id,user,role);return repo.view(id);}
 public Map<String,Object> eta(UUID id,UUID user,String role){var o=get(id,user,role);return Map.of("orderId",id,"status",o.status(),"expectedArrival",o.expectedArrival()==null?"":o.expectedArrival().toString(),"deferralReason",Objects.toString(o.deferralReason(),""));}
 public UUID receipt(UUID id,UUID user,String role,ReceiptRequest r){authorizeManager(id,user,role);return repo.receipt(id,user,r);}
 public UUID issue(UUID id,UUID user,String role,IssueRequest r){authorizeManager(id,user,role);return repo.issue(id,user,r);}
 public Map<String,Object> myOutlet(UUID user,String role){if(!role.equals("STORE_MANAGER"))throw forbidden();return repo.outlet(managerOutlet(user));}
 public List<Map<String,Object>> outlets(String role){requireAdmin(role);return repo.outlets();}public List<Map<String,Object>> vehicles(String role){if(!Set.of("DISPATCHER","ADMIN","LOADER").contains(role))throw forbidden();return repo.vehicles();}
 private void authorize(UUID id,UUID u,String role){if(role.equals("STORE_MANAGER"))repo.ensureOwned(id,managerOutlet(u));else if(!Set.of("DISPATCHER","ADMIN","LOADER","DRIVER").contains(role))throw forbidden();}
 private void authorizeManager(UUID id,UUID u,String role){if(!role.equals("STORE_MANAGER"))throw forbidden();repo.ensureOwned(id,managerOutlet(u));}
 private String scope(UUID u,String role){if(role.equals("STORE_MANAGER"))return managerOutlet(u);if(Set.of("DISPATCHER","ADMIN","LOADER","DRIVER").contains(role))return null;throw forbidden();}
 private String managerOutlet(UUID u){String x=repo.outletFor(u);if(x==null)throw new ApiException(HttpStatus.FORBIDDEN,"OUTLET_NOT_ASSIGNED","Store manager has no assigned outlet");return x;}
 private void requireAdmin(String r){if(!Set.of("DISPATCHER","ADMIN").contains(r))throw forbidden();}private ApiException forbidden(){return new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","Role is not allowed for this operation");}
}
