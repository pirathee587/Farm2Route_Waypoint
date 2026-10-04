package com.waypoint.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "calendar", schema = "public")
public class CalendarEntity {

    @Id
    private LocalDate date;
    private short dow;

    @Column(name = "dow_name")
    private String dowName;

    @Column(name = "is_weekend")
    private boolean weekend;

    @Column(name = "iso_year")
    private short isoYear;

    @Column(name = "iso_week")
    private short isoWeek;

    @Column(name = "is_payday")
    private boolean payday;

    private String festival;

    @Column(name = "festival_ramp")
    private boolean festivalRamp;

    @Column(name = "is_holiday")
    private boolean holiday;

    private boolean monsoon;

    @Column(name = "is_operating")
    private boolean operating;

    public LocalDate getDate() { return date; }
    public short getDow() { return dow; }
    public String getDowName() { return dowName; }
    public boolean isWeekend() { return weekend; }
    public short getIsoYear() { return isoYear; }
    public short getIsoWeek() { return isoWeek; }
    public boolean isPayday() { return payday; }
    public String getFestival() { return festival; }
    public boolean isFestivalRamp() { return festivalRamp; }
    public boolean isHoliday() { return holiday; }
    public boolean isMonsoon() { return monsoon; }
    public boolean isOperating() { return operating; }
}