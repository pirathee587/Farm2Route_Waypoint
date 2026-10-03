import React, { useEffect, useState } from 'react';
import { DispatcherDashboardPage } from '@/pages/dashboard/DispatcherDashboardPage';
import { OrdersQueuePage } from '@/pages/orders/OrdersQueuePage';
import { OrderDetailsPage } from '@/pages/orders/OrderDetailsPage';
import { RoutePlanningPage } from '@/pages/planning/RoutePlanningPage';
import { PlannedTripDetailPage } from '@/pages/planning/PlannedTripDetailPage';
import { CapacityShortfallPage } from '@/pages/planning/CapacityShortfallPage';
import { DeferredOrdersPage } from '@/pages/planning/DeferredOrdersPage';
import { LiveTrackingPage } from '@/pages/tracking/LiveTrackingPage';
import { TripDetailPage } from '@/pages/tracking/TripDetailPage';
import { TripLiveMapPage } from '@/pages/tracking/TripLiveMapPage';
import { FleetCapacityPage } from '@/pages/fleet/FleetCapacityPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import type { QueueOrder } from '@/entities/order/orderTypes';

type Route = 'dashboard' | 'orders' | 'order-details' | 'planning' | 'planned-trip' |
  'capacity-shortfall' | 'deferred-orders' | 'live-tracking' | 'live-trip-detail' |
  'live-trip-map' | 'fleet' | 'reports';

function routeFromPath(pathname: string): { route: Route; id?: string } {
  const p = pathname.split('/').filter(Boolean);
  if (p[0] !== 'dispatcher') return { route: 'dashboard' };
  if (p[1] === 'orders' && p[2]) return { route: 'order-details', id: decodeURIComponent(p[2]) };
  if (p[1] === 'orders') return { route: 'orders' };
  if (p[1] === 'planning' && p[2] === 'trips' && p[3]) return { route: 'planned-trip', id: decodeURIComponent(p[3]) };
  if (p[1] === 'planning' && p[2] === 'shortfall') return { route: 'capacity-shortfall' };
  if (p[1] === 'planning') return { route: 'planning' };
  if (p[1] === 'deferred') return { route: 'deferred-orders' };
  if (p[1] === 'tracking' && p[2] && p[3] === 'map') return { route: 'live-trip-map', id: decodeURIComponent(p[2]) };
  if (p[1] === 'tracking' && p[2]) return { route: 'live-trip-detail', id: decodeURIComponent(p[2]) };
  if (p[1] === 'tracking') return { route: 'live-tracking' };
  if (p[1] === 'fleet') return { route: 'fleet' };
  if (p[1] === 'reports') return { route: 'reports' };
  return { route: 'dashboard' };
}

const paths: Partial<Record<Route, string>> = {
  dashboard: '/dispatcher/dashboard', orders: '/dispatcher/orders', planning: '/dispatcher/planning',
  'capacity-shortfall': '/dispatcher/planning/shortfall', 'deferred-orders': '/dispatcher/deferred',
  'live-tracking': '/dispatcher/tracking', fleet: '/dispatcher/fleet', reports: '/dispatcher/reports',
};

export const App: React.FC = () => {
  const initial = routeFromPath(window.location.pathname);
  const [route, setRoute] = useState<Route>(initial.route);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initial.route === 'order-details' ? initial.id ?? null : null);
  const [plannedTripId, setPlannedTripId] = useState<string | null>(initial.route === 'planned-trip' ? initial.id ?? null : null);
  const [planningSelectedOrders, setPlanningSelectedOrders] = useState<QueueOrder[]>([]);
  const [selectedTrackingTripId, setSelectedTrackingTripId] = useState(initial.route === 'live-trip-detail' || initial.route === 'live-trip-map' ? initial.id ?? '' : 'TRIP-0925-014');

  const navigate = (next: Route, path: string, replace = false) => {
    if (replace) window.history.replaceState({}, '', path);
    else if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setRoute(next);
  };

  useEffect(() => {
    if (!window.location.pathname.startsWith('/dispatcher/')) navigate('dashboard', paths.dashboard!, true);
    const onPopState = () => {
      const next = routeFromPath(window.location.pathname);
      setRoute(next.route);
      if (next.route === 'order-details') setSelectedOrderId(next.id ?? null);
      if (next.route === 'planned-trip') setPlannedTripId(next.id ?? null);
      if (next.route === 'live-trip-detail' || next.route === 'live-trip-map') setSelectedTrackingTripId(next.id ?? '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleGlobalNavigate = (target: string) => {
    if (target === 'route-planning') target = 'planning';
    if (target === 'shortfall') target = 'capacity-shortfall';
    const direct = target as Route;
    if (paths[direct]) return navigate(direct, paths[direct]!);
    if (target.startsWith('planned-trip/')) {
      const id = target.slice('planned-trip/'.length); setPlannedTripId(id);
      return navigate('planned-trip', `/dispatcher/planning/trips/${encodeURIComponent(id)}`);
    }
    if (target.startsWith('live-trip-detail/')) {
      const id = target.slice('live-trip-detail/'.length); setSelectedTrackingTripId(id);
      return navigate('live-trip-detail', `/dispatcher/tracking/${encodeURIComponent(id)}`);
    }
    if (target.startsWith('live-trip-map/')) {
      const id = target.slice('live-trip-map/'.length); setSelectedTrackingTripId(id);
      return navigate('live-trip-map', `/dispatcher/tracking/${encodeURIComponent(id)}/map`);
    }
  };

  const handleViewOrderDetails = (id: string) => {
    setSelectedOrderId(id);
    navigate('order-details', `/dispatcher/orders/${encodeURIComponent(id)}`);
  };

  const handlePlanOrders = (orders: QueueOrder[]) => {
    setPlanningSelectedOrders(orders);
    navigate('planning', paths.planning!);
  };

  switch (route) {
    case 'dashboard': return <DispatcherDashboardPage onNavigateGlobal={handleGlobalNavigate} />;
    case 'orders': return <OrdersQueuePage onNavigateGlobal={handleGlobalNavigate} onViewOrderDetails={handleViewOrderDetails} onPlanOrders={handlePlanOrders} />;
    case 'order-details': return <OrderDetailsPage orderId={selectedOrderId ?? ''} onNavigateGlobal={handleGlobalNavigate} onBack={() => window.history.back()} onPlanOrder={handlePlanOrders} />;
    case 'planning': return <RoutePlanningPage onNavigateGlobal={handleGlobalNavigate} selectedOrders={planningSelectedOrders} />;
    case 'planned-trip': return <PlannedTripDetailPage tripId={plannedTripId ?? ''} onNavigateGlobal={handleGlobalNavigate} />;
    case 'capacity-shortfall': return <CapacityShortfallPage onNavigateGlobal={handleGlobalNavigate} onBackToPlanning={() => navigate('planning', paths.planning!)} />;
    case 'deferred-orders': return <DeferredOrdersPage onNavigateGlobal={handleGlobalNavigate} />;
    case 'live-tracking': return <LiveTrackingPage onNavigateGlobal={handleGlobalNavigate} selectedTripId={selectedTrackingTripId} onSelectTrip={setSelectedTrackingTripId} />;
    case 'live-trip-detail': return <TripDetailPage tripId={selectedTrackingTripId} onNavigateGlobal={handleGlobalNavigate} onBack={() => window.history.back()} />;
    case 'live-trip-map': return <TripLiveMapPage tripId={selectedTrackingTripId} onNavigateGlobal={handleGlobalNavigate} onBack={() => window.history.back()} />;
    case 'fleet': return <FleetCapacityPage onNavigateGlobal={handleGlobalNavigate} />;
    case 'reports': return <ReportsPage onNavigateGlobal={handleGlobalNavigate} />;
  }
};

export default App;
