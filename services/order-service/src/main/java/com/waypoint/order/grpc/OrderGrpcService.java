package com.waypoint.order.grpc;

import com.waypoint.order.domain.CalendarEntity;
import com.waypoint.order.domain.OrderEntity;
import com.waypoint.order.domain.OrderStatus;
import com.waypoint.order.domain.OutletEntity;
import com.waypoint.order.domain.VehicleEntity;
import com.waypoint.order.repository.CalendarRepository;
import com.waypoint.order.repository.OrderRepository;
import com.waypoint.order.repository.OutletRepository;
import com.waypoint.order.repository.VehicleRepository;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
public class OrderGrpcService extends OrderServiceGrpc.OrderServiceImplBase {

    private final OrderRepository orderRepository;
    private final OutletRepository outletRepository;
    private final VehicleRepository vehicleRepository;
    private final CalendarRepository calendarRepository;

    public OrderGrpcService(
        OrderRepository orderRepository,
        OutletRepository outletRepository,
        VehicleRepository vehicleRepository,
        CalendarRepository calendarRepository) {
        this.orderRepository = orderRepository;
        this.outletRepository = outletRepository;
        this.vehicleRepository = vehicleRepository;
        this.calendarRepository = calendarRepository;
    }

    @Override
    public void getOrders(
        GetOrdersRequest request,
        StreamObserver<GetOrdersResponse> responseObserver) {
        try {
            LocalDate date = parseRequiredDate(request.getDate(), "date");
            Set<String> outletIds = request.getDepot().isBlank()
                ? null
                : outletRepository.findByDepot(request.getDepot()).stream()
                    .map(OutletEntity::getOutletId)
                    .collect(Collectors.toSet());

            List<Order> orders = orderRepository.findByRequestedDeliveryDateAndStatusIn(
                    date, List.of(OrderStatus.PENDING, OrderStatus.ALLOCATED)).stream()
                .filter(order -> outletIds == null || outletIds.contains(order.getOutletId()))
                .map(this::toProto)
                .toList();

            responseObserver.onNext(GetOrdersResponse.newBuilder().addAllOrders(orders).build());
            responseObserver.onCompleted();
        } catch (IllegalArgumentException exception) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(exception.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void getOutlets(
        GetOutletsRequest request,
        StreamObserver<GetOutletsResponse> responseObserver) {
        responseObserver.onNext(GetOutletsResponse.newBuilder()
            .addAllOutlets(outletRepository.findAll().stream().map(this::toProto).toList())
            .build());
        responseObserver.onCompleted();
    }

    @Override
    public void getVehicles(
        GetVehiclesRequest request,
        StreamObserver<GetVehiclesResponse> responseObserver) {
        responseObserver.onNext(GetVehiclesResponse.newBuilder()
            .addAllVehicles(vehicleRepository.findAll().stream().map(this::toProto).toList())
            .build());
        responseObserver.onCompleted();
    }

    @Override
    public void getCalendar(
        GetCalendarRequest request,
        StreamObserver<GetCalendarResponse> responseObserver) {
        try {
            List<CalendarEntity> rows;
            if (request.getDateFrom().isBlank() && request.getDateTo().isBlank()) {
                rows = calendarRepository.findAll();
            } else {
                LocalDate from = parseRequiredDate(request.getDateFrom(), "date_from");
                LocalDate to = request.getDateTo().isBlank()
                    ? from
                    : parseRequiredDate(request.getDateTo(), "date_to");
                if (to.isBefore(from)) {
                    throw new IllegalArgumentException("date_to must not be before date_from");
                }
                rows = calendarRepository.findByDateBetween(from, to);
            }
            responseObserver.onNext(GetCalendarResponse.newBuilder()
                .addAllRows(rows.stream().map(this::toProto).toList())
                .build());
            responseObserver.onCompleted();
        } catch (IllegalArgumentException exception) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(exception.getMessage()).asRuntimeException());
        }
    }

    private Order toProto(OrderEntity order) {
        return Order.newBuilder()
            .setOrderId(order.getId().toString())
            .setOutletId(order.getOutletId())
            .setBrand(order.getBrand().name())
            .setPreferredDate(order.getRequestedDeliveryDate().toString())
            .setStatus(order.getStatus().name())
            .setCreatedAt(order.getCreatedAt().toString())
            .setUpdatedAt(order.getUpdatedAt().toString())
            .build();
    }

    private Outlet toProto(OutletEntity outlet) {
        return Outlet.newBuilder()
            .setOutletId(outlet.getOutletId())
            .setName(nullToEmpty(outlet.getName()))
            .setDistrict(nullToEmpty(outlet.getDistrict()))
            .setDepot(nullToEmpty(outlet.getDepot()))
            .setParkingType(nullToEmpty(outlet.getParkingType()))
            .setLat(decimal(outlet.getLat()))
            .setLng(decimal(outlet.getLng()))
            .build();
    }

    private Vehicle toProto(VehicleEntity vehicle) {
        return Vehicle.newBuilder()
            .setVehicleId(vehicle.getVehicleId())
            .setRegistration(nullToEmpty(vehicle.getRegistration()))
            .setType(nullToEmpty(vehicle.getType()))
            .setWeightCapKg(decimal(vehicle.getWeightCapKg()))
            .setVolumeCapM3(decimal(vehicle.getVolumeCapM3()))
            .setTempCapability(nullToEmpty(vehicle.getTempCapability()))
            .setDepot(nullToEmpty(vehicle.getDepot()))
            .setBrand(nullToEmpty(vehicle.getBrand()))
            .build();
    }

    private CalendarRow toProto(CalendarEntity row) {
        return CalendarRow.newBuilder()
            .setDate(row.getDate().toString())
            .setDow(row.getDow())
            .setDowName(nullToEmpty(row.getDowName()))
            .setIsWeekend(row.isWeekend())
            .setIsoYear(row.getIsoYear())
            .setIsoWeek(row.getIsoWeek())
            .setIsPayday(row.isPayday())
            .setFestival(nullToEmpty(row.getFestival()))
            .setFestivalRamp(row.isFestivalRamp())
            .setIsHoliday(row.isHoliday())
            .setMonsoon(row.isMonsoon())
            .setIsOperating(row.isOperating())
            .build();
    }

    private static LocalDate parseRequiredDate(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return LocalDate.parse(value);
    }

    private static double decimal(BigDecimal value) {
        return value == null ? 0D : value.doubleValue();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}