// ============================================================
// Dashboard API — Fetches from /api/planning/dashboard
// Planning counters come only from the Planning Service.
// ============================================================

import type { DashboardData } from '@/entities/dashboard/dashboardTypes';
import { apiRequest } from '@/shared/api/apiClient';

// ── Mock / Fallback Data ────────────────────────────────────

export const mockDashboardData: DashboardData = {
  source: 'FALLBACK',
  date: 'Monday, 25 September 2026',
  summary: {
    totalOrders: 56,
    unplannedOrders: 0,
    plannedOrders: 48,
    deferredOrders: 8,
    activeTrips: 8,
    availableVehicles: 38,
    totalVehicles: 60,
    availableReefers: 8,
    totalReefers: 16,
    issuesCount: 3,
    inTransitVehicles: 14,
    loadingVehicles: 5,
    unavailableVehicles: 6,
    plannedPercent: 85.7,
  },
  attentionItems: [
    {
      id: 'att-001',
      type: 'capacity_shortfall',
      title: 'Capacity Shortfall',
      description: '8 deferred orders require a planning decision.',
      severity: 'warning',
      actionLabel: 'Review Orders',
      actionTarget: 'orders',
    },
    {
      id: 'att-002',
      type: 'reefer_capacity',
      title: 'Reefer Capacity',
      description: 'Chilled demand is approaching available capacity.',
      severity: 'info',
      actionLabel: 'Review Capacity',
      actionTarget: 'fleet',
    },
    {
      id: 'att-003',
      type: 'loading_issue',
      title: 'Loading Issue · TRIP-0925-014',
      description: '2 cartons reported missing.',
      severity: 'critical',
      affectedRef: 'TRIP-0925-014',
      actionLabel: 'View Issue',
      actionTarget: 'live-tracking',
    },
  ],
  activeTrips: [
    {
      id: 'TRIP-0925-014',
      vehicleId: 'VEH014',
      vehicleType: 'Reefer',
      route: 'Peliyagoda → Colombo',
      driver: 'Dilan Fernando',
      stopsCompleted: 3,
      totalStops: 6,
      eta: '10:40 AM',
      status: 'In Transit',
    },
    {
      id: 'TRIP-0925-018',
      vehicleId: 'VEH022',
      vehicleType: 'Dry Box',
      route: 'Peliyagoda → Gampaha',
      driver: 'Sahan Silva',
      stopsCompleted: 0,
      totalStops: 4,
      eta: '11:20 AM',
      status: 'Loading',
    },
    {
      id: 'TRIP-0925-021',
      vehicleId: 'VEH031',
      vehicleType: 'Van',
      route: 'Kandy → Peradeniya',
      driver: 'Kasun Perera',
      stopsCompleted: 0,
      totalStops: 3,
      eta: '12:05 PM',
      status: 'Ready',
    },
  ],
  recentActivity: [
    {
      id: 'act-001',
      time: '09:42',
      description: 'TRIP-0925-014 departed Peliyagoda Depot.',
      color: 'blue',
    },
    {
      id: 'act-002',
      time: '09:30',
      description: 'Loader reported 2 missing cartons on TRIP-0925-018.',
      color: 'red',
    },
    {
      id: 'act-003',
      time: '09:28',
      description: 'ORD-0925-027 deferred due to refrigerated vehicle capacity.',
      color: 'orange',
    },
    {
      id: 'act-004',
      time: '09:15',
      description: 'VEH031 marked Ready for departure.',
      color: 'green',
    },
  ],
};

export const emptyDashboardData: DashboardData = {
  source: 'REAL_API',
  date: '',
  summary: { totalOrders:0, unplannedOrders:0, plannedOrders:0, deferredOrders:0, activeTrips:0, availableVehicles:0, totalVehicles:0, availableReefers:0, totalReefers:0, issuesCount:0, inTransitVehicles:0, loadingVehicles:0, unavailableVehicles:0, plannedPercent:0 },
  attentionItems: [], activeTrips: [], recentActivity: [],
};

// ── API Response Type ────────────────────────────────────────

interface DashboardApiResponse {
  totalOrders: number;
  unplannedOrders: number;
  plannedOrders: number;
  deferredOrders: number;
  activeTrips: number;
  availableVehicles: number;
  totalVehicles: number;
  availableReefers: number;
  totalReefers: number;
}

// ── API Fetch ────────────────────────────────────────────────

export async function fetchDashboardData(): Promise<DashboardData> {
    const apiData = await apiRequest<DashboardApiResponse>('/planning/dashboard', {
      signal: AbortSignal.timeout(5000),
    });

    return {
      source: 'REAL_API',
      date: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      attentionItems: [],
      activeTrips: [],
      recentActivity: [],
      summary: {
        totalOrders: apiData.totalOrders,
        unplannedOrders: apiData.unplannedOrders,
        plannedOrders: apiData.plannedOrders,
        deferredOrders: apiData.deferredOrders,
        activeTrips: apiData.activeTrips,
        availableVehicles: apiData.availableVehicles,
        totalVehicles: apiData.totalVehicles,
        availableReefers: apiData.availableReefers,
        totalReefers: apiData.totalReefers,
        plannedPercent:
          apiData.totalOrders > 0
            ? Math.round((apiData.plannedOrders / apiData.totalOrders) * 100)
            : 0,
        issuesCount: 0,
        inTransitVehicles: 0,
        loadingVehicles: 0,
        unavailableVehicles: Math.max(0, apiData.totalVehicles - apiData.availableVehicles),
      },
    };
}
