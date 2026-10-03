import { QueueOrder } from '../order/orderTypes';

export interface PlanningSummary {
  unplanned: number;
  planned: number;
  availableVehicles: number;
  totalVehicles: number;
  reeferAvailable: number;
  totalReefer: number;
  deferred: number;
}

export interface VehicleCandidate {
  id: string;
  type: string;
  name: string; // e.g., "VEH014 - Reefer"
  weightCapacityKg: number;
  volumeCapacityM3: number;
  driverName: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Unavailable';
  currentDepot: string;
  isRefrigerated: boolean;
  tripsToday: number;
  fuelStatus: 'Within quota' | 'Exceeded';
}

export interface TripStop {
  id: string;
  sequence: number;
  order: QueueOrder;
}

export interface ValidationCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  status?: 'PASSED' | 'FAILED' | 'NOT_EVALUATED';
}

export interface TripValidationResult {
  feasible: boolean;
  weightUsageKg: number;
  weightCapacityKg: number;
  weightPercent: number;
  volumeUsageM3: number;
  volumeCapacityM3: number;
  volumePercent: number;
  checks: ValidationCheck[];
  conflictMessage?: string;
}

export interface DraftTrip {
  id: string;
  status: 'DRAFT' | 'PLANNED';
  depot: string;
  vehicle: VehicleCandidate | null;
  stops: TripStop[];
  validation: TripValidationResult | null;
  distanceKm: number;
  estDurationMins: number;
  confirmedAt?: string;
}

// ============================================================
// Capacity Shortfall Interfaces
// ============================================================

export type ShortfallConstraintType =
  | 'REEFER CONSTRAINT'
  | 'WEIGHT CONSTRAINT'
  | 'VOLUME CONSTRAINT'
  | 'ACCESS CONSTRAINT'
  | 'DELIVERY WINDOW'
  | 'FUEL CONSTRAINT'
  | 'ROUTE LIMIT';

export interface ShortfallSummary {
  ordersRequiringService: number;
  canBeServed: number;
  requireDecision: number;
  reeferCapacity: number;
  reeferAvailable: number;
}

export interface DeferralRecord {
  reason: string;
  nextPlannedDate: string;
  operationalNote?: string;
  recordedAt: string;
}

export interface AffectedOrder {
  id: string;
  currentTripId?: string;
  outletName: string;
  outletShort: string;
  depot: string;
  district: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  requirement: 'Chilled' | 'Ambient' | 'Frozen';
  weightKg: number;
  volumeM3: number;
  deliveryWindow: string;
  timeSensitive: boolean;
  risk: 'High Risk' | 'Capacity' | 'Lower';
  decisionState: 'Unresolved' | 'Kept' | 'Deferred';
  deferralRecord?: DeferralRecord;
  recommendation: {
    action: 'DEFER' | 'KEEP';
    reason: string;
  };
}

export interface CapacityShortfallData {
  tripId?: string;
  constraintType: ShortfallConstraintType;
  title: string;
  subtitle: string;
  warningTitle: string;
  warningSubtitle: string;
  whyExplanation: string;
  summary: ShortfallSummary;
  affectedOrders: AffectedOrder[];
}

export interface DeferOrderRequest {
  orderId: string;
  reason: string;
  nextPlannedDate: string;
  operationalNote?: string;
  tripId?: string;
}

// ============================================================
// Deferred Orders Page Types
// ============================================================

export type DeferralReasonCategory = 'Capacity' | 'Window' | 'Vehicle' | 'Other';
export type DeferredQueueStatus = 'Scheduled' | 'Pending' | 'Review';

export interface DeferredOrderHistoryEvent {
  event: string;
  timestamp: string; // e.g. '25 Sep · 07:45'
}

export interface DeferredOrder {
  id: string;
  outletName: string;      // e.g. 'Waypoint Fresh — Nugegoda'
  outletShort: string;     // e.g. 'Fresh — Nugegoda'
  depot: string;           // e.g. 'Peliyagoda Depot'
  depotRegion: string;     // e.g. 'Colombo'
  brand: 'Fresh' | 'Style' | 'Tech';
  deferralReasonCategory: DeferralReasonCategory;
  deferralReasonLabel: string;  // e.g. 'Reefer capacity'
  deferralReasonFull: string;   // e.g. 'Refrigerated capacity unavailable'
  deferralNote: string;         // e.g. 'Deferred during route planning'
  deferredAt: string;           // e.g. '25 Sep · 08:28'
  nextPlannedDate: string;      // ISO date or formatted 'DD Sep YYYY'
  nextPlannedDateLabel: string; // e.g. '26 Sep 2026'
  queueStatus: DeferredQueueStatus;
  requirement: 'Chilled' | 'Ambient' | 'Frozen';
  weightKg: number;
  volumeM3: number;
  deliveryWindow: string;
  history: DeferredOrderHistoryEvent[];
}

export interface DeferredOrdersSummary {
  totalDeferred: number;
  capacity: number;
  window: number;
  vehicle: number;
  other: number;
}

export interface UpdateNextPlannedDateRequest {
  orderId: string;
  newDate: string;
  reasonForChange?: string;
}

export interface ReturnToRoutePlanningRequest {
  orderId: string;
}
