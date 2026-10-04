package com.waypoint.planning.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.*;
import java.util.*;

@Component
public class ReferenceDataLoader implements ApplicationRunner {
  private final JdbcTemplate jdbc;
  private final boolean enabled;
  public ReferenceDataLoader(JdbcTemplate jdbc,@Value("${waypoint.reference-data.enabled:true}")boolean enabled){this.jdbc=jdbc;this.enabled=enabled;}
  @Override public void run(ApplicationArguments args) throws Exception {if(!enabled)return;loadOutlets();loadVehicles();loadCalendar();loadTravel();loadAllowance();loadOrders();}
  private List<Map<String,String>> csv(String name)throws IOException{
    try(var in=new ClassPathResource("reference/"+name).getInputStream();var br=new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))){
      String[] headers=Objects.requireNonNull(br.readLine()).split(",",-1);List<Map<String,String>> rows=new ArrayList<>();String line;
      while((line=br.readLine())!=null){if(line.isBlank())continue;String[] values=line.split(",",-1);Map<String,String> row=new LinkedHashMap<>();for(int i=0;i<headers.length;i++)row.put(headers[i],i<values.length?values[i].trim():"");rows.add(row);}return rows;}
  }
  private void loadOutlets()throws IOException{for(var r:csv("outlets.csv"))jdbc.update("""
    INSERT INTO public.outlets(outlet_id,name,district,depot,brand,parking_type,dock_type,mall_window_open,mall_window_close,last_served_date,store_manager_id)
    VALUES(?,?,?,?,?::public.order_brand,?::public.parking_type,?::public.dock_type,?::time,?::time,?::date,?::uuid)
    ON CONFLICT(outlet_id) DO UPDATE SET name=EXCLUDED.name,district=EXCLUDED.district,depot=EXCLUDED.depot,brand=EXCLUDED.brand,parking_type=EXCLUDED.parking_type,dock_type=EXCLUDED.dock_type,mall_window_open=EXCLUDED.mall_window_open,mall_window_close=EXCLUDED.mall_window_close,last_served_date=EXCLUDED.last_served_date
    """,r.get("outlet_id"),r.get("name"),r.get("district"),r.get("depot"),r.get("brand"),r.get("parking_type"),r.get("dock_type"),nil(r.get("mall_window_open")),nil(r.get("mall_window_close")),nil(r.get("last_served_date")),nil(r.get("store_manager_id")));}
  private void loadVehicles()throws IOException{for(var r:csv("vehicles.csv"))jdbc.update("""
    INSERT INTO public.vehicles(vehicle_id,registration,type,weight_cap_kg,volume_cap_m3,temp_capability,depot,brand,driver_id,km_per_l,weekly_fuel_quota_l,fuel_used_week_l,in_workshop)
    VALUES(?,?,?::public.vehicle_kind,?,?,?::public.temp_requirement,?,?,?::uuid,?,?,?,?)
    ON CONFLICT(vehicle_id) DO UPDATE SET registration=EXCLUDED.registration,type=EXCLUDED.type,weight_cap_kg=EXCLUDED.weight_cap_kg,volume_cap_m3=EXCLUDED.volume_cap_m3,temp_capability=EXCLUDED.temp_capability,depot=EXCLUDED.depot,brand=EXCLUDED.brand,driver_id=EXCLUDED.driver_id,km_per_l=EXCLUDED.km_per_l,weekly_fuel_quota_l=EXCLUDED.weekly_fuel_quota_l,fuel_used_week_l=EXCLUDED.fuel_used_week_l,in_workshop=EXCLUDED.in_workshop
    """,r.get("vehicle_id"),r.get("registration"),r.get("type"),num(r,"weight_cap_kg"),num(r,"volume_cap_m3"),r.get("temp_capability"),r.get("depot"),r.get("brand"),nil(r.get("driver_id")),num(r,"km_per_l"),num(r,"weekly_fuel_quota_l"),num(r,"fuel_used_week_l"),Boolean.valueOf(r.get("in_workshop")));}
  private void loadCalendar()throws IOException{for(var r:csv("calendar.csv"))jdbc.update("INSERT INTO public.delivery_calendar(outlet_id,delivery_date,is_delivery_day,notes) VALUES(?,?::date,?,?) ON CONFLICT(outlet_id,delivery_date) DO UPDATE SET is_delivery_day=EXCLUDED.is_delivery_day,notes=EXCLUDED.notes",r.get("outlet_id"),r.get("delivery_date"),Boolean.valueOf(r.get("is_delivery_day")),r.get("notes"));}
  private void loadTravel()throws IOException{for(var r:csv("district_travel.csv"))jdbc.update("INSERT INTO public.district_travel VALUES(?,?,?,?,?) ON CONFLICT(depot,district) DO UPDATE SET depot_to_district_freeflow_min=EXCLUDED.depot_to_district_freeflow_min,inter_stop_freeflow_min=EXCLUDED.inter_stop_freeflow_min,distance_km=EXCLUDED.distance_km",r.get("depot"),r.get("district"),integer(r,"depot_to_district_freeflow_min"),integer(r,"inter_stop_freeflow_min"),num(r,"distance_km"));}
  private void loadAllowance()throws IOException{for(var r:csv("service_allowance.csv"))jdbc.update("INSERT INTO public.service_allowance VALUES(?,?,?) ON CONFLICT(brand,dock_type) DO UPDATE SET service_allowance_min=EXCLUDED.service_allowance_min",r.get("brand"),r.get("dock_type"),integer(r,"service_allowance_min"));}
  private void loadOrders()throws IOException{for(var r:csv("s1_orders.csv"))jdbc.update("""
    INSERT INTO public.orders(id,outlet_id,product_code,quantity,weight_kg,volume_m3,brand,temp_requirement,preferred_date,window_open,window_close,status,order_value,closed_at,planning_scenario)
    VALUES(?::uuid,?,?,?,?,?,?::public.order_brand,?::public.temp_requirement,?::date,?::time,?::time,'PENDING'::public.order_status_v2,?,?::timestamptz,'S1')
    ON CONFLICT(id) DO UPDATE SET quantity=EXCLUDED.quantity,weight_kg=EXCLUDED.weight_kg,volume_m3=EXCLUDED.volume_m3,order_value=EXCLUDED.order_value,closed_at=EXCLUDED.closed_at
    """,r.get("order_id"),r.get("outlet_id"),r.get("product_code"),integer(r,"quantity"),num(r,"weight_kg"),num(r,"volume_m3"),r.get("brand"),r.get("temp_requirement"),r.get("preferred_date"),r.get("window_open"),r.get("window_close"),num(r,"order_value"),r.get("closed_at"));}
  private Object nil(String s){return s==null||s.isBlank()?null:s;}private double num(Map<String,String>r,String k){return Double.parseDouble(r.get(k));}private int integer(Map<String,String>r,String k){return Integer.parseInt(r.get(k));}
}
