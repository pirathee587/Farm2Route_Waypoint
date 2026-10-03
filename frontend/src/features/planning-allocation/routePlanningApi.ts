import type { 
  PlanningSummary, 
  VehicleCandidate, 
  DraftTrip, 
  TripValidationResult, 
  TripStop,
  CapacityShortfallData,
  AffectedOrder,
  DeferOrderRequest,
  DeferralRecord,
  DeferredOrder,
  DeferredOrdersSummary,
  UpdateNextPlannedDateRequest,
  ReturnToRoutePlanningRequest,
} from '@/entities/planning/planningTypes';
import {
  getDevelopmentOrders,
  updateDevelopmentOrderStatus,
  upsertDevelopmentOrder,
} from '@/features/order-management/ordersApi';
import { fetchFleetData } from '@/features/fleet/fleetApi';
import type { QueueOrder } from '@/entities/order/orderTypes';

export async function fetchPlanningSummary(): Promise<PlanningSummary> {
  const fleet = await fetchFleetData();
  const orders = getDevelopmentOrders();
  return {
    unplanned: orders.filter(order => order.status === 'Unplanned').length,
    planned: 48,
    availableVehicles: fleet.summary.available,
    totalVehicles: fleet.summary.totalFleet,
    reeferAvailable: fleet.summary.chilledAvailable,
    totalReefer: fleet.summary.chilledCapable,
    deferred: orders.filter(order => order.status === 'Deferred').length
  };
}

export async function fetchAvailableVehicles(): Promise<VehicleCandidate[]> {
  const fleet = await fetchFleetData();
  return fleet.vehicles.map(vehicle => ({
    id: vehicle.id,
    type: vehicle.type === 'Dry Box' ? 'Dry-box Truck' : vehicle.type === 'Van' ? 'Small Van' : 'Reefer',
    name: `${vehicle.id} - ${vehicle.type}`,
    weightCapacityKg: vehicle.weightCapacityKg,
    volumeCapacityM3: vehicle.volumeCapacityM3,
    driverName: vehicle.driverName,
    status: vehicle.status,
    currentDepot: vehicle.depot,
    isRefrigerated: vehicle.isRefrigerated,
    tripsToday: vehicle.tripsToday,
    fuelStatus: vehicle.fuelPercent >= 30 ? 'Within quota' : 'Exceeded',
  }));
}

function orderDepot(order: QueueOrder): string {
  return order.routeArea.toLowerCase().startsWith('kandy') ? 'Kandy' : 'Peliyagoda';
}

export function getVehicleEligibilityReason(vehicle: VehicleCandidate, orders: QueueOrder[], tripDepot: string): string | null {
  if (vehicle.status !== 'Available') return vehicle.status;
  if (vehicle.tripsToday >= 2) return 'Daily trip limit reached';
  if (vehicle.fuelStatus === 'Exceeded') return 'Fuel quota exceeded';
  if (vehicle.currentDepot !== tripDepot) return `Home depot is ${vehicle.currentDepot}`;
  if (orders.some(order => orderDepot(order) !== tripDepot)) return 'Order depot mismatch';
  if (orders.reduce((sum, order) => sum + order.weightKg, 0) > vehicle.weightCapacityKg) return 'Weight capacity exceeded';
  if (orders.reduce((sum, order) => sum + order.volumeM3, 0) > vehicle.volumeCapacityM3) return 'Volume capacity exceeded';
  if (orders.some(order => order.temperature !== 'Ambient') && !vehicle.isRefrigerated) return 'Reefer required';
  if (orders.some(order => order.constraint === 'Van Only') && vehicle.type !== 'Small Van') return 'Van-only outlet';
  return null;
}

function parseTime(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function arrivalFitsWindow(window: string, arrivalMinutes: number): boolean {
  const times = window.match(/\d{1,2}:\d{2}/g) ?? [];
  if (/before/i.test(window) && times[0]) return arrivalMinutes <= (parseTime(times[0]) ?? -1);
  if (times.length >= 2) {
    const start = parseTime(times[0]!);
    const end = parseTime(times[1]!);
    return start !== null && end !== null && arrivalMinutes >= start && arrivalMinutes <= end;
  }
  return false;
}

export async function validateTrip(vehicle: VehicleCandidate | null, stops: TripStop[], tripDepot = 'Peliyagoda'): Promise<TripValidationResult> {
  await new Promise(r => setTimeout(r, 200));
  
  if (!vehicle) {
    return {
      feasible: false,
      weightUsageKg: 0, weightCapacityKg: 0, weightPercent: 0,
      volumeUsageM3: 0, volumeCapacityM3: 0, volumePercent: 0,
      checks: [],
      conflictMessage: 'No vehicle selected.'
    };
  }

  const weightUsage = stops.reduce((sum, stop) => sum + stop.order.weightKg, 0);
  const volumeUsage = stops.reduce((sum, stop) => sum + stop.order.volumeM3, 0);
  
  const weightPercent = Math.round((weightUsage / vehicle.weightCapacityKg) * 100);
  const volumePercent = Math.round((volumeUsage / vehicle.volumeCapacityM3) * 100);

  const needsReefer = stops.some(s => s.order.temperature === 'Chilled' || s.order.temperature === 'Frozen');
  const tempValid = needsReefer ? vehicle.isRefrigerated : true;
  
  const weightValid = weightUsage <= vehicle.weightCapacityKg;
  const volumeValid = volumeUsage <= vehicle.volumeCapacityM3;
  const tripsValid = vehicle.tripsToday < 2;
  const availabilityValid = vehicle.status === 'Available';
  const fuelValid = vehicle.fuelStatus !== 'Exceeded';
  const depotValid = vehicle.currentDepot === tripDepot && stops.every(stop => orderDepot(stop.order) === tripDepot);
  const vanOnlyRequired = stops.some(stop => stop.order.constraint === 'Van Only');
  const accessValid = !vanOnlyRequired || vehicle.type === 'Small Van';
  // Development scheduling model: first ETA 06:30, then 60 minutes per stop.
  // This is deterministic and is replaced by route ETA data when the backend is connected.
  const windowValid = stops.every((stop, index) => arrivalFitsWindow(stop.order.deliveryWindow, 390 + index * 60));

  const feasible = stops.length > 0 && tempValid && weightValid && volumeValid && tripsValid && availabilityValid && fuelValid && depotValid && accessValid && windowValid;

  const checks = [
    { id: 'weight', name: 'Weight Capacity', passed: weightValid, message: weightValid ? 'Valid' : 'Capacity exceeded' },
    { id: 'volume', name: 'Volume Capacity', passed: volumeValid, message: volumeValid ? 'Valid' : 'Capacity exceeded' },
    { id: 'temp', name: 'Temperature', passed: tempValid, message: tempValid ? (needsReefer ? 'Reefer compatible' : 'Valid') : 'Reefer required' },
    { id: 'availability', name: 'Vehicle Availability', passed: availabilityValid, status: availabilityValid ? 'PASSED' as const : 'FAILED' as const, message: availabilityValid ? 'Available' : `${vehicle.status} vehicles cannot be allocated` },
    { id: 'access', name: 'Outlet Access', passed: accessValid, status: accessValid ? 'PASSED' as const : 'FAILED' as const, message: accessValid ? (vanOnlyRequired ? 'Van compatible' : 'Valid') : 'Van-only outlet requires a small van' },
    { id: 'depot', name: 'Home Depot', passed: depotValid, status: depotValid ? 'PASSED' as const : 'FAILED' as const, message: depotValid ? vehicle.currentDepot : `Vehicle and all orders must belong to ${tripDepot}` },
    { id: 'window', name: 'Delivery Windows', passed: windowValid, status: windowValid ? 'PASSED' as const : 'FAILED' as const, message: windowValid ? 'Estimated arrivals fit windows' : 'Estimated arrival conflicts with a delivery window' },
    { id: 'fuel', name: 'Fuel Quota', passed: fuelValid, status: fuelValid ? 'PASSED' as const : 'FAILED' as const, message: vehicle.fuelStatus },
    { id: 'trips', name: 'Trips Per Day', passed: tripsValid, message: `Trip ${vehicle.tripsToday + 1} of 2` },
  ];

  let conflictMessage;
  if (!feasible) {
    if (!availabilityValid) conflictMessage = `${vehicle.id} is ${vehicle.status.toLowerCase()} and cannot be allocated.`;
    else if (!tempValid) conflictMessage = 'Chilled orders require refrigerated capacity. Choose another vehicle.';
    else if (!accessValid) conflictMessage = 'A van-only outlet requires a suitable small van.';
    else if (!depotValid) conflictMessage = 'Vehicle home depot does not match the trip and order depot.';
    else if (!windowValid) conflictMessage = 'Estimated arrival conflicts with an order delivery window.';
    else if (!fuelValid) conflictMessage = 'Vehicle weekly fuel quota is exceeded.';
    else if (!weightValid || !volumeValid) conflictMessage = 'Some remaining orders may not fit available fleet capacity.';
    else if (!tripsValid) conflictMessage = 'Vehicle has already reached maximum trips per day.';
  }

  return {
    feasible,
    weightUsageKg: weightUsage,
    weightCapacityKg: vehicle.weightCapacityKg,
    weightPercent,
    volumeUsageM3: volumeUsage,
    volumeCapacityM3: vehicle.volumeCapacityM3,
    volumePercent,
    checks,
    conflictMessage
  };
}

export async function generateSuggestedPlan(orders: QueueOrder[]): Promise<DraftTrip> {
  await new Promise(r => setTimeout(r, 400));
  const vehicles = await fetchAvailableVehicles();
  const depot = orders[0] ? orderDepot(orders[0]) : 'Peliyagoda';
  const vehicle = vehicles.find(candidate => candidate.status === 'Available' && candidate.currentDepot === depot && candidate.tripsToday < 2 && candidate.fuelStatus === 'Within quota') ?? null;
  
  const stops = orders.map((o, idx) => ({ id: `stop-${idx}`, sequence: idx + 1, order: o }));
  const validation = await validateTrip(vehicle, stops, depot);

  return {
    id: `TRIP-0925-014`,
    status: 'DRAFT',
    depot,
    vehicle,
    stops,
    validation,
    distanceKm: 42,
    estDurationMins: 95
  };
}

export async function confirmTrip(draft: DraftTrip): Promise<{ success: boolean, tripId: string }> {
  await new Promise(r => setTimeout(r, 600));
  const validation = await validateTrip(draft.vehicle, draft.stops, draft.depot);
  
  if (!validation.feasible) {
    return { success: false, tripId: draft.id };
  }
  const confirmed: DraftTrip = { ...draft, status: 'PLANNED', validation, confirmedAt: new Date().toISOString() };
  confirmedTripsStore.set(draft.id, confirmed);
  sessionStorage.setItem(`waypoint:confirmed-trip:${draft.id}`, JSON.stringify(confirmed));
  draft.stops.forEach(stop => updateDevelopmentOrderStatus(stop.order.id, 'Planned'));
  return { success: true, tripId: draft.id };
}

const confirmedTripsStore = new Map<string, DraftTrip>();
let savedDraft: DraftTrip | null = null;

export async function savePlanningDraft(draft: DraftTrip): Promise<void> {
  savedDraft = structuredClone(draft);
  sessionStorage.setItem('waypoint:planning-draft', JSON.stringify(draft));
}

export function getSavedPlanningDraft(): DraftTrip | null {
  if (savedDraft) return structuredClone(savedDraft);
  const persisted = sessionStorage.getItem('waypoint:planning-draft');
  return persisted ? JSON.parse(persisted) as DraftTrip : null;
}

export async function fetchPlannedTrip(tripId: string): Promise<DraftTrip> {
  await new Promise(r => setTimeout(r, 300));
  const persisted = sessionStorage.getItem(`waypoint:confirmed-trip:${tripId}`);
  const trip = confirmedTripsStore.get(tripId) ?? (persisted ? JSON.parse(persisted) as DraftTrip : undefined);
  if (!trip) throw new Error('Trip not found');
  return structuredClone(trip);
}

// ============================================================
// Capacity Shortfall Mock & API Functions
// ============================================================

export const MOCK_AFFECTED_ORDERS: AffectedOrder[] = [
  {
    id: 'ORD-0925-027',
    currentTripId: 'TRIP-0925-014',
    outletName: 'Waypoint Fresh — Nugegoda',
    outletShort: 'Fresh — Nugegoda',
    depot: 'Peliyagoda Depot',
    district: 'Colombo District',
    brand: 'Fresh',
    requirement: 'Chilled',
    weightKg: 690,
    volumeM3: 6.4,
    deliveryWindow: 'Before 08:00',
    timeSensitive: true,
    risk: 'High Risk',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'DEFER',
      reason: 'Refrigerated capacity unavailable'
    }
  },
  {
    id: 'ORD-0925-036',
    outletName: 'Waypoint Fresh — Gampaha',
    outletShort: 'Fresh — Gampaha',
    depot: 'Peliyagoda Depot',
    district: 'Gampaha District',
    brand: 'Fresh',
    requirement: 'Chilled',
    weightKg: 610,
    volumeM3: 5.9,
    deliveryWindow: 'Before 08:00',
    timeSensitive: true,
    risk: 'Capacity',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'DEFER',
      reason: 'Refrigerated capacity unavailable'
    }
  },
  {
    id: 'ORD-0925-041',
    outletName: 'Waypoint Style — Colombo 03',
    outletShort: 'Style — Colombo',
    depot: 'Peliyagoda Depot',
    district: 'Colombo District',
    brand: 'Style',
    requirement: 'Ambient',
    weightKg: 490,
    volumeM3: 4.8,
    deliveryWindow: '08:00–12:00',
    timeSensitive: false,
    risk: 'Lower',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'KEEP',
      reason: 'Can fit standard dry capacity'
    }
  },
  {
    id: 'ORD-0925-044',
    outletName: 'Waypoint Fresh — Wattala',
    outletShort: 'Fresh — Wattala',
    depot: 'Peliyagoda Depot',
    district: 'Gampaha District',
    brand: 'Fresh',
    requirement: 'Chilled',
    weightKg: 580,
    volumeM3: 5.5,
    deliveryWindow: '06:00–08:00',
    timeSensitive: true,
    risk: 'High Risk',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'DEFER',
      reason: 'Refrigerated capacity unavailable'
    }
  },
  {
    id: 'ORD-0925-049',
    outletName: 'Waypoint Tech — Colombo 04',
    outletShort: 'Tech — Colombo',
    depot: 'Peliyagoda Depot',
    district: 'Colombo District',
    brand: 'Tech',
    requirement: 'Ambient',
    weightKg: 720,
    volumeM3: 7.0,
    deliveryWindow: '10:00–14:00',
    timeSensitive: false,
    risk: 'Lower',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'KEEP',
      reason: 'Standard dry capacity feasible'
    }
  },
  {
    id: 'ORD-0925-052',
    outletName: 'Waypoint Fresh — Moratuwa',
    outletShort: 'Fresh — Moratuwa',
    depot: 'Peliyagoda Depot',
    district: 'Colombo District',
    brand: 'Fresh',
    requirement: 'Chilled',
    weightKg: 520,
    volumeM3: 4.9,
    deliveryWindow: 'Before 09:00',
    timeSensitive: true,
    risk: 'Capacity',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'DEFER',
      reason: 'Refrigerated capacity unavailable'
    }
  },
  {
    id: 'ORD-0925-055',
    outletName: 'Waypoint Style — Negombo',
    outletShort: 'Style — Negombo',
    depot: 'Peliyagoda Depot',
    district: 'Gampaha District',
    brand: 'Style',
    requirement: 'Ambient',
    weightKg: 380,
    volumeM3: 3.8,
    deliveryWindow: '09:00–13:00',
    timeSensitive: false,
    risk: 'Lower',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'KEEP',
      reason: 'Standard dry capacity feasible'
    }
  },
  {
    id: 'ORD-0925-058',
    outletName: 'Waypoint Fresh — Kelaniya',
    outletShort: 'Fresh — Kelaniya',
    depot: 'Peliyagoda Depot',
    district: 'Gampaha District',
    brand: 'Fresh',
    requirement: 'Chilled',
    weightKg: 640,
    volumeM3: 6.0,
    deliveryWindow: '07:00–09:00',
    timeSensitive: true,
    risk: 'High Risk',
    decisionState: 'Unresolved',
    recommendation: {
      action: 'DEFER',
      reason: 'Refrigerated capacity unavailable'
    }
  }
];

export async function fetchCapacityShortfallData(tripId?: string): Promise<CapacityShortfallData> {
  await new Promise(r => setTimeout(r, 250));
  return {
    tripId: tripId || 'TRIP-0925-014',
    constraintType: 'REEFER CONSTRAINT',
    title: 'Capacity Shortfall Detected',
    subtitle: 'Available fleet capacity cannot serve all current delivery demand.',
    warningTitle: 'Refrigerated capacity is insufficient for all chilled orders.',
    warningSubtitle: 'Review the affected orders below and decide which orders remain in the plan and which must be deferred.',
    whyExplanation: 'Available refrigerated vehicle capacity is insufficient to serve all chilled orders within their required delivery windows.',
    summary: {
      ordersRequiringService: 56,
      canBeServed: 48,
      requireDecision: 8,
      reeferCapacity: 16,
      reeferAvailable: 8
    },
    affectedOrders: MOCK_AFFECTED_ORDERS
  };
}

export async function recordOrderDeferral(req: DeferOrderRequest): Promise<{ success: boolean; deferralRecord: DeferralRecord }> {
  // Simulate network request
  await new Promise(r => setTimeout(r, 400));
  const record: DeferralRecord = {
    reason: req.reason,
    nextPlannedDate: req.nextPlannedDate,
    operationalNote: req.operationalNote,
    recordedAt: new Date().toISOString()
  };
  const affected = MOCK_AFFECTED_ORDERS.find(order => order.id === req.orderId);
  if (affected) {
    upsertDevelopmentOrder({
      id: affected.id, receivedAt: '', isNew: false, outletName: affected.outletName,
      routeArea: `${affected.depot.replace(' Depot', '')} - ${affected.district.replace(' District', '')}`,
      brand: affected.brand, deliveryWindow: affected.deliveryWindow,
      timeSensitive: affected.timeSensitive, temperature: affected.requirement,
      weightKg: affected.weightKg, volumeM3: affected.volumeM3, status: 'Deferred',
      constraint: affected.requirement === 'Ambient' ? 'Valid' : 'Reefer Capacity',
    });
    const deferred: DeferredOrder = {
      id: affected.id, outletName: affected.outletName, outletShort: affected.outletShort,
      depot: affected.depot, depotRegion: affected.district.replace(' District', ''), brand: affected.brand,
      deferralReasonCategory: /window/i.test(req.reason) ? 'Window' : /vehicle/i.test(req.reason) ? 'Vehicle' : /capacity|refriger/i.test(req.reason) ? 'Capacity' : 'Other',
      deferralReasonLabel: req.reason, deferralReasonFull: req.reason,
      deferralNote: req.operationalNote || 'Deferred during route planning',
      deferredAt: new Date().toLocaleString('en-GB'), nextPlannedDate: req.nextPlannedDate,
      nextPlannedDateLabel: req.nextPlannedDate, queueStatus: 'Scheduled',
      requirement: affected.requirement, weightKg: affected.weightKg,
      volumeM3: affected.volumeM3, deliveryWindow: affected.deliveryWindow,
      history: [{ event: 'Deferred by Dispatcher', timestamp: new Date().toLocaleString('en-GB') }],
    };
    deferredOrdersStore = deferredOrdersStore.some(order => order.id === deferred.id)
      ? deferredOrdersStore.map(order => order.id === deferred.id ? deferred : order)
      : [...deferredOrdersStore, deferred];
    persistDeferredOrders();
  } else {
    updateDevelopmentOrderStatus(req.orderId, 'Deferred');
  }
  return {
    success: true,
    deferralRecord: record
  };
}

export async function recordOrderKeepInPlan(orderId: string): Promise<{ success: boolean }> {
  await new Promise(r => setTimeout(r, 300));
  updateDevelopmentOrderStatus(orderId, 'Unplanned');
  return { success: true };
}

// ============================================================
// Deferred Orders Mock Data & API Functions
// ============================================================

export const MOCK_DEFERRED_ORDERS: DeferredOrder[] = [
  {
    id: 'ORD-0925-027',
    outletName: 'Waypoint Fresh — Nugegoda',
    outletShort: 'Fresh — Nugegoda',
    depot: 'Peliyagoda Depot',
    depotRegion: 'Colombo',
    brand: 'Fresh',
    deferralReasonCategory: 'Capacity',
    deferralReasonLabel: 'Reefer capacity',
    deferralReasonFull: 'Refrigerated capacity unavailable',
    deferralNote: 'Deferred during route planning',
    deferredAt: '25 Sep · 08:28',
    nextPlannedDate: '2026-09-26',
    nextPlannedDateLabel: '26 Sep 2026',
    queueStatus: 'Scheduled',
    requirement: 'Chilled',
    weightKg: 690,
    volumeM3: 6.4,
    deliveryWindow: 'Before 08:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 07:45' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 08:28' },
    ],
  },
  {
    id: 'ORD-0925-036',
    outletName: 'Waypoint Fresh — Gampaha',
    outletShort: 'Fresh — Gampaha',
    depot: 'Peliyagoda Depot',
    depotRegion: 'Gampaha',
    brand: 'Fresh',
    deferralReasonCategory: 'Capacity',
    deferralReasonLabel: 'Reefer capacity',
    deferralReasonFull: 'Refrigerated capacity unavailable',
    deferralNote: 'Deferred during route planning',
    deferredAt: '25 Sep · 08:30',
    nextPlannedDate: '2026-09-27',
    nextPlannedDateLabel: '27 Sep 2026',
    queueStatus: 'Scheduled',
    requirement: 'Chilled',
    weightKg: 610,
    volumeM3: 5.9,
    deliveryWindow: 'Before 08:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 07:50' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 08:30' },
    ],
  },
  {
    id: 'ORD-0925-041',
    outletName: 'Waypoint Style — Colombo',
    outletShort: 'Style — Colombo',
    depot: 'Peliyagoda Depot',
    depotRegion: 'Colombo',
    brand: 'Style',
    deferralReasonCategory: 'Window',
    deferralReasonLabel: 'Delivery window',
    deferralReasonFull: 'Delivery window conflict — outlet not accessible',
    deferralNote: 'Deferred due to time window mismatch',
    deferredAt: '25 Sep · 08:35',
    nextPlannedDate: '2026-09-27',
    nextPlannedDateLabel: '27 Sep 2026',
    queueStatus: 'Pending',
    requirement: 'Ambient',
    weightKg: 490,
    volumeM3: 4.8,
    deliveryWindow: '08:00–12:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 08:00' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 08:35' },
    ],
  },
  {
    id: 'ORD-0925-044',
    outletName: 'Waypoint Fresh — Wattala',
    outletShort: 'Fresh — Wattala',
    depot: 'Peliyagoda Depot',
    depotRegion: 'Gampaha',
    brand: 'Fresh',
    deferralReasonCategory: 'Capacity',
    deferralReasonLabel: 'Reefer capacity',
    deferralReasonFull: 'Refrigerated capacity unavailable',
    deferralNote: 'Deferred during route planning',
    deferredAt: '25 Sep · 08:40',
    nextPlannedDate: '2026-09-26',
    nextPlannedDateLabel: '26 Sep 2026',
    queueStatus: 'Scheduled',
    requirement: 'Chilled',
    weightKg: 580,
    volumeM3: 5.5,
    deliveryWindow: '06:00–08:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 08:10' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 08:40' },
    ],
  },
  {
    id: 'ORD-0925-049',
    outletName: 'Waypoint Tech — Colombo',
    outletShort: 'Tech — Colombo',
    depot: 'Peliyagoda Depot',
    depotRegion: 'Colombo',
    brand: 'Tech',
    deferralReasonCategory: 'Vehicle',
    deferralReasonLabel: 'Vehicle unavailable',
    deferralReasonFull: 'Assigned vehicle unavailable — maintenance',
    deferralNote: 'Deferred due to vehicle unavailability',
    deferredAt: '25 Sep · 08:45',
    nextPlannedDate: '2026-09-27',
    nextPlannedDateLabel: '27 Sep 2026',
    queueStatus: 'Pending',
    requirement: 'Ambient',
    weightKg: 720,
    volumeM3: 7.0,
    deliveryWindow: '10:00–14:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 08:15' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 08:45' },
    ],
  },
  {
    id: 'ORD-0925-052',
    outletName: 'Waypoint Style — Kandy',
    outletShort: 'Style — Kandy',
    depot: 'Kandy Depot',
    depotRegion: 'Kandy',
    brand: 'Style',
    deferralReasonCategory: 'Other',
    deferralReasonLabel: 'Fuel quota',
    deferralReasonFull: 'Fuel quota exceeded for route',
    deferralNote: 'Deferred due to fuel constraints',
    deferredAt: '25 Sep · 09:00',
    nextPlannedDate: '2026-09-28',
    nextPlannedDateLabel: '28 Sep 2026',
    queueStatus: 'Review',
    requirement: 'Ambient',
    weightKg: 380,
    volumeM3: 3.8,
    deliveryWindow: '09:00–13:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 08:30' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 09:00' },
    ],
  },
  {
    id: 'ORD-0925-055',
    outletName: 'Waypoint Fresh — Kelaniya',
    outletShort: 'Fresh — Kelaniya',
    depot: 'Peliyagoda Depot',
    depotRegion: 'Gampaha',
    brand: 'Fresh',
    deferralReasonCategory: 'Capacity',
    deferralReasonLabel: 'Reefer capacity',
    deferralReasonFull: 'Refrigerated capacity unavailable',
    deferralNote: 'Deferred during route planning',
    deferredAt: '25 Sep · 09:10',
    nextPlannedDate: '2026-09-27',
    nextPlannedDateLabel: '27 Sep 2026',
    queueStatus: 'Scheduled',
    requirement: 'Chilled',
    weightKg: 640,
    volumeM3: 6.0,
    deliveryWindow: '07:00–09:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 08:45' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 09:10' },
    ],
  },
  {
    id: 'ORD-0925-058',
    outletName: 'Waypoint Fresh — Moratuwa',
    outletShort: 'Fresh — Moratuwa',
    depot: 'Peliyagoda Depot',
    depotRegion: 'Colombo',
    brand: 'Fresh',
    deferralReasonCategory: 'Window',
    deferralReasonLabel: 'Delivery window',
    deferralReasonFull: 'Delivery window conflict — no access before 09:00',
    deferralNote: 'Deferred due to outlet access restriction',
    deferredAt: '25 Sep · 09:15',
    nextPlannedDate: '2026-09-28',
    nextPlannedDateLabel: '28 Sep 2026',
    queueStatus: 'Pending',
    requirement: 'Chilled',
    weightKg: 520,
    volumeM3: 4.9,
    deliveryWindow: 'Before 09:00',
    history: [
      { event: 'Order received', timestamp: '25 Sep · 09:00' },
      { event: 'Deferred by Dispatcher', timestamp: '25 Sep · 09:15' },
    ],
  },
];

// Compute summary from data
function computeDeferredSummary(orders: DeferredOrder[]): DeferredOrdersSummary {
  return {
    totalDeferred: orders.length,
    capacity: orders.filter(o => o.deferralReasonCategory === 'Capacity').length,
    window: orders.filter(o => o.deferralReasonCategory === 'Window').length,
    vehicle: orders.filter(o => o.deferralReasonCategory === 'Vehicle').length,
    other: orders.filter(o => o.deferralReasonCategory === 'Other').length,
  };
}

// In-memory store so updates persist during the session
const persistedDeferred = sessionStorage.getItem('waypoint:deferred-orders');
let deferredOrdersStore: DeferredOrder[] = persistedDeferred ? JSON.parse(persistedDeferred) as DeferredOrder[] : [...MOCK_DEFERRED_ORDERS];

function persistDeferredOrders(): void {
  sessionStorage.setItem('waypoint:deferred-orders', JSON.stringify(deferredOrdersStore));
}

export async function fetchDeferredOrders(): Promise<{
  orders: DeferredOrder[];
  summary: DeferredOrdersSummary;
}> {
  await new Promise(r => setTimeout(r, 250));
  return {
    orders: [...deferredOrdersStore],
    summary: computeDeferredSummary(deferredOrdersStore),
  };
}

export function getDeferredOrdersSnapshot(): DeferredOrder[] {
  return deferredOrdersStore.map(order => ({ ...order, history: [...order.history] }));
}

export async function updateNextPlannedDate(
  req: UpdateNextPlannedDateRequest
): Promise<{ success: boolean; updatedOrder: DeferredOrder }> {
  await new Promise(r => setTimeout(r, 400));
  const idx = deferredOrdersStore.findIndex(o => o.id === req.orderId);
  if (idx === -1) throw new Error(`Order ${req.orderId} not found`);
  // Format the new date label
  const d = new Date(req.newDate);
  const formatted = d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, ' ');
  const updated: DeferredOrder = {
    ...deferredOrdersStore[idx],
    nextPlannedDate: req.newDate,
    nextPlannedDateLabel: formatted,
  };
  deferredOrdersStore = deferredOrdersStore.map((o, i) => (i === idx ? updated : o));
  persistDeferredOrders();
  return { success: true, updatedOrder: updated };
}

export async function returnOrderToPlanning(
  req: ReturnToRoutePlanningRequest
): Promise<{ success: boolean; returnedOrderId: string }> {
  await new Promise(r => setTimeout(r, 400));
  const deferredOrder = deferredOrdersStore.find(order => order.id === req.orderId);
  // Remove from deferred store — it is now UNPLANNED in the planning pool
  deferredOrdersStore = deferredOrdersStore.filter(o => o.id !== req.orderId);
  persistDeferredOrders();
  const updatedOrder = updateDevelopmentOrderStatus(req.orderId, 'Unplanned');
  if (!updatedOrder && deferredOrder) {
    upsertDevelopmentOrder({
      id: deferredOrder.id, receivedAt: '', isNew: false, outletName: deferredOrder.outletName,
      routeArea: `${deferredOrder.depot.replace(' Depot', '')} - ${deferredOrder.depotRegion}`,
      brand: deferredOrder.brand, deliveryWindow: deferredOrder.deliveryWindow,
      timeSensitive: /before/i.test(deferredOrder.deliveryWindow), temperature: deferredOrder.requirement,
      weightKg: deferredOrder.weightKg, volumeM3: deferredOrder.volumeM3,
      status: 'Unplanned', constraint: deferredOrder.requirement === 'Ambient' ? 'Valid' : 'Reefer Required',
    });
  }
  if (!updatedOrder && !deferredOrder) throw new Error(`Order ${req.orderId} not found in planning data`);
  return { success: true, returnedOrderId: req.orderId };
}
