import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authSession } from '@/features/auth/authSession';

export function StoreManagerRouteGuard() {
  const location = useLocation();
  const session = authSession.get();

  if (!session || session.user.role !== 'STORE_MANAGER') {
    return <Navigate replace to="/" />;
  }
  return <Outlet />;
}