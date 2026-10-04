import React from 'react';
import { DriverPortal } from '@/features/delivery-tracking';

interface DriverPortalPageProps {
  onLogout?: () => void;
  currentUser?: { email: string; role?: string; fullName?: string } | null;
}

export const DriverPortalPage: React.FC<DriverPortalPageProps> = ({ onLogout, currentUser }) => {
  return <DriverPortal onLogout={onLogout} currentUser={currentUser} />;
};

export default DriverPortalPage;
