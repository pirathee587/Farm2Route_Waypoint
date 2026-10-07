import type { ReportData, DeferralBreakdownItem, OperationalInsight } from '@/entities/fleet/fleetTypes';
import { fetchFleetData } from '@/features/fleet/fleetApi';
import { fetchLiveTrackingData } from '@/features/delivery-tracking/liveTrackingApi';
import { getDeferredOrdersSnapshot } from '@/features/planning-allocation/routePlanningApi';

export async function fetchCurrentReportData(): Promise<ReportData> {
  const [fleet, tracking, deferred] = await Promise.all([fetchFleetData(), fetchLiveTrackingData(), getDeferredOrdersSnapshot()]);
  const totalOrders = deferred.length;
  const deferredOrders = deferred.length;
  const plannedOrders = totalOrders - deferredOrders;
  const plannedPercent = totalOrders > 0 ? Math.round((plannedOrders / totalOrders) * 1000) / 10 : 0;
  const categories = ['Capacity', 'Window', 'Vehicle', 'Other'] as const;
  const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];
  const deferralBreakdown: DeferralBreakdownItem[] = categories.map((category, index) => ({
    category: category === 'Window' ? 'Delivery Window' : category,
    count: deferred.filter(order => order.deferralReasonCategory === category).length,
    color: colors[index]!,
  }));
  const issues = tracking.summary.issuesCount + tracking.summary.atRiskCount;
  const insights: OperationalInsight[] = [
    { id: 'capacity', type: 'warning', title: 'Capacity shortfall', description: `${deferredOrders} orders require a decision.`, actionPage: 'capacity-shortfall' },
    { id: 'reefer', type: 'attention', title: 'Reefer availability', description: `${fleet.summary.chilledAvailable} of ${fleet.summary.chilledCapable} chilled-capable vehicles available.`, actionPage: 'fleet' },
    { id: 'tracking', type: 'info', title: 'Active delivery operations', description: `${tracking.summary.activeTripsCount} trips are currently being tracked.`, actionPage: 'live-tracking' },
  ];
  return {
    reportDate: 'Current operational state', totalOrders, plannedOrders, deferredOrders,
    activeTrips: tracking.summary.activeTripsCount, issues,
    deliveryPerformance: { plannedOrders, deferredOrders, issues, totalOrders, plannedPercent, deferredPercent: totalOrders > 0 ? Math.round((deferredOrders / totalOrders) * 1000) / 10 : 0 },
    deferralBreakdown,
    fleetUtilisation: { available: fleet.summary.available, inUse: fleet.summary.inUse, unavailable: fleet.summary.unavailable, total: fleet.summary.totalFleet },
    chilledCapacity: { chilledAvailable: fleet.summary.chilledAvailable, chilledTotal: fleet.summary.chilledCapable, reeferTrucksTotal: 12, reeferVansTotal: 4, attentionRequired: fleet.reeferAttentionRequired },
    operationalInsights: insights,
  };
}
