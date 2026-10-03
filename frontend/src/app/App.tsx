import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/login/LoginPage';
import { LoadingPortalPage } from '@/pages/loading/LoadingPortalPage';
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

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ email: string; role?: string } | null>(() => {
    const storedUser = localStorage.getItem('waypoint_loader_session');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }

    if (
      typeof window !== 'undefined' &&
      (window.location.hash === '#loading' || window.location.hash === '#portal')
    ) {
      return { email: 'kumar.s@waypoint.com', role: 'LOADER' };
    }

    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#login') {
        setCurrentUser(null);
        localStorage.removeItem('waypoint_loader_session');
      } else if (
        window.location.hash === '#loading' ||
        window.location.hash === '#portal'
      ) {
        const user = { email: 'kumar.s@waypoint.com', role: 'LOADER' };
        setCurrentUser(user);
        localStorage.setItem('waypoint_loader_session', JSON.stringify(user));
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('waypoint_loader_session');
    window.location.hash = '#login';
  };

  if (currentUser) {
    return <LoadingPortalPage onLogout={handleLogout} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Navigate replace to="/store-manager" />} path="/" />
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
        <Route element={<Navigate replace to="/store-manager" />} path="*" />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
