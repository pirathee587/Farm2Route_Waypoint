import React from 'react';
import { LoadingPortal } from '@/features/loading';

interface LoadingPortalPageProps {
  onLogout?: () => void;
}

export const LoadingPortalPage: React.FC<LoadingPortalPageProps> = ({ onLogout }) => {
  return <LoadingPortal onLogout={onLogout} />;
};

export default LoadingPortalPage;
