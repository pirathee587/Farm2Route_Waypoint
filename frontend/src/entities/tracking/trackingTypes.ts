// ============================================================
// trackingTypes.ts — Domain types for Dispatcher Live Tracking
// ============================================================

export type TripMonitoringStatus = 'ON_TIME' | 'AT_RISK' | 'ISSUE';

export type TripState = 'IN_TRANSIT' | 'COMPLETED' | 'PLANNED';

export type StopStatus = 'DEPOT' | 'DELIVERED' | 'NEXT' | 'UPCOMING';

export interface TripStop {
  id: string;
  stopNumber: number;
  name: string;
  orderId?: string;
  status: StopStatus;
  timeText: string;
  deliveryWindow?: string;
  itemsText?: string;
  locationArea?: string;
  // Visual coordinates for SVG map (percentages 0-100)
  mapCoords?: { x: number; y: number };
}

export interface TripConstraint {
  id: string;
  label: string;
  value: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
}

export interface TripActivityItem {
  id: string;
  time: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
}

export interface ActiveTrip {
  id: string;
  tripCode: string; // e.g. "TRIP-0925-014"
  state: TripState; // IN_TRANSIT
  monitoringStatus: TripMonitoringStatus; // ON_TIME, AT_RISK, ISSUE
  vehicleId: string; // VEH014
  vehicleType: string; // Reefer, Dry Box, Van
  vehicleFullName: string; // Refrigerated Truck
  vehiclePlate: string; // WP - CAB - 4421
  driverName: string; // Dilan Fernando
  driverInitials: string; // DF
  driverStatus: string; // Active · On route
  origin: string; // Peliyagoda
  destination: string; // Colombo
  fullRouteText: string; // Peliyagoda Depot → Colombo District
  completedStops: number; // 4
  totalStops: number; // 6
  eta: string; // 10:40
  delayText?: string; // +18 min delay or +12 min
  issueText?: string; // Delivery Issue
  
  // Next stop summary
  nextStopName: string; // Colombo 07
  nextStopFullName: string; // Waypoint Fresh — Colombo 07
  nextStopEta: string; // 10:40
  nextStopWindow: string; // 10:00 - 10:30
  nextStopOrder: string; // ORD-0925-014
  nextStopTemperature?: string; // Chilled
  nextStopItemsText?: string; // 12 chilled items

  // Load & capacity
  weightKg: number; // 3360
  maxWeightKg: number; // 4000
  volumeM3: number; // 15.4
  maxVolumeM3: number; // 18.0
  chilledItemsCount: number; // 12
  totalOrdersCount: number; // 6
  temperatureStatus: string; // Within range

  // Vehicle info
  homeDepot: string; // Peliyagoda
  tripUsage: string; // Trip 1 of 2
  todayTrips: string; // 1/2

  // Timeline / status steps
  tripLoadedTime?: string; // 07:50
  tripDepartedTime?: string; // 08:10

  // Lists
  stops: TripStop[];
  constraints: TripConstraint[];
  activities: TripActivityItem[];
}

export interface LiveTrackingSummary {
  activeTripsCount: number;
  onTimeCount: number;
  atRiskCount: number;
  issuesCount: number;
  lastUpdated: string;
}
