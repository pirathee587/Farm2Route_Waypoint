package com.waypoint.order.repository;

import com.waypoint.order.domain.CalendarEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarRepository extends JpaRepository<CalendarEntity, LocalDate> {

    List<CalendarEntity> findByDateBetween(LocalDate from, LocalDate to);
}