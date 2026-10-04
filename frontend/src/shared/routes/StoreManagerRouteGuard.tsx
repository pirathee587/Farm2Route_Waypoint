import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authSession } from '@/features/auth/authSession';

export function StoreManagerRouteGuard() {
  const location = useLocation();
  const session = authSession.get();

  if (!session) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  if (session.user.role !== 'STORE_MANAGER') {
    return <Navigate replace to="/login" />;
  }
  return <Outlet />;
}
