// ============================================================
// Dashboard Entity — Dispatcher Dashboard Data Models
// ============================================================

export interface DashboardSummary {
  totalOrders: number;
  unplannedOrders: number;
  plannedOrders: number;
  deferredOrders: number;
  activeTrips: number;
  availableVehicles: number;
  totalVehicles: number;
  availableReefers: number;
  totalReefers: number;
  issuesCount: number;
  inTransitVehicles: number;
  loadingVehicles: number;
  unavailableVehicles: number;
  plannedPercent: number;
}

export type AttentionSeverity = 'critical' | 'warning' | 'info';
export type AttentionType =
  | 'capacity_shortfall'
  | 'reefer_capacity'
  | 'loading_issue'
  | 'delivery_window'
  | 'driver_issue';

export interface AttentionItem {
  id: string;
  type: AttentionType;
  title: string;
  description: string;
  severity: AttentionSeverity;
  affectedRef?: string; // order ID, trip ID, etc.
  actionLabel: string;
  actionTarget: string; // navigation target key
}

export type TripStatus = 'In Transit' | 'Loading' | 'Ready' | 'Completed' | 'Delayed';

export interface ActiveTrip {
  id: string;
  vehicleId: string;
  vehicleType: string;
  route: string;
  driver: string;
  stopsCompleted: number;
  totalStops: number;
  eta: string;
  status: TripStatus;
}

export interface RecentActivityItem {
  id: string;
  time: string;
  description: string;
  color: 'blue' | 'red' | 'orange' | 'green';
}

export interface DashboardData {
  source: 'REAL_API' | 'FALLBACK';
  summary: DashboardSummary;
  attentionItems: AttentionItem[];
  activeTrips: ActiveTrip[];
  recentActivity: RecentActivityItem[];
  date: string;
}
