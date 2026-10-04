import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/login/LoginPage';
import { LoadingPortalPage } from '@/pages/loading/LoadingPortalPage';
import { DriverPortalPage } from '@/pages/delivery/DriverPortalPage';
import { authSession } from '@/features/auth/authSession';
import { StoreManagerLayout } from '@/shared/layouts/StoreManagerLayout';
import { StoreManagerRouteGuard } from '@/shared/routes/StoreManagerRouteGuard';
import { DashboardPage } from '@/pages/store-manager/DashboardPage';
import { NewOrderPage } from '@/pages/store-manager/NewOrderPage';
import { OrderConfirmedPage } from '@/pages/store-manager/OrderConfirmedPage';
import { OrderHistoryPage } from '@/pages/store-manager/OrderHistoryPage';
import { DeliveryTrackingPage } from '@/pages/store-manager/DeliveryTrackingPage';
import { DeferralPage } from '@/pages/store-manager/DeferralPage';
import { ReceivingPage } from '@/pages/store-manager/ReceivingPage';
import { ReceiptConfirmationPage } from '@/pages/store-manager/ReceiptConfirmationPage';
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

type DispatcherRoute = 'dashboard' | 'orders' | 'order-details' | 'planning' | 'planned-trip' |
  'capacity-shortfall' | 'deferred-orders' | 'live-tracking' | 'live-trip-detail' |
  'live-trip-map' | 'fleet' | 'reports';

function routeFromPath(pathname: string): { route: DispatcherRoute; id?: string } {
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

const dispatcherPaths: Partial<Record<DispatcherRoute, string>> = {
  dashboard: '/dispatcher/dashboard', orders: '/dispatcher/orders', planning: '/dispatcher/planning',
  'capacity-shortfall': '/dispatcher/planning/shortfall', 'deferred-orders': '/dispatcher/deferred',
  'live-tracking': '/dispatcher/tracking', fleet: '/dispatcher/fleet', reports: '/dispatcher/reports',
};

const FullPageRedirect: React.FC<{ to: string }> = ({ to }) => {
  useEffect(() => window.location.replace(to), [to]);
  return null;
};

export const App: React.FC = () => {
  const isDispatcherPath = window.location.pathname.startsWith('/dispatcher');
  const initial = routeFromPath(window.location.pathname);
  const [dispatcherRoute, setDispatcherRoute] = useState<DispatcherRoute>(initial.route);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initial.route === 'order-details' ? initial.id ?? null : null);
  const [plannedTripId, setPlannedTripId] = useState<string | null>(initial.route === 'planned-trip' ? initial.id ?? null : null);
  const [planningSelectedOrders, setPlanningSelectedOrders] = useState<QueueOrder[]>([]);
  const [selectedTrackingTripId, setSelectedTrackingTripId] = useState(initial.route === 'live-trip-detail' || initial.route === 'live-trip-map' ? initial.id ?? '' : 'TRIP-0925-014');
  const [currentUser, setCurrentUser] = useState<{ email: string; role?: string } | null>(() => {
    const storedSession = localStorage.getItem('waypoint_auth_session');
    if (storedSession) {
      try { return JSON.parse(storedSession).user; } catch { return null; }
    }
    const storedUser = localStorage.getItem('waypoint_loader_session');
    if (storedUser) {
      try { return JSON.parse(storedUser); } catch { return null; }
    }
    return null;
  });

  const navigate = (next: DispatcherRoute, path: string, replace = false) => {
    if (replace) window.history.replaceState({}, '', path);
    else if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setDispatcherRoute(next);
  };

  useEffect(() => {
    if (!isDispatcherPath) return;
    if (!window.location.pathname.startsWith('/dispatcher/')) navigate('dashboard', dispatcherPaths.dashboard!, true);
    const onPopState = () => {
      const next = routeFromPath(window.location.pathname);
      setDispatcherRoute(next.route);
      if (next.route === 'order-details') setSelectedOrderId(next.id ?? null);
      if (next.route === 'planned-trip') setPlannedTripId(next.id ?? null);
      if (next.route === 'live-trip-detail' || next.route === 'live-trip-map') setSelectedTrackingTripId(next.id ?? '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDispatcherPath]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('waypoint_loader_session');
    authSession.clear();
    window.location.assign('/login');
  };

  const handleGlobalNavigate = (target: string) => {
    if (target === 'route-planning') target = 'planning';
    if (target === 'shortfall') target = 'capacity-shortfall';
    const direct = target as DispatcherRoute;
    if (dispatcherPaths[direct]) return navigate(direct, dispatcherPaths[direct]!);
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
    navigate('planning', dispatcherPaths.planning!);
  };

  if (currentUser?.role === 'DRIVER') {
    return <DriverPortalPage currentUser={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser?.role === 'LOADER') {
    return <LoadingPortalPage onLogout={handleLogout} />;
  }

  if (isDispatcherPath) {
    if (!currentUser) return <FullPageRedirect to="/login" />;
    if (currentUser.role !== 'DISPATCHER' && currentUser.role !== 'ADMIN') {
      return <FullPageRedirect to={currentUser.role === 'STORE_MANAGER' ? '/store-manager' : '/login'} />;
    }
    switch (dispatcherRoute) {
      case 'dashboard': return <DispatcherDashboardPage onNavigateGlobal={handleGlobalNavigate} />;
      case 'orders': return <OrdersQueuePage onNavigateGlobal={handleGlobalNavigate} onViewOrderDetails={handleViewOrderDetails} onPlanOrders={handlePlanOrders} />;
      case 'order-details': return <OrderDetailsPage orderId={selectedOrderId ?? ''} onNavigateGlobal={handleGlobalNavigate} onBack={() => window.history.back()} onPlanOrder={handlePlanOrders} />;
      case 'planning': return <RoutePlanningPage onNavigateGlobal={handleGlobalNavigate} selectedOrders={planningSelectedOrders} />;
      case 'planned-trip': return <PlannedTripDetailPage tripId={plannedTripId ?? ''} onNavigateGlobal={handleGlobalNavigate} />;
      case 'capacity-shortfall': return <CapacityShortfallPage onNavigateGlobal={handleGlobalNavigate} onBackToPlanning={() => navigate('planning', dispatcherPaths.planning!)} />;
      case 'deferred-orders': return <DeferredOrdersPage onNavigateGlobal={handleGlobalNavigate} />;
      case 'live-tracking': return <LiveTrackingPage onNavigateGlobal={handleGlobalNavigate} selectedTripId={selectedTrackingTripId} onSelectTrip={setSelectedTrackingTripId} />;
      case 'live-trip-detail': return <TripDetailPage tripId={selectedTrackingTripId} onNavigateGlobal={handleGlobalNavigate} onBack={() => window.history.back()} />;
      case 'live-trip-map': return <TripLiveMapPage tripId={selectedTrackingTripId} onNavigateGlobal={handleGlobalNavigate} onBack={() => window.history.back()} />;
      case 'fleet': return <FleetCapacityPage onNavigateGlobal={handleGlobalNavigate} />;
      case 'reports': return <ReportsPage onNavigateGlobal={handleGlobalNavigate} />;
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Navigate replace to={currentUser?.role === 'STORE_MANAGER' ? '/store-manager' : '/login'} />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<StoreManagerRouteGuard />} path="/store-manager">
          <Route element={<StoreManagerLayout />}>
            <Route element={<DashboardPage />} index />
            <Route element={<DashboardPage />} path="dashboard" />
            <Route element={<NewOrderPage />} path="orders/new" />
            <Route element={<OrderConfirmedPage />} path="orders/:id/confirmed" />
            <Route element={<OrderHistoryPage />} path="orders" />
            <Route element={<DeliveryTrackingPage />} path="orders/:id/tracking" />
            <Route element={<DeferralPage />} path="orders/:id/deferral" />
            <Route element={<ReceiptConfirmationPage />} path="orders/:id/receipt" />
            <Route element={<ReceivingPage />} path="receiving" />
          </Route>
        </Route>
        <Route element={<Navigate replace to="/login" />} path="*" />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
