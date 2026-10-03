// ============================================================
// fleetTypes.ts — Fleet / Capacity & Reports domain types
// ============================================================

export type VehicleStatus = 'Available' | 'In Use' | 'Maintenance' | 'Unavailable';
export type VehicleType = 'Reefer' | 'Dry Box' | 'Van';

export interface FleetVehicle {
  id: string;             // e.g. 'VEH014'
  registration: string;  // e.g. 'WP-CAB-4421'
  type: VehicleType;
  typeFull: string;       // e.g. 'Refrigerated Truck'
  depot: string;          // e.g. 'Peliyagoda'
  weightCapacityKg: number;
  volumeCapacityM3: number;
  isRefrigerated: boolean;
  tripsToday: number;
  maxTripsPerDay: number;
  status: VehicleStatus;
  fuelPercent: number;    // 0–100 (weekly quota %)
  driverName: string;
}

export interface FleetSummary {
  totalFleet: number;
  available: number;
  inUse: number;
  chilledCapable: number;
  unavailable: number;
  chilledAvailable: number;
  dryBoxTotal: number;
  dryBoxAvailable: number;
  vanTotal: number;
  vanAvailable: number;
}

export interface FleetPageData {
  summary: FleetSummary;
  vehicles: FleetVehicle[];
  reeferAttentionRequired: boolean;
}

// ── Reports types ──────────────────────────────────────────────

export type DeferralCategory = 'Capacity' | 'Delivery Window' | 'Vehicle' | 'Other';

export interface DeferralBreakdownItem {
  category: DeferralCategory;
  count: number;
  color: string;
}

export interface DeliveryPerformance {
  plannedOrders: number;
  deferredOrders: number;
  issues: number;
  totalOrders: number;
  plannedPercent: number;
  deferredPercent: number;
}

export interface FleetUtilisation {
  available: number;
  inUse: number;
  unavailable: number;
  total: number;
}

export interface ChilledCapacity {
  chilledAvailable: number;
  chilledTotal: number;
  reeferTrucksTotal: number;
  reeferVansTotal: number;
  attentionRequired: boolean;
}

export interface OperationalInsight {
  id: string;
  type: 'warning' | 'info' | 'attention';
  title: string;
  description: string;
  actionPage?: string;
  actionLabel?: string;
}

export interface ReportData {
  reportDate: string;
  totalOrders: number;
  plannedOrders: number;
  deferredOrders: number;
  activeTrips: number;
  issues: number;
  deliveryPerformance: DeliveryPerformance;
  deferralBreakdown: DeferralBreakdownItem[];
  fleetUtilisation: FleetUtilisation;
  chilledCapacity: ChilledCapacity;
  operationalInsights: OperationalInsight[];
}
