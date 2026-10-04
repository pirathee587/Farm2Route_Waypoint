export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteDepot {
  name: string;
  lat: number;
  lng: number;
}

export type StopDeliveryStatus =
  | 'DELIVERED'
  | 'NOT_DELIVERED'
  | 'PARTIAL'
  | 'ARRIVED'
  | 'WAITING_FOR_WINDOW'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'REMOVED';

export interface RouteStop {
  stop_id: string;
  seq: number;
  outlet_id: string;
  name: string;
  district?: string;
  lat: number;
  lng: number;
  status: StopDeliveryStatus | string;
  window_open?: string;
  window_close?: string;
}

export interface RouteNextStop {
  stop_id: string;
  outlet_id: string;
  name: string;
  district: string;
  status: string;
  window_open: string;
  window_close: string;
  distance_km: number;
  eta_min: number;
  temperature: string;
  constraint: string;
}

export interface RouteInstruction {
  text: string;
  maneuver: string; // e.g. 'turn-left', 'turn-right', 'straight', 'uturn', 'arrive', etc.
  distance_m: number;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat]
}

export interface RouteProgress {
  completed: number;
  total: number;
}

export interface TripTab {
  trip_number: number;
  label: string;
  trip_id?: string;
}

export interface TripRouteResponse {
  trip_number: number;
  vehicle_id: string;
  trip_tabs: TripTab[];
  depot: RouteDepot;
  stops: RouteStop[];
  next_stop: RouteNextStop | null;
  next_instruction: RouteInstruction | null;
  route_geometry: GeoJSONLineString | null;
  progress: RouteProgress;
  route_source: 'mapbox' | 'fallback' | string;
}

export interface RouteGeometryResponse {
  route_geometry: GeoJSONLineString | null;
  route_source: string;
}

export interface DriverGeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
}
